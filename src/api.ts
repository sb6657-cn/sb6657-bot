import { Context } from 'koishi';
import type { searchMeme_req, searchMeme_res, RandomMeme, hotMemes_res } from './types/api';
import { Res, post, get } from './utils/request';

const BACK_END_URL = 'https://api.hguofichp.cn';

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

export async function getHotMemes24h(ctx: Context): Promise<Res<hotMemes_res[]>> {
    return await get(ctx, `${BACK_END_URL}/machine/hotBarrageOf24H`);
}
export async function getHotMemes7d(ctx: Context): Promise<Res<hotMemes_res[]>> {
    return await get(ctx, `${BACK_END_URL}/machine/hotBarrageOf7Day`);
}
