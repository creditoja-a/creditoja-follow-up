# Crédito Já — Follow-up System

Sistema de automação de acompanhamento de portabilidade consignada via WhatsApp.

## 🚀 Stack

- **Node.js** + Express
- **SQLite** (better-sqlite3, WAL mode)
- **node-cron** (timezone: America/Sao_Paulo)
- **Venditore/WTS.chat** (canal único de envio)
- **Dashboard** HTML/CSS/JS puro (SPA)

## 📋 Estrutura

```
creditoja-follow-up/
├── server/
│   ├── index.js           # Servidor principal
│   ├── database.js        # SQLite + schemas
│   ├── venditore.js       # Integração WTS.chat
│   ├── scheduler.js       # Agendamentos (cron)
│   ├── messages.js        # Templates de mensagens
│   ├── importer.js        # Importação de planilhas
│   ├── webhook.js         # Webhook de recebimento
│   ├── routes.js          # API REST
│   └── logger.js          # Logs estruturados
├── public/
│   └── index.html         # Dashboard SPA
├── data/                  # Banco de dados (criado automaticamente)
├── logs/                  # Logs diários (criado automaticamente)
├── package.json
├── .env
└── README.md
```

## ⚙️ Variáveis de Ambiente

```
PORT=3000
VENDITORE_BASE_URL=https://api.wts.chat
VENDITORE_TOKEN=pn_Jom6D38diA4WLqkhgiUh6FXyHBjjqlWjo47Yw2yx78
VENDITORE_CHANNEL_ID=59452a79-9f88-4bbe-9fb7-3f6ef00ae596
TEST_NUMBER=5511952756127
REPORT_NUMBER=5511952756127
SCHEDULER_ENABLED=true
```

## 🗄️ Banco de Dados

### Tabela: clients
- `id` (PK)
- `name`, `phone` (UNIQUE), `cpf` (UNIQUE)
- `proposta`, `banco`
- `status` (enum: aguarda_retorno_saldo | aguarda_desbloqueio | pendente_formalizacao | aprovado | cancelado)
- `expectedReturnDate`, `formalizacaoLink`
- `formalizacaoConcluida`, `desbloqueoConcluido`
- `hasReplied`, `active`
- `createdAt`, `updatedAt`

### Tabela: message_logs
- `id` (PK)
- `clientId` (FK)
- `phone`, `message`, `messageType`
- `dispatchKey` (UNIQUE) — anti-duplicata
- `status` (sent | failed | received)
- `sentAt`, `daysUntilReturn`

## 📅 Scheduler (Seg–Fri, 08:00–18:00)

| Horário | Ação | Condição |
|---------|------|----------|
| 09:00 | Matinal | Todos os dias úteis |
| 12:00 | Meio-dia | Apenas days > 7 |
| 15:00 | Vespertino | Todos os dias úteis |
| 1h | Formalização + Desbloqueio | 08–18h |
| 30min | Loop desbloqueio | 08–18h, benefitStatus=blocked |
| 20:00 | Relatório diário | Todos os dias úteis |

## 📱 Lógica de Fases

```
daysUntilReturn = ceil((expectedReturnDate - hoje) / 86400000)

days <= 0     → DIA DO RETORNO (mensagem especial)
days == 1     → RETORNO AMANHÃ (mensagem especial)
days 2–7      → FASE CRÍTICA (09h e 15h — SEM meio-dia)
days > 7      → FASE INICIAL (09h, 12h e 15h)
```

## 🔗 API REST

### Stats
```
GET /api/stats
```

### Clientes
```
GET /api/clients?status=&search=
GET /api/clients/:id
PATCH /api/clients/:id
```

### Mensagens
```
GET /api/messages?limit=100
```

### Importação
```
POST /api/import/file (multipart: field "file")
POST /api/import/sheets (body: { sheetId, sheetName })
```

### Envio Manual
```
POST /api/send (body: { phone, message })
```

### Status
```
GET /api/status
```

### Configuração
```
GET /api/config
PUT /api/config (body: { key, value })
```

### Testes
```
POST /api/test-connection
```

### Logs
```
GET /api/logs
```

## 🪝 Webhook

```
POST /webhook/venditore
POST /webhook (alias)

Payload: { event, data: { phone, message, channelId, contactName } }
```

Ao receber:
1. Extrai `phone`
2. Busca cliente no banco
3. Marca `hasReplied = 1`
4. Insere em `message_logs`

## 📊 Dashboard

- **Dashboard**: Stats em tempo real + últimas mensagens
- **Clientes**: Busca, filtro por status, edição
- **Mensagens**: Histórico completo
- **Importar**: Upload de XLSX/CSV ou Google Sheets
- **Logs**: Últimas 500 linhas coloridas
- **Configurações**: Tokens, números, scheduler toggle

## 🚀 Inicialização

```bash
npm install
npm start
```

Ao iniciar:
1. SQLite criado em `/data/creditoja.db`
2. Scheduler ativado
3. Mensagens de teste enviadas
4. Express na porta 3000

## 📤 Importação de Planilhas

Aceita: XLSX, CSV, Google Sheets

Colunas aceitas (case-insensitive):
- `nome`, `name`, `cliente`, `beneficiário`
- `telefone`, `phone`, `celular`, `whatsapp`, `fone`
- `cpf`, `documento`
- `proposta`, `número proposta`
- `banco`, `bank`, `instituição`
- `status`, `situação`
- `obs`, `observação`, `notes`

Extração automática do OBS:
- Data retorno: `PREVISÃO - DD/MM/YYYY` ou `PREVISAO - DD/MM/YYYY`
- Link formalização: qualquer URL `https://...`

Mapeamento de status:
- `aguarda retorno/aguarda_retorno/retorno saldo` → `aguarda_retorno_saldo`
- `aguarda desbloqueio/desbloqueio` → `aguarda_desbloqueio`
- `pendente formalizacao/formalização/formalizar` → `pendente_formalizacao`
- `aprovado/aprovada/aprovados` → `aprovado`
- `cancelado/cancelada` → `cancelado`

## ⚠️ Regras Absolutas

✅ Canal único: Venditore/WTS.chat
✅ Anti-duplicata obrigatória por `dispatchKey`
✅ Retry 1x após 3s em caso de falha
✅ Rate limit 1.5s entre envios
✅ Scheduler apenas Seg–Sex (America/Sao_Paulo)
✅ Upsert por CPF na importação
✅ Webhook responde 200 imediatamente
✅ Volume persistente no Railway: `/app/data`

❌ NUNCA Z-API
❌ NUNCA alterar texto das mensagens
❌ NUNCA enviar duplicado no mesmo dia/período
❌ NUNCA enviar fora do horário comercial (exceto relatório 20h)

## 📝 Mensagens

Todas as mensagens possuem templates exatos com placeholders:
- `{Sr./Sra.}` — Detectado automaticamente pelo primeiro nome
- `{PRIMEIRO_NOME}` — Primeiro nome do cliente
- `{PROPOSTA}` — Número da proposta
- `{BANCO}` — Nome do banco
- `{DIAS}` — Dias até retorno
- `{LINK_FORMALIZACAO}` — Link para assinar

## 🔧 Troubleshooting

**Mensagens não estão sendo enviadas:**
- Verificar `VENDITORE_TOKEN` e `VENDITORE_CHANNEL_ID`
- Verificar se `SCHEDULER_ENABLED=true`
- Checar logs em `/logs/`

**Webhook não está recebendo:**
- Verificar se URL está correta: `POST /webhook/venditore`
- Verificar se resposta é 200 OK

**Importação falhando:**
- Verificar formato das colunas (case-insensitive)
- Verificar se telefone tem 10 ou 11 dígitos
- Verificar se CPF é válido

## 📞 Suporte

Para dúvidas ou problemas, consulte os logs em `/logs/` ou acesse o dashboard em `http://localhost:3000`.

---

**Crédito Já — Portabilidade Consignada**
_Fique com Deus. 🙏_
