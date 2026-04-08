import axios from 'axios';
import { logger } from './logger.js';

const baseURL = process.env.VENDITORE_BASE_URL || 'https://api.wts.chat';
const token = process.env.VENDITORE_TOKEN;
const channelId = process.env.VENDITORE_CHANNEL_ID;

const client = axios.create({
  baseURL,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

export async function sendMessage(phone, message) {
  try {
    // Normalizar telefone
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('55')) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '9' + cleanPhone; // Adicionar 9 para celular
    }
    cleanPhone = '55' + cleanPhone;

    const payload = {
      channelId,
      phone: cleanPhone,
      message,
      text: message
    };

    const response = await client.post('/v1/message/send-text', payload);
    
    logger.info(`✅ Mensagem enviada para ${cleanPhone}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.message);
    
    // Retry uma vez após 3 segundos
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          let cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.startsWith('55')) {
            cleanPhone = cleanPhone.substring(2);
          }
          if (cleanPhone.length === 10) {
            cleanPhone = '9' + cleanPhone;
          }
          cleanPhone = '55' + cleanPhone;

          const payload = {
            channelId,
            phone: cleanPhone,
            message,
            text: message
          };

          const response = await client.post('/v1/message/send-text', payload);
          logger.info(`✅ Mensagem reenviada com sucesso para ${cleanPhone}`);
          resolve({ success: true, data: response.data });
        } catch (retryError) {
          logger.error(`❌ Falha no retry para ${phone}:`, retryError.message);
          resolve({ success: false, error: retryError.message });
        }
      }, 3000);
    });
  }
}

export async function updateContact(contactId, data) {
  try {
    await client.patch(`/v1/contact/update`, {
      id: contactId,
      ...data
    });
    return true;
  } catch (error) {
    logger.warn(`⚠️ Erro ao atualizar contato ${contactId}:`, error.message);
    return false;
  }
}

export async function testConnection(testNumber) {
  try {
    const testMsg = `✅ *Crédito Já — Sistema Online*

⏰ ${new Date().toLocaleString('pt-BR')}

*Portabilidade Consignada — Automação ativa.*

📡 Canal: Venditore / WTS.chat
📋 Scheduler: ✅ Ativo (Seg–Sex)
🔗 Webhook: /webhook/venditore

_Sistema iniciado com sucesso. Fique com Deus. 🙏_`;

    const result = await sendMessage(testNumber, testMsg);
    return result.success;
  } catch (error) {
    logger.error('❌ Erro ao testar conexão:', error.message);
    return false;
  }
}

export default client;
