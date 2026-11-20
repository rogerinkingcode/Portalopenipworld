'use client'

/** Prazos — visão do gestor. Lista e calendário; o interno aparece só aqui. */

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { CardPrazoLargo } from '@/componentes/CardPrazoLargo'
import { Calendario, type ItemCalendario } from '@/componentes/Calendario'
import { AvisoCompletude, Vazio } from '@/componentes/ui'
import { Paginacao, usePaginacao } from '@/componentes/Paginacao'
import {
  ESTADO_PRAZO_ROTULO,
  dataBr,
  diasAte,
  estadoDoPrazo,
  nomeAtivo,
  type EstadoPrazo,
} from '@/lib/visao'
import { EsqPrazos } from '@/componentes/EsqueletosDasPaginas'

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

/** `useSearchParams` exige Suspense para a rota poder ser pré-renderizada. */
export default function Pagina() {
  return (
    <Suspense fallback={<EsqPrazos />}>
      <Prazos />
    </Suspense>
  )
}

function Prazos() {
  const { pacote, carregando, hoje } = usePortfolio()
  const [forma, setForma] = useState<'lista' | 'calendario'>('lista')
  // Padrão "todos": o portfólio inteiro primeiro, o recorte depois. Havia um "ocultar
  // vencidos" ligado por padrão — esconder sem contar é a outra ponta da desonestidade.
  // `?estado=` vem dos atalhos do Painel ("prazos a tratar" abre direto no recorte).
  const pedido = useSearchParams().get('estado')
  const [estado, setEstado] = useState<EstadoPrazo | 'todos'>(
    pedido && pedido in ESTADO_PRAZO_ROTULO ? (pedido as EstadoPrazo) : 'todos',
  )

  const todas = useMemo(() => {
    const ativos = new Map(pacote.ativos.map((a) => [a.ativo_id, a]))
    return pacote.prazos
      .map((p) => ({
        prazo: p,
        ativo: ativos.get(p.ativo_id),
        dias: diasAte(p.vence_em, hoje),
        estado: estadoDoPrazo(p, hoje),
      }))
      .sort((a, b) => a.prazo.vence_em.localeCompare(b.prazo.vence_em))
  }, [pacote, hoje])

  const contagem = useMemo(() => {
    const c: Record<EstadoPrazo, number> = { a_abrir: 0, aberto: 0, vencido: 0, cumprido: 0 }
    for (const l of todas) c[l.estado] += 1
    return c
  }, [todas])

  const linhas = useMemo(
    () => (estado === 'todos' ? todas : todas.filter((l) => l.estado === estado)),
    [todas, estado],
  )
  const paginacao = usePaginacao(linhas.length)

  function mudarEstado(e: EstadoPrazo | 'todos') {
    setEstado(e)
    paginacao.voltarAoInicio()
  }

  const itens: ItemCalendario[] = useMemo(
    () =>
      pacote.prazos
        .filter((p) => !p.cumprido)
        .map((p) => {
          const at = pacote.ativos.find((a) => a.ativo_id === p.ativo_id)
          return {
            id: p.prazo_id,
            data: p.vence_em,
            titulo: p.regua.nome,
            detalhe: at ? nomeAtivo(at) : undefined,
            firme: p.firmeza === 'legal',
          }
        }),
    [pacote],
  )

  const estimados = pacote.prazos.filter((p) => p.firmeza === 'estimado').length

  if (carregando) return <EsqPrazos />
  if (pacote.prazos.length === 0)
    return (
      <Vazio
        titulo="Nenhum prazo derivado"
        detalhe="Prazos nascem dos despachos e das datas da carteira: o servidor os calcula a cada importação e uma vez por dia. Importe a carteira (busca no INPI ou planilha) para que eles apareçam."
      />
    )

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
            <span className="num">{todas.length}</span> no portfólio ·{' '}
            <span className="num">{contagem.aberto}</span> em aberto · calculados para hoje,{' '}
            <span className="num">{dataBr(hoje)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {estimados > 0 && (
        <p
          className="mt-4 rounded-lg px-3.5 py-2.5 text-[11.5px] leading-snug"
          style={{
            background: 'rgba(230,138,0,.1)',
            border: '1px solid rgba(230,138,0,.24)',
            color: 'var(--color-alerta)',
          }}
        >
          ⚠️{' '}
          <strong>
            <span className="num">{estimados}</span> prazo{estimados === 1 ? '' : 's'} com régua
            ESTIMADA.
          </strong>{' '}
          Anuidade e prorrogação não têm regra escrita na casa — as datas abaixo vêm de uma régua
          ainda não confirmada. Confira na fonte oficial antes de agir.
        </p>
      )}

      {/* Recorte por estado, com a contagem visível em cada chip: um prazo pode ainda não
          ter aberto (prorrogação decenal, caducidade), estar correndo, ter vencido ou ter
          sido cumprido — e as quatro coisas não disputam a mesma lista. */}
      {forma === 'lista' && todas.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rotulo mr-0.5">mostrar</span>
          <ChipEstado on={estado === 'todos'} onClick={() => mudarEstado('todos')} n={todas.length}>
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
        <section className="card mt-4 p-4">
          <Calendario itens={itens} hoje={hoje} aoClicar={() => setForma('lista')} />
        </section>
      ) : (
        <>
          {/* O MESMO cartão do portal. O Gui: "Prazos do cliente está melhor que o do gestor,
              melhor aplicar o mesmo modelo de cliente para o gestor." A diferença é só o
              `mostrarInterno` — a antecedência da casa não atravessa a projeção do cliente. */}
          <div className="mt-4 flex flex-col gap-2.5">
            {paginacao.fatia(linhas).map(({ prazo, ativo }) => (
              <CardPrazoLargo
                key={prazo.prazo_id}
                p={prazo}
                hoje={hoje}
                ativo={ativo ? { jurisdicao: ativo.jurisdicao, nome: nomeAtivo(ativo) } : undefined}
                href={ativo ? `/assets/${ativo.ativo_id}` : undefined}
                mostrarInterno
              />
            ))}
          </div>
          <Paginacao {...paginacao.props} />

          <section className="card mt-3 p-4">
            <AvisoCompletude {...pacote.completude.prazos} />
            <p className="text-[11px] leading-snug text-[var(--tx2)]">
              A contagem de dias é calculada agora, com hoje ={' '}
              <span className="num">{dataBr(hoje)}</span>. Não está gravada em lugar nenhum — um
              número desses vale por 24 horas. A data marcada{' '}
              <strong className="text-[var(--tx)]">interno</strong> é a antecedência operacional da
              casa e não aparece no portal do cliente.
            </p>
          </section>
        </>
      )}
    </>
  )
}
