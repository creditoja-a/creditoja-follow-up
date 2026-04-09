import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// ROTAS SIMPLES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    total: 0,
    aguarda_retorno: 0,
    retorno_hoje: 0,
    pendente_formalizacao: 0,
    enviadas_hoje: 0,
    falhas_hoje: 0,
  });
});

// Clientes
app.get('/api/clients', (req, res) => {
  res.json([]);
});

app.post('/api/clients', (req, res) => {
  res.json({ ok: true, id: Date.now() });
});

// Mensagens
app.get('/api/messages', (req, res) => {
  res.json([]);
});

// Enviar mensagem
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message obrigatórios' });
  }

  try {
    // Simular envio via Venditore
    const token = process.env.VENDITORE_TOKEN;
    const channelId = process.env.VENDITORE_CHANNEL_ID;
    const baseUrl = process.env.VENDITORE_BASE_URL || 'https://api.wts.chat';

    const response = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message,
        channelId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      res.json({ success: true, data });
    } else {
      res.status(400).json({ error: data.message || 'Erro ao enviar' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook
app.post('/webhook/venditore', (req, res) => {
  res.status(200).json({ ok: true });
  console.log('📨 Webhook recebido:', req.body);
});

app.post('/webhook', (req, res) => {
  res.status(200).json({ ok: true });
  console.log('📨 Webhook recebido:', req.body);
});

// Importar
app.post('/api/import/file', (req, res) => {
  res.json({ imported: 0, errors: 0 });
});

app.post('/api/import/sheets', (req, res) => {
  res.json({ imported: 0, errors: 0 });
});

// Logs
app.get('/api/logs', (req, res) => {
  res.json(['[INFO] Sistema iniciado', '[INFO] Pronto para receber mensagens']);
});

// Config
app.get('/api/config', (req, res) => {
  res.json({
    VENDITORE_TOKEN: process.env.VENDITORE_TOKEN ? '***' : 'não configurado',
    SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED || 'true',
  });
});

app.put('/api/config', (req, res) => {
  res.json({ ok: true });
});

// Status
app.get('/api/status', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'online',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    scheduler: process.env.SCHEDULER_ENABLED === 'true' ? 'ativo' : 'desativado',
    timestamp: new Date().toISOString()
  });
});

// Test connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const testNum = process.env.TEST_NUMBER;
    const token = process.env.VENDITORE_TOKEN;
    const channelId = process.env.VENDITORE_CHANNEL_ID;
    const baseUrl = process.env.VENDITORE_BASE_URL || 'https://api.wts.chat';

    const response = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: testNum,
        message: '✅ Teste de conexão Follow-up System - Crédito Já',
        channelId,
      }),
    });

    const success = response.ok;
    res.json({ success, testNumber: testNum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 Webhook: POST http://localhost:${PORT}/webhook/venditore`);
  console.log(`📡 API: http://localhost:${PORT}/api/stats`);
});
