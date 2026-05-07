export function formatBytes(bytes?: number | null) {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function calcSaving(
  originalSize?: number | null,
  outputSize?: number | null
) {
  if (!originalSize || !outputSize || originalSize === 0) {
    return null;
  }

  const saved = ((originalSize - outputSize) / originalSize) * 100;
  if (Number.isNaN(saved)) return null;

  return `${Math.max(0, saved).toFixed(0)}%`;
}
