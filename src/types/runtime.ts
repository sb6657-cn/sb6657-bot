// 各指令运行时（内存中）的状态类型。和配置类型分开：
// - types/config.ts 描述"用户在面板里填的配置"
// - types/runtime.ts 描述"指令执行过程中的中间状态"

// ===== 🔫 开枪 —— 运行时状态 =====

/** 放回抽样（概率模式）的群状态 */
export interface ProbStatus {
    kind: 'probability';
    /** 下一次中弹若触发时的禁言时长（秒） */
    time: number;
}

/** 不放回抽样（弹巢模式）的群状态 */
export interface SeqStatus {
    kind: 'sequence';
    /** 总格数 */
    total: number;
    /** 剩余格数（未开过的） */
    remaining: number;
    /** 子弹在剩余格中的位置（0 ~ remaining-1）。每次开枪会让"前面"的空格消失 */
    bulletIndex: number;
    /** 已开过的枪数（供文案用） */
    shotCount: number;
}

/** 单个群的开枪状态（两种模式二选一） */
export type GroupStatus = ProbStatus | SeqStatus;

// ===== 🔁 复读禁言 —— 运行时状态 =====

/** 单个子频道（cid）的复读计数状态 */
export interface RepeatState {
    /** 当前被重复的消息内容 */
    content: string;
    /** 已经被重复的次数 */
    times: number;
}

// ===== 🚿 刷屏禁言 —— 运行时状态 =====

/** 单个用户的发言时间戳滑动窗口（毫秒时间戳升序数组） */
export type SpamWindow = number[];
