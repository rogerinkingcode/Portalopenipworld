'use client'

/**
 * Filtro que aparece **quando faz falta**, não sempre.
 *
 * Pedido do Gui: *"de forma intuitiva quando houver, para não ficar uma lista gigante e misturada
 * com vários ativos e várias jurisdições"*.
 *
 * A regra: um filtro só se justifica quando há mais de uma opção real E a lista é longa o bastante
 * para caber fora da tela. Com dois itens visíveis de uma vez, o filtro custa mais do que resolve —
 * a pessoa varre com o olho mais rápido do que clica.
 *
 * Também é honesto sobre o que sobrou: quando um filtro está ligado, a tela diz quantos itens está
 * escondendo. Lista filtrada silenciosamente é a forma mais fácil de alguém concluir que "não tem
 * nada" quando na verdade tem.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bandeira } from './Bandeira'
import { normalizarBusca } from './BuscaPessoa'
import { valeFiltrar, type Opcao } from '@/lib/filtro'

/**
 * Acima disto as opções deixam de ser botões soltos (viravam uma "nuvem" de dezenas de chips)
 * e passam a ser um seletor com busca: uma linha por opção, com a contagem à direita.
 */
export const LIMITE_CHIPS = 8

export type { Opcao }
export { LIMIAR_FILTRO, contar } from '@/lib/filtro'

export function BarraDeFiltro({
  titulo,
  opcoes,
  escolhido,
  aoEscolher,
  totalSemFiltro,
  totalComFiltro,
  forcar = false,
}: {
  titulo: string
  opcoes: Opcao[]
  escolhido: string | null
  aoEscolher: (v: string | null) => void
  totalSemFiltro: number
  totalComFiltro: number
  /** mostra a barra mesmo abaixo do limiar — para quando o filtro já está ligado */
  forcar?: boolean
}) {
  if (!valeFiltrar({ opcoes: opcoes.length, escolhido, total: totalSemFiltro, forcar })) return null

  if (opcoes.length > LIMITE_CHIPS) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rotulo mr-0.5">{titulo}</span>
        <SeletorComBusca
          titulo={titulo}
          opcoes={opcoes}
          escolhido={escolhido}
          aoEscolher={aoEscolher}
          totalSemFiltro={totalSemFiltro}
        />
        {escolhido && totalComFiltro < totalSemFiltro && (
          <span className="text-[10.5px] text-[var(--tx3)]">
            <span className="num">{totalSemFiltro - totalComFiltro}</span>{' '}
            {totalSemFiltro - totalComFiltro === 1 ? 'item oculto' : 'itens ocultos'} pelo filtro
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="rotulo mr-0.5">{titulo}</span>

      <button
        onClick={() => aoEscolher(null)}
        className="rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition"
        style={{
          fontFamily: 'var(--font-titulo)',
          borderColor: escolhido === null ? 'var(--color-ciano)' : 'var(--brd)',
          background: escolhido === null ? 'rgba(0,224,246,.1)' : 'transparent',
          color: escolhido === null ? 'var(--tx)' : 'var(--tx2)',
        }}
      >
        Todos <span className="num">{totalSemFiltro}</span>
      </button>

      {opcoes.map((o) => {
        const on = escolhido === o.valor
        return (
          <button
            key={o.valor}
            onClick={() => aoEscolher(on ? null : o.valor)}
            title={o.rotulo}
            className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition"
            style={{
              fontFamily: 'var(--font-titulo)',
              borderColor: on ? 'var(--color-ciano)' : 'var(--brd)',
              background: on ? 'rgba(0,224,246,.1)' : 'transparent',
              color: on ? 'var(--tx)' : 'var(--tx2)',
            }}
          >
            {o.jurisdicao && <Bandeira j={o.jurisdicao} />}
            <span className="truncate">{o.rotulo}</span>
            <span className="num text-[var(--tx3)]">{o.n}</span>
          </button>
        )
      })}

      {escolhido && totalComFiltro < totalSemFiltro && (
        <span className="ml-1 text-[10.5px] text-[var(--tx3)]">
          <span className="num">{totalSemFiltro - totalComFiltro}</span>{' '}
          {totalSemFiltro - totalComFiltro === 1 ? 'item oculto' : 'itens ocultos'} pelo filtro
        </span>
      )}
    </div>
  )
}

type Linha = { valor: string | null; rotulo: string; n: number; jurisdicao?: string }

/**
 * O seletor com busca: um botão que mostra a escolha atual e abre uma lista rolável, com campo
 * de busca no topo. Busca sem acento e sem caixa; Esc ou clique fora fecham; setas e Enter
 * escolhem pelo teclado.
 */
function SeletorComBusca({
  titulo,
  opcoes,
  escolhido,
  aoEscolher,
  totalSemFiltro,
}: {
  titulo: string
  opcoes: Opcao[]
  escolhido: string | null
  aoEscolher: (v: string | null) => void
  totalSemFiltro: number
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [foco, setFoco] = useState(0)
  const raiz = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  const atual = opcoes.find((o) => o.valor === escolhido)
  // A primeira linha é sempre "Todos" (valor null), depois as opções que casam com a busca.
  const linhas: Linha[] = useMemo(() => {
    const q = normalizarBusca(busca)
    const casam = q ? opcoes.filter((o) => normalizarBusca(o.rotulo).includes(q)) : opcoes
    return [{ valor: null, rotulo: 'Todos', n: totalSemFiltro }, ...casam]
  }, [opcoes, busca, totalSemFiltro])

  useEffect(() => {
    if (!aberto) return
    campo.current?.focus()
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function abrir() {
    setBusca('')
    setFoco(0)
    setAberto(true)
  }

  function escolher(v: string | null) {
    aoEscolher(v)
    setAberto(false)
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setAberto(false)
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFoco((f) => Math.min(f + 1, linhas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFoco((f) => Math.max(f - 1, 0))
    } else if (e.key === 'Enter' && linhas[foco]) {
      e.preventDefault()
      escolher(linhas[foco].valor)
    }
  }

  return (
    <div ref={raiz} className="relative">
      <button
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="inline-flex w-[min(340px,calc(100vw-6rem))] items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-[11.5px] transition"
        style={{
          fontFamily: 'var(--font-titulo)',
          borderColor: escolhido ? 'var(--color-ciano)' : 'var(--brd)',
          background: escolhido ? 'rgba(0,224,246,.1)' : 'var(--sup2)',
          color: 'var(--tx)',
        }}
      >
        {atual?.jurisdicao && <Bandeira j={atual.jurisdicao} />}
        <span className="flex-1 truncate">{atual ? atual.rotulo : `Todos (${opcoes.length} opções)`}</span>
        <span className="num text-[var(--tx3)]">{atual ? atual.n : totalSemFiltro}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
          className="flex-shrink-0 text-[var(--tx2)] transition-transform"
          style={{ transform: aberto ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div
          className="absolute left-0 z-40 mt-1.5 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl"
          style={{ background: 'var(--fundo)', border: '1px solid var(--brd)', boxShadow: 'var(--sh-forte)' }}
          onKeyDown={teclas}
        >
          <div className="border-b border-[var(--linha)] p-2">
            <input
              ref={campo}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setFoco(0)
              }}
              placeholder={`Buscar ${titulo}…`}
              className="w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-1.5 text-[12px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]"
            />
          </div>
          <ul role="listbox" className="max-h-[320px] overflow-y-auto py-1">
            {linhas.map((o, i) => {
              const on = escolhido === o.valor
              return (
                <li key={o.valor ?? '__todos'}>
                  <button
                    role="option"
                    aria-selected={on}
                    onClick={() => escolher(o.valor)}
                    onMouseEnter={() => setFoco(i)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px]"
                    style={{
                      background: i === foco ? 'var(--sup-h)' : 'transparent',
                      color: on ? 'var(--tx)' : 'var(--tx2)',
                      fontWeight: on ? 600 : 400,
                      borderTop: i === 1 ? '1px solid var(--linha)' : undefined,
                    }}
                  >
                    <span className="w-3 flex-shrink-0 text-[var(--color-ciano)]">{on ? '✓' : ''}</span>
                    {o.jurisdicao && <Bandeira j={o.jurisdicao} />}
                    <span className="flex-1 truncate" title={o.rotulo}>
                      {o.rotulo}
                    </span>
                    <span className="num rounded-md bg-[var(--trilho)] px-1.5 py-0.5 text-[10.5px] text-[var(--tx2)]">
                      {o.n}
                    </span>
                  </button>
                </li>
              )
            })}
            {linhas.length === 1 && (
              <li className="px-3 py-3 text-center text-[11.5px] text-[var(--tx3)]">
                Nada encontrado para “{busca}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

