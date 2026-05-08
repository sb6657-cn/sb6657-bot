// 简单格式化时间，把类似2025-01-01T12:00:00.000Z 格式化成2025-01-01 12:00:00
export function easyFormatTime(string: string | undefined) {
    if (!string) return '';
    return string.replace('T', ' ').split('.')[0];
}

/**
 * 把秒数格式化为「X小时Y分钟Z秒」可读形式，省略为 0 的单位
 * @example formatDuration(90) → "1分钟30秒"
 * @example formatDuration(3900) → "1小时5分钟"
 * @example formatDuration(3630) → "1小时30秒"
 */
export function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const remainingSeconds = s % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}秒`);

    if (parts.length === 0) return '0秒';
    return parts.join('');
}
