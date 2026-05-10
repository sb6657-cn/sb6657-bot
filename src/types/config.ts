/** 🔍 搜烂梗 指令配置 */
export interface SearchConfig {
    enabled: boolean;
    minInterval: number;
    defaultMaxUsage: number;
    customLimits: { userId: string; maxUsage: number }[];
}

/** 🎲 随机烂梗 指令配置 */
export interface RandomConfig {
    enabled: boolean;
    minInterval: number;
}

/** 🔫 开枪 指令 —— 两种模式互斥 */
export type RouletteMode =
    | {
          mode: 'probability';
          probability: number;
          initTime: number;
          timeStepMin: number;
          timeStepMax: number;
          msgHit: string;
          msgNewRound: string;
          msgMiss: string;
      }
    | {
          mode: 'sequence';
          chambers: number;
          muteTime: number;
          msgHit: string;
          msgNewRound: string;
          msgMiss: string;
      };

export type RouletteConfig = {
    enabled: boolean;
    minInterval: number;
} & RouletteMode;

/** 😴 睡觉 指令配置 */
export interface SleepConfig {
    enabled: boolean;
    minInterval: number;
    minSeconds: number;
    maxSeconds: number;
    msgSleep: string;
}

/** 🔁 复读禁言 —— 被动监听器配置（不是命令，靠监听群消息触发） */
export interface RepeatMuteConfig {
    enabled: boolean;
    guildMode: 'all' | 'whitelist' | 'blacklist';
    guilds: string[];
    minTimes: number;
    muteSeconds: number;
    maxDurationMultiplier: number;
    msgMute: string;
}

/** 🚿 刷屏禁言 —— 被动监听器配置（按用户滑动窗口计数） */
export interface SpamMuteConfig {
    enabled: boolean;
    guildMode: 'all' | 'whitelist' | 'blacklist';
    guilds: string[];
    windowSeconds: number;
    threshold: number;
    muteSeconds: number;
    msgMute: string;
}

/** 🗳️ 投票禁言配置 */
export interface VoteMuteConfig {
    enabled: boolean;
    guildMode: 'all' | 'whitelist' | 'blacklist';
    guilds: string[];
    muteNeedsVotes: number;
    unmuteNeedsVotes: number;
    muteSeconds: number;
    enableUnmute: boolean;
}

/** 顶层配置 —— 按指令分组
 *  注意：这里故意不叫 `Config`，因为 `Config` 这个名字留给 config.ts 里的 Schema 值
 */
export interface ConfigType {
    search: SearchConfig;
    random: RandomConfig;
    roulette: RouletteConfig;
    sleep: SleepConfig;
    repeatMute: RepeatMuteConfig;
    spamMute: SpamMuteConfig;
    voteMute: VoteMuteConfig;
}
