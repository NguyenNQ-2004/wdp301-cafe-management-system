export function isSafeLocalPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const decoded = decodeURIComponent(value);
    return !decoded.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(decoded);
  } catch { return false; }
}
