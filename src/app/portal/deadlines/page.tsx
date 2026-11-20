'use client'

/**
 * Prazos do cliente — lista e calendário.
 * A lista responde "o que vem primeiro"; o calendário, "onde há aperto". Convivem.
 */

import { useMemo, useState } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { CardPrazoLargo } from '@/componentes/CardPrazoLargo'
import { Calendario, type ItemCalendario } from '@/componentes/Calendario'
import {
  ESTADO_PRAZO_ROTULO,
  dataBr,
  estadoDoPrazo,
  nomeAtivo,
  type EstadoPrazo,
} from '@/lib/visao'
import { Paginacao, usePaginacao } from '@/componentes/Paginacao'


function ChipEstado({
  children,
  on,
  onClick,
  n,
}: {
  children: React.ReactNode
  on: boolean
  onClick: () => void
  n: number
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition"
      style={{
        fontFamily: 'var(--font-titulo)',
        borderColor: on ? 'var(--color-ciano)' : 'var(--brd)',
        background: on ? 'rgba(0,224,246,.1)' : 'transparent',
        color: on ? 'var(--tx)' : 'var(--tx2)',
      }}
    >
      {children} <span className="num text-[var(--tx3)]">{n}</span>
    </button>
  )
}

export default function MeusPrazos() {
  const { visao, hoje } = useCliente()
  const [forma, setForma] = useState<'lista' | 'calendario'>('lista')
  const [foco, setFoco] = useState<string | null>(null)
  // "todos" é o padrão: o Gui pediu ver o portfólio inteiro e recortar depois, não o contrário.
  const [estado, setEstado] = useState<EstadoPrazo | 'todos'>('todos')

  const todos = useMemo(
    () => (visao ? [...visao.prazos].sort((a, b) => a.vence_em.localeCompare(b.vence_em)) : []),
    [visao],
  )

  const contagem = useMemo(() => {
    const c: Record<EstadoPrazo, number> = { a_abrir: 0, aberto: 0, vencido: 0, cumprido: 0 }
    for (const p of todos) c[estadoDoPrazo(p, hoje)] += 1
    return c
  }, [todos, hoje])

  const prazos = useMemo(
    () => (estado === 'todos' ? todos : todos.filter((p) => estadoDoPrazo(p, hoje) === estado)),
    [todos, estado, hoje],
  )
  const paginacao = usePaginacao(prazos.length)

  function mudarEstado(e: EstadoPrazo | 'todos') {
    setEstado(e)
    paginacao.voltarAoInicio()
  }

  const itens: ItemCalendario[] = useMemo(
    () =>
      todos
        .filter((p) => !p.cumprido)
        .map((p) => {
          const at = visao?.ativos.find((a) => a.ativo_id === p.ativo_id)
          return {
            id: p.prazo_id,
            data: p.vence_em,
            titulo: p.regua.nome,
            detalhe: at ? nomeAtivo(at) : undefined,
            firme: p.firmeza === 'legal',
          }
        }),
    [todos, visao],
  )

  if (!visao) return null

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Prazos
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{todos.length}</span> no portfólio ·{' '}
            <span className="num">{contagem.aberto}</span> em aberto · calculados para hoje,{' '}
            <span className="num">{dataBr(hoje)}</span>
          </p>
        </div>
        <div className="seg">
          <button data-on={forma === 'lista' ? 'sim' : 'nao'} onClick={() => setForma('lista')}>
            Lista
          </button>
          <button
            data-on={forma === 'calendario' ? 'sim' : 'nao'}
            onClick={() => setForma('calendario')}
          >
            Calendário
          </button>
        </div>
      </header>

      {/* Recorte por estado. "Ainda não aberto" é o que faltava: a prorrogação decenal e a
          caducidade têm data de ABERTURA, e antes dela não há o que fazer. */}
      {forma === 'lista' && todos.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rotulo mr-0.5">mostrar</span>
          <ChipEstado on={estado === 'todos'} onClick={() => mudarEstado('todos')} n={todos.length}>
            Todos
          </ChipEstado>
          {(['aberto', 'a_abrir', 'vencido', 'cumprido'] as EstadoPrazo[])
            .filter((e) => contagem[e] > 0)
            .map((e) => (
              <ChipEstado
                key={e}
                on={estado === e}
                onClick={() => mudarEstado(estado === e ? 'todos' : e)}
                n={contagem[e]}
              >
                {ESTADO_PRAZO_ROTULO[e]}
              </ChipEstado>
            ))}
        </div>
      )}

      {forma === 'calendario' ? (
        <section className="card mt-5 p-4">
          <Calendario
            itens={itens}
            hoje={hoje}
            aoClicar={(id) => {
              // Abre a lista inteira na página em que o prazo clicado está.
              const i = todos.findIndex((p) => p.prazo_id === id)
              setEstado('todos')
              paginacao.setPagina(i >= 0 ? Math.floor(i / paginacao.porPagina) : 0)
              setFoco(id)
              setForma('lista')
            }}
          />
        </section>
      ) : prazos.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          {todos.length === 0 ? 'Nenhum prazo registrado.' : 'Nenhum prazo neste estado.'}
        </p>
      ) : (
        <>
        <div className="mt-5 flex flex-col gap-2.5">
          {paginacao.fatia(prazos).map((p) => {
            const at = visao.ativos.find((a) => a.ativo_id === p.ativo_id)
            return (
              /* O MESMO cartão do gestor — um componente só, para não voltarem a divergir. */
              <CardPrazoLargo
                key={p.prazo_id}
                p={p}
                hoje={hoje}
                ativo={at ? { jurisdicao: at.jurisdicao, nome: nomeAtivo(at) } : undefined}
                href={at ? `/portal/assets/${at.ativo_id}` : undefined}
                destacado={foco === p.prazo_id}
              />
            )
          })}
        </div>
        <Paginacao {...paginacao.props} />
        </>
      )}
    </>
  )
}
