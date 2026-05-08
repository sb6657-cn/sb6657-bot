import { Context } from 'koishi';
import type { searchMeme_req, searchMeme_res, RandomMeme } from './types/api';
import { Res, post, get } from './utils/request';

const BACK_END_URL = 'https://hguofichp.cn:10086';

export async function searchMemes(ctx: Context, keyword: string): Promise<Res<searchMeme_res>> {
    const payload: searchMeme_req = {
        barrage: keyword.trim(),
        pageNum: 1,
        pageSize: 5,
        sort: 1,
    };
    return await post<searchMeme_req, searchMeme_res>(ctx, {
        url: `${BACK_END_URL}/machine/pageSearch`,
        data: payload,
    });
}

export async function getRandomMeme(ctx: Context): Promise<Res<RandomMeme>> {
    return await get(ctx, `${BACK_END_URL}/machine/getRandOne`);
}
