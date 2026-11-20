// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.
// Fonte: backend/src/regras/reguas.ts (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,
// que roda sozinho antes de dev, testes e build).
// hash-da-fonte: 81604871dab136b4

/**
 * Catálogo de réguas de prazo.
 *
 * ⚠️ Fato medido: NENHUM dispositivo legal está documentado no repo do BI, na memória, no Papi ou
 * no Desktop — `grep -rE "\bLPI\b|9\.279|decenal"` devolve zero. A única fonte escrita é a skill
 * do Codex §9.1, recebida em 06/09/2026.
 *
 * Por isso cada régua carrega uma FIRMEZA, e a tela mostra:
 *   legal      — dispositivo confirmado pela casa
 *   praticado  — o que o escritório faz (62 dias em 19/19 oposições), dies a quo não confirmado
 *   estimado   — regra ainda não confirmada (anuidade, prorrogação) — a tela AVISA
 *   informado  — veio de agente/cliente sem régua
 *
 * ⚠️ MEDIDO em 07/09/2026: **6 réguas são `legal`** — aquelas cuja CONTAGEM DE DIAS vem de um
 *    artigo explícito da LPI (oposição 60, exigência, recurso de indeferimento, PAN, exigência
 *    técnica). O que ainda **não** foi confirmado pelo Gui não é o número de dias: é o
 *    **dies a quo** — a regra de contagem da skill do Codex §9.1, que explica os 62 dias
 *    medidos em 19/19 oposições onde a lei diz 60. Ver PERGUNTAS-ABERTAS §2.
 *
 *    Este cabeçalho dizia "nenhuma régua é `legal`" e estava errado desde sempre — afirmação
 *    de proteção que não existe é pior que ausência de afirmação: quem lê para de conferir.
 */

import type { Firmeza, Regua } from '../contrato/tipos.ts'

/** Padrão da casa, conforme a skill §9.1. */
const ORDINARIA = {
  contagem: 'corridos',
  dies_a_quo: 'primeiro_dia_util_seguinte',
  ajuste_dia_nao_util: 'proximo_dia_util',
  calendario: 'br_inpi',
} as const

export type ReguaCatalogo = Regua & {
  firmeza_padrao: Firmeza
  /** Códigos de despacho que disparam esta régua. */
  gatilhos: string[]
  /** O que acontece se perder. Vazio quando a casa não documentou. */
  consequencia?: string
  observacao?: string
}

export const CATALOGO: Record<string, ReguaCatalogo> = {
  'br.marca.prazo_oposicao': {
    id: 'br.marca.prazo_oposicao',
    nome: 'Prazo para oposição a pedido de terceiro',
    fundamento: 'art. 158 LPI — da publicação do pedido para oposição',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['IPAS009', 'I009', 'IPAS421', 'I421', 'IPAS756', 'I756', 'IPAS757', 'I757'],
    observacao: 'É o relógio da colidência. I756/I757 são designações de Madri.',
  },

  'br.marca.manifestacao_oposicao': {
    id: 'br.marca.manifestacao_oposicao',
    nome: 'Manifestação à oposição',
    fundamento: 'art. 158 §1º LPI — da publicação da oposição',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'praticado',
    gatilhos: ['I339'],
    observacao:
      'Medido: 62 dias em 19 de 19 casos contra a data da RPI. A regra do primeiro dia útil ' +
      'seguinte explica a diferença — aguarda confirmação para virar `legal`.',
  },

  'br.marca.exigencia': {
    id: 'br.marca.exigencia',
    nome: 'Cumprimento de exigência (marca)',
    fundamento: 'art. 159 LPI',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['I340', 'I105', 'I206'],
    consequencia: 'A omissão gera ARQUIVAMENTO DEFINITIVO do pedido.',
  },

  'br.marca.recurso_indeferimento': {
    id: 'br.marca.recurso_indeferimento',
    nome: 'Recurso contra indeferimento (marca)',
    fundamento: 'art. 212 §1º LPI',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['I024'],
    observacao: 'Medido: 60 dias em 14 de 14.',
  },

  'br.marca.pan': {
    id: 'br.marca.pan',
    nome: 'Processo administrativo de nulidade',
    fundamento: 'arts. 168-169 LPI — da CONCESSÃO / expedição do certificado',
    dias: 180,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['IPAS158', 'I158', 'IPAS770', 'I770', 'IPAS403'],
    observacao:
      '⛔ Conta da concessão, NUNCA do deferimento. Depois disso só a via judicial (art. 174, ' +
      'prazo de 5 anos) — que é outra pesquisa.',
  },

  'br.marca.prorrogacao': {
    id: 'br.marca.prorrogacao',
    nome: 'Prorrogação decenal do registro de marca',
    fundamento: 'art. 133 LPI — 10 anos da concessão, prorrogáveis por períodos iguais',
    dias: 0,
    ...ORDINARIA,
    ciclo: {
      base: 'concessao',
      periodo_meses: 120,
      // art. 133 §1º: "o pedido deverá ser formulado durante o ÚLTIMO ANO de vigência"
      janela_abre_antes_dias: 365,
      recorrente: true,
    },
    // art. 133 §2º — e é §2º, não §1º: o §1º é a janela, o §2º é a graça com retribuição
    prazo_extraordinario: { dias: 180, fundamento: 'art. 133 §2º LPI', taxa_adicional: true },
    firmeza_padrao: 'legal',
    gatilhos: [],
    observacao:
      'Quando a base traz `vigencyEnd`, ela GANHA da conta derivada — data do certificado vale ' +
      'mais que aritmética. O ciclo abaixo existe para os ativos que vierem sem ela.',
  },

  'br.patente.exigencia_tecnica': {
    id: 'br.patente.exigencia_tecnica',
    nome: 'Manifestação a exigência técnica',
    fundamento: 'art. 36 LPI',
    dias: 90,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['6.1', '6.23'],
    observacao: 'Medido: 90 dias em 38 de 63; 60 em 15; 30 em 5 (há variação por tipo de exigência).',
  },

  'br.patente.recurso_indeferimento': {
    id: 'br.patente.recurso_indeferimento',
    nome: 'Recurso contra indeferimento (patente)',
    fundamento: 'arts. 212-213 LPI',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: ['9.2', '12.2'],
  },

  'br.patente.anuidade': {
    id: 'br.patente.anuidade',
    nome: 'Anuidade',
    fundamento: 'art. 84 LPI — retribuição anual a partir do início do 3º ano do depósito',
    dias: 0,
    ...ORDINARIA,
    ciclo: {
      base: 'deposito',
      // art. 84, caput: "a partir do início do TERCEIRO ANO da data do depósito"
      primeiro_apos_meses: 24,
      periodo_meses: 12,
      // art. 84 §2º: "dentro dos primeiros 3 (três) meses de cada período anual"
      janela_apos_inicio_dias: 90,
      recorrente: true,
    },
    // art. 84 §2º, 2ª parte: "nos 6 meses subsequentes, mediante retribuição adicional"
    prazo_extraordinario: { dias: 180, fundamento: 'art. 84 §2º LPI', taxa_adicional: true },
    firmeza_padrao: 'legal',
    gatilhos: [],
    observacao:
      '⚠️ A DATA é lei; o CÓDIGO DA GRU não. A guia tem pelo menos 6 códigos de anuidade ' +
      '(220 · 224 · 226 · 228 · 240) e o extraordinário muda o código (221 · 225) — e a mesma ' +
      '"6ª anuidade" sai com 220 e com 222 no CRM, sem nada no dado que os distinga. Por isso o ' +
      'Wallet calcula a data e NÃO emite guia: pergunta aberta §3, eixo 2.',
  },

  'br.patente.restauracao': {
    id: 'br.patente.restauracao',
    nome: 'Restauração do pedido ou da patente',
    /*
     * ⚠️ CORRIGIDO em 06/09/2026. Esta régua citava o "art. 161 LPI", que trata de outra
     * coisa por completo — o art. 161 diz que o certificado de registro se concede depois de
     * deferido o pedido e comprovado o pagamento. A restauração é o art. 87, e o dies a quo
     * não é o "termo final": é a NOTIFICAÇÃO do arquivamento ou da extinção.
     *
     * Instituto vizinho e distinto, para não confundir: o art. 221 trata de restauração de
     * prazo por JUSTA CAUSA, e não tem os 90 dias.
     */
    fundamento: 'art. 87 LPI — 3 meses da notificação do arquivamento ou da extinção',
    dias: 90,
    ...ORDINARIA,

    firmeza_padrao: 'praticado',
    gatilhos: [],
    observacao:
      'O dies a quo é a NOTIFICAÇÃO, não a publicação — enquanto o evento de notificação não ' +
      'for modelado, a data sai como praticada. Pergunta aberta §2.',
  },

  // ── As medidas que o Gui citou e não existiam no catálogo ─────────────────

  'br.marca.caducidade_defesa': {
    id: 'br.marca.caducidade_defesa',
    nome: 'Defesa em pedido de caducidade',
    /*
     * ⚠️ Esta é a caducidade que CORRE CONTRA o cliente: alguém requereu a caducidade da
     * marca DELE e ele tem 60 dias para provar o uso. O ônus da prova é do titular.
     * Não confundir com a caducidade OFENSIVA (abaixo), que é janela e não corre.
     */
    fundamento: 'art. 143 §2º LPI — 60 dias da intimação, com ônus de provar o uso',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'praticado',
    gatilhos: [],
    observacao:
      'Perder este prazo extingue o registro (art. 142, III). O código de despacho da ' +
      'intimação ainda NÃO foi mapeado — enquanto isso, o prazo entra por registro manual.',
  },

  'br.patente.pan': {
    id: 'br.patente.pan',
    nome: 'Nulidade administrativa de patente',
    /* ⚠️ 6 meses, não 180 dias de marca. São prazos diferentes para institutos diferentes. */
    fundamento: 'art. 51 LPI — 6 meses da concessão da patente',
    dias: 180,
    ...ORDINARIA,

    firmeza_padrao: 'praticado',
    gatilhos: [],
    observacao:
      'Conta da CONCESSÃO. Manifestação do titular em 60 dias (art. 52). Depois desta janela ' +
      'resta a via judicial, que corre durante toda a vigência (art. 56).',
  },

  'br.di.pan': {
    id: 'br.di.pan',
    nome: 'Nulidade administrativa de desenho industrial',
    fundamento: 'art. 112 LPI — 5 anos da concessão do registro',
    dias: 1826,
    ...ORDINARIA,

    firmeza_padrao: 'estimado',
    gatilhos: [],
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. A janela do DI é muito mais larga que a da marca ' +
      '(180 dias) e a da patente (6 meses) — confira antes de agir. E a RPI de DI só sai em ' +
      'PDF, então o gatilho não chega por feed estruturado.',
  },

  'br.marca.retribuicao_concessao': {
    id: 'br.marca.retribuicao_concessao',
    nome: 'Pagamento da retribuição de concessão',
    /*
     * ⚠️ O prazo mais caro de perder do catálogo: a consequência é ARQUIVAMENTO DEFINITIVO
     * do pedido, e a lei diz "independentemente de notificação". Um deferimento que ninguém
     * pagou vira nada.
     */
    fundamento: 'art. 162 LPI — 60 dias do deferimento (+30 com retribuição adicional)',
    dias: 60,
    ...ORDINARIA,
    prazo_extraordinario: { dias: 30, fundamento: 'art. 162 LPI', taxa_adicional: true },
    firmeza_padrao: 'praticado',
    /*
     * ⛔ SEM GATILHO AUTOMÁTICO, de propósito.
     *
     * O código de despacho sozinho é AMBÍGUO aqui: o mesmo IPAS158 significa "pague a
     * retribuição" quando o deferimento é SEU, e "cabe nulidade" quando é o registro de um
     * TERCEIRO. Quem separa é o LADO, e o lado não está no código — está em de quem é o
     * processo. Dar gatilho a esta régua faria a busca por despacho devolver 60 dias onde o
     * caso pede 180, e a primeira versão disto quebrou o teste do PAN exatamente assim.
     *
     * Enquanto o derivador não souber o lado, esta régua entra por registro manual.
     */
    gatilhos: [],
    observacao:
      'Há uma segunda janela de 30 dias com retribuição específica, INDEPENDENTEMENTE de ' +
      'notificação — perder as duas arquiva o pedido em DEFINITIVO (art. 162). É o prazo mais ' +
      'caro do catálogo. Sem gatilho automático: o despacho de deferimento não diz de que lado ' +
      'o processo está. Pergunta aberta §2.',
  },

  // ── Medidas do lado do TITULAR que a carteira própria precisa (17/11/2026) ─

  'br.marca.manifestacao_nulidade': {
    id: 'br.marca.manifestacao_nulidade',
    nome: 'Manifestação em processo administrativo de nulidade (marca)',
    fundamento: 'art. 170 LPI — 60 dias da intimação do titular',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'estimado',
    gatilhos: [],
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. Corre contra o titular quando um terceiro pede a ' +
      'nulidade do registro dele (IPAS400). O dies a quo é a intimação, aqui lida como a data da RPI.',
  },

  'br.patente.manifestacao_parecer': {
    id: 'br.patente.manifestacao_parecer',
    nome: 'Manifestação sobre parecer técnico (patente)',
    fundamento: 'art. 36 LPI — 90 dias da publicação do parecer',
    dias: 90,
    ...ORDINARIA,
    firmeza_padrao: 'estimado',
    gatilhos: [],
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. O parecer desfavorável (7.1) abre prazo de resposta ' +
      'do depositante, como a exigência técnica — sem resposta, o pedido segue para decisão.',
  },

  // ── Desenho industrial, lado do TITULAR (17/11/2026) ──────────────────────
  // Códigos medidos na RPI 2915 e na base aberta do INPI: 136 exigência, 024 indeferimento,
  // 400 nulidade a requerimento. O 139 ("arquivado por não ter sido apresentada a petição de
  // cumprimento de exigência no prazo legal de 60 dias") confirma o número de dias da exigência.

  'br.di.exigencia': {
    id: 'br.di.exigencia',
    nome: 'Cumprimento de exigência (desenho industrial)',
    fundamento: 'art. 106 §3º LPI — 60 dias da publicação da exigência',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: [],
    consequencia: 'A omissão gera ARQUIVAMENTO DEFINITIVO do pedido (despacho 139).',
  },

  'br.di.recurso_indeferimento': {
    id: 'br.di.recurso_indeferimento',
    nome: 'Recurso contra indeferimento (desenho industrial)',
    fundamento: 'art. 212 LPI — 60 dias da publicação do indeferimento',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: [],
  },

  'br.di.manifestacao_nulidade': {
    id: 'br.di.manifestacao_nulidade',
    nome: 'Manifestação em processo administrativo de nulidade (desenho industrial)',
    fundamento: 'art. 114 LPI — 60 dias da publicação da notificação',
    dias: 60,
    ...ORDINARIA,
    firmeza_padrao: 'legal',
    gatilhos: [],
    observacao: 'Corre contra o titular quando um terceiro pede a nulidade do registro dele (despacho 400).',
  },

  'br.di.quinquenio': {
    id: 'br.di.quinquenio',
    nome: 'Retribuição do 2º quinquênio (desenho industrial)',
    fundamento: 'art. 120 §1º LPI — durante o 5º ano de vigência, contada do depósito',
    dias: 0,
    ...ORDINARIA,
    ciclo: { base: 'deposito', primeiro_apos_meses: 48, periodo_meses: 60, janela_abre_antes_dias: 365, recorrente: false },
    // art. 120 §3º: "dentro dos 6 meses subsequentes, mediante retribuição adicional"
    prazo_extraordinario: { dias: 180, fundamento: 'art. 120 §3º LPI', taxa_adicional: true },
    firmeza_padrao: 'legal',
    gatilhos: [],
    observacao:
      'O pagamento não é publicado: o Wallet mostra o quinquênio até o fim do prazo ordinário e ' +
      'não acusa atraso que não pode provar.',
  },

  'br.di.prorrogacao': {
    id: 'br.di.prorrogacao',
    nome: 'Prorrogação do registro de desenho industrial (+ quinquênio)',
    fundamento:
      'art. 108 LPI — 10 anos do depósito, prorrogáveis por 3 períodos de 5 anos (máximo 25); ' +
      'o quinquênio vai junto (art. 120 §2º)',
    dias: 0,
    ...ORDINARIA,
    ciclo: { base: 'deposito', primeiro_apos_meses: 120, periodo_meses: 60, janela_abre_antes_dias: 365, recorrente: true },
    // art. 108 §1º: no último ano de vigência; §2º: 180 dias subsequentes, com retribuição adicional
    prazo_extraordinario: { dias: 180, fundamento: 'art. 108 §2º LPI', taxa_adicional: true },
    firmeza_padrao: 'legal',
    gatilhos: [],
    observacao: 'Três prorrogações possíveis: aos 10, 15 e 20 anos do depósito. Aos 25 a proteção acaba.',
  },
}

/**
 * JANELAS — coisas com data, mas que NÃO são prazo que corre.
 *
 * A distinção importa na tela: um prazo vence e some; uma janela abre e permanece aberta.
 * Tratar as duas com o mesmo relógio produziria contagem regressiva para algo que não expira,
 * e alarme para algo que é oportunidade, não ameaça.
 */
export const JANELAS = {
  'br.marca.caducidade_ofensiva': {
    id: 'br.marca.caducidade_ofensiva',
    nome: 'Caducidade contra registro de terceiro',
    fundamento: 'art. 143 LPI — a partir de 5 anos da concessão do registro do terceiro',
    abre_apos_dias: 1826,
    a_partir_de: 'concessao_do_terceiro' as const,
    /* Não vence: fica aberta enquanto o desuso persistir. O período investigado são os 5 anos
       contados PARA TRÁS a partir da data do requerimento (art. 143 c/c 145). */
    fecha: false,
    firmeza_padrao: 'estimado' as const,
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. É a via para atacar registro de terceiro quando a ' +
      'oposição e o PAN já fecharam. Exige legítimo interesse. O art. 145 impede conhecer o ' +
      'requerimento antes dos 5 anos, ou se o uso já foi comprovado em processo requerido há ' +
      'menos de 5 anos.',
  },

  'br.marca.caducidade_vulnerabilidade': {
    id: 'br.marca.caducidade_vulnerabilidade',
    nome: 'Vulnerabilidade a caducidade',
    fundamento: 'art. 143 LPI, lido do outro lado — 5 anos da concessão do SEU registro',
    abre_apos_dias: 1826,
    a_partir_de: 'concessao_propria' as const,
    fecha: false,
    firmeza_padrao: 'estimado' as const,
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. Não é prazo nem tarefa: é um ESTADO do ativo — a ' +
      'partir daqui qualquer interessado pode requerer a caducidade, e o ônus de provar o uso ' +
      'é do titular. Serve para a casa recomendar guardar prova de uso, não para alarmar.',
  },

  'br.marca.prorrogacao_janela': {
    id: 'br.marca.prorrogacao_janela',
    nome: 'Janela de prorrogação decenal',
    fundamento: 'art. 133 §1º e §2º LPI — último ano de vigência (+6 meses, com adicional)',
    abre_apos_dias: -365,
    a_partir_de: 'vigencia_ate' as const,
    fecha: true,
    firmeza_padrao: 'estimado' as const,
    observacao:
      '⚠️ REGRA NÃO CONFIRMADA PELA CASA. A régua `br.marca.prorrogacao` marca só o termo ' +
      'final; a janela ÚTIL abre um ano antes. Perder as duas extingue o registro (art. 142, I).',
  },
} as const

/** Prática medida em 5 pares: prazo interno = legal − 10 dias. ⛔ É CONFIGURAÇÃO, não lei. */
export const ANTECEDENCIA_INTERNA_DIAS = 10

const PORCODIGO = new Map<string, ReguaCatalogo>()
for (const r of Object.values(CATALOGO)) {
  for (const g of r.gatilhos) PORCODIGO.set(g.toUpperCase(), r)
}

/** Devolve a régua de um código de despacho, ou `null` quando a casa não tem régua para ele. */
export function reguaPorDespacho(codigo: string): ReguaCatalogo | null {
  return PORCODIGO.get(codigo.trim().toUpperCase()) ?? null
}

/** Códigos que abrem prazo de oposição (a fila de colidência de terceiros). */
export const CODIGOS_OPOSICAO = ['I009', 'I421', 'I756', 'I757'] as const

/** Códigos que abrem prazo de PAN. */
export const CODIGOS_PAN = ['IPAS158', 'IPAS770', 'IPAS403'] as const

/** Códigos que EXCLUEM o ativo da base na ingestão (medido na carga de 03/09: 16 exclusões). */
export const CODIGOS_TERMINAIS = ['I235', 'I024'] as const
