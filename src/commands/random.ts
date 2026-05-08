import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import { getRandomMeme } from '../api';
import { easyFormatTime } from '../utils/day';
import { getDisplayTags } from '../utils/tag';

export function useRandomCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-random');
    const { random } = config;

    if (!random.enabled) {
        logger.info('随机烂梗 指令已被禁用,跳过注册');
        return;
    }

    ctx.command('随机', '随机一条烂梗', {
        minInterval: random.minInterval,
    })
        .alias('random', '随机烂梗', '抽烂梗')
        .action(async ({ session }) => {
            if (!session || !session.user) return '无法获取用户信息，请重试';

            const { flatData, _failure, err } = await getRandomMeme(ctx);
            if (_failure || !flatData?.barrage) {
                logger.error('网络请求炸了:', err);
                return `随机烂梗 后端接口炸了，请寻求维护者提供帮助。错误信息: ${err}`;
            }
            return `<at id="${session.userId}"/>:
${flatData.barrage}
tag: ${getDisplayTags(flatData.tags)
                .map((t) => t.label)
                .join(' ')}
#${flatData.id} - 复制数${flatData.cnt}
投稿时间${easyFormatTime(flatData.submitTime)}`;
        });
}
