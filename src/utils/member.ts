import { h } from 'koishi';

export function extractUserIdFromUserArg(user: string): string | undefined {
    if (!user) return;
    const raw = user.trim();
    if (!raw) return;

    // 1) 纯数字 QQ 号
    if (/^\d+$/.test(raw)) return raw;

    // 2) 优先从 @ 元素中提取 ID（最稳定）
    try {
        const at = h.select(h.parse(raw), 'at')[0]?.attrs?.id;
        if (at && /^\d+$/.test(String(at))) return String(at);
    } catch {
        /* 解析失败就跳过 */
    }

    // 3) platform:id 格式（如 onebot:123456）
    const fromDomain = raw.split(':').pop()?.trim();
    if (fromDomain && /^\d+$/.test(fromDomain)) return fromDomain;

    // 其余情况（昵称、脏文本等）视为无效，避免误把昵称当 user_id 调用禁言接口
    return;
}

const parseMutedByTimestamp = (raw: unknown): boolean | null => {
    if (typeof raw !== 'number') return null;
    if (raw <= 0) return false;
    const nowMs = Date.now();
    // 兼容秒级与毫秒级时间戳
    const timestampMs = raw > 1_000_000_000_000 ? raw : raw * 1000;
    return timestampMs > nowMs;
};

const parseMutedFromObject = (payload: Record<string, unknown> | undefined): boolean | null => {
    if (!payload) return null;

    const boolFields = ['isMuted', 'muted', 'is_mute'];
    for (const field of boolFields) {
        if (typeof payload[field] === 'boolean') return payload[field] as boolean;
    }

    const timestampFields = ['muteUntil', 'mute_until', 'muteTime', 'mute_time', 'shutUpTime', 'shut_up_time', 'shutUpTimestamp', 'shut_up_timestamp', 'disable_timestamp'];
    for (const field of timestampFields) {
        const parsed = parseMutedByTimestamp(payload[field]);
        if (parsed !== null) return parsed;
    }
    return null;
};

/**
 * 检查目标用户当前是否处于禁言状态。
 * 返回 true/false 表示明确结果，返回 null 表示无法可靠判断。
 */
export async function checkUserMutedStatus(session: any, guildId: string, targetUserId: string, logger?: { warn: (...args: any[]) => void }): Promise<boolean | null> {
    // 优先尝试 OneBot 内部接口（能直接拿到 shut_up_timestamp）
    try {
        const onebot = session.onebot;
        if (onebot?.getGroupMemberInfo) {
            const info = await onebot.getGroupMemberInfo(guildId, targetUserId, false);
            const parsedFromInfo = parseMutedFromObject(info as Record<string, unknown>);
            if (parsedFromInfo !== null) return parsedFromInfo;
            const parsedFromData = parseMutedFromObject((info as any)?.data);
            if (parsedFromData !== null) return parsedFromData;
        }
    } catch (err) {
        logger?.warn('检查成员禁言状态（onebot）失败:', err);
    }

    // 兜底尝试通用接口
    try {
        const member = await session.bot.getGuildMember(guildId, targetUserId);
        return parseMutedFromObject(member as unknown as Record<string, unknown>);
    } catch (err) {
        logger?.warn('检查成员禁言状态（getGuildMember）失败:', err);
        return null;
    }
}
