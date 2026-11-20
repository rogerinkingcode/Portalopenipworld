/**
 * Derivados de leitura — funções puras sobre o pacote.
 *
 * ⚠️ Nada aqui é gravado. `dias_restantes`, `vencido` e `estado` são f(vence_em, hoje) na
 * leitura, por decisão do contrato: data gravada apodrece, função não.
 */

import type { Especie } from '../contrato/tipos.ts'

// ───────────────────────────────────────────────────────────────────────────
// MATÉRIA — o agrupamento que o Gui pediu. Espécie é do contrato; matéria é como
// a casa fala. Marca, Patente, Modelo de utilidade, Desenho industrial.
// ───────────────────────────────────────────────────────────────────────────

export type Materia = 'marca' | 'patente' | 'modelo' | 'desenho' | 'outra'

export function materiaDe(e: Especie): Materia {
  if (e === 'marca') return 'marca'
  if (e === 'patente_invencao' || e === 'certificado_adicao') return 'patente'
  if (e === 'modelo_utilidade') return 'modelo'
  if (e === 'desenho_industrial') return 'desenho'
  return 'outra'
}

export const MATERIAS: { id: Materia; rotulo: string; plural: string; icone: string }[] = [
  { id: 'marca', rotulo: 'Marca', plural: 'Marcas', icone: '®' },
  { id: 'patente', rotulo: 'Patente', plural: 'Patentes', icone: '⚙' },
  { id: 'modelo', rotulo: 'Modelo de utilidade', plural: 'Modelos de utilidade', icone: '⚒' },
  { id: 'desenho', rotulo: 'Desenho industrial', plural: 'Desenhos industriais', icone: '◇' },
  { id: 'outra', rotulo: 'Outro', plural: 'Outros', icone: '◌' },
]

export function rotuloMateria(m: Materia): string {
  return MATERIAS.find((x) => x.id === m)?.plural ?? 'Outros'
}

// ───────────────────────────────────────────────────────────────────────────
// JURISDIÇÃO
// ───────────────────────────────────────────────────────────────────────────

/**
 * Código ISO de bandeira para uma jurisdição. As marcas regionais e internacionais
 * não são países e não têm bandeira ISO — devolvem null e a tela desenha o selo próprio.
 */
export function isoBandeira(j: string): string | null {
  if (j === 'EM') return 'eu' // marca da União Europeia (EUIPO)
  if (j === 'WO') return null // registro internacional (Madri/PCT) — não é país
  if (j === 'ND') return null
  if (!/^[A-Z]{2}$/.test(j)) return null
  return j.toLowerCase()
}

/** Latitude/longitude do centroide, para o mapa. Só as jurisdições que a casa usa. */
export const COORDENADA: Record<string, [number, number]> = {
  BR: [-51, -12],
  US: [-98, 39],
  CA: [-106, 56],
  MX: [-102, 23],
  AR: [-64, -35],
  CL: [-71, -32],
  CO: [-74, 4],
  PE: [-76, -10],
  UY: [-56, -33],
  PY: [-58, -23],
  BO: [-64, -17],
  EM: [10, 50], // EUIPO — Alicante, mas o pin representa a União
  PT: [-8, 39],
  ES: [-4, 40],
  FR: [2, 46],
  DE: [10, 51],
  IT: [12, 42],
  GB: [-2, 54],
  CH: [8, 47],
  NL: [5, 52],
  CN: [104, 35],
  JP: [138, 36],
  KR: [128, 36],
  IN: [79, 22],
  SG: [104, 1],
  AU: [134, -25],
  ZA: [24, -29],
  AE: [54, 24],
  IL: [35, 31],
  TR: [35, 39],
  RU: [90, 62],
}

// ───────────────────────────────────────────────────────────────────────────
// PRAZO — urgência é RELÓGIO, não termômetro.
//
// O risco (juízo humano) e a proximidade (aritmética) são duas dimensões, e a tela
// nunca as funde: um caso médio a 5 dias e um alto a 55 precisam ler diferente na
// dimensão certa. Cor por proximidade; risco tem etiqueta própria.
// ───────────────────────────────────────────────────────────────────────────

export type Urgencia = 'vencido' | 'urgente' | 'atencao' | 'tranquilo'

/**
 * Em que ponto do ciclo o prazo está.
 *
 * São quatro estados e não dois, porque "em aberto" tem duas ausências diferentes: o que
 * AINDA não começou (a janela abre no futuro) e o que JÁ acabou. Misturar os três numa lista
 * só faz a prorrogação de 2034 disputar atenção com a exigência de 13 dias.
 */
export type EstadoPrazo = 'a_abrir' | 'aberto' | 'vencido' | 'cumprido'

export function estadoDoPrazo(
  p: { abre_em?: string; vence_em: string; cumprido?: { em: string } },
  hoje: string,
): EstadoPrazo {
  if (p.cumprido) return 'cumprido'
  if (p.abre_em && diasAte(p.abre_em, hoje) > 0) return 'a_abrir'
  if (diasAte(p.vence_em, hoje) < 0) return 'vencido'
  return 'aberto'
}

/**
 * "A tratar" = em aberto ou vencido: o que pede ação agora. A prorrogação que só abre daqui a
 * anos é ~90% dos prazos da carteira e não entra — contá-la fazia o indicador dizer 40 onde são 2.
 */
export function prazoATratar(
  p: { abre_em?: string; vence_em: string; cumprido?: { em: string } },
  hoje: string,
): boolean {
  const e = estadoDoPrazo(p, hoje)
  return e === 'aberto' || e === 'vencido'
}

/**
 * Processo que acabou (arquivado, extinto, indeferido, nulo, caduco, cancelado, renunciado).
 * Mesma leitura que o motor de prazos do servidor faz da situação para não gerar prazo.
 */
const SITUACAO_ENCERRADA =
  /extint|arquivad|arquivamento|indeferid|nul[oa]\b|caducad|cancelad|renuncia|renúncia|inexistente/i
export function processoEncerrado(situacaoTexto: string): boolean {
  return SITUACAO_ENCERRADA.test(situacaoTexto)
}

export const ESTADO_PRAZO_ROTULO: Record<EstadoPrazo, string> = {
  a_abrir: 'ainda não aberto',
  aberto: 'em aberto',
  vencido: 'vencido',
  cumprido: 'cumprido',
}

export function diasAte(dataIso: string, hoje: string): number {
  const a = Date.parse(dataIso + 'T00:00:00Z')
  const b = Date.parse(hoje + 'T00:00:00Z')
  return Math.round((a - b) / 86400000)
}

export function urgenciaDe(dias: number): Urgencia {
  if (dias < 0) return 'vencido'
  if (dias <= 10) return 'urgente' // a antecedência praticada pela casa: legal − 10
  if (dias <= 30) return 'atencao'
  return 'tranquilo'
}

export const URGENCIA_PILL: Record<Urgencia, string> = {
  vencido: 'pill-neu',
  urgente: 'pill-neg',
  atencao: 'pill-avi',
  tranquilo: 'pill-neu',
}

/**
 * O texto começa com MAIÚSCULA ("Venceu há 3 dias"): quase sempre ele aparece sozinho, numa
 * célula ou num chip. No meio de uma frase, use `.toLowerCase()`.
 */
export function textoDias(dias: number): string {
  if (dias < 0) return `Venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  // Acima de um ano, o número de dias deixa de informar: "2807 dias" é a prorrogação
  // decenal, e ninguém lê isso como 2034.
  if (dias > 365) {
    const anos = Math.floor(dias / 365)
    return `Em ${anos} ${anos === 1 ? 'ano' : 'anos'}`
  }
  return `${dias} dias`
}

// ───────────────────────────────────────────────────────────────────────────
// FORMATO
// ───────────────────────────────────────────────────────────────────────────

export function dataBr(iso?: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

export function dataCurta(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
export const MES_NOME = MESES

type ComNome = {
  marca?: { nome: string } | null
  patente?: { titulo?: string } | null
  identificadores: { valor_bruto: string }[]
}

/** O que se chama o ativo na tela. Marca tem nome; patente tem título; o resto é o número. */
export function nomeAtivo(a: ComNome): string {
  if (a.marca?.nome) return a.marca.nome
  if (a.patente?.titulo) return a.patente.titulo
  return a.identificadores[0]?.valor_bruto ?? 'sem identificação'
}

/**
 * O número que a pessoa reconhece. `valor_bruto` é o que veio da fonte — com pontuação,
 * com o dígito verificador. `valor_normalizado` serve para casar, não para mostrar.
 */
export function numeroAtivo(a: { identificadores: { valor_bruto: string }[] }): string | null {
  return a.identificadores[0]?.valor_bruto ?? null
}
