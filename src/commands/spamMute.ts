import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import type { SpamWindow, SpamSameContentState } from '../types/runtime';
import { formatDuration } from '../utils/day';
import { renderTemplate } from '../utils/template';
import { isGuildAllowed } from '../utils/guild';

/**
 * 刷屏禁言 —— 被动监听器（不注册命令）
 *
 * 内置两个相互独立、互不干扰的计数器，按 `guildId:userId` 维度分别维护：
 *
 *   1. 频率计数器（始终启用，受 spamMute.enabled 控制）
 *      - 维护一个时间戳滑动窗口，剔除超过 windowSeconds 的旧时间戳
 *      - 当窗口内消息数 ≥ threshold 时触发禁言并清空窗口
 *      - 抓"短时间内连发"
 *
 *   2. 相同内容计数器（受 sameContentEnabled 控制，可单独开关）
 *      - 为每个用户记录"当前正在被重复的内容 + 该内容的发送时间戳列表"
 *      - 一旦遇到不同内容，就把状态重置为新内容、时间戳清空后塞入当前
 *      - 同样按 sameContentWindowSeconds 滑动窗口剔除过期时间戳
 *      - 当连续相同内容次数 ≥ sameContentThreshold 时触发禁言并清空状态
 *      - 抓"间隔几秒发一次同样内容"这种慢速刷屏
 *
 * 两个计数器各自独立判定。同一条消息若同时命中（极少见），只会触发先判定的那个，
 * 避免对同一条消息重复禁言。本实现里相同内容计数器优先判定，因为它通常意味着更明显的恶意复读。
 */
export function useSpamMuteCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-spamMute');
    const { spamMute } = config;

    if (!spamMute.enabled) {
        logger.info('刷屏禁言 已被禁用,跳过监听器注册');
        return;
    }

    // —— 频率计数器：key = `${guildId}:${userId}` ——
    const windows = new Map<string, SpamWindow>();
    // —— 相同内容计数器：key = `${guildId}:${userId}` ——
    const sameContentStates = new Map<string, SpamSameContentState>();

    ctx.guild().on('message-created', async (session) => {
        if (!session.guildId || !session.userId) return;
        if (!isGuildAllowed(session.guildId, spamMute.guildMode, spamMute.guilds)) return;

        const key = `${session.guildId}:${session.userId}`;
        const now = Date.now();
        const content = session.content ?? '';

        // ========== 1. 相同内容计数器（可单独开关） ==========
        if (spamMute.sameContentEnabled) {
            const sameWindowMs = spamMute.sameContentWindowSeconds * 1000;
            let state = sameContentStates.get(key);

            if (!state || state.content !== content) {
                state = { content, timestamps: [now] };
                sameContentStates.set(key, state);
            } else {
                while (state.timestamps.length > 0 && now - state.timestamps[0] > sameWindowMs) {
                    state.timestamps.shift();
                }
                state.timestamps.push(now);
            }

            if (state.timestamps.length >= spamMute.sameContentThreshold) {
                const count = state.timestamps.length;
                sameContentStates.delete(key);
                // 同时把频率窗口也清掉，避免被同一波刷屏立刻再触发频率禁言
                windows.delete(key);

                try {
                    await session.bot.muteGuildMember(session.guildId, session.userId, spamMute.sameContentMuteSeconds * 1000);
                } catch (err) {
                    logger.error('刷屏禁言（相同内容）执行失败:', err);
                    return;
                }

                await session.send(
                    renderTemplate(spamMute.msgSameContentMute, {
                        at: `<at id="${session.userId}"/>`,
                        time: formatDuration(spamMute.sameContentMuteSeconds),
                        seconds: spamMute.sameContentMuteSeconds,
                        count,
                        threshold: spamMute.sameContentThreshold,
                        window: spamMute.sameContentWindowSeconds,
                    })
                );
                return;
            }
        }

        // ========== 2. 频率计数器（始终启用） ==========
        const windowMs = spamMute.windowSeconds * 1000;

        let win = windows.get(key);
        if (!win) {
            win = [];
            windows.set(key, win);
        }

        while (win.length > 0 && now - win[0] > windowMs) {
            win.shift();
        }
        win.push(now);

        if (win.length >= spamMute.threshold) {
            const count = win.length;
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
