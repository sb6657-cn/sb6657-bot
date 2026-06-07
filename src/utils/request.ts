import { Context } from 'koishi';

interface Req<T> {
    url: string;
    data: T;
}
export interface Res<T> {
    flatData: T | null;
    err: any;
    _failure?: boolean;
}
interface BaseResponse<T = any> {
    code: number;
    msg: string;
    data: T;
}

// 后端用于统计请求来源
const REQUEST_OPTIONS = {
    headers: {
        dpahjdoiaw: 'qq_bot',
    },
};

/**
 * 核心请求工具 (扁平化错误处理)
 * * @description 内部已接管所有的 try...catch 和非 200 状态码判断。
 * 外部调用时不需要嵌套 try...catch。
 * 直接通过解构 { flatData, _failure } 进行流式判断即可。
 */
export async function post<REQ, RES = any>(ctx: Context, req: Req<REQ>): Promise<Res<RES>> {
    let result: Res<RES> = {
        flatData: null,
        err: null,
        _failure: false,
    };
    try {
        const res = await ctx.http.post<BaseResponse<RES>>(req.url, req.data, REQUEST_OPTIONS);
        if (res.code === 200) {
            result.flatData = res.data;
        } else {
            result._failure = true;
            result.err = res.msg || `API Error: Code ${res.code}`;
        }
    } catch (e: any) {
        result._failure = true;
        result.err = e;
    }
    return result;
}
export async function get<RES = any>(ctx: Context, url: string): Promise<Res<RES>> {
    let result: Res<RES> = {
        flatData: null,
        err: null,
        _failure: false,
    };
    try {
        const res = await ctx.http.get<BaseResponse<RES>>(url, REQUEST_OPTIONS);
        if (res.code === 200) {
            result.flatData = res.data;
        } else {
            result._failure = true;
            result.err = res.msg || `API Error: Code ${res.code}`;
        }
    } catch (e: any) {
        result._failure = true;
        result.err = e;
    }
    return result;
}
