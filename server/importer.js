import XLSX from 'xlsx';
import axios from 'axios';
import db from './database.js';
import { logger } from './logger.js';

const STATUS_MAP = {
  'aguarda retorno': 'aguarda_retorno_saldo',
  'aguarda_retorno': 'aguarda_retorno_saldo',
  'retorno saldo': 'aguarda_retorno_saldo',
  'aguarda desbloqueio': 'aguarda_desbloqueio',
  'desbloqueio': 'aguarda_desbloqueio',
  'pendente formalizacao': 'pendente_formalizacao',
  'formalização': 'pendente_formalizacao',
  'formalizar': 'pendente_formalizacao',
  'aprovado': 'aprovado',
  'aprovada': 'aprovado',
  'aprovados': 'aprovado',
  'cancelado': 'cancelado',
  'cancelada': 'cancelado',
};

function normalizePhone(phone) {
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('55')) clean = clean.substring(2);
  if (clean.length === 10) clean = '9' + clean;
  if (clean.length !== 11) return null;
  return '55' + clean;
}

function extractReturnDate(obs) {
  if (!obs) return null;
  const match = obs.match(/PREVIS[ÃA]O\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (match) {
    const [day, month, year] = match[1].split('/');
    return new Date(year, month - 1, day);
  }
  return null;
}

function extractLink(obs) {
  if (!obs) return null;
  const match = obs.match(/(https?:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

export async function importFromFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return importClients(data);
  } catch (error) {
    logger.error('❌ Erro ao importar arquivo:', error.message);
    throw error;
  }
}

export async function importFromGoogleSheets(sheetId, sheetName) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
    const response = await axios.get(url);
    
    const lines = response.data.split('\n');
    const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      data.push(row);
    }

    return importClients(data);
  } catch (error) {
    logger.error('❌ Erro ao importar Google Sheets:', error.message);
    throw error;
  }
}

function importClients(data) {
  const columnMap = {
    nome: ['nome', 'name', 'cliente', 'beneficiário'],
    telefone: ['telefone', 'phone', 'celular', 'whatsapp', 'fone'],
    cpf: ['cpf', 'documento'],
    proposta: ['proposta', 'número proposta', 'num proposta'],
    banco: ['banco', 'bank', 'instituição'],
    status: ['status', 'situação'],
    obs: ['obs', 'observação', 'observacoes', 'notes'],
  };

  function findColumn(row, aliases) {
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase().trim();
      if (aliases.some(a => keyLower.includes(a))) {
        return key;
      }
    }
    return null;
  }

  let imported = 0;
  let errors = 0;

  for (const row of data) {
    try {
      const nomeCol = findColumn(row, columnMap.nome);
      const telefoneCol = findColumn(row, columnMap.telefone);
      const cpfCol = findColumn(row, columnMap.cpf);
      const propostaCol = findColumn(row, columnMap.proposta);
      const bancoCol = findColumn(row, columnMap.banco);
      const statusCol = findColumn(row, columnMap.status);
      const obsCol = findColumn(row, columnMap.obs);

      const name = row[nomeCol]?.trim();
      const phone = normalizePhone(row[telefoneCol]);
      const cpf = row[cpfCol]?.replace(/\D/g, '');
      const proposta = row[propostaCol]?.trim();
      const banco = row[bancoCol]?.trim();
      const statusRaw = row[statusCol]?.trim().toLowerCase();
      const obs = row[obsCol]?.trim();

      if (!name || !phone || !cpf) continue;

      const status = STATUS_MAP[statusRaw] || 'aguarda_retorno_saldo';
      const expectedReturnDate = extractReturnDate(obs);
      const formalizacaoLink = extractLink(obs);

      db.prepare(`
        INSERT INTO clients (name, phone, cpf, proposta, banco, status, expectedReturnDate, notes, formalizacaoLink)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cpf) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          proposta = excluded.proposta,
          banco = excluded.banco,
          status = excluded.status,
          expectedReturnDate = excluded.expectedReturnDate,
          formalizacaoLink = excluded.formalizacaoLink,
          updatedAt = CURRENT_TIMESTAMP
      `).run(name, phone, cpf, proposta, banco, status, expectedReturnDate, obs, formalizacaoLink);

      imported++;
    } catch (error) {
      logger.error('❌ Erro ao importar linha:', error.message);
      errors++;
    }
  }

  logger.info(`✅ Importação concluída: ${imported} clientes | ${errors} erros`);
  return { imported, errors };
}

export default { importFromFile, importFromGoogleSheets };
