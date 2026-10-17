/**
 * Module logging tập trung chuẩn doanh nghiệp cho client.
 * Hỗ trợ các cấp độ log (debug, info, warn, error) với định dạng rõ ràng.
 */
import { IS_DEV } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AppLogger {
  private prefix: string;

  constructor(prefix = '[Hồn Việt 3D]') {
    this.prefix = prefix;
  }

  debug(...args: unknown[]): void {
    if (IS_DEV) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args: unknown[]): void {
    console.info(this.prefix, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.prefix, ...args);
  }

  createChild(tag: string): AppLogger {
    return new AppLogger(`${this.prefix}[${tag}]`);
  }
}

export const logger = new AppLogger();
