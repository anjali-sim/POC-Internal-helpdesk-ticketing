import pino, { type LoggerOptions } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
};

if (!isProduction) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);
