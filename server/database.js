import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/creditoja.db');

const db = new Database(dbPath);

// Habilitar WAL mode e foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criar tabelas se não existirem
export function initializeDatabase() {
  // Tabela de clientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      proposta TEXT,
      banco TEXT,
      status TEXT CHECK(status IN ('aguarda_retorno_saldo', 'aguarda_desbloqueio', 'pendente_formalizacao', 'aprovado', 'cancelado')) DEFAULT 'aguarda_retorno_saldo',
      gender TEXT CHECK(gender IN ('M', 'F')) DEFAULT 'M',
      expectedReturnDate DATETIME,
      notes TEXT,
      formalizacaoLink TEXT,
      formalizacaoConcluida INTEGER DEFAULT 0,
      desbloqueoConcluido INTEGER DEFAULT 0,
      benefitStatus TEXT CHECK(benefitStatus IN ('pending', 'blocked', 'unblocked')) DEFAULT 'pending',
      hasReplied INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabela de logs de mensagens
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      messageType TEXT,
      dispatchKey TEXT UNIQUE,
      status TEXT CHECK(status IN ('sent', 'failed', 'received')) DEFAULT 'sent',
      attempts INTEGER DEFAULT 1,
      errorMessage TEXT,
      sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      daysUntilReturn INTEGER,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );
  `);

  // Tabela de configurações
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Criar índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
    CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_message_logs_clientId ON message_logs(clientId);
    CREATE INDEX IF NOT EXISTS idx_message_logs_dispatchKey ON message_logs(dispatchKey);
  `);

  console.log('✅ Banco de dados SQLite inicializado');
}

export default db;
