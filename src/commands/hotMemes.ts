import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import { getHotMemes24h, getHotMemes7d } from '../api';
import { getDisplayTags } from '../utils/tag';

export function useHotMemesCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-hot-memes');
    const { hotMemes } = config;

    if (!hotMemes.enabled) {
        logger.info('热门烂梗 指令已被禁用,跳过注册');
        return;
    }

    ctx.command('热门24h', '24小时热门烂梗', {
        minInterval: hotMemes.minInterval,
    })
        .alias('hot24h', '24h热门')
        .action(async ({ session }) => {
            if (!session || !session.user) return '无法获取用户信息，请重试';

            const { _failure, flatData, err } = await getHotMemes24h(ctx);
            if (_failure || !flatData?.[0]?.barrage) {
                logger.error('网络请求炸了:', err);
                return `24小时热门烂梗 后端接口炸了，请寻求维护者提供帮助。错误信息: ${err}`;
            }

            const messageHots = flatData
                .map((item) => {
                    return `<message>${item.barrage}\ntag: ${getDisplayTags(item.tags)
                        .map((t) => t.label)
                        .join(' ')}\n#${item.barrageId} - 复制数${item.cnt}</message>`;
                })
                .join('');

            return `
                <message><at id="${session.userId}"/> 当前24小时热门烂梗如下:</message>
                <message forward>
                    ${messageHots}
                </message>`;
        });

    ctx.command('热门7d', '7天热门烂梗', {
        minInterval: hotMemes.minInterval,
    })
        .alias('hot7d', '7d热门')
        .action(async ({ session }) => {
            if (!session || !session.user) return '无法获取用户信息，请重试';

            const { _failure, flatData, err } = await getHotMemes7d(ctx);
            if (_failure || !flatData?.[0]?.barrage) {
                logger.error('网络请求炸了:', err);
                return `7天热门烂梗 后端接口炸了，请寻求维护者提供帮助。错误信息: ${err}`;
            }

            const messageHots = flatData
                .map((item) => {
                    return `<message>${item.barrage}\ntag: ${getDisplayTags(item.tags)
                        .map((t) => t.label)
                        .join(' ')}\n#${item.barrageId} - 复制数${item.cnt}</message>`;
                })
                .join('');

            return `
                <message><at id="${session.userId}"/> 当前7天热门烂梗如下:</message>
                <message forward>
                    ${messageHots}
                </message>`;
        });
}
