/**
 * 简单的模板字符串替换,支持 {key} 风格占位符
 * @example renderTemplate('你好 {name},剩余 {n} 次', { name: '小明', n: 3 })
 *          → '你好 小明,剩余 3 次'
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        const v = vars[key];
        return v === undefined ? `{${key}}` : String(v);
    });
}
