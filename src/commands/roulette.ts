import { Context, Random } from 'koishi';
import type { ConfigType } from '../types/config';
import type { GroupStatus } from '../types/runtime';
import { formatDuration } from '../utils/day';
import { renderTemplate } from '../utils/template';

export function useRouletteCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-roulette');
    const { roulette } = config;

    if (!roulette.enabled) {
        logger.info('开枪 指令已被禁用,跳过注册');
        return;
    }

    // 按群独立管理状态
    const statusMap = new Map<string, GroupStatus>();

    /** 按当前配置初始化一个新状态 */
    const freshStatus = (): GroupStatus => {
        if (roulette.mode === 'probability') {
            return { kind: 'probability', time: roulette.initTime };
        }
        const total = Math.max(1, roulette.chambers);
        return {
            kind: 'sequence',
            total,
            remaining: total,
            bulletIndex: Random.int(0, total),
            shotCount: 0,
        };
    };

    ctx.intersect((session) => session.guildId !== undefined)
        .command('开枪', '对自己开一枪，看看会不会死哦', {
            minInterval: roulette.minInterval,
        })
        .action(async ({ session }) => {
            if (!session || !session.guildId || !session.userId) return;

            // 取/建本群状态。若模式变了（配置被改），也重建。
            let status = statusMap.get(session.guildId);
            if (!status || status.kind !== (roulette.mode === 'probability' ? 'probability' : 'sequence')) {
                status = freshStatus();
                statusMap.set(session.guildId, status);
            }

            const at = `<at id="${session.userId}"/>`;

            // ===== 模式 A：放回抽样（概率） =====
            if (roulette.mode === 'probability' && status.kind === 'probability') {
                if (Random.bool(roulette.probability)) {
                    const seconds = status.time;
                    try {
                        await session.bot.muteGuildMember(session.guildId, session.userId, seconds * 1000);
                    } catch (err) {
                        logger.error('禁言失败:', err);
                        return `开枪 禁言失败，可能是机器人权限不足。错误: ${err}`;
                    }

                    // 本轮结束
                    statusMap.delete(session.guildId);

                    await session.sendQueued(
                        renderTemplate(roulette.msgHit, {
                            at,
                            time: formatDuration(seconds),
                            seconds,
                        }),
                        500
                    );

                    if (roulette.msgNewRound && roulette.msgNewRound.trim()) {
                        await session.sendQueued(
                            renderTemplate(roulette.msgNewRound, {
                                at,
                                time: formatDuration(roulette.initTime),
                                seconds: roulette.initTime,
                            }),
                            500
                        );
                    }
                    return;
                }

                // 空枪 → 叠加
                const [lo, hi] = roulette.timeStepMin <= roulette.timeStepMax ? [roulette.timeStepMin, roulette.timeStepMax] : [roulette.timeStepMax, roulette.timeStepMin];
                status.time += Random.int(lo, hi);

                return renderTemplate(roulette.msgMiss, {
                    at,
                    time: formatDuration(status.time),
                    seconds: status.time,
                });
            }

            // ===== 模式 B：不放回抽样（弹巢） =====
            if (roulette.mode === 'sequence' && status.kind === 'sequence') {
                // 本枪打中吗？子弹位置 == 0 意味着"下一格就是子弹"
                const hit = status.bulletIndex === 0;
                status.shotCount += 1;
                const chamber = status.shotCount; // 当前第几枪
                const total = status.total;

                if (hit) {
                    const seconds = roulette.muteTime;
                    try {
                        await session.bot.muteGuildMember(session.guildId, session.userId, seconds * 1000);
                    } catch (err) {
                        logger.error('禁言失败:', err);
                        return `开枪 禁言失败，可能是机器人权限不足。错误: ${err}`;
                    }

                    // 本轮结束
                    statusMap.delete(session.guildId);

                    await session.sendQueued(
                        renderTemplate(roulette.msgHit, {
                            at,
                            time: formatDuration(seconds),
                            seconds,
                            chamber,
                            total,
                        }),
                        500
                    );

                    if (roulette.msgNewRound && roulette.msgNewRound.trim()) {
                        await session.sendQueued(
                            renderTemplate(roulette.msgNewRound, {
                                at,
                                total: Math.max(1, roulette.chambers),
                            }),
                            500
                        );
                    }
                    return;
                }

                // 空枪 → 消耗一格，子弹相对位置 -1
                status.remaining -= 1;
                status.bulletIndex -= 1;

                return renderTemplate(roulette.msgMiss, {
                    at,
                    chamber,
                    remaining: status.remaining,
                    total,
                });
            }
        });
}
