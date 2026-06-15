import { createLogger, format, transports } from 'winston';
import fs from 'fs';

if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

if (process.env.LOG_RESET === 'true') {
  fs.writeFileSync('./logs/error.log', '', 'utf8');
  fs.writeFileSync('./logs/test.log', '', 'utf8');
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
      )
    }),
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/test.log' })
  ]
});

export default logger;
