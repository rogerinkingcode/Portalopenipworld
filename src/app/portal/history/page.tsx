'use client'

/**
 * Histórico: o que foi contratado e o que aconteceu com cada ativo.
 *
 * São duas linhas do tempo de naturezas diferentes, e a tela não as mistura:
 *   SERVIÇOS — o que o cliente contratou (vem do CRM). Inclui o que está em aberto:
 *              proposta, negociação e contrato em andamento.
 *   EVENTOS  — o que o INPI publicou sobre o ativo (vem da revista e da base).
 *
 * ⛔ Valor de serviço não vai ao cliente: o campo do CRM infla o nacional em
 *    R$ 145.153,79 e um card repete o valor do outro. Preço é conversa comercial,
 *    não linha de extrato.
 */

import { useSearchParams } from 'next/navigation'
import { useMemo, useState, Suspense } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { Bandeira } from '@/componentes/Bandeira'
import { dataBr, nomeAtivo } from '@/lib/visao'
import { EsqPortalHistorico } from '@/componentes/EsqueletosDasPaginas'

const ESTADO_PILL: Record<string, string> = {
  proposta: 'pill-neu',
  negociacao: 'pill-avi',
  contratado: 'pill-ok',
  em_andamento: 'pill-ok',
  concluido: 'pill-pos',
  cancelado: 'pill-neu',
  perdido: 'pill-neu',
}
const ESTADO_ROTULO: Record<string, string> = {
  proposta: 'Proposta enviada',
  negociacao: 'Em negociação',
  contratado: 'Contratado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  perdido: 'Não seguiu',
}

type Aba = 'servicos' | 'eventos'

function MeuHistorico() {
  const { visao } = useCliente()
  const params = useSearchParams()
  // A home linka para cá com ?ver=investimento — sem ler a URL, o clique cairia na aba errada.
  const [aba, setAba] = useState<Aba>((params.get('ver') as Aba | null) ?? 'servicos')

  const servicos = useMemo(() => {
    if (!visao) return []
    return [...visao.servicos].sort((a, b) => {
      const da = a.datas?.conclusao ?? a.datas?.abertura ?? ''
      const db = b.datas?.conclusao ?? b.datas?.abertura ?? ''
      return db.localeCompare(da)
    })
  }, [visao])

  const eventos = useMemo(() => {
    if (!visao) return []
    return [...visao.eventos].sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em))
  }, [visao])

  if (!visao) return null

  const abertos = servicos.filter((s) =>
    ['proposta', 'negociacao', 'contratado', 'em_andamento'].includes(s.estado),
  )

  return (
    <>
      <header>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Histórico
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          O que foi contratado e o que o INPI publicou. Os valores vão ficar em Investimentos, que
          ainda está em construção.
        </p>
      </header>

      <div className="seg mt-4">
        <button data-on={aba === 'servicos' ? 'sim' : 'nao'} onClick={() => setAba('servicos')}>
          Contratações ({servicos.length})
        </button>
        <button data-on={aba === 'eventos' ? 'sim' : 'nao'} onClick={() => setAba('eventos')}>
          Andamentos ({eventos.length})
        </button>
      </div>

      {aba === 'servicos' ? (
        <>
          {abertos.length > 0 && (
            <div className="nota mt-4">
              <strong className="text-[var(--tx)]">
                <span className="num">{abertos.length}</span>{' '}
                {abertos.length === 1 ? 'serviço em aberto' : 'serviços em aberto'}
              </strong>{' '}
              — proposta, negociação ou execução em andamento.
            </div>
          )}
          {servicos.length === 0 ? (
            <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
              Nenhuma contratação registrada.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {servicos.map((s) => {
                const ativos = visao.ativos.filter((a) => s.ativo_ids.includes(a.ativo_id))
                return (
                  <article key={s.servico_id} className="card p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className="text-[12.5px] font-semibold text-[var(--tx)]"
                            style={{ fontFamily: 'var(--font-titulo)' }}
                          >
                            {s.tipo}
                          </h3>
                          <span className={`pill ${ESTADO_PILL[s.estado] ?? 'pill-neu'}`}>
                            {ESTADO_ROTULO[s.estado] ?? s.estado}
                          </span>
                          {s.materia?.map((m) => (
                            <span key={m} className="pill pill-neu">
                              {m}
                            </span>
                          ))}
                        </div>
                        {ativos.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--tx2)]">
                            {ativos.map((a) => (
                              <span key={a.ativo_id} className="inline-flex items-center gap-1.5">
                                <Bandeira j={a.jurisdicao} />
                                {nomeAtivo(a)}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[10.5px] text-[var(--tx3)]">
                        {s.datas?.abertura && (
                          <div>
                            aberto <span className="num">{dataBr(s.datas.abertura)}</span>
                          </div>
                        )}
                        {s.datas?.conclusao && (
                          <div>
                            concluído <span className="num">{dataBr(s.datas.conclusao)}</span>
                          </div>
                        )}
                        {s.paises && s.paises.length > 0 && (
                          <div className="mt-1 flex justify-end gap-1">
                            {s.paises.map((p) => (
                              <Bandeira key={p} j={p} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : eventos.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          Nenhum andamento publicado.
        </p>
      ) : (
        <div className="mt-4 flex flex-col">
          {eventos.map((e, i) => {
            const at = visao.ativos.find((a) => a.ativo_id === e.ativo_id)
            return (
              <div key={e.evento_id} className="flex gap-3">
                {/* trilho da linha do tempo */}
                <div className="flex flex-col items-center pt-1.5">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: 'var(--color-ciano)' }}
                  />
                  {i < eventos.length - 1 && (
                    <span className="w-px flex-1" style={{ background: 'var(--linha)' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="num text-[11px] font-semibold text-[var(--tx)]">
                      {dataBr(e.ocorrido_em)}
                    </span>
                    <span
                      className="text-[12px] font-medium text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {e.titulo}
                    </span>
                    {e.publicacao && (
                      <span className="num text-[10px] text-[var(--tx3)]">
                        RPI {e.publicacao.revista}
                        {e.publicacao.pagina ? ` · p. ${e.publicacao.pagina}` : ''}
                      </span>
                    )}
                  </div>
                  {at && (
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-[10.5px] text-[var(--tx3)]">
                      <Bandeira j={at.jurisdicao} />
                      {nomeAtivo(at)}
                    </p>
                  )}
                  {e.texto && (
                    <p className="mt-1 text-[11.5px] leading-snug text-[var(--tx2)]">{e.texto}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function Pagina() {
  return (
    <Suspense
      fallback={<EsqPortalHistorico />}
    >
      <MeuHistorico />
    </Suspense>
  )
}
