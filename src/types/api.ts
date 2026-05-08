/** 烂梗搜索相关类型 */
// 0: 按id排序, 1: 按复制次数排序
export enum SortType {
    ID = 0,
    COPY = 1,
}
export interface searchMeme_req {
    barrage: string;
    tags?: string;
    submitTime?: [string, string];
    sort: SortType;
    pageSize: number;
    pageNum: number;
}
export interface searchMemeElement {
    id: number;
    barrage: string;
    cnt: string;
    tags: string;
    submitTime: string;
}
export interface searchMeme_res {
    total: number;
    list: searchMemeElement[];
    isLastPage: boolean;
}

/** 随机烂梗相关类型 */
export interface RandomMeme {
    tags: string;
    id: string;
    barrage: string;
    cnt: string;
    likes: string;
    submitTime: string;
}
