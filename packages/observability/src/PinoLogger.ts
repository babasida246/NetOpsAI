import { pino } from 'pino'
import type { ILogger, LogContext } from '@contracts/shared'

export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error'
    pretty?: boolean
}

export class PinoLogger implements ILogger {
    private logger: ReturnType<typeof pino>

    constructor(config: LoggerConfig) {
        this.logger = pino({
            level: config.level,
            transport: config.pretty ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            } : undefined
        })
    }

    info(message: string, context?: LogContext): void {
        this.logger.info(context || {}, message)
    }

    warn(message: string, context?: LogContext): void {
        this.logger.warn(context || {}, message)
    }

    error(message: string, context?: LogContext): void {
        this.logger.error(context || {}, message)
    }

    debug(message: string, context?: LogContext): void {
        this.logger.debug(context || {}, message)
    }

    child(context: LogContext): ILogger {
        const childLogger = this.logger.child(context)
        return {
            info: (msg, ctx) => childLogger.info(ctx || {}, msg),
            warn: (msg, ctx) => childLogger.warn(ctx || {}, msg),
            error: (msg, ctx) => childLogger.error(ctx || {}, msg),
            debug: (msg, ctx) => childLogger.debug(ctx || {}, msg)
        }
    }
}
