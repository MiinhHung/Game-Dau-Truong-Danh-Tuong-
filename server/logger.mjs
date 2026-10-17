/**
 * Logger tập trung cho máy chủ backend.
 */
export function formatLog(prefix, message) {
  const time = new Date().toLocaleTimeString('vi-VN');
  return `[${time}] [${prefix}] ${message}`;
}

export const serverLogger = {
  info: (msg) => console.log(formatLog('SERVER', msg)),
  warn: (msg) => console.warn(formatLog('WARN', msg)),
  error: (msg) => console.error(formatLog('ERROR', msg)),
};
