// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.
// Fonte: backend/src/regras/calendario.ts (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,
// que roda sozinho antes de dev, testes e build).
// hash-da-fonte: 0923b5b26b50fab6

/**
 * Calendário útil brasileiro e cálculo de prazo.
 *
 * Portado do Papi (`/opt/papi/pct_pipeline.py:200-273`) — a peça mais cara de refazer e a mais
 * fácil de errar. A regra de contagem vem da skill do Codex §9.1, a única escrita na casa:
 *
 *   "Na regra ordinária, iniciar a contagem no primeiro dia útil após a publicação e contar dias
 *    contínuos. Verificar prorrogação do vencimento sem expediente. Não aplicar automaticamente
 *    feriados municipais do cliente ou recesso judicial a procedimento administrativo."
 *
 * ⚠️ É isso que explica os 62 dias que a casa pratica em 19 de 19 oposições, onde a lei diz 60.
 *
 * ⛔ O front NUNCA soma dias. Quem produz o pacote produz `vence_em`; a tela lê e mostra a régua.
 */

import type { Regua } from '../contrato/tipos.ts'

// ───────────────────────────────────────────────────────────────────────────
// Data civil sem fuso — trabalhamos com AAAA-MM-DD, nunca com Date local
// ───────────────────────────────────────────────────────────────────────────

/** Dias desde a época, a partir de uma data civil. Evita o inferno de fuso do `new Date`. */
function paraDia(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(a, m - 1, d) / 86400000)
}

function paraIso(dia: number): string {
  const dt = new Date(dia * 86400000)
  const a = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function somarDias(iso: string, dias: number): string {
  return paraIso(paraDia(iso) + dias)
}

export function diferencaEmDias(de: string, ate: string): number {
  return paraDia(ate) - paraDia(de)
}

/** 0 = domingo … 6 = sábado. */
function diaDaSemana(iso: string): number {
  return (((paraDia(iso) + 4) % 7) + 7) % 7
}

// ───────────────────────────────────────────────────────────────────────────
// Feriados
// ───────────────────────────────────────────────────────────────────────────

/** Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher. */
function pascoa(ano: number): string {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const cacheFeriados = new Map<number, Set<string>>()

/**
 * Feriados nacionais + móveis. ⛔ Sem feriado municipal e sem recesso forense: a skill é explícita
 * de que eles NÃO se aplicam a procedimento administrativo do INPI.
 *
 * ⚠️ O INPI publica todo ano a portaria com os dias SEM EXPEDIENTE, que não coincide exatamente
 * com esta lista. Enquanto essa tabela não for carregada, todo prazo derivado daqui nasce com
 * `firmeza` no máximo `praticado` — nunca `legal`.
 */
export function feriadosNacionais(ano: number): Set<string> {
  const cache = cacheFeriados.get(ano)
  if (cache) return cache

  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra (nacional desde 2024, Lei 14.759/2023)
    `${ano}-12-25`, // Natal
  ]
  const dPascoa = paraDia(pascoa(ano))
  const moveis = [
    paraIso(dPascoa - 48), // Carnaval (segunda)
    paraIso(dPascoa - 47), // Carnaval (terça)
    paraIso(dPascoa - 2), // Sexta-feira Santa
    paraIso(dPascoa + 60), // Corpus Christi
  ]

  const conjunto = new Set([...fixos, ...moveis])
  cacheFeriados.set(ano, conjunto)
  return conjunto
}

export function ehDiaUtil(iso: string): boolean {
  const dow = diaDaSemana(iso)
  if (dow === 0 || dow === 6) return false
  const ano = Number(iso.slice(0, 4))
  return !feriadosNacionais(ano).has(iso)
}

export function proximoDiaUtil(iso: string): string {
  let d = iso
  while (!ehDiaUtil(d)) d = somarDias(d, 1)
  return d
}

export function diaUtilAnterior(iso: string): string {
  let d = iso
  while (!ehDiaUtil(d)) d = somarDias(d, -1)
  return d
}

// ───────────────────────────────────────────────────────────────────────────
// Cálculo de prazo pela régua
// ───────────────────────────────────────────────────────────────────────────

export type PrazoCalculado = {
  primeiro_dia_contado: string
  vence_nominal: string
  vence_em: string
  ajustado: boolean
}

/**
 * Aplica a régua a uma data de publicação. A régua inteira viaja com o prazo — a tela mostra de
 * onde a data saiu, e é isso que permite auditar sem abrir o código.
 */
export function calcularPrazo(publicacao: string, regua: Regua): PrazoCalculado {
  let primeiro: string
  switch (regua.dies_a_quo) {
    case 'incluido':
      primeiro = publicacao
      break
    case 'excluido':
      primeiro = somarDias(publicacao, 1)
      break
    case 'primeiro_dia_util_seguinte':
      primeiro = proximoDiaUtil(somarDias(publicacao, 1))
      break
  }

  let nominal: string
  if (regua.contagem === 'corridos') {
    nominal = somarDias(primeiro, Math.max(0, regua.dias - 1))
  } else {
    nominal = primeiro
    let restantes = Math.max(0, regua.dias - 1)
    while (restantes > 0) {
      nominal = somarDias(nominal, 1)
      if (ehDiaUtil(nominal)) restantes--
    }
  }

  let vence = nominal
  if (regua.ajuste_dia_nao_util === 'proximo_dia_util') vence = proximoDiaUtil(nominal)
  else if (regua.ajuste_dia_nao_util === 'dia_util_anterior') vence = diaUtilAnterior(nominal)

  return { primeiro_dia_contado: primeiro, vence_nominal: nominal, vence_em: vence, ajustado: vence !== nominal }
}

// ───────────────────────────────────────────────────────────────────────────
// Derivados — calculados na LEITURA, com `hoje` explícito
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⛔ `dias_restantes` NUNCA é gravado. Agregado calculado cedo apodrece: um número desses está
 * certo por 24 horas. Aqui ele é função de (vence_em, hoje), e `hoje` é parâmetro para o teste
 * poder fixá-lo.
 */
export function diasRestantes(venceEm: string, hoje: string): number {
  return diferencaEmDias(hoje, venceEm)
}

export type EstadoPrazo = 'vencido' | 'critico' | 'proximo' | 'no_prazo'

/** Faixas herdadas do Papi: crítico ≤7 · alto ≤14 · médio ≤30. */
export function estadoPrazo(venceEm: string, hoje: string): EstadoPrazo {
  const d = diasRestantes(venceEm, hoje)
  if (d < 0) return 'vencido'
  if (d <= 7) return 'critico'
  if (d <= 30) return 'proximo'
  return 'no_prazo'
}
