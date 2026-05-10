import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import type { VoteState } from '../types/runtime';
import { isGuildAllowed } from '../utils/guild';
import { checkUserMutedStatus, extractUserIdFromUserArg } from '../utils/member';

export function useVoteMuteCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-voteMute');
    const { voteMute } = config;

    if (!voteMute.enabled) {
        logger.info('投票禁言已禁用，跳过注册');
        return;
    }

    const stateMap = new Map<string, VoteState>();

    const sendQuotedByMessageId = async (session: any, content: string) => {
        if (session.messageId) {
            await session.send(`<quote id="${session.messageId}"/>${content}`);
            return;
        }
        await session.send(content);
    };

    const getState = (guildId: string, userId: string): VoteState => {
        const key = `${guildId}:${userId}`;
        let state = stateMap.get(key);
        if (!state) {
            state = {
                muteVotes: new Set<string>(),
                unmuteVotes: new Set<string>(),
                mutedByVote: false,
            };
            stateMap.set(key, state);
        }
        return state;
    };

    // 从 <user:user> 参数中提取纯用户 ID（兼容 platform:id 等格式）
    const getTargetUserId = extractUserIdFromUserArg;

    ctx.intersect((session) => session.guildId !== undefined)
        .command('投票禁言 <user:user>', '投票禁言某个用户，达到票数后执行禁言')
        .action(async ({ session }, user) => {
            if (!session || !session.guildId || !session.userId || !user) return;
            if (!isGuildAllowed(session.guildId, voteMute.guildMode, voteMute.guilds)) return;

            const targetUserId = getTargetUserId(user);
            if (!targetUserId) {
                await sendQuotedByMessageId(session, '🔇 无法解析目标用户。');
                return;
            }
            if (targetUserId === session.userId) {
                await sendQuotedByMessageId(session, '🔇 不能给自己投票禁言。');
                return;
            }

            const botUserId = session.bot.userId || (session.bot as any).selfId;
            if (botUserId && targetUserId === botUserId) {
                await sendQuotedByMessageId(session, '🔇 不能投票禁言bot。');
                return;
            }

            // 按 群:用户 获取投票状态，实现群间隔离
            const targetState = getState(session.guildId, targetUserId);
            // 防止对已禁言用户重复禁言 / 防止对未禁言用户发起解禁
            if (targetState.mutedByVote) {
                await sendQuotedByMessageId(session, '🔇 该用户已被投票禁言，无法再次禁言。');
                return;
            }
            if (targetState.muteVotes.has(session.userId)) {
                await sendQuotedByMessageId(session, '🔇 你已经投过票了。');
                return;
            }

            targetState.muteVotes.add(session.userId);
            const votes = targetState.muteVotes.size;

            if (votes < voteMute.muteNeedsVotes) {
                await sendQuotedByMessageId(session, `🔇 禁言投票进行中：${votes}/${voteMute.muteNeedsVotes}，还需 ${voteMute.muteNeedsVotes - votes} 票。`);
                return;
            }

            // 达到票数阈值，执行操作并清理投票状态
            try {
                await session.bot.muteGuildMember(session.guildId, targetUserId, voteMute.muteSeconds * 1000);
            } catch (err) {
                logger.error('投票禁言执行失败:', err);
                await sendQuotedByMessageId(session, '🔇 禁言失败，可能是bot权限不足。');
                return;
            }

            targetState.mutedByVote = true;
            targetState.muteVotes.clear();
            targetState.unmuteVotes.clear();
            await sendQuotedByMessageId(session, `🔇 投票成功，已禁言 <at id="${targetUserId}"/>。`);
            return;
        });

    ctx.intersect((session) => session.guildId !== undefined)
        .command('投票解禁 <user:user>', '投票解禁某个用户，达到票数后执行解禁')
        .action(async ({ session }, user) => {
            if (!session || !session.guildId || !session.userId || !user) return;
            if (!isGuildAllowed(session.guildId, voteMute.guildMode, voteMute.guilds)) return;

            const targetUserId = getTargetUserId(user);
            if (!targetUserId) {
                await sendQuotedByMessageId(session, '🔊 无法解析目标用户。');
                return;
            }
            if (targetUserId === session.userId) {
                await sendQuotedByMessageId(session, '🔊 不能给自己投票解禁。');
                return;
            }

            // 按 群:用户 获取投票状态，实现群间隔离
            const targetState = getState(session.guildId, targetUserId);
            // 防止对已禁言用户重复禁言 / 防止对未禁言用户发起解禁
            if (!targetState.mutedByVote && !voteMute.enableUnmute) {
                await sendQuotedByMessageId(session, '🔊 只能解禁被投票禁言的用户。');
                return;
            }
            if (!targetState.mutedByVote && voteMute.enableUnmute) {
                const isMuted = await checkUserMutedStatus(session as any, session.guildId, targetUserId, logger);
                if (isMuted === false) {
                    await sendQuotedByMessageId(session, '🔊 该用户当前未被禁言，无需解禁。');
                    return;
                }
            }
            if (targetState.unmuteVotes.has(session.userId)) {
                await sendQuotedByMessageId(session, '🔊 你已经投过票了。');
                return;
            }

            targetState.unmuteVotes.add(session.userId);
            const votes = targetState.unmuteVotes.size;

            if (votes < voteMute.unmuteNeedsVotes) {
                await sendQuotedByMessageId(session, `🔊 解禁投票进行中：${votes}/${voteMute.unmuteNeedsVotes}，还需 ${voteMute.unmuteNeedsVotes - votes} 票。`);
                return;
            }

            // 达到票数阈值，执行操作并清理投票状态
            try {
                await session.bot.muteGuildMember(session.guildId, targetUserId, 0);
            } catch (err) {
                logger.error('投票解禁执行失败:', err);
                await sendQuotedByMessageId(session, '🔊 解禁失败，可能是bot权限不足。');
                return;
            }

            targetState.mutedByVote = false;
            targetState.unmuteVotes.clear();
            targetState.muteVotes.clear();
            await sendQuotedByMessageId(session, `🔊 投票成功，已解禁 <at id="${targetUserId}"/>。`);
            return;
        });
}
