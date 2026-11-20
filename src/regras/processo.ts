// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.
// Fonte: backend/src/regras/processo.ts (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,
// que roda sozinho antes de dev, testes e build).
// hash-da-fonte: 05d8e00e4a5e9326

/**
 * Extrator de número de processo.
 *
 * ⚠️ Por que isto é infraestrutura, não conveniência: o número mora no TÍTULO do card 22× mais
 * que no campo criado para isso — 3.055 cards contra 1.692, e só 82 exclusivos do campo.
 * 286 títulos carregam MAIS DE UM número: serviço ↔ ativo é N:N.
 *
 * ⚠️ O erro que este módulo existe para evitar: um `\d{9,}` descarta o dígito verificador de
 * `BR 10 2022 000101-0` e devolve `102022013321`. O XML da RPI publica o número canônico COM o
 * verificador — o casamento falha, o cliente não recebe o alerta, e o log não registra erro:
 * o ativo simplesmente "não teve despacho essa semana". Prazo do art. 36 é de 90 dias.
 */

import type { Identificador } from '../contrato/tipos.ts'

export type TipoIdentificadorExtraido = Identificador['tipo']

export type NumeroExtraido = {
  tipo: TipoIdentificadorExtraido
  bruto: string
  normalizado: string
  jurisdicao: string
}

/**
 * Patente / MU / DI / PCT-fase-nacional brasileiros: `BR` + 2 (tipo) + 4 (ano) + 6 + `-` + 1 (DV).
 * Aceita com e sem espaços. O DV é PARTE DO NÚMERO.
 *   BR 10 2022 000101-0 · BR102021000102-0 · BR 11 2024 000103-0 · BR302025000104-0
 */
const RE_PATENTE_BR = /\bBR\s?(\d{2})\s?(\d{4})\s?(\d{6})\s?-\s?(\d)\b/gi

/** Marca INPI e designação de Madri: 9 dígitos isolados. */
const RE_NOVE_DIGITOS = /(?<![\d.\-/])(\d{9})(?![\d.\-/])/g

/**
 * EUIPO: 8 ou 9 dígitos, e o **zero à esquerda faz parte do número** (`018999999`).
 * ⚠️ Só é reconhecido quando a jurisdição do contexto diz que é EUIPO — solto, 8 dígitos são
 * ambíguos demais. Planilha lida como número destrói o zero; por isso o importador lê texto.
 */
const RE_EUIPO = /(?<![\d.\-/])(0\d{7,8})(?![\d.\-/])/g

/** PCT: `PCT/BR2021/000102`, `PCT/CN2022/000101`. */
const RE_PCT = /\bPCT\/([A-Z]{2})(\d{4})\/(\d{5,6})\b/gi

/** Patente europeia concedida/publicada: `EP3000101`. */
const RE_EP = /\bEP\s?(\d{7,8})\b/gi

/** Serial/registro dos EUA: `29/000,101` ou `90/123456`. */
const RE_USPTO = /\b(\d{2})\/(\d{3}),?(\d{3})\b/g

/** Identificador interno da casa: `ND00101`. ⛔ Regra 2: nunca comparado como número INPI. */
const RE_ND = /\bND\s?(\d{3,6})\b/gi

/** Prefixos de patente BR: 10 = invenção · 11 = fase nacional PCT · 20 = MU · 30 = DI. */
const PREFIXO_BR: Record<string, TipoIdentificadorExtraido> = {
  '10': 'inpi_patente',
  '11': 'inpi_patente',
  '20': 'inpi_patente',
  '30': 'inpi_di',
}

/**
 * Ruído que se parece com número de processo e NÃO é.
 * Códigos de GRU no título têm 3–4 dígitos (`GRU 389`, `- 372 -`, `3000`) e por isso não colidem
 * com o padrão de 9 dígitos. Já `RPI 2904` colide se lido como número solto — daí o corte.
 */
function ehRuido(contexto: string, indice: number): boolean {
  const antes = contexto.slice(Math.max(0, indice - 24), indice).toUpperCase()
  return /\b(RPI|GRU|CLASSE|NCL|PROTOCOLO)\s*$/.test(antes)
}

/**
 * Extrai todos os identificadores de um texto livre (título de card, célula de planilha).
 * Devolve na ordem em que aparecem, sem repetir o mesmo `normalizado`.
 */
export function extrairNumeros(texto: string): NumeroExtraido[] {
  if (!texto) return []
  const achados: NumeroExtraido[] = []
  const vistos = new Set<string>()
  const cobertos: Array<[number, number]> = []

  const registrar = (n: NumeroExtraido, ini: number, fim: number) => {
    if (vistos.has(n.normalizado)) return
    vistos.add(n.normalizado)
    achados.push(n)
    cobertos.push([ini, fim])
  }
  const jaCoberto = (ini: number, fim: number) =>
    cobertos.some(([a, b]) => ini >= a && fim <= b)

  for (const m of texto.matchAll(RE_PATENTE_BR)) {
    const [bruto, tipoNum, ano, seq, dv] = m
    // ⚠️ O hífen e o DV FICAM. Descartá-los quebra o casamento com a RPI.
    const normalizado = `BR${tipoNum}${ano}${seq}-${dv}`
    registrar(
      {
        tipo: PREFIXO_BR[tipoNum] ?? 'inpi_patente',
        bruto: bruto.trim(),
        normalizado,
        jurisdicao: 'BR',
      },
      m.index!,
      m.index! + bruto.length,
    )
  }

  for (const m of texto.matchAll(RE_PCT)) {
    const [bruto, pais, ano, seq] = m
    registrar(
      { tipo: 'pct', bruto: bruto.trim(), normalizado: `PCT/${pais.toUpperCase()}${ano}/${seq}`, jurisdicao: 'WO' },
      m.index!,
      m.index! + bruto.length,
    )
  }

  for (const m of texto.matchAll(RE_EP)) {
    const [bruto, seq] = m
    registrar(
      { tipo: 'ep', bruto: bruto.trim(), normalizado: `EP${seq}`, jurisdicao: 'EP' },
      m.index!,
      m.index! + bruto.length,
    )
  }

  for (const m of texto.matchAll(RE_USPTO)) {
    const [bruto, serie, a, b] = m
    registrar(
      { tipo: 'uspto_serial', bruto: bruto.trim(), normalizado: `${serie}/${a}${b}`, jurisdicao: 'US' },
      m.index!,
      m.index! + bruto.length,
    )
  }

  for (const m of texto.matchAll(RE_ND)) {
    const [bruto, seq] = m
    registrar(
      { tipo: 'nd_interno', bruto: bruto.trim(), normalizado: `ND${seq}`, jurisdicao: 'BR' },
      m.index!,
      m.index! + bruto.length,
    )
  }

  for (const m of texto.matchAll(RE_NOVE_DIGITOS)) {
    const bruto = m[1]
    const ini = m.index!
    const fim = ini + bruto.length
    if (jaCoberto(ini, fim)) continue // já faz parte de um BR…-D
    if (ehRuido(texto, ini)) continue
    // 9 dígitos começando com 5 têm o MESMO formato de id de card do Ploomes; o tipo real
    // (marca nacional × designação de Madri) só se resolve com a jurisdição do contexto.
    registrar(
      { tipo: 'inpi_marca', bruto, normalizado: bruto, jurisdicao: 'BR' },
      ini,
      fim,
    )
  }

  return achados
}

/** Normaliza um número já conhecido, preservando o dígito verificador. */
export function normalizarProcesso(valor: string): string | null {
  const achados = extrairNumeros(valor)
  return achados.length > 0 ? achados[0].normalizado : null
}

/**
 * Extrai com a jurisdição conhecida — usada pelo importador, que sabe a coluna PAÍS.
 * É o caminho para EUIPO e outros escritórios cujo número é ambíguo fora de contexto.
 */
export function extrairNumerosNaJurisdicao(texto: string, jurisdicao: string): NumeroExtraido[] {
  const achados = extrairNumeros(texto)

  // Reclassifica o que o extrator genérico chamou de marca INPI: um número numa linha marcada
  // "União Europeia" NÃO é marca do INPI. O tipo vem da jurisdição declarada, que é dado, não
  // adivinhação. ⚠️ Sem isso, o ativo do EUIPO entraria como brasileiro e o casamento com a RPI
  // nunca aconteceria — em silêncio.
  const porJurisdicao: Record<string, TipoIdentificadorExtraido> = {
    EM: 'euipo',
    WO: 'madri',
    US: 'uspto_reg',
  }
  const tipo = porJurisdicao[jurisdicao]
  if (tipo) {
    const reclassificados = achados.map((a) =>
      a.tipo === 'inpi_marca' ? { ...a, tipo, jurisdicao } : a,
    )
    if (reclassificados.length > 0) return reclassificados
  }
  if (achados.length > 0) return achados

  // EUIPO com 8 dígitos: só reconhecível porque a jurisdição diz que é.
  if (jurisdicao === 'EM') {
    for (const m of texto.matchAll(RE_EUIPO)) {
      return [{ tipo: 'euipo', bruto: m[1], normalizado: m[1], jurisdicao: 'EM' }]
    }
  }
  return []
}

/** Um título pode citar vários ativos — 286 casos medidos. */
export function ehMultiAtivo(texto: string): boolean {
  return extrairNumeros(texto).length > 1
}
