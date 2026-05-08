import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import type { SpamWindow } from '../types/runtime';
import { formatDuration } from '../utils/day';
import { renderTemplate } from '../utils/template';
import { isGuildAllowed } from '../utils/guild';

/**
 * 刷屏禁言 —— 被动监听器（不注册命令）
 *
 * 原理：按 `guildId:userId` 为每个用户维护一个消息时间戳滑动窗口。
 * 每次新消息进来：
 *   1. 把超过 windowSeconds 的老时间戳剔除
 *   2. 追加当前时间戳
 *   3. 若窗口内数量 >= threshold，触发禁言并清空窗口
 */
export function useSpamMuteCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-spamMute');
    const { spamMute } = config;

    if (!spamMute.enabled) {
        logger.info('刷屏禁言 已被禁用,跳过监听器注册');
        return;
    }

    // key = `${guildId}:${userId}`，每个用户一个时间戳窗口
    const windows = new Map<string, SpamWindow>();

    ctx.guild().on('message-created', async (session) => {
        if (!session.guildId || !session.userId) return;
        if (!isGuildAllowed(session.guildId, spamMute.guildMode, spamMute.guilds)) return;

        const key = `${session.guildId}:${session.userId}`;
        const now = Date.now();
        const windowMs = spamMute.windowSeconds * 1000;

        // 取/建窗口
        let win = windows.get(key);
        if (!win) {
            win = [];
            windows.set(key, win);
        }

        // 1. 剔除过期
        while (win.length > 0 && now - win[0] > windowMs) {
            win.shift();
        }
        // 2. 追加当前
        win.push(now);

        // 3. 判定
        if (win.length >= spamMute.threshold) {
            const count = win.length;
            // 清空该用户的窗口，避免下一条消息再次触发
            windows.delete(key);

            try {
                await session.bot.muteGuildMember(session.guildId, session.userId, spamMute.muteSeconds * 1000);
            } catch (err) {
                logger.error('刷屏禁言 执行失败:', err);
                return;
            }

            await session.send(
                renderTemplate(spamMute.msgMute, {
                    at: `<at id="${session.userId}"/>`,
                    time: formatDuration(spamMute.muteSeconds),
                    seconds: spamMute.muteSeconds,
                    count,
                    threshold: spamMute.threshold,
                    window: spamMute.windowSeconds,
                })
            );
        }
    });
}
