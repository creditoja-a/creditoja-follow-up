// Detecção de gênero por primeiro nome
const femaleNames = [
  'maria', 'ana', 'rosa', 'silva', 'santos', 'oliveira', 'costa', 'sousa', 'gomes', 'martins',
  'fernanda', 'carla', 'paula', 'sandra', 'patricia', 'barbara', 'carolina', 'daniela', 'gabriela',
  'jessica', 'juliana', 'mariana', 'monica', 'natalia', 'patricia', 'priscila', 'rafaela', 'renata',
  'roberta', 'rosana', 'rosangela', 'roseane', 'roseli', 'rosemeire', 'rosena', 'rosenir', 'rosenita'
];

function detectGender(name) {
  if (!name) return 'Sr.';
  const firstName = name.split(' ')[0].toLowerCase();
  return femaleNames.includes(firstName) ? 'Sra.' : 'Sr.';
}

function getFirstName(name) {
  return name ? name.split(' ')[0] : 'Cliente';
}

export function buildMessage(template, client) {
  const gender = detectGender(client.name);
  const firstName = getFirstName(client.name);
  const dias = client.daysUntilReturn || 0;
  
  return template
    .replace('{Sr./Sra.}', gender)
    .replace('{PRIMEIRO_NOME}', firstName)
    .replace('{PROPOSTA}', client.proposta || 'N/A')
    .replace('{BANCO}', client.banco || 'N/A')
    .replace('{DIAS}', dias)
    .replace('{LINK_FORMALIZACAO}', client.formalizacaoLink || '')
    .replace('{LINK}', client.formalizacaoLink || '');
}

// MENSAGENS EXATAS — NÃO ALTERAR
export const MESSAGES = {
  // FASE INICIAL
  INICIAL_09H: `Bom dia {Sr./Sra.} {PRIMEIRO_NOME}, que você tenha um dia abençoado. Que Deus e Jesus te protejam e à sua família. 🙏

Estamos acompanhando de perto a sua portabilidade realizada com a *Crédito Já*, proposta *{PROPOSTA}* no banco *{BANCO}*.

Ainda não recebemos retorno do banco, mas o processo está em andamento normalmente.

⚠️ *Atenção importante:* Não tente fazer portabilidade em outro lugar. O seu processo já está em andamento conosco e qualquer tentativa em outro banco pode *bloquear o seu benefício* e cancelar tudo.

*NÃO atenda ligações de números desconhecidos.* Quando precisarmos ligar para você, avisaremos com antecedência.

Fique com Deus e tenha um dia abençoado. 🙏`,

  INICIAL_12H: `Olá {Sr./Sra.} {PRIMEIRO_NOME}, espero que seu dia esteja abençoado e cheio da presença de Deus. 🌟

Estamos entrando em contato novamente sobre a sua portabilidade *Crédito Já*, proposta *{PROPOSTA}* no banco *{BANCO}*.

Ainda não temos retorno do banco — isso é normal, o processo leva de 5 a 7 dias úteis.

⚠️ *Muito importante:* NÃO tente fazer portabilidade em outro lugar. O seu processo já está em andamento conosco e qualquer movimentação em outro banco pode *bloquear o seu benefício* e cancelar a sua operação.

Se o banco ligar oferecendo condições melhores, diga NÃO. Eles só querem manter você pagando juros mais altos.

Que Deus abençoe você e sua família. 🙏`,

  INICIAL_15H: `Boa tarde {Sr./Sra.} {PRIMEIRO_NOME}, espero que você e sua família estejam bem e protegidos por Deus. ☀️

Atualizando você sobre a portabilidade *Crédito Já*, proposta *{PROPOSTA}* no banco *{BANCO}* — ainda aguardamos retorno do banco hoje.

Amanhã entraremos em contato novamente com mais informações.

⚠️ *Não tente fazer portabilidade em outro lugar.* O processo já está em andamento conosco e qualquer tentativa em outro banco pode *bloquear o seu benefício*.

*NÃO atenda ligações desconhecidas* e não aceite nada do banco.

Tenha uma tarde abençoada. Fique com Deus. 🙏`,

  // FASE CRÍTICA
  CRITICA_09H: `Bom dia {Sr./Sra.} {PRIMEIRO_NOME}, que Deus e Jesus abençoem o seu dia e a sua família. 🙏

Estamos chegando muito perto da data de retorno do seu saldo — *faltam {DIAS} dia(s)* para a proposta *{PROPOSTA}* no banco *{BANCO}*.

Precisamos confirmar algo importante: *você sabe como desbloquear o seu benefício?*

Se tiver alguma dificuldade, nos avise agora para que possamos te ajudar passo a passo e evitar deixar tudo para a última hora.

Se precisar, peça a um filho(a), amigo(a) ou familiar para estar com você no dia — para não perder essa oportunidade.

⚠️ *Não tente fazer portabilidade em outro lugar.* O processo já está em andamento conosco e qualquer tentativa em outro banco pode *bloquear o seu benefício* e cancelar tudo.

*NÃO atenda ligações desconhecidas* e não aceite nada do banco.

Fique com Deus, estamos aqui com você. 🙏`,

  CRITICA_15H: `Olá {Sr./Sra.} {PRIMEIRO_NOME}, espero que esteja tendo um dia abençoado com Deus e sua família. 🙏

Atualizando sobre a proposta *{PROPOSTA}* no banco *{BANCO}* — *faltam {DIAS} dia(s)* para o retorno do seu saldo.

Precisamos confirmar: *você já desbloqueou o seu benefício?*

• Se não, você sabe como fazer? Precisa de ajuda? Nos fale agora para que possamos te auxiliar.
• Se sim, nos envie o extrato para confirmarmos.

Esse passo é muito importante e não pode ser deixado para a última hora.

⚠️ *Não tente fazer portabilidade em outro lugar.* Qualquer movimentação em outro banco pode *bloquear o seu benefício* e cancelar a operação da Crédito Já.

*No dia do retorno, você terá apenas 2 horas para assinar.*

Fique com Deus e conte conosco. 🙏`,

  // RETORNO AMANHÃ
  RETORNO_AMANHA: `Bom dia {Sr./Sra.} {PRIMEIRO_NOME}, que Deus abençoe você e sua família. 🙏

*Atenção: amanhã é o dia do retorno do seu saldo!* 🎉

Proposta *{PROPOSTA}* no banco *{BANCO}* — a Crédito Já está acompanhando tudo de perto.

Precisamos confirmar: *você já desbloqueou o seu benefício?* Se ainda não desbloqueou, faça hoje mesmo para não perder o prazo.

Se precisar de ajuda com o desbloqueio, nos chame agora. Se possível, tenha um familiar por perto amanhã para te ajudar caso precise.

⚠️ *Não tente fazer portabilidade em outro lugar.* O processo já está em andamento conosco e qualquer tentativa em outro banco pode *bloquear o seu benefício* e cancelar tudo.

*NÃO atenda ligações desconhecidas* e não aceite nada do banco — eles vão tentar te convencer a ficar.

Estamos com você. Fique com Deus! 🙏`,

  // DIA DO RETORNO
  DIA_RETORNO: `Bom dia {Sr./Sra.} {PRIMEIRO_NOME}, que Deus abençoe você e sua família. 🙏

*Hoje é o dia do retorno do seu saldo!* 🎉

Proposta *{PROPOSTA}* no banco *{BANCO}* — estamos acompanhando tudo em tempo real.

Por favor, fique disponível e em um local com sinal.

Você terá apenas *2 horas para assinar* após o retorno.

Se precisar, tenha um familiar por perto para te ajudar.

⚠️ *NÃO atenda ligações desconhecidas* e *NÃO aceite nada do banco*. Eles tentarão te convencer a ficar — não caia nessa.

Estamos com você. Fique com Deus! 🙏`,

  // FORMALIZAÇÃO
  FORMALIZACAO: `Olá {Sr./Sra.} {PRIMEIRO_NOME}, que Deus abençoe você e sua família. 🙏

*Você ainda não formalizou a sua portabilidade Crédito Já.* Faça o quanto antes para não perder o valor liberado hoje.

📋 Proposta: *{PROPOSTA}* | Banco: *{BANCO}*

Acesse o link abaixo para assinar agora:
{LINK_FORMALIZACAO}

⚠️ *Não deixe para depois* — o prazo é limitado e o valor pode ser cancelado.

⚠️ *Não tente fazer portabilidade em outro lugar.* Qualquer tentativa em outro banco pode *bloquear o seu benefício*.

Estamos aqui para te ajudar. Fique com Deus. 🙏`,

  // DESBLOQUEIO
  DESBLOQUEIO: `Olá {Sr./Sra.} {PRIMEIRO_NOME}, que Deus abençoe você e sua família. 🙏

Estamos acompanhando a sua portabilidade *Crédito Já*, proposta *{PROPOSTA}* no banco *{BANCO}*.

*Você já conseguiu desbloquear o seu benefício?*

Se ainda não desbloqueou, precisamos que faça isso o quanto antes para não perder o valor liberado. Podemos te ajudar passo a passo — é só nos chamar.

Após desbloquear, acesse o link para assinar: {LINK}

⚠️ *Não tente fazer portabilidade em outro lugar.* Qualquer tentativa em outro banco pode *bloquear o seu benefício* e cancelar a operação.

Qualquer dúvida, estamos aqui. Fique com Deus. 🙏`,

  // RELATÓRIO
  RELATORIO: `📊 *RELATÓRIO DIÁRIO — ACOMPANHAMENTO CRÉDITO JÁ*
📅 {DATA}

*Retornos de saldo hoje ({N_RETORNOS}):*
{RETORNOS_LISTA}

*Clientes que responderam:* {N_RESPONDERAM}
*Clientes que desbloquearam:* {N_DESBLOQUEARAM}
*Total de clientes ativos:* {N_TOTAL}

✅ Enviados: {N_ENVIADOS} | ❌ Falhas: {N_FALHAS}

Fique com Deus. Operação rodando com sucesso. 🙏`
};

export function getMessageForPhase(phase, daysUntilReturn) {
  if (daysUntilReturn <= 0) return MESSAGES.DIA_RETORNO;
  if (daysUntilReturn === 1) return MESSAGES.RETORNO_AMANHA;
  if (daysUntilReturn >= 2 && daysUntilReturn <= 7) {
    if (phase === 'manha') return MESSAGES.CRITICA_09H;
    if (phase === 'tarde') return MESSAGES.CRITICA_15H;
  }
  if (daysUntilReturn > 7) {
    if (phase === 'manha') return MESSAGES.INICIAL_09H;
    if (phase === 'meio_dia') return MESSAGES.INICIAL_12H;
    if (phase === 'tarde') return MESSAGES.INICIAL_15H;
  }
  return '';
}

export default { buildMessage, getMessageForPhase, MESSAGES };
