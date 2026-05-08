// 简单格式化时间，把类似2025-01-01T12:00:00.000Z 格式化成2025-01-01 12:00:00
export function easyFormatTime(string: string | undefined) {
    if (!string) return '';
    return string.replace('T', ' ').split('.')[0];
}

/**
 * 把秒数格式化为「X 小时 Y 分 Z 秒」可读形式
 * @example formatDuration(90) → "01 分 30 秒"
 */
export function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    if (s < 60) {
        return `${s.toString().padStart(2, '0')} 秒`;
    }
    if (s < 3600) {
        const minutes = Math.floor(s / 60);
        const remainingSeconds = s % 60;
        return `${minutes.toString().padStart(2, '0')} 分 ${remainingSeconds.toString().padStart(2, '0')} 秒`;
    }
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const remainingSeconds = s % 60;
    return `${hours.toString().padStart(2, '0')} 小时 ${minutes.toString().padStart(2, '0')} 分 ${remainingSeconds.toString().padStart(2, '0')} 秒`;
}
