import { Context, Random } from 'koishi';
import type { ConfigType } from '../types/config';
import type { RepeatState } from '../types/runtime';
import { formatDuration } from '../utils/day';
import { renderTemplate } from '../utils/template';
import { isGuildAllowed } from '../utils/guild';

/**
 * 复读禁言 —— 被动监听器（不注册命令）
 * 原理：按子频道（cid）分组计数。若有人连续 minTimes 次发同一条消息，触发禁言。
 * 同时监听 send 事件，避免机器人自己的消息把计数搞乱。
 */
export function useRepeatMuteCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-repeatMute');
    const { repeatMute } = config;

    if (!repeatMute.enabled) {
        logger.info('复读禁言 已被禁用,跳过监听器注册');
        return;
    }

    // 按子频道（cid = platform:channelId）独立记录
    const states: Record<string, RepeatState> = {};

    const getState = (cid: string): RepeatState => {
        if (!states[cid]) {
            states[cid] = { content: '', times: 0 };
        }
        return states[cid];
    };

    // 监听群内收到的消息
    ctx.guild().on('message-created', async (session) => {
        if (!session.cid || !session.guildId || !session.userId) return;
        if (!isGuildAllowed(session.guildId, repeatMute.guildMode, repeatMute.guilds)) return;
        const state = getState(session.cid);

        if (session.content === state.content) {
            state.times += 1;

            if (state.times >= repeatMute.minTimes) {
                // 重置本频道计数，准备下一轮
                state.times = 0;

                const multiplier = Random.int(1, repeatMute.maxDurationMultiplier + 1); // Random.int 右开区间，+1 让倍率能取到上限
                const totalSeconds = repeatMute.muteSeconds * multiplier;

                try {
                    await session.bot.muteGuildMember(session.guildId, session.userId, totalSeconds * 1000);
                } catch (err) {
                    logger.error('复读禁言 执行失败:', err);
                    return;
                }

                await session.send(
                    renderTemplate(repeatMute.msgMute, {
                        at: `<at id="${session.userId}"/>`,
                        time: formatDuration(totalSeconds),
                        seconds: totalSeconds,
                        times: repeatMute.minTimes,
                        baseSeconds: repeatMute.muteSeconds,
                        multiplier,
                    })
                );
            }
        } else {
            // 新内容，重置计数从 0 开始（本条不算进计数，和原插件行为一致）
            state.content = session.content ?? '';
            state.times = 0;
        }
    });

    // 监听机器人自己发送的消息，保持计数同步（若机器人也跟风复读就一起算）
    ctx.guild().on('send', (session) => {
        if (!session.cid) return;
        if (!isGuildAllowed(session.guildId, repeatMute.guildMode, repeatMute.guilds)) return;
        const state = getState(session.cid);
        if (session.content === state.content) {
            state.times += 1;
        } else {
            state.content = session.content ?? '';
            state.times = 0;
        }
    });
}
