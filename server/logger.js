import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

// Criar diretório de logs se não existir
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function formatLog(level, message, data = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message} ${data}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(logEntry.trim());
}

export const logger = {
  info: (msg, data) => formatLog('INFO', msg, data),
  warn: (msg, data) => formatLog('WARN', msg, data),
  error: (msg, data) => formatLog('ERROR', msg, data),
  debug: (msg, data) => formatLog('DEBUG', msg, data),
};

export function getLogs(limit = 500) {
  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(-limit);
  } catch {
    return [];
  }
}
