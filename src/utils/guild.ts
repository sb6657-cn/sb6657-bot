/** 群生效范围模式 */
export type GuildScopeMode = 'all' | 'whitelist' | 'blacklist';

/**
 * 判断某个群是否在"生效范围"内。
 * - all: 始终生效
 * - whitelist: 仅当 guildId 在 guilds 列表中才生效
 * - blacklist: 仅当 guildId 不在 guilds 列表中才生效
 */
export function isGuildAllowed(guildId: string | undefined, mode: GuildScopeMode, guilds: string[]): boolean {
    if (!guildId) return false;
    if (mode === 'all') return true;
    const hit = guilds.includes(guildId);
    return mode === 'whitelist' ? hit : !hit;
}
