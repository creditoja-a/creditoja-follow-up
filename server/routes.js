import express from 'express';
import multer from 'multer';
import db from './database.js';
import { sendMessage, testConnection } from './venditore.js';
import { importFromFile, importFromGoogleSheets } from './importer.js';
import { handleWebhook } from './webhook.js';
import { getLogs } from './logger.js';
import { logger } from './logger.js';

const router = express.Router();
const upload = multer({ dest: '/tmp' });

// ============================================================
// WEBHOOK
// ============================================================
router.post('/webhook/venditore', (req, res) => {
  res.status(200).json({ ok: true });
  handleWebhook(req.body);
});

router.post('/webhook', (req, res) => {
  res.status(200).json({ ok: true });
  handleWebhook(req.body);
});

// ============================================================
// STATS
// ============================================================
router.get('/api/stats', (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count,
    aguarda_retorno: db.prepare('SELECT COUNT(*) as count FROM clients WHERE status = "aguarda_retorno_saldo" AND active = 1').get().count,
    retorno_hoje: db.prepare(`SELECT COUNT(*) as count FROM clients WHERE DATE(expectedReturnDate) = DATE('now') AND active = 1`).get().count,
    pendente_formalizacao: db.prepare('SELECT COUNT(*) as count FROM clients WHERE status = "pendente_formalizacao" AND formalizacaoConcluida = 0 AND active = 1').get().count,
    enviadas_hoje: db.prepare(`SELECT COUNT(*) as count FROM message_logs WHERE DATE(sentAt) = DATE('now') AND status = 'sent'`).get().count,
    falhas_hoje: db.prepare(`SELECT COUNT(*) as count FROM message_logs WHERE DATE(sentAt) = DATE('now') AND status = 'failed'`).get().count,
  };
  res.json(stats);
});

// ============================================================
// CLIENTES
// ============================================================
router.get('/api/clients', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM clients WHERE active = 1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR cpf LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY createdAt DESC LIMIT 100';
  const clients = db.prepare(query).all(...params);
  res.json(clients);
});

router.get('/api/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const messages = db.prepare('SELECT * FROM message_logs WHERE clientId = ? ORDER BY sentAt DESC LIMIT 50').all(client.id);
  res.json({ ...client, messages });
});

router.patch('/api/clients/:id', (req, res) => {
  const { status, formalizacaoConcluida, desbloqueoConcluido, hasReplied, expectedReturnDate, active, notes, formalizacaoLink } = req.body;

  const updates = [];
  const values = [];

  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (formalizacaoConcluida !== undefined) { updates.push('formalizacaoConcluida = ?'); values.push(formalizacaoConcluida); }
  if (desbloqueoConcluido !== undefined) { updates.push('desbloqueoConcluido = ?'); values.push(desbloqueoConcluido); }
  if (hasReplied !== undefined) { updates.push('hasReplied = ?'); values.push(hasReplied); }
  if (expectedReturnDate !== undefined) { updates.push('expectedReturnDate = ?'); values.push(expectedReturnDate); }
  if (active !== undefined) { updates.push('active = ?'); values.push(active); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (formalizacaoLink !== undefined) { updates.push('formalizacaoLink = ?'); values.push(formalizacaoLink); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// ============================================================
// MENSAGENS
// ============================================================
router.get('/api/messages', (req, res) => {
  const { limit = 100 } = req.query;
  const messages = db.prepare('SELECT * FROM message_logs ORDER BY sentAt DESC LIMIT ?').all(parseInt(limit));
  res.json(messages);
});

// ============================================================
// IMPORTAÇÃO
// ============================================================
router.post('/api/import/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não fornecido' });
    const result = await importFromFile(req.file.path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/import/sheets', async (req, res) => {
  try {
    const { sheetId, sheetName } = req.body;
    if (!sheetId || !sheetName) return res.status(400).json({ error: 'sheetId e sheetName obrigatórios' });
    const result = await importFromGoogleSheets(sheetId, sheetName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENVIO MANUAL
// ============================================================
router.post('/api/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone e message obrigatórios' });
    const result = await sendMessage(phone, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STATUS
// ============================================================
router.get('/api/status', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'online',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    scheduler: process.env.SCHEDULER_ENABLED === 'true' ? 'ativo' : 'desativado',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// CONFIG
// ============================================================
router.get('/api/config', (req, res) => {
  const config = db.prepare('SELECT * FROM config').all();
  res.json(Object.fromEntries(config.map(c => [c.key, c.value])));
});

router.put('/api/config', (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key e value obrigatórios' });

  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
  res.json({ ok: true });
});

// ============================================================
// TESTES
// ============================================================
router.post('/api/test-connection', async (req, res) => {
  try {
    const testNum = process.env.TEST_NUMBER;
    const success = await testConnection(testNum);
    res.json({ success, testNumber: testNum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LOGS
// ============================================================
router.get('/api/logs', (req, res) => {
  const logs = getLogs(500);
  res.json(logs);
});

export default router;
