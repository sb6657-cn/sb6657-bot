import { Context } from 'koishi';
import type { ConfigType } from '../types/config';
import { searchMemes } from '../api';

export function useSearchCommand(ctx: Context, config: ConfigType) {
    const logger = ctx.logger('sb6657-bot-search');
    const { search } = config;

    if (!search.enabled) {
        logger.info('搜烂梗 指令已被禁用,跳过注册');
        return;
    }

    const absoluteMax = search.customLimits.reduce((max, item) => Math.max(max, item.maxUsage), search.defaultMaxUsage);

    ctx.command('搜烂梗 <keyword:text>', '根据关键词搜索烂梗', {
        minInterval: search.minInterval,
        maxUsage: absoluteMax,
    })
        .userFields(['usage'])
        .alias('meme', '搜', 'search')
        .action(async ({ session }, keyword) => {
            if (!keyword || !keyword.trim()) return '请输入搜索关键词';
            if (!session || !session.user) return '无法获取用户信息，请重试';

            const customConfig = search.customLimits.find((c) => c.userId === session.userId);
            const currentLimit = customConfig ? customConfig.maxUsage : search.defaultMaxUsage;
            const todayUsage = (session.user.usage && session.user.usage['搜烂梗']) || 0;

            if (todayUsage >= currentLimit) {
                return `<at id="${session.userId}"/> 今天的 ${currentLimit} 次烂梗搜索额度已经用完，请静待0点刷新`;
            }

            const { flatData, _failure, err } = await searchMemes(ctx, keyword);
            if (_failure) {
                logger.error('网络请求炸了:', err);
                return `搜烂梗 后端接口炸了，请寻求维护者提供帮助。错误信息: ${err}`;
            }
            if (!flatData?.list?.length) {
                return `关键词「${keyword}」没有找到搜索结果。想要补充更多烂梗？请去sb6657首页投稿！`;
            }

            const rawText = flatData.list.map((item) => `${item.id}.\n${item.barrage}`).join('\n');
            if (rawText.length > 150) {
                const messageNodes = flatData.list.map((item) => `<message>${item.id}.\n${item.barrage}</message>`).join('');
                return `
                        <message><at id="${session.userId}"/> 关键词「${keyword.trim()}」结果字数较多,见聊天记录:</message>
                        <message forward>
                            ${messageNodes}
                        </message>`;
            } else {
                return `<at id="${session.userId}"/> 搜到了!关键词「${keyword.trim()}」结果如下：\n${rawText}`;
            }
        });
}
