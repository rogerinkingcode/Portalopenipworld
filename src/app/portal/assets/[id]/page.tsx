'use client'

/**
 * A ficha de UM ativo, na visão do cliente — o "processo aberto".
 *
 * Organizada em SUB-ABAS, não numa página longa. É o padrão da casa (`feedback_ux_patterns`
 * item 1: *"quando uma aba tem múltiplos segmentos, usar sub-tabs internas — não uma página
 * longa com scroll"*), e aqui ele resolve um problema concreto: identidade, ameaça, documento
 * e contratação são quatro naturezas diferentes, e empilhá-las obriga a rolar por três para
 * chegar na quarta.
 *
 * A abertura responde **"em que pé está?"** — situação, prazos, cadastro, histórico. O resto
 * tem aba própria, com o contador visível, para ninguém precisar entrar só para descobrir que
 * está vazio.
 *
 * ⚠️ Lê **só** da projeção auditada: procedência de campo, prazo interno, agente correspondente,
 *    valor de serviço e nota interna nem chegam até aqui.
 */

import Link from 'next/link'
import { linkDoArquivo } from '@/componentes/Documentos'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, Suspense } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { Bandeira } from '@/componentes/Bandeira'
import { CardAmeacaCompacta } from '@/componentes/AmeacaCompacta'
import { CardPrazo } from '@/componentes/CardPrazo'
import { Vazio, BotaoVoltar, LinkIcone, IconeBaixar } from '@/componentes/ui'
import { montarAmeacas } from '@/lib/ameacas'
import { VIGENCIA_POR_ESPECIE, rotuloEspecie, rotuloJurisdicao, rotuloPapel } from '@/lib/rotulos'
import { dataBr, estadoDoPrazo, materiaDe, nomeAtivo } from '@/lib/visao'
import { dinheiro, somarInvestimento } from '@/lib/investimento'
import { EsqAtivo } from '@/componentes/EsqueletosDasPaginas'

const TIPO_DOC: Record<string, string> = {
  certificado: 'Certificado de registro',
  procuracao: 'Procuração',
  contrato: 'Contrato',
  proposta: 'Proposta',
  relatorio_colidencia: 'Parecer de colidência',
  carta_agente: 'Carta do correspondente',
  peticao: 'Petição',
  comprovante: 'Comprovante',
  publicacao: 'Publicação oficial',
  outro: 'Documento',
}

const ESTADO_SERVICO: Record<string, string> = {
  proposta: 'Proposta enviada',
  negociacao: 'Em negociação',
  contratado: 'Contratado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  perdido: 'Não seguiu',
}

type Sub = 'geral' | 'ameacas' | 'documentos' | 'servicos'

function FichaDoAtivoCliente() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const params = useSearchParams()
  const { visao, hoje } = useCliente()

  /*
   * A sub-aba vive no ENDEREÇO, não só no estado. Assim um link de fora abre direto na aba
   * certa (o aviso de ameaça leva ao ativo já na aba de ameaças) e o botão "voltar" do
   * navegador desfaz a troca de aba, que é o que a pessoa espera dele.
   */
  const sub = (params.get('ver') as Sub | null) ?? 'geral'
  const irPara = (s: Sub) =>
    router.replace(s === 'geral' ? `/portal/assets/${id}` : `/portal/assets/${id}?ver=${s}`, {
      scroll: false,
    })

  const d = useMemo(() => {
    if (!visao) return null
    const ativo = visao.ativos.find((a) => a.ativo_id === id)
    if (!ativo) return null
    const nomes = new Map(visao.pessoas.map((p) => [p.pessoa_id, p]))
    return {
      ativo,
      papeis: visao.vinculos
        .filter((v) => v.ativo_id === ativo.ativo_id)
        .map((v) => ({ ...v, pessoa: nomes.get(v.pessoa_id) }))
        .filter((v) => v.pessoa),
      eventos: visao.eventos
        .filter((e) => e.ativo_id === ativo.ativo_id)
        .sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em)),
      prazos: visao.prazos
        .filter((p) => p.ativo_id === ativo.ativo_id)
        .sort((a, b) => a.vence_em.localeCompare(b.vence_em)),
      documentos: visao.documentos.filter((x) => x.ativo_id === ativo.ativo_id),
      servicos: visao.servicos.filter((s) => s.ativo_ids.includes(ativo.ativo_id)),
      ameacas: montarAmeacas(visao).filter((a) => a.ativo_id === ativo.ativo_id),
    }
  }, [visao, id])

  if (!visao) return null
  if (!d) {
    return (
      <Vazio
        titulo="Ativo não encontrado"
        detalhe="Este identificador não está no seu portfólio."
        acao={
          <BotaoVoltar href="/portal/assets">Voltar para Meus ativos</BotaoVoltar>
        }
      />
    )
  }

  const { ativo } = d
  const materia = materiaDe(ativo.especie)
  const classes = ativo.marca?.classes ?? []
  const emAberto = d.prazos.filter((p) => {
    const e = estadoDoPrazo(p, hoje)
    return e === 'aberto' || e === 'vencido'
  })

  const abas: { id: Sub; rotulo: string; n?: number }[] = [
    { id: 'geral', rotulo: 'Visão geral' },
    { id: 'ameacas', rotulo: 'Ameaças', n: d.ameacas.length },
    { id: 'documentos', rotulo: 'Documentos', n: d.documentos.length },
    { id: 'servicos', rotulo: 'Contratações', n: d.servicos.length },
  ]

  return (
    <>
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <BotaoVoltar href="/portal/assets">Voltar para Meus ativos</BotaoVoltar>
          <h1
            className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[22px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            <Bandeira j={ativo.jurisdicao} grande />
            {nomeAtivo(ativo)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--tx2)]">
            <span title={VIGENCIA_POR_ESPECIE[ativo.especie]}>{rotuloEspecie(ativo.especie)}</span>
            <span className="text-[var(--tx3)]">·</span>
            <span>{rotuloJurisdicao(ativo.jurisdicao)}</span>
            {ativo.identificadores[0] && (
              <>
                <span className="text-[var(--tx3)]">·</span>
                <span className="num">{ativo.identificadores[0].valor_bruto}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {ativo.vigilancia.ativa ? (
            <span
              className="pill pill-ok"
              title={`Cruzamos toda publicação nova desta base contra este ativo. Última leitura: ${dataBr(ativo.vigilancia.atualizado_em)}`}
            >
              Vigilância ativa
              {ativo.vigilancia.atualizado_em && (
                <span className="num"> · {dataBr(ativo.vigilancia.atualizado_em)}</span>
              )}
            </span>
          ) : (
            <span className="pill pill-neu">Sem leitura automática</span>
          )}
          {!ativo.vigilancia.ativa && ativo.vigilancia.motivo && (
            <span className="max-w-[300px] text-right text-[10px] leading-snug text-[var(--tx3)]">
              {ativo.vigilancia.motivo}
            </span>
          )}
        </div>
      </header>

      {/* ── Situação: a resposta de uma linha. Fica FORA das abas, porque vale
             para todas elas. ─────────────────────────────────────────────── */}
      <div className={`card chip-mat mat-${materia} mt-4 px-4 py-3`}>
        <span className="rotulo">Situação</span>
        <p className="mt-1 text-[14px] font-medium text-[var(--tx)]">{ativo.situacao.texto}</p>
      </div>

      {/* ── Sub-abas ────────────────────────────────────────────────────── */}
      <div className="mt-4 overflow-x-auto">
        <div className="seg w-max">
          {abas.map((x) => (
            <button
              key={x.id}
              data-on={sub === x.id ? 'sim' : 'nao'}
              onClick={() => irPara(x.id)}
              className="whitespace-nowrap"
            >
              {x.rotulo}
              {x.n !== undefined && (
                <span
                  className={`num ml-1.5 ${sub === x.id ? 'opacity-80' : 'text-[var(--tx3)]'}`}
                >
                  {x.n}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ VISÃO GERAL ═══════════════════════════════════════════════════ */}
      {sub === 'geral' && (
        <>
          {/* Prazos em largura inteira e no topo da aba: é o único bloco com data, e
              data é o que decide se ainda dá tempo de agir. */}
          <section className="card mt-4 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="sec">Prazos</h2>
              {emAberto.length > 0 && (
                <span className="text-[10.5px] text-[var(--tx3)]">
                  <span className="num">{emAberto.length}</span> em aberto
                </span>
              )}
            </div>
            {d.prazos.length === 0 ? (
              <p className="mt-3 text-[12px] text-[var(--tx2)]">
                Nenhum prazo em aberto para este ativo.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {d.prazos.map((p) => (
                  /* O MESMO cartão da ficha do gestor — sem `mostrarInterno`: a antecedência
                     operacional da casa nem chega até aqui pela projeção. */
                  <CardPrazo key={p.prazo_id} p={p} hoje={hoje} />
                ))}
              </div>
            )}
          </section>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
              <section className="card p-4">
                <h2 className="sec">Identificadores</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="tb">
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Papel</th>
                        <th>Jurisdição</th>
                        <th>Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ativo.identificadores.map((i, n) => (
                        <tr key={`${i.valor_normalizado}-${n}`}>
                          <td className="num font-medium text-[var(--tx)]">{i.valor_bruto}</td>
                          <td className="text-[var(--tx2)]">{i.papel}</td>
                          <td>
                            <span className="inline-flex items-center gap-1.5">
                              <Bandeira j={i.jurisdicao} />
                              {i.jurisdicao}
                            </span>
                          </td>
                          <td className="num text-[var(--tx2)]">{dataBr(i.desde)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {classes.length > 0 && (
                <section className="card p-4">
                  <h2 className="sec">Classes e especificação</h2>
                  <div className="mt-3 flex flex-col gap-2">
                    {classes.map((c) => (
                      <div key={c.codigo} className="rounded-lg border border-[var(--linha)] p-3">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            className="text-[13px] font-semibold text-[var(--tx)]"
                            style={{ fontFamily: 'var(--font-titulo)' }}
                          >
                            Classe <span className="num">{c.codigo}</span>
                          </span>
                          {c.edicao_ncl && (
                            <span className="num text-[10px] text-[var(--tx3)]">
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
                    {d.eventos.length} {d.eventos.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>
                {d.eventos.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[var(--tx2)]">
                    Nenhum andamento publicado para este ativo ainda.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col">
                    {d.eventos.map((e, i) => (
                      <div key={e.evento_id} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1.5">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ background: 'var(--color-ciano)' }}
                          />
                          {i < d.eventos.length - 1 && (
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
              </section>
            </div>

            <div className="flex flex-col gap-4">
              <section className="card p-4">
                <h2 className="sec">Datas</h2>
                <dl className="mt-3 flex flex-col gap-2 text-[12px]">
                  <Data r="Depósito" v={ativo.datas.deposito} />
                  <Data r="Publicação" v={ativo.datas.publicacao} />
                  <Data r="Concessão" v={ativo.datas.concessao} />
                  <Data r="Vigência até" v={ativo.datas.vigencia_ate} destaque />
                </dl>
                {VIGENCIA_POR_ESPECIE[ativo.especie] && (
                  <p className="mt-2.5 border-t border-[var(--linha)] pt-2 text-[10.5px] leading-snug text-[var(--tx3)]">
                    {VIGENCIA_POR_ESPECIE[ativo.especie]}
                  </p>
                )}
              </section>

              <section className="card p-4">
                <h2 className="sec">Pessoas e papéis</h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {d.papeis.map((v) => (
                    <div key={`${v.pessoa_id}-${v.papel}`}>
                      <div className="text-[12px] font-medium text-[var(--tx)]">
                        {v.pessoa!.nome}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="pill pill-neu">{rotuloPapel(v.papel)}</span>
                        {v.desde && (
                          <span className="num text-[10px] text-[var(--tx3)]">
                            desde {dataBr(v.desde)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* ═══ AMEAÇAS ═══════════════════════════════════════════════════════ */}
      {sub === 'ameacas' && (
        <section className="mt-4">
          {d.ameacas.length === 0 ? (
            <div className="card p-6">
              <h2
                className="text-[14px] font-semibold text-[var(--tx)]"
                style={{ fontFamily: 'var(--font-titulo)' }}
              >
                Nenhuma ameaça contra este ativo.
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--tx2)]">
                {ativo.vigilancia.ativa ? (
                  <>
                    Cruzamos cada publicação nova desta base contra ele
                    {ativo.vigilancia.atualizado_em && (
                      <>
                        {' '}
                        — a última leitura foi em{' '}
                        <span className="num">{dataBr(ativo.vigilancia.atualizado_em)}</span>
                      </>
                    )}
                    . Nada exigiu ação.
                  </>
                ) : (
                  <>
                    ⚠️ Este ativo{' '}
                    <strong className="text-[var(--tx)]">não tem leitura automática</strong>
                    {ativo.vigilancia.motivo ? ` — ${ativo.vigilancia.motivo}` : ''}. O silêncio
                    aqui é <strong className="text-[var(--tx)]">ausência de olho</strong>, não
                    ausência de risco.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {d.ameacas.map((a) => (
                <CardAmeacaCompacta
                  key={a.colidencia_id}
                  a={a}
                  hoje={hoje}
                  href={`/portal/threats/${a.colidencia_id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ DOCUMENTOS ════════════════════════════════════════════════════ */}
      {sub === 'documentos' && (
        <section className="mt-4">
          {d.documentos.length === 0 ? (
            <Vazio
              titulo="Nenhum documento deste processo"
              detalhe="Certificados, pareceres e cartas aparecem aqui à medida que são emitidos."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {d.documentos.map((x) => (
                <div key={x.documento_id} className="card flex items-center gap-3 p-3">
                  <span
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[11px] font-semibold"
                    style={{
                      background: 'rgba(0,224,246,.1)',
                      color: 'var(--color-petrol-cla)',
                      fontFamily: 'var(--font-titulo)',
                    }}
                  >
                    {x.mime?.includes('pdf') ? 'PDF' : '▤'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-[var(--tx)]">
                      {x.nome}
                    </span>
                    <span className="text-[10.5px] text-[var(--tx3)]">
                      {TIPO_DOC[x.tipo] ?? x.tipo}
                      {x.idioma && ` · ${x.idioma.toUpperCase()}`}
                    </span>
                  </span>
                  <LinkIcone href={linkDoArquivo(x.documento_id)} rotulo={`Baixar ${x.nome}`} baixar>
                    <IconeBaixar />
                  </LinkIcone>
                </div>
              ))}
            </div>
          )}
          <div className="nota mt-4">
            Os arquivos ficam guardados com o escritório e são entregues por canal autenticado.{' '}
            <Link
              href={`/portal/documents?ativo=${ativo.ativo_id}`}
              className="font-semibold text-[var(--color-petrol-cla)]"
            >
              ver no acervo completo →
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CONTRATAÇÕES ══════════════════════════════════════════════════ */}
      {sub === 'servicos' && (
        <section className="mt-4">
          {d.servicos.length === 0 ? (
            <Vazio
              titulo="Nenhuma contratação registrada para este ativo"
              detalhe="Serviços contratados sobre este processo aparecem aqui, da proposta à conclusão."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {/* O total deste ativo. Fica no topo porque é a resposta da aba; as linhas
                  abaixo são a memória de cálculo. */}
              {(() => {
                const inv = somarInvestimento(d.servicos)
                if (inv.porMoeda.length === 0) return null
                return (
                  <div className="card mb-1 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <span className="rotulo">Investido neste ativo</span>
                        <div className="mt-1 flex flex-wrap items-baseline gap-3">
                          {inv.porMoeda.map((m) => (
                            <span key={m.moeda} className="num-g text-[22px] text-[var(--tx)]">
                              {dinheiro(m.total, m.moeda)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-[10.5px] leading-relaxed text-[var(--tx2)]">
                        {inv.porMoeda.map((m) => (
                          <div key={m.moeda}>
                            honorários <span className="num">{dinheiro(m.honorario, m.moeda)}</span>
                            {' · '}taxas oficiais{' '}
                            <span className="num">{dinheiro(m.taxaOficial, m.moeda)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {inv.semValor > 0 && (
                      <p className="mt-2 border-t border-[var(--linha)] pt-2 text-[10.5px] leading-snug text-[var(--color-alerta)]">
                        ⚠ <span className="num">{inv.semValor}</span>{' '}
                        {inv.semValor === 1 ? 'contratação ainda não tem' : 'contratações ainda não têm'}{' '}
                        valor conferido e {inv.semValor === 1 ? 'está fora' : 'estão fora'} desta
                        soma. O total abaixo é um piso, não o custo fechado.
                      </p>
                    )}
                  </div>
                )
              })()}
              {d.servicos.map((s) => (
                <div key={s.servico_id} className="card p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[12.5px] font-semibold text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {s.tipo}
                    </span>
                    <span className="pill pill-neu">{ESTADO_SERVICO[s.estado] ?? s.estado}</span>
                    {s.materia?.map((m) => (
                      <span key={m} className="pill pill-neu">
                        {m}
                      </span>
                    ))}
                  </div>
                  {s.valor ? (
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--linha)] pt-2">
                      <span className="num-g text-[15px] text-[var(--tx)]">
                        {dinheiro(s.valor.total, s.valor.moeda)}
                      </span>
                      {s.valor.honorario !== undefined && (
                        <span className="text-[10.5px] text-[var(--tx2)]">
                          honorários{' '}
                          <span className="num">{dinheiro(s.valor.honorario, s.valor.moeda)}</span>
                        </span>
                      )}
                      {s.valor.taxa_oficial !== undefined && s.valor.taxa_oficial > 0 && (
                        <span
                          className="text-[10.5px] text-[var(--tx2)]"
                          title="repasse ao INPI ou a escritório no exterior — não é receita do escritório"
                        >
                          taxas oficiais{' '}
                          <span className="num">{dinheiro(s.valor.taxa_oficial, s.valor.moeda)}</span>
                        </span>
                      )}
                      <span
                        className="pill pill-neu"
                        title={
                          s.valor.origem === 'nota_fiscal'
                            ? 'valor da nota fiscal emitida'
                            : s.valor.origem === 'cobranca'
                              ? 'valor da cobrança gerada — pode mudar até a emissão'
                              : 'valor informado pela equipe, ainda sem documento'
                        }
                      >
                        {s.valor.origem === 'nota_fiscal'
                          ? 'nota emitida'
                          : s.valor.origem === 'cobranca'
                            ? 'cobrança'
                            : 'informado'}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 border-t border-[var(--linha)] pt-2 text-[10.5px] text-[var(--tx3)]">
                      valor ainda não conferido
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[10.5px] text-[var(--tx3)]">
                    {s.datas?.abertura && (
                      <span>
                        aberto <span className="num">{dataBr(s.datas.abertura)}</span>
                      </span>
                    )}
                    {s.datas?.conclusao && (
                      <span>
                        concluído <span className="num">{dataBr(s.datas.conclusao)}</span>
                      </span>
                    )}
                    {s.paises && s.paises.length > 0 && (
                      <span className="flex items-center gap-1">
                        {s.paises.map((p) => (
                          <Bandeira key={p} j={p} />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

function Data({ r, v, destaque }: { r: string; v?: string | null; destaque?: boolean }) {
  if (!v) return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--tx2)]">{r}</dt>
      <dd
        className="num font-semibold"
        style={{ color: destaque ? 'var(--color-petrol-cla)' : 'var(--tx)' }}
      >
        {dataBr(v)}
      </dd>
    </div>
  )
}

/**
 * `useSearchParams` exige um limite de Suspense para a rota poder ser pré-renderizada —
 * sem ele o `next build` falha na geração estática desta página. O recuo é só uma linha:
 * o conteúdo aparece assim que o roteador resolve a query, no mesmo quadro.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<EsqAtivo />}>
      <FichaDoAtivoCliente />
    </Suspense>
  )
}
