import cron from 'node-cron';
import db from './database.js';
import { sendMessage, testConnection } from './venditore.js';
import { buildMessage, getMessageForPhase, MESSAGES } from './messages.js';
import { logger } from './logger.js';

const RATE_LIMIT_MS = 1500; // 1.5s entre envios

export function startScheduler() {
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    logger.info('⏸️ Scheduler desativado');
    return;
  }

  logger.info('🚀 Scheduler iniciado (Seg–Sex, America/Sao_Paulo)');

  // 09:00 — Matinal
  cron.schedule('0 9 * * 1-5', () => handleDispatch('manha'), { timezone: 'America/Sao_Paulo' });

  // 12:00 — Meio-dia (apenas days > 7)
  cron.schedule('0 12 * * 1-5', () => handleDispatch('meio_dia'), { timezone: 'America/Sao_Paulo' });

  // 15:00 — Vespertino
  cron.schedule('0 15 * * 1-5', () => handleDispatch('tarde'), { timezone: 'America/Sao_Paulo' });

  // 1h — Formalização + Desbloqueio (08–18h)
  cron.schedule('0 */1 8-18 * * 1-5', () => handleFormalizacaoDesbloqueio(), { timezone: 'America/Sao_Paulo' });

  // 30min — Loop desbloqueio (08–18h)
  cron.schedule('*/30 8-18 * * 1-5', () => handleDesbloqueioLoop(), { timezone: 'America/Sao_Paulo' });

  // 20:00 — Relatório diário
  cron.schedule('0 20 * * 1-5', () => handleRelatorio(), { timezone: 'America/Sao_Paulo' });
}

async function handleDispatch(period) {
  logger.info(`📤 Iniciando disparo ${period}...`);
  
  const clients = db.prepare(`
    SELECT * FROM clients 
    WHERE status = 'aguarda_retorno_saldo' 
    AND active = 1
  `).all();

  for (const client of clients) {
    const daysUntilReturn = Math.ceil((new Date(client.expectedReturnDate) - new Date()) / 86400000);
    
    // Validar fase
    if (period === 'meio_dia' && daysUntilReturn <= 7) continue;
    
    const message = getMessageForPhase(period, daysUntilReturn);
    if (!message) continue;

    const dispatchKey = `${new Date().toISOString().split('T')[0]}_${period}_${client.id}`;
    
    // Verificar duplicata
    const existing = db.prepare('SELECT id FROM message_logs WHERE dispatchKey = ?').get(dispatchKey);
    if (existing) {
      logger.info(`⏭️ Pulando ${client.phone} — já enviado hoje neste período`);
      continue;
    }

    const finalMessage = buildMessage(message, { ...client, daysUntilReturn });
    const result = await sendMessage(client.phone, finalMessage);

    db.prepare(`
      INSERT INTO message_logs (clientId, phone, message, messageType, dispatchKey, status, daysUntilReturn)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(client.id, client.phone, finalMessage, period, dispatchKey, result.success ? 'sent' : 'failed', daysUntilReturn);

    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  logger.info(`✅ Disparo ${period} concluído`);
}

async function handleFormalizacaoDesbloqueio() {
  logger.info('📋 Verificando formalização e desbloqueio...');

  // Formalização
  const formalizacao = db.prepare(`
    SELECT * FROM clients 
    WHERE status = 'pendente_formalizacao' 
    AND formalizacaoConcluida = 0 
    AND active = 1
  `).all();

  for (const client of formalizacao) {
    const message = buildMessage(MESSAGES.FORMALIZACAO, client);
    const result = await sendMessage(client.phone, message);
    
    db.prepare(`
      INSERT INTO message_logs (clientId, phone, message, messageType, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(client.id, client.phone, message, 'formalizacao', result.success ? 'sent' : 'failed');

    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  // Desbloqueio
  const desbloqueio = db.prepare(`
    SELECT * FROM clients 
    WHERE status = 'aguarda_desbloqueio' 
    AND desbloqueoConcluido = 0 
    AND active = 1
  `).all();

  for (const client of desbloqueio) {
    const message = buildMessage(MESSAGES.DESBLOQUEIO, client);
    const result = await sendMessage(client.phone, message);
    
    db.prepare(`
      INSERT INTO message_logs (clientId, phone, message, messageType, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(client.id, client.phone, message, 'desbloqueio', result.success ? 'sent' : 'failed');

    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  logger.info('✅ Formalização e desbloqueio verificados');
}

async function handleDesbloqueioLoop() {
  logger.info('🔄 Loop desbloqueio...');

  const blocked = db.prepare(`
    SELECT * FROM clients 
    WHERE benefitStatus = 'blocked' 
    AND active = 1
  `).all();

  for (const client of blocked) {
    const message = buildMessage(MESSAGES.DESBLOQUEIO, client);
    const result = await sendMessage(client.phone, message);
    
    db.prepare(`
      INSERT INTO message_logs (clientId, phone, message, messageType, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(client.id, client.phone, message, 'desbloqueio_loop', result.success ? 'sent' : 'failed');

    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  logger.info('✅ Loop desbloqueio concluído');
}

async function handleRelatorio() {
  logger.info('📊 Gerando relatório diário...');

  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count,
    responderam: db.prepare('SELECT COUNT(*) as count FROM clients WHERE hasReplied = 1 AND active = 1').get().count,
    desbloquearam: db.prepare('SELECT COUNT(*) as count FROM clients WHERE desbloqueoConcluido = 1 AND active = 1').get().count,
    enviados: db.prepare(`SELECT COUNT(*) as count FROM message_logs WHERE DATE(sentAt) = ?`).get(today).count,
    falhas: db.prepare(`SELECT COUNT(*) as count FROM message_logs WHERE DATE(sentAt) = ? AND status = 'failed'`).get(today).count,
  };

  const retornos = db.prepare(`
    SELECT name, proposta FROM clients 
    WHERE DATE(expectedReturnDate) = ? 
    AND active = 1
  `).all(today);

  let retornosLista = '';
  if (retornos.length > 0) {
    retornosLista = retornos.map(r => `• ${r.name} — ${r.proposta}`).join('\n');
  } else {
    retornosLista = '• Nenhum retorno previsto para hoje';
  }

  const relatorio = MESSAGES.RELATORIO
    .replace('{DATA}', new Date().toLocaleDateString('pt-BR'))
    .replace('{N_RETORNOS}', retornos.length)
    .replace('{RETORNOS_LISTA}', retornosLista)
    .replace('{N_RESPONDERAM}', stats.responderam)
    .replace('{N_DESBLOQUEARAM}', stats.desbloquearam)
    .replace('{N_TOTAL}', stats.total)
    .replace('{N_ENVIADOS}', stats.enviados)
    .replace('{N_FALHAS}', stats.falhas);

  await sendMessage(process.env.REPORT_NUMBER, relatorio);
  logger.info('✅ Relatório enviado');
}

export default { startScheduler };
