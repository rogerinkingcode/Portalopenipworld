'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, Suspense } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { AvisoCompletude, CarimboVigilancia, Cartao, Chip, Vazio, BotaoVoltar } from '@/componentes/ui'
import { dataBr } from '@/lib/tempo'
import { estadoDoPrazo, prazoATratar } from '@/lib/visao'
import { Bandeira } from '@/componentes/Bandeira'
import { CardPrazo } from '@/componentes/CardPrazo'
import { ControleVigilancia } from '@/componentes/ControleVigilancia'
import { AcoesDocumento, EnviarDocumento } from '@/componentes/Documentos'
import { EXPLICA_PAPEL, rotuloDocumento, rotuloEspecie, rotuloFonte, rotuloJurisdicao, rotuloPapel, VIGENCIA_POR_ESPECIE } from '@/lib/rotulos'
import { EsqAtivo } from '@/componentes/EsqueletosDasPaginas'

type Sub = 'geral' | 'ameacas' | 'documentos' | 'servicos'

function FichaDoAtivo() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const params = useSearchParams()

  /*
   * A sub-aba vive no ENDEREÇO: um link de fora abre direto na aba certa, e o "voltar" do
   * navegador desfaz a troca de aba — que é o que a pessoa espera dele.
   */
  const sub = (params.get('ver') as Sub | null) ?? 'geral'
  const irPara = (x: Sub) =>
    router.replace(x === 'geral' ? `/assets/${id}` : `/assets/${id}?ver=${x}`, { scroll: false })
  const { pacote, carregando, hoje } = usePortfolio()

  const ativo = pacote.ativos.find((a) => a.ativo_id === id)

  const dados = useMemo(() => {
    if (!ativo) return null
    const nomes = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p]))
    return {
      vinculos: pacote.vinculos
        .filter((v) => v.ativo_id === ativo.ativo_id)
        .map((v) => ({ ...v, pessoa: nomes.get(v.pessoa_id) })),
      eventos: pacote.eventos
        .filter((e) => e.ativo_id === ativo.ativo_id)
        .sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em)),
      prazos: pacote.prazos
        .filter((p) => p.ativo_id === ativo.ativo_id)
        .sort((a, b) => a.vence_em.localeCompare(b.vence_em)),
      documentos: pacote.documentos.filter((d) => d.ativo_id === ativo.ativo_id),
      servicos: pacote.servicos.filter((s) => s.ativo_ids.includes(ativo.ativo_id)),
      colidencias: pacote.colidencias.filter((c) => c.ativo_id === ativo.ativo_id),
    }
  }, [ativo, pacote])

  if (carregando) return <EsqAtivo />
  if (!ativo || !dados)
    return <Vazio titulo="Ativo não encontrado" detalhe="O identificador não existe neste portfólio." />

  const semTitular = ativo.pendencias.some((p) => p.tipo === 'titular_anonimo')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BotaoVoltar href="/assets">Voltar para Ativos</BotaoVoltar>
          <h1
            className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[22px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            <Bandeira j={ativo.jurisdicao} grande />
            {ativo.marca?.nome ?? ativo.patente?.titulo ?? '(sem nome)'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-tx2">
            <span title={VIGENCIA_POR_ESPECIE[ativo.especie]}>{rotuloEspecie(ativo.especie)}</span>
            <span>·</span>
            <span>{rotuloJurisdicao(ativo.jurisdicao)}</span>
            {ativo.identificadores[0] && (
              <>
                <span className="text-[var(--tx3)]">·</span>
                <span className="num">{ativo.identificadores[0].valor_bruto}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CarimboVigilancia vigilancia={ativo.vigilancia} />
          <Chip tom="neutro" titulo={`De onde veio este registro: ${rotuloFonte(ativo.fonte)}`}>
            {rotuloFonte(ativo.fonte)}
          </Chip>
        </div>
      </div>

      {!ativo.vigilancia.ativa && (
        <p className="rounded border border-[#f3ddb5] bg-[#fdf3e3] px-3 py-2 text-[12.5px] text-alerta">
          ⚠️ <strong>Este ativo não está sob vigilância automática.</strong> {ativo.vigilancia.motivo}
        </p>
      )}
      <ControleVigilancia ativoId={ativo.ativo_id} vigilancia={ativo.vigilancia} />

      {semTitular && (
        <p className="rounded border border-[#f0c8c3] bg-[#fbeae8] px-3 py-2 text-[12.5px] text-erro">
          ⚠️ <strong>Titular não identificado.</strong> Enquanto não houver titular, o ativo não é publicável para
          nenhum cliente. Resolva em <Link href="/reconciliation" className="underline">Conciliação</Link>.
        </p>
      )}

      {/* ── Situação: a resposta de uma linha. Fora das abas, porque vale para todas. ── */}
      <div className="card px-4 py-3">
        <span className="rotulo">Situação</span>
        <p className="mt-1 text-[14px] font-medium text-[var(--tx)]">{ativo.situacao.texto}</p>
        <p className="mt-1 text-[10.5px] text-[var(--tx3)]">
          {rotuloFonte(ativo.situacao.fonte)}
          {ativo.situacao.codigo ? ` · ${ativo.situacao.codigo}` : ''}
        </p>
      </div>

      {/* ── Sub-abas ─────────────────────────────────────────────────────────────
             Identidade, colidência, documento e contratação são quatro naturezas
             diferentes; empilhá-las obriga a rolar por três para chegar na quarta. É o
             padrão da casa e o mesmo da visão do cliente. */}
      <div className="overflow-x-auto">
        <div className="seg w-max">
          {ABAS.map((x) => {
            const n =
              x.id === 'ameacas'
                ? dados.colidencias.length
                : x.id === 'documentos'
                  ? dados.documentos.length
                  : x.id === 'servicos'
                    ? dados.servicos.length
                    : undefined
            return (
              <button
                key={x.id}
                data-on={sub === x.id ? 'sim' : 'nao'}
                onClick={() => irPara(x.id)}
                className="whitespace-nowrap"
              >
                {x.rotulo}
                {n !== undefined && (
                  <span
                    className={`num ml-1.5 ${sub === x.id ? 'opacity-80' : 'text-[var(--tx3)]'}`}
                  >
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ VISÃO GERAL ══════════════════════════════════════════════════════ */}
      {sub === 'geral' && (
        <>
          {/* Prazos em largura inteira e no topo: é o único bloco com relógio, e data é o
              que decide se ainda dá tempo de agir. Mesma ordem da ficha do cliente. */}
          <section className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="sec">Prazos</h2>
              {dados.prazos.length > 0 && (
                <span className="num text-[10.5px] text-[var(--tx3)]">
                  {dados.prazos.filter((p) => prazoATratar(p, hoje)).length} a tratar
                  {dados.prazos.some((p) => estadoDoPrazo(p, hoje) === 'a_abrir') &&
                    ` · ${dados.prazos.filter((p) => estadoDoPrazo(p, hoje) === 'a_abrir').length} ainda não aberto(s)`}
                </span>
              )}
            </div>
            {dados.prazos.length === 0 ? (
              <p className="mt-3 text-[12px] text-[var(--tx2)]">
                Nenhum prazo derivado. Prazos nascem de eventos.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dados.prazos.map((p) => (
                  /* O MESMO cartão da ficha do cliente. A única diferença é `mostrarInterno`:
                     a antecedência operacional da casa não atravessa a projeção do cliente. */
                  <CardPrazo key={p.prazo_id} p={p} hoje={hoje} mostrarInterno />
                ))}
              </div>
            )}
            <AvisoCompletude {...pacote.completude.prazos} />
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <section className="card p-4">
                <h2 className="sec">Identificadores</h2>
                {ativo.identificadores.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[var(--tx2)]">
                    Ativo em nascimento — o número chega quando o INPI atribuir. O identificador
                    interno do portfólio <span className="num">{ativo.ativo_id}</span> não muda
                    quando isso acontecer.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="tb">
                      <thead>
                        <tr>
                          <th>Número</th>
                          <th>Tipo</th>
                          <th>Papel</th>
                          <th>Jurisdição</th>
                          <th>Fonte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ativo.identificadores.map((i, k) => (
                          <tr key={k}>
                            <td
                              className="num font-medium text-[var(--tx)]"
                              title={`como veio: ${i.valor_bruto}`}
                            >
                              {i.valor_normalizado}
                            </td>
                            <td className="text-[var(--tx2)]">{i.tipo}</td>
                            <td className="text-[var(--tx2)]">{i.papel}</td>
                            <td>
                              <span className="inline-flex items-center gap-1.5">
                                <Bandeira j={i.jurisdicao} />
                                {i.jurisdicao}
                              </span>
                            </td>
                            <td className="text-[var(--tx2)]">{rotuloFonte(i.fonte)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {ativo.marca && (
                <section className="card p-4">
                  <h2 className="sec">Classes e especificação</h2>
                  <div className="mt-3 flex flex-col gap-2">
                    {ativo.marca.classes.map((c, k) => (
                      <div key={k} className="rounded-lg border border-[var(--linha)] p-3">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            className="text-[13px] font-semibold text-[var(--tx)]"
                            style={{ fontFamily: 'var(--font-titulo)' }}
                          >
                            Classe <span className="num">{c.codigo}</span>
                          </span>
                          {c.edicao_ncl && (
                            <span
                              className="num text-[10px] text-[var(--tx3)]"
                              title="A edição da NCL é preservada: Ncl(7) ≠ Ncl(12) ≠ classificação nacional antiga"
                            >
                              {c.edicao_ncl}
                            </span>
                          )}
                          {c.status && <span className="pill pill-neu">{c.status}</span>}
                        </div>
                        {c.especificacao_bruta && (
                          <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--tx2)]">
                            {c.especificacao_bruta}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="sec">Linha do tempo</h2>
                  <span className="num text-[10.5px] text-[var(--tx3)]">
                    {dados.eventos.length} {dados.eventos.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>
                {dados.eventos.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[var(--tx2)]">
                    Nenhum evento. Importe uma RPI para trazer os despachos deste processo.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col">
                    {dados.eventos.map((e, i) => (
                      <div key={e.evento_id} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1.5">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ background: 'var(--color-ciano)' }}
                          />
                          {i < dados.eventos.length - 1 && (
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
                            {e.codigo && (
                              <span className="num text-[9.5px] text-[var(--tx3)]">{e.codigo}</span>
                            )}
                            {e.publicacao && (
                              <span className="num text-[9.5px] text-[var(--tx3)]">
                                RPI {e.publicacao.revista}
                                {e.publicacao.pagina ? ` · p. ${e.publicacao.pagina}` : ''}
                              </span>
                            )}
                            {/* Só o gestor: o cliente não recebe evento interno — a projeção o
                                REMOVE, não o etiqueta. */}
                            {!e.visivel_ao_cliente && (
                              <span
                                className="pill pill-neu"
                                title="Este evento é interno — a projeção do cliente o REMOVE, não o etiqueta"
                              >
                                interno
                              </span>
                            )}
                            {e.observacoes.length > 1 && (
                              <span
                                className="pill pill-ok"
                                title={`Visto por ${e.observacoes.length} fontes: ${e.observacoes.map((o) => rotuloFonte(o.fonte)).join(', ')}. Mesmo fato, não eventos duplicados.`}
                              >
                                {e.observacoes.length} fontes
                              </span>
                            )}
                          </div>
                          {e.texto && (
                            <p className="mt-1 text-[11.5px] leading-snug text-[var(--tx2)]">
                              {e.texto}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <AvisoCompletude {...pacote.completude.eventos} />
              </section>
            </div>

            <div className="flex flex-col gap-4">
              <section className="card p-4">
                <h2 className="sec">Datas</h2>
                <dl className="mt-3 flex flex-col gap-2 text-[12px]">
                  {(
                    [
                      ['deposito', 'Depósito'],
                      ['publicacao', 'Publicação'],
                      ['concessao', 'Concessão'],
                      ['vigencia_ate', 'Vigência até'],
                    ] as const
                  ).map(([campo, rotulo]) => {
                    const proc = ativo.datas.procedencia[campo]
                    return (
                      <div
                        key={campo}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <dt className="text-[var(--tx2)]">{rotulo}</dt>
                        <dd
                          className="num text-right font-medium text-[var(--tx)]"
                          title={
                            proc
                              ? `Fonte: ${rotuloFonte(proc.fonte)}`
                              : 'Data desconhecida — não é zero, é ausência'
                          }
                          style={
                            campo === 'vigencia_ate'
                              ? { color: 'var(--color-petrol-cla)' }
                              : undefined
                          }
                        >
                          {dataBr(ativo.datas[campo])}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
                {VIGENCIA_POR_ESPECIE[ativo.especie] && (
                  <p className="mt-2.5 border-t border-[var(--linha)] pt-2 text-[10.5px] leading-snug text-[var(--tx3)]">
                    {VIGENCIA_POR_ESPECIE[ativo.especie]}
                  </p>
                )}
              </section>

              <section className="card p-4">
                <h2 className="sec">Pessoas e papéis</h2>
                {dados.vinculos.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[var(--tx2)]">Nenhuma pessoa vinculada.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2.5">
                    {dados.vinculos.map((v) => (
                      <div key={v.vinculo_id}>
                        <div className="text-[12px] font-medium text-[var(--tx)]">
                          {v.pessoa?.nome ?? '(desconhecido)'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="pill pill-neu" title={EXPLICA_PAPEL[v.papel]}>
                            {rotuloPapel(v.papel)}
                            {v.ordem ? ` ${v.ordem}` : ''}
                          </span>
                          {v.desde && (
                            <span className="num text-[10px] text-[var(--tx3)]">
                              desde {dataBr(v.desde)}
                            </span>
                          )}
                          {/* Só o gestor: este vínculo não vai no pacote do cliente. */}
                          {!v.publicavel && (
                            <span
                              className="pill pill-avi"
                              title="Este vínculo não vai ao pacote do cliente"
                            >
                              interno
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {/* ═══ COLIDÊNCIAS ══════════════════════════════════════════════════════ */}
      {sub === 'ameacas' &&
        (dados.colidencias.length === 0 ? (
          <Cartao titulo="Colidências">
            <p className="text-[12.5px] text-tx2">
              Nenhuma colidência registrada para este ativo. Candidatas nascem do cruzamento da
              RPI e só viram ameaça depois do parecer humano.
            </p>
          </Cartao>
        ) : (
            <Cartao titulo="Colidências">
              <ul className="space-y-2">
                {dados.colidencias.map((c) => (
                  <li key={c.colidencia_id} className="rounded border border-[var(--linha)] p-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[12.5px] font-medium">
                        <span className="tabular mr-1 text-tx2">{c.caso_id}</span> {c.terceiro.marca}
                      </p>
                      <Chip tom={c.approval_status === 'approved' ? 'ok' : 'neutro'}>
                        {c.approval_status === 'approved' ? 'aprovada' : 'aguardando parecer'}
                      </Chip>
                    </div>
                    <p className="tabular mt-1 text-[10.5px] text-tx2">
                      {c.terceiro.processo} · {c.medida} · RPI {c.evento_gatilho.revista}
                    </p>
                    {c.parecer ? (
                      <p className="mt-1 text-[10.5px]">
                        Risco <strong>{c.parecer.risco}</strong> — {c.parecer.justificativa}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10.5px] text-tx2">
                        Fila de recuperação: {c.tier}. ⚠️ Isso não é risco — o risco nasce do parecer humano.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Cartao>
        ))}

      {/* ═══ DOCUMENTOS ═══════════════════════════════════════════════════════ */}
      {sub === 'documentos' && (
        <Cartao titulo="Documentos">
          <EnviarDocumento ativoFixo={ativo.ativo_id} />
          {dados.documentos.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-tx2">Nenhum documento.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {dados.documentos.map((d) => (
                <li key={d.documento_id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <span>
                    <span className="text-[var(--tx)]">{d.nome}</span>{' '}
                    <span className="text-[11px] text-tx2">· {rotuloDocumento(d.tipo)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                  <AcoesDocumento d={d} />
                  {d.publicavel ? (
                    <Chip tom="ok" titulo={`Liberado por ${d.publicavel_por} em ${dataBr(d.publicavel_em)}`}>
                      publicável
                    </Chip>
                  ) : (
                    <Chip tom="neutro" titulo="Não vai ao cliente — allowlist é positiva, por documento">
                      interno
                    </Chip>
                  )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10.5px] text-tx2">
            O cliente vê no portal só o que estiver liberado; o arquivo sai pela API autenticada, nunca por link público.
          </p>
        </Cartao>
      )}

      {/* ═══ CONTRATAÇÕES ═════════════════════════════════════════════════════ */}
      {sub === 'servicos' && (
        <Cartao titulo="Histórico de serviços">
          {dados.servicos.length === 0 ? (
            <p className="text-[12.5px] text-tx2">Nenhum serviço vinculado a este ativo.</p>
          ) : (
            <table className="tb">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Estado</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {dados.servicos.map((s) => (
                  <tr key={s.servico_id}>
                    <td className="py-1.5 pr-3" title={s.origem.titulo_bruto}>
                      {s.tipo ?? '—'}
                      {s.ativo_ids.length > 1 && (
                        <span className="ml-2 text-[10.5px] text-tx2" title="Este serviço cobre mais de um ativo">
                          (+{s.ativo_ids.length - 1})
                        </span>
                      )}
                    </td>
                    <td>{s.estado}</td>
                    <td className="tabular">{dataBr(s.datas.conclusao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <AvisoCompletude {...pacote.completude.servicos} />
        </Cartao>
      )}
    </div>
  )
}

const ABAS: { id: Sub; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'ameacas', rotulo: 'Colidências' },
  { id: 'documentos', rotulo: 'Documentos' },
  { id: 'servicos', rotulo: 'Contratações' },
]

/** `useSearchParams` exige limite de Suspense para a rota poder ser pré-renderizada. */
export default function Pagina() {
  return (
    <Suspense
      fallback={<EsqAtivo />}
    >
      <FichaDoAtivo />
    </Suspense>
  )
}
