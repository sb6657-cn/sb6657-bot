import { Context, Random } from 'koishi';
import type { ConfigType } from '../types/config';
import { formatDuration } from '../utils/day';
import { renderTemplate } from '../utils/template';

export function useSleepCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-sleep');
    const { sleep } = config;

    if (!sleep.enabled) {
        logger.info('睡觉 指令已被禁用,跳过注册');
        return;
    }

    ctx.intersect((session) => session.guildId !== undefined)
        .command('睡觉', '来一次精致睡眠吧！')
        .action(async ({ session }) => {
            if (!session || !session.guildId || !session.userId) return;

            // 容错：如果 min > max，交换
            const [lo, hi] = sleep.minSeconds <= sleep.maxSeconds ? [sleep.minSeconds, sleep.maxSeconds] : [sleep.maxSeconds, sleep.minSeconds];
            const seconds = Random.int(lo, hi);

            try {
                await session.bot.muteGuildMember(session.guildId, session.userId, seconds * 1000);
            } catch (err) {
                logger.error('禁言失败:', err);
                return `睡觉 失败了，可能是机器人权限不足。错误: ${err}`;
            }

            return renderTemplate(sleep.msgSleep, {
                at: `<at id="${session.userId}"/>`,
                time: formatDuration(seconds),
                seconds,
            });
        });
}
