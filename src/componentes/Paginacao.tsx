'use client'

/**
 * Paginação das listas: "Itens por página [10 ▾] · 1–10 de 37 · ← anterior · página 1 de 4 · próxima →".
 *
 * A quantidade por página vai de 10 a 100, de 10 em 10. Começa SEMPRE em 10: a escolha vive só
 * no estado da tela, de propósito — entrar de novo na página ou recarregar volta para 10.
 */

import { useCallback, useState } from 'react'

export const POR_PAGINA_PADRAO = 10
export const OPCOES_POR_PAGINA = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export function totalDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina))
}

/** A página pedida, presa ao intervalo válido (a lista pode ter encolhido com um filtro). */
export function paginaValida(pagina: number, total: number, porPagina: number): number {
  return Math.min(Math.max(0, pagina), totalDePaginas(total, porPagina) - 1)
}

export function fatiar<T>(lista: T[], pagina: number, porPagina: number): T[] {
  return lista.slice(pagina * porPagina, (pagina + 1) * porPagina)
}

/**
 * O estado da paginação de uma lista. `pag` já vem preso ao intervalo válido para `total`;
 * trocar a quantidade por página volta para a primeira página.
 */
export function usePaginacao(total: number) {
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPaginaBruto] = useState(POR_PAGINA_PADRAO)
  const pag = paginaValida(pagina, total, porPagina)
  // Estável entre renders: pode entrar em lista de dependências de efeito sem reiniciá-lo.
  const voltarAoInicio = useCallback(() => setPagina(0), [])
  return {
    pag,
    porPagina,
    setPagina,
    setPorPagina: (n: number) => {
      setPorPaginaBruto(n)
      setPagina(0)
    },
    voltarAoInicio,
    fatia: <T,>(lista: T[]) => fatiar(lista, pag, porPagina),
    /** Props prontas para o <Paginacao />. */
    props: {
      pagina: pag,
      total,
      porPagina,
      aoMudar: setPagina,
      aoMudarPorPagina: (n: number) => {
        setPorPaginaBruto(n)
        setPagina(0)
      },
    },
  }
}

export function Paginacao({
  pagina,
  total,
  porPagina,
  aoMudar,
  aoMudarPorPagina,
}: {
  pagina: number
  total: number
  porPagina: number
  aoMudar: (pagina: number) => void
  /** Sem isto, a quantidade por página é fixa e o seletor não aparece. */
  aoMudarPorPagina?: (porPagina: number) => void
}) {
  if (total === 0) return null
  const totalPaginas = totalDePaginas(total, porPagina)
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11.5px] text-[var(--tx2)]">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Com 10 ou menos itens não há o que escolher: a lista inteira já cabe na menor página. */}
        {aoMudarPorPagina && total > OPCOES_POR_PAGINA[0] && (
          <label className="flex items-center gap-2">
            <span>Itens por página</span>
            <select
              value={porPagina}
              onChange={(e) => aoMudarPorPagina(Number(e.target.value))}
              className="rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 py-1 text-[11.5px] text-[var(--tx)]"
            >
              {OPCOES_POR_PAGINA.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <span>
          <span className="num">{pagina * porPagina + 1}</span>–
          <span className="num">{Math.min((pagina + 1) * porPagina, total)}</span> de{' '}
          <span className="num">{total}</span>
        </span>
      </span>
      {totalPaginas > 1 && (
        <span className="flex items-center gap-2">
          <button
            disabled={pagina === 0}
            onClick={() => aoMudar(pagina - 1)}
            className="rounded border border-[var(--brd)] px-2.5 py-1 disabled:opacity-40"
          >
            ← anterior
          </button>
          <span>
            página <span className="num">{pagina + 1}</span> de{' '}
            <span className="num">{totalPaginas}</span>
          </span>
          <button
            disabled={pagina >= totalPaginas - 1}
            onClick={() => aoMudar(pagina + 1)}
            className="rounded border border-[var(--brd)] px-2.5 py-1 disabled:opacity-40"
          >
            próxima →
          </button>
        </span>
      )}
    </div>
  )
}
