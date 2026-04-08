import db from './database.js';
import { updateContact } from './venditore.js';
import { logger } from './logger.js';

export function handleWebhook(payload) {
  try {
    const { event, data } = payload;
    
    if (event !== 'message.received') {
      return;
    }

    const { phone, message, channelId, contactName } = data;
    
    if (!phone) {
      logger.warn('⚠️ Webhook recebido sem telefone');
      return;
    }

    // Normalizar telefone
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    // Buscar cliente
    const client = db.prepare('SELECT id FROM clients WHERE phone = ?').get(cleanPhone);
    
    if (client) {
      // Marcar como respondido
      db.prepare('UPDATE clients SET hasReplied = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(client.id);

      // Registrar mensagem recebida
      db.prepare(`
        INSERT INTO message_logs (clientId, phone, message, messageType, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(client.id, cleanPhone, message || '', 'received', 'received');

      // Tentar atualizar contato na Venditore (não crítico)
      updateContact(client.id, { hasReplied: true }).catch(() => {});

      logger.info(`✅ Mensagem recebida de ${cleanPhone}`);
    } else {
      logger.info(`ℹ️ Mensagem recebida de número não registrado: ${cleanPhone}`);
    }
  } catch (error) {
    logger.error('❌ Erro ao processar webhook:', error.message);
  }
}

export default { handleWebhook };
