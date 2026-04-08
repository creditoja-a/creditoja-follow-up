import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initializeDatabase } from './database.js';
import { startScheduler } from './scheduler.js';
import { testConnection } from './venditore.js';
import { logger } from './logger.js';
import routes from './routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Rotas
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicialização
async function startup() {
  try {
    logger.info('🚀 Iniciando Crédito Já — Follow-up System');

    // Inicializar banco de dados
    initializeDatabase();

    // Iniciar scheduler
    startScheduler();

    // Enviar mensagens de teste
    const testNum1 = process.env.TEST_NUMBER;
    const testNum2 = process.env.REPORT_NUMBER;

    setTimeout(async () => {
      logger.info('📤 Enviando mensagens de teste...');
      
      if (testNum1) {
        await testConnection(testNum1);
        await new Promise(r => setTimeout(r, 1500));
      }
      
      if (testNum2 && testNum2 !== testNum1) {
        await testConnection(testNum2);
      }
    }, 1000);

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`✅ Servidor rodando na porta ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔗 Webhook: POST http://localhost:${PORT}/webhook/venditore`);
    });
  } catch (error) {
    logger.error('❌ Erro na inicialização:', error.message);
    process.exit(1);
  }
}

startup();
