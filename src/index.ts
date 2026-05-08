import { Context } from 'koishi';
import { Config } from './config';
import type { ConfigType } from './types/config';

import { useSearchCommand } from './commands/search';
import { useRandomCommand } from './commands/random';
import { useRouletteCommand } from './commands/roulette';
import { useSleepCommand } from './commands/sleep';
import { useRepeatMuteCommand } from './commands/repeatMute';
import { useSpamMuteCommand } from './commands/spamMute';

export const name = 'sb6657-bot';
export { Config };

export function apply(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot');
    logger.info('sb6656烂梗机器人开始初始化');

    // 搜烂梗命令
    useSearchCommand(ctx, config);
    // 随机一条烂梗命令
    useRandomCommand(ctx, config);
    // 开枪（俄罗斯轮盘赌）命令
    useRouletteCommand(ctx, config);
    // 睡觉命令
    useSleepCommand(ctx, config);
    // 复读禁言（被动监听器）
    useRepeatMuteCommand(ctx, config);
    // 刷屏禁言（被动监听器）
    useSpamMuteCommand(ctx, config);
    // TODO 投稿命令

    // TODO 布雷德十五勇士命令
}
