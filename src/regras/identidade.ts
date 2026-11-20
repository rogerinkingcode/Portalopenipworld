/**
 * Identidade e idempotência.
 *
 * Regras que não se negociam (`CLAUDE.md` §3):
 *   4. `ativo_id` é emitido pelo SERVIDOR, opaco, imutável. Nunca derivado do número —
 *      17,86% dos ativos vivos ainda não têm número, e o id mudaria quando o INPI atribuísse.
 *   5. `evento_id` deriva do CONTEÚDO, nunca da posição no arquivo. Duas fontes do mesmo fato
 *      viram duas OBSERVAÇÕES do mesmo evento.
 *  10. Nome nunca é chave.
 */

import { ulid } from 'ulid'

/**
 * Emite uma REFERÊNCIA PROVISÓRIA (ULID) para ligar registros dentro de um pacote ainda não
 * gravado. ⚠️ Não é o id definitivo: quem emite id é o servidor, que troca esta referência por um
 * UUID ao gravar (decisão do Gui, 03/11/2026).
 */
export function novoId(): string {
  return ulid()
}

/** Upper, sem acento, sem pontuação, espaço colapsado. Para BUSCA — ⛔ nunca para dedupe. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/&/g, ' E ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/**
 * Coalesce letras separadas por pontuação num núcleo único.
 *
 *   `c.r.i.a.r.`  →  `CRIAR`      `C-R-I-A-R`  →  `CRIAR`
 *
 * ⚠️ Defeito medido na RPI 2899: a normalização leu `c.r.i.a.r.` como letras isoladas, apagou o
 * núcleo CRIAR e derrubou um caso de risco ALTO abaixo do limiar. Um falso negativo de
 * normalização custa uma oposição perdida.
 *
 * ⚠️ E o contrário também é defeito: `A B`, `A E B` e `A B C` NÃO devem ser unidos. Só sequências
 * de 4+ letras isoladas por espaço viram variante — e o bruto sempre sobrevive ao lado.
 */
const LETRAS_PONTUADAS = /(?<![A-Z0-9])(?:[A-Z]\s*[.\-_/·•]\s*){2,}[A-Z](?:\s*[.\-_/·•])?(?![A-Z0-9])/g
const LETRAS_ESPACADAS = /(?<![A-Z0-9])(?:[A-Z]\s+){3,}[A-Z](?![A-Z0-9])/g

export function normalizarMarca(valor: string): string {
  const base = valor
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/&/g, ' E ')
  const semPontuadas = base.replace(LETRAS_PONTUADAS, (m) => m.replace(/[^A-Z0-9]/g, ''))
  const semEspacadas = semPontuadas.replace(LETRAS_ESPACADAS, (m) => m.replace(/\s+/g, ''))
  return semEspacadas.replace(/[^A-Z0-9]+/g, ' ').trim()
}

/**
 * Chave de mesmidade de PESSOA JURÍDICA para comparação de titular.
 *
 * ⚠️ Defeito medido na RPI 2903 (`ownerDeduplicationDefect`): o dedupe por similaridade textual
 * fundiu `APEX PROPRIEDADE INTELECTUAL LTDA` com `EIXO PROPRIEDADE INTELECTUAL LTDA` e excluiu
 * 4 pares de CONCORRENTES como se fossem o mesmo titular.
 *
 * A regra que ficou: mesmidade é por identificador (CNPJ/CPF) ou por **igualdade exata** desta
 * chave. ⛔ Nunca por proximidade.
 */
const SUFIXOS_SOCIETARIOS = new Set([
  'BR', 'CIA', 'CO', 'COMPANHIA', 'COMPANY', 'EIRELI', 'INC', 'LLC', 'LLP', 'LTDA', 'ME', 'SA',
])

export function chaveTitular(valor: string): string {
  return normalizarTexto(valor)
    .split(' ')
    .filter((t) => t && !SUFIXOS_SOCIETARIOS.has(t))
    .join(' ')
}

/** Mesmidade de titular. Documento ganha; sem documento, só igualdade EXATA da chave. */
export function mesmoTitular(
  a: { nome: string; documento?: string },
  b: { nome: string; documento?: string },
): boolean {
  if (a.documento && b.documento) return soDigitos(a.documento) === soDigitos(b.documento)
  const ka = chaveTitular(a.nome)
  const kb = chaveTitular(b.nome)
  return ka.length > 0 && ka === kb
}

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

// ───────────────────────────────────────────────────────────────────────────
// evento_id — hash do conteúdo
// ───────────────────────────────────────────────────────────────────────────

/**
 * FNV-1a de 64 bits em base32 Crockford. Não é criptográfico — é chave de conteúdo, e precisa
 * rodar igual no navegador e no servidor sem depender de WebCrypto assíncrono.
 */
function fnv1a64(texto: string): bigint {
  let h = 0xcbf29ce484222325n
  const primo = 0x100000001b3n
  const mascara = 0xffffffffffffffffn
  for (let i = 0; i < texto.length; i++) {
    h ^= BigInt(texto.charCodeAt(i))
    h = (h * primo) & mascara
  }
  return h
}

const ALFABETO32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function base32(n: bigint, chars: number): string {
  let out = ''
  let v = n
  for (let i = 0; i < chars; i++) {
    out = ALFABETO32[Number(v & 31n)] + out
    v >>= 5n
  }
  return out
}

export type ChaveEvento = {
  jurisdicao: string
  identificador: string
  codigo: string
  ocorrido_em: string
  publicacao_tipo?: string
  revista?: number
}

/**
 * `evento_id` = hash do fato, não do arquivo.
 *
 * O mesmo despacho visto pela digitação manual e pela varredura retroativa da revista produz o
 * MESMO id → a segunda fonte vira uma observação a mais. Nada duplica, nada sobrescreve, e a
 * procedência das duas sobrevive.
 *
 * Republicação corrigida da revista, com um despacho a menos, NÃO cria órfão: nenhum id depende
 * de `ordinal`.
 */
export function eventoId(chave: ChaveEvento): string {
  const canonico = [
    chave.jurisdicao,
    chave.identificador,
    chave.codigo,
    chave.ocorrido_em,
    chave.publicacao_tipo ?? '',
    chave.revista != null ? String(chave.revista) : '',
  ].join('|')
  return 'ev_' + base32(fnv1a64(canonico), 13)
}
