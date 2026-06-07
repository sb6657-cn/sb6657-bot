import { Schema } from 'koishi';
import type { SearchConfig, RandomConfig, RouletteConfig, SleepConfig, RepeatMuteConfig, SpamMuteConfig, VoteMuteConfig, ConfigType } from './types/config';

// 子配置 Schema —— 每个指令一个面板分组
const SearchConfig: Schema<SearchConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用本指令'),
    minInterval: Schema.number().default(1000).description('指令触发的冷却时间 (毫秒)'),
    defaultMaxUsage: Schema.number().default(50).description('普通群友每天的默认搜索次数'),
    customLimits: Schema.array(
        Schema.object({
            userId: Schema.string().required().description('需要提权的 QQ 号'),
            maxUsage: Schema.number().required().description('该用户每天允许的最高次数'),
        })
    )
        .default([])
        .description('VIP 用户的自定义次数白名单（可添加多条）'),
}).description('🔍 搜烂梗 指令');

const RandomConfig: Schema<RandomConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用本指令'),
    minInterval: Schema.number().default(1000).description('指令触发的冷却时间 (毫秒)'),
}).description('🎲 随机烂梗 指令');

// 🔫 开枪 —— 基础字段 + 模式互斥字段
const RouletteConfig: Schema<RouletteConfig> = Schema.intersect([
    Schema.object({
        enabled: Schema.boolean().default(false).description('是否启用本指令'),
        minInterval: Schema.number().default(600).description('指令触发的冷却时间 (毫秒)'),
        mode: Schema.union([
            Schema.const('probability').description('放回抽样（概率模式）：每次独立概率，空枪叠加时长'),
            Schema.const('sequence').description('不放回抽样（弹巢模式）：固定弹膛数，每次开枪减少一格，直至中弹'),
        ])
            .default('probability')
            .description('游戏模式'),
    }).description('🔫 开枪（俄罗斯轮盘赌）指令'),
    Schema.union([
        // —— 模式 A：放回抽样 ——
        Schema.object({
            mode: Schema.const('probability'),
            probability: Schema.number().min(0).max(1).step(0.01).default(0.2).description('每次中弹概率，0-1'),
            initTime: Schema.number().min(0).default(180).description('每轮初始禁言时间（秒），无上限。决定空枪文案 / 新一轮文案中 `{time}` `{seconds}` 的起始值'),
            timeStepMin: Schema.number().min(0).default(60).description('每次空枪后叠加的随机最小时间（秒），无上限。影响空枪文案中 `{time}` `{seconds}`'),
            timeStepMax: Schema.number().min(0).default(180).description('每次空枪后叠加的随机最大时间（秒），无上限。影响空枪文案中 `{time}` `{seconds}`'),
            msgHit: Schema.string()
                .role('textarea')
                .default('钢铁般的左键，无解的直架！{at} 被杀死了！')
                .description('中弹文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 本次禁言时长（格式化） | `{seconds}` 本次禁言秒数'),
            msgNewRound: Schema.string()
                .role('textarea')
                .default('加油吧{at} ，我们新加坡major干回来。下一轮初始禁言时长为{time}')
                .description('中弹后追加的新一轮文案（留空则不发）。可用占位符：`{at}` 艾特触发用户 | `{time}` 下一轮初始时长（格式化，取自 initTime） | `{seconds}` 下一轮初始秒数'),
            msgMiss: Schema.string()
                .role('textarea')
                .default('先瞄准再空枪。{at} 恭喜你躲过一劫！禁言时间将增加到{time}！')
                .description('空枪文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 下次若中弹的禁言时长（格式化） | `{seconds}` 下次若中弹的秒数'),
        }),
        // —— 模式 B：不放回抽样 ——
        Schema.object({
            mode: Schema.const('sequence').required(),
            chambers: Schema.number().min(1).default(6).description('弹巢格数（N 格中装 1 发子弹），无上限。对应占位符 `{total}`'),
            muteTime: Schema.number().min(0).default(300).description('中弹后禁言时间（秒），无上限。对应占位符 `{time}`（格式化后） / `{seconds}`（原始秒数）'),
            msgHit: Schema.string()
                .role('textarea')
                .default('Bang！第{chamber}/{total}枪抽中了！{at} 被杀死了！')
                .description(
                    '中弹文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 禁言时长（格式化，取自 muteTime） | `{seconds}` 禁言秒数 | `{chamber}` 中弹时是第几枪 | `{total}` 弹巢总格数（取自 chambers）'
                ),
            msgNewRound: Schema.string()
                .role('textarea')
                .default('弹巢重新装填完毕，共{total}格。')
                .description('中弹后追加的新一轮文案（留空则不发）。可用占位符：`{at}` 艾特触发用户 | `{total}` 新一轮弹巢总格数（取自 chambers）'),
            msgMiss: Schema.string()
                .role('textarea')
                .default('{at} 咔哒——空的。弹巢剩余{remaining}/{total}格……')
                .description('空枪文案。可用占位符：`{at}` 艾特触发用户 | `{chamber}` 刚开过的是第几枪 | `{remaining}` 本次开枪后剩余格数 | `{total}` 弹巢总格数（取自 chambers）'),
        }),
    ]),
]);

const SleepConfig: Schema<SleepConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用本指令'),
    minInterval: Schema.number().default(600).description('指令触发的冷却时间 (毫秒)'),
    minSeconds: Schema.number()
        .min(0)
        .default(6 * 60 * 60)
        .description('睡眠最短时长（秒），默认 6 小时，无上限。与 maxSeconds 共同决定占位符 `{time}` `{seconds}` 的随机区间下界'),
    maxSeconds: Schema.number()
        .min(0)
        .default(8 * 60 * 60)
        .description('睡眠最长时长（秒），默认 8 小时，无上限。与 minSeconds 共同决定占位符 `{time}` `{seconds}` 的随机区间上界'),
    msgSleep: Schema.string()
        .role('textarea')
        .default('{at} 好好睡觉，{time}后再醒来吧！')
        .description('睡觉文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 本次睡眠时长（格式化） | `{seconds}` 本次睡眠秒数'),
}).description('😴 睡觉 指令');

// 🔁 复读禁言 —— 被动监听器
const RepeatMuteConfig: Schema<RepeatMuteConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用本功能（关闭后不再监听群消息）'),
    guildMode: Schema.union([
        Schema.const('all').description('所有群都生效'),
        Schema.const('whitelist').description('白名单：仅下方群号列表生效'),
        Schema.const('blacklist').description('黑名单：仅下方群号列表外的群生效'),
    ])
        .default('all')
        .description('群生效范围模式'),
    guilds: Schema.array(Schema.string()).default([]).role('table').description('群号列表（白名单 / 黑名单模式下使用；选择"所有群"时此处填写内容不生效但会保留）'),
    minTimes: Schema.number().min(1).default(10).description('触发禁言所需的最少重复次数。对应占位符 `{times}`'),
    muteSeconds: Schema.number().min(1).default(60).description('基础禁言时长（秒），无上限。最终禁言时长 = 此值 × 随机倍率。对应占位符 `{baseSeconds}`'),
    maxDurationMultiplier: Schema.number().min(1).default(5).description('随机禁言倍率的上限（1 ~ 该值随机取整数），无上限。对应占位符 `{multiplier}`'),
    msgMute: Schema.string()
        .role('textarea')
        .default('检测到复读，已禁言{time}')
        .description(
            '触发禁言时的提示文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 本次禁言时长（格式化，如 `1小时5分钟`） | `{seconds}` 本次禁言秒数 | `{times}` 触发所需重复次数（取自 minTimes） | `{baseSeconds}` 基础禁言秒数（取自 muteSeconds） | `{multiplier}` 本次随机倍率'
        ),
}).description('🔁 复读禁言 · 被动监听群内刷屏并自动禁言');

// 🚿 刷屏禁言 —— 被动监听器
const SpamMuteConfig: Schema<SpamMuteConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用本功能（关闭后不再监听群消息）'),
    guildMode: Schema.union([
        Schema.const('all').description('所有群都生效'),
        Schema.const('whitelist').description('白名单：仅下方群号列表生效'),
        Schema.const('blacklist').description('黑名单：仅下方群号列表外的群生效'),
    ])
        .default('all')
        .description('群生效范围模式'),
    guilds: Schema.array(Schema.string()).default([]).role('table').description('群号列表（白名单 / 黑名单模式下使用；选择"所有群"时此处填写内容不生效但会保留）'),
    windowSeconds: Schema.number().min(1).default(6).description('【频率计数器】滑动时间窗口大小（秒），无上限。判定"最近 N 秒内"的 N。对应占位符 `{window}`'),
    threshold: Schema.number().min(2).default(5).description('【频率计数器】触发阈值：窗口内发送消息数达到该值即触发禁言。对应占位符 `{threshold}`'),
    muteSeconds: Schema.number().min(1).default(300).description('【频率计数器】触发后禁言时长（秒），无上限。对应占位符 `{time}`（格式化后） / `{seconds}`（原始秒数）'),
    msgMute: Schema.string()
        .role('textarea')
        .default('{at} 刷屏了！{window}秒内发送了{count}条消息，禁言{time}冷静一下。')
        .description(
            '【频率计数器】触发禁言时的提示文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 本次禁言时长（格式化） | `{seconds}` 本次禁言秒数 | `{count}` 本次窗口内实际消息数 | `{threshold}` 触发阈值（取自 threshold） | `{window}` 窗口秒数（取自 windowSeconds）'
        ),
    sameContentEnabled: Schema.boolean().default(false).description('【相同内容计数器】是否启用"连续发送相同内容"独立检测（与频率计数器互不影响，可单独开关）'),
    sameContentWindowSeconds: Schema.number()
        .min(1)
        .default(5 * 60)
        .description('【相同内容计数器】滑动时间窗口大小（秒），默认 300 秒（5 分钟），无上限。一旦用户发送了不同内容，本计数器会重置为新内容。对应占位符 `{window}`'),
    sameContentThreshold: Schema.number().min(2).default(5).description('【相同内容计数器】触发阈值：窗口内连续发送相同内容次数达到该值即触发禁言。对应占位符 `{threshold}`'),
    sameContentMuteSeconds: Schema.number()
        .min(1)
        .default(10 * 60)
        .description('【相同内容计数器】触发后禁言时长（秒），默认 600 秒（10 分钟），无上限。对应占位符 `{time}`（格式化后） / `{seconds}`（原始秒数）'),
    msgSameContentMute: Schema.string()
        .role('textarea')
        .default('{at} 刷屏了！{window}秒内连续发送了{count}条相同内容，禁言{time}冷静一下。')
        .description(
            '【相同内容计数器】触发禁言时的提示文案。可用占位符：`{at}` 艾特触发用户 | `{time}` 本次禁言时长（格式化） | `{seconds}` 本次禁言秒数 | `{count}` 本次窗口内连续相同内容数 | `{threshold}` 触发阈值（取自 sameContentThreshold） | `{window}` 窗口秒数（取自 sameContentWindowSeconds）'
        ),
}).description('🚿 刷屏禁言 · 按用户独立计数，含「频率」与「相同内容」两个互不干扰的检测器');

// 🗳️ 投票禁言指令
const VoteMuteConfig: Schema<VoteMuteConfig> = Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用投票禁言功能'),
    guildMode: Schema.union([Schema.const('all'), Schema.const('whitelist'), Schema.const('blacklist')])
        .default('all')
        .description('群生效范围模式'),
    guilds: Schema.array(Schema.string()).default([]).role('table').description('群号列表（白名单/黑名单模式下生效）'),
    muteNeedsVotes: Schema.number().min(1).default(5).description('禁言所需票数'),
    unmuteNeedsVotes: Schema.number().min(1).default(5).description('解禁所需票数'),
    muteSeconds: Schema.number()
        .min(1)
        .default(60 * 60 * 24) // 24小时
        .description('投票禁言时长（秒）'),
    enableUnmute: Schema.boolean().default(false).description('是否允许投票解禁管理员禁言用户'),
}).description('🗳️ 投票禁言/解禁指令');

// 顶层 Schema
export const Config: Schema<ConfigType> = Schema.object({
    search: SearchConfig,
    random: RandomConfig,
    roulette: RouletteConfig,
    sleep: SleepConfig,
    repeatMute: RepeatMuteConfig,
    spamMute: SpamMuteConfig,
    voteMute: VoteMuteConfig,
});
