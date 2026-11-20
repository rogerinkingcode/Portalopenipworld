'use client'

/**
 * A casa do cliente. Responde, em ordem: o que eu tenho, o que corre contra mim,
 * o que vence, e onde vocês estão olhando.
 */

import Link from 'next/link'
import { useMemo } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { Mapa, type PontoMapa } from '@/componentes/Mapa'
import { Bandeira } from '@/componentes/Bandeira'
import { Calendario, type ItemCalendario } from '@/componentes/Calendario'
import { ComoChegaAqui } from '@/componentes/Ameaca'
import { CardAmeacaCompacta } from '@/componentes/AmeacaCompacta'
import { montarAmeacas } from '@/lib/ameacas'
import { dinheiro, somarInvestimento } from '@/lib/investimento'
import { rotuloJurisdicao, rotuloFirmeza } from '@/lib/rotulos'
import {
  MATERIAS,
  dataBr,
  diasAte,
  estadoDoPrazo,
  materiaDe,
  nomeAtivo,
  textoDias,
  urgenciaDe,
  type Materia,
} from '@/lib/visao'

/**
 * Quantas ameaças a home mostra antes de mandar para a aba.
 * Três é o que cabe sem empurrar o calendário e o mapa para fora da primeira tela.
 */
const LIMITE_HOME = 3

export default function CasaDoCliente() {
  const { visao, hoje, nome: dono } = useCliente()

  const v = useMemo(() => {
    if (!visao) return null
    const porMateria = new Map<Materia, number>()
    const porJur = new Map<string, { n: number; vigiada: boolean; motivo?: string }>()
    for (const a of visao.ativos) {
      const m = materiaDe(a.especie)
      porMateria.set(m, (porMateria.get(m) ?? 0) + 1)
      const j = porJur.get(a.jurisdicao) ?? { n: 0, vigiada: false }
      j.n += 1
      if (a.vigilancia.ativa) j.vigiada = true
      else if (!j.motivo) j.motivo = a.vigilancia.motivo
      porJur.set(a.jurisdicao, j)
    }

    const ameacas = montarAmeacas(visao)
    // "Em aberto" é o que corre agora (ou venceu). A prorrogação que só abre daqui a anos é
    // ~90% dos prazos da carteira: contá-la aqui fazia o indicador dizer 40 quando são 2.
    const pendentes = visao.prazos.filter((p) => !p.cumprido)
    const emAberto = pendentes.filter((p) => {
      const e = estadoDoPrazo(p, hoje)
      return e === 'aberto' || e === 'vencido'
    })
    const proximos = [...pendentes].sort((a, b) => a.vence_em.localeCompare(b.vence_em))
    const ativoPorId = new Map(visao.ativos.map((a) => [a.ativo_id, a]))

    const pontos: PontoMapa[] = [...porJur.entries()]
      .map(([j, d]) => ({
        jurisdicao: j,
        rotulo: rotuloJurisdicao(j),
        ativos: d.n,
        vigiada: d.vigiada,
        motivo: d.motivo,
      }))
      .sort((a, b) => b.ativos - a.ativos)

    const naoVigiadas = pontos.filter((p) => !p.vigiada)
    const ultima = ameacas.map((a) => a.gatilho).sort((x, y) => y.data.localeCompare(x.data))[0]

    const itensCal: ItemCalendario[] = pendentes.map((p) => {
      const at = ativoPorId.get(p.ativo_id)
      return {
        id: p.prazo_id,
        data: p.vence_em,
        titulo: p.regua.nome,
        detalhe: at ? nomeAtivo(at) : undefined,
        firme: p.firmeza === 'legal',
      }
    })

    const investimento = somarInvestimento(visao.servicos)

    return {
      porMateria, pontos, naoVigiadas, ameacas, emAberto, proximos, ultima, itensCal, investimento, ativoPorId,
    }
  }, [visao, hoje])

  if (!visao || !v) return null
  // O dono do portal vem do servidor junto com o recorte. ⚠️ Não é `visao.pessoas[0]`: o
  // recorte traz também cotitulares e parceiros, e a ordem deles não diz quem está logado.
  const nome = dono ?? ''

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[22px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Seu portfólio
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">{nome}</p>
        </div>
      </header>

      {/* ═══ Indicadores ════════════════════════════════════════════════════ */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Ind rotulo="Ativos" valor={visao.ativos.length} rodape={`em ${v.pontos.length} ${v.pontos.length === 1 ? 'jurisdição' : 'jurisdições'}`} href="/portal/assets" />
        <Ind
          rotulo="Prazos em aberto"
          valor={v.emAberto.length}
          rodape={
            v.emAberto[0]
              ? `o próximo ${textoDias(diasAte(v.emAberto[0].vence_em, hoje)).toLowerCase()}`
              : v.proximos[0]
                ? `nenhum correndo agora · o próximo abre ${textoDias(diasAte(v.proximos[0].abre_em ?? v.proximos[0].vence_em, hoje)).toLowerCase()}`
                : 'nenhum em aberto'
          }
          href="/portal/deadlines"
        />
        {/* O custo do portfólio. Fica aqui e não numa aba separada porque, com uma leitura
            por trimestre, o cliente precisa da ordem de grandeza junto do resto — e uma aba
            só de dinheiro num portal de acompanhamento vira cobrança, não transparência.
            Quando houver série mensal de verdade, ela ganha tela própria. */}
        {/* Investimentos está em beta (trancado): o cartão mostra o número, mas não leva a lugar nenhum. */}
        <div className="card block p-4">
          <span className="rotulo">Investido no portfólio</span>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            {v.investimento.porMoeda.length === 0 ? (
              <span className="num-g text-[24px] leading-none text-[var(--tx3)]">—</span>
            ) : (
              v.investimento.porMoeda.map((m) => (
                <span key={m.moeda} className="num-g text-[24px] leading-none text-[var(--tx)]">
                  {dinheiro(m.total, m.moeda)}
                </span>
              ))
            )}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">
            {v.investimento.comValor === 0 ? (
              'Nenhuma contratação com valor conferido ainda.'
            ) : (
              <>
                <span className="num">{v.investimento.comValor}</span>{' '}
                {v.investimento.comValor === 1 ? 'contratação' : 'contratações'} desde o início
                {v.investimento.semValor > 0 && (
                  <>
                    {' · '}
                    <span className="text-[var(--color-alerta)]">
                      <span className="num">{v.investimento.semValor}</span> sem valor conferido
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <Link href="/portal/threats" className="card card-i block p-4">
          <span className="rotulo">Ameaças detectadas</span>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="num-g text-[30px] leading-none"
              style={{ color: v.ameacas.length > 0 ? 'var(--color-erro)' : 'var(--tx)' }}
            >
              {v.ameacas.length}
            </span>
            {v.ameacas.length > 0 && (
              <span className="flex gap-1">
                {['alto', 'medio', 'baixo'].map((r) => {
                  const n = v.ameacas.filter((a) => a.risco === r).length
                  if (!n) return null
                  return (
                    <span
                      key={r}
                      className={`pill ${r === 'alto' ? 'pill-neg' : r === 'medio' ? 'pill-avi' : 'pill-neu'}`}
                    >
                      {n} {r === 'medio' ? 'médio' : r}
                    </span>
                  )
                })}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">
            {v.ameacas.length === 0
              ? 'Nenhuma publicação nova exigiu ação na última leitura.'
              : 'Pedidos de terceiros que se aproximam das suas marcas, com parecer do escritório.'}
          </p>
        </Link>
      </div>

      {/* ═══ PRÓXIMOS PRAZOS ════════════════════════════════════════════════
             Em tabela e em largura inteira: é o formato que o painel do gestor já usa, lê
             melhor para várias linhas, e não disputa espaço com as ameaças — que agora moram
             no cartão de panorama, junto do que descreve o portfólio. */}
      {v.proximos.length > 0 && (
        <section className="card mt-6 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="sec">Próximos prazos</h2>
            <Link
              href="/portal/deadlines"
              className="text-[11px] font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              Ver todos e o calendário →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tb">
              <thead>
                <tr>
                  <th>Vence</th>
                  <th></th>
                  <th>Ativo</th>
                  <th>Tipo de prazo</th>
                  <th>Firmeza</th>
                </tr>
              </thead>
              <tbody>
                {v.proximos.slice(0, 6).map((p) => {
                  const at = v.ativoPorId.get(p.ativo_id)
                  const d = diasAte(p.vence_em, hoje)
                  const u = urgenciaDe(d)
                  return (
                    <tr key={p.prazo_id}>
                      <td className="num whitespace-nowrap">{dataBr(p.vence_em)}</td>
                      <td>
                        <span
                          className={`pill ${u === 'urgente' ? 'pill-neg' : u === 'atencao' ? 'pill-avi' : 'pill-neu'}`}
                        >
                          {textoDias(d)}
                        </span>
                      </td>
                      <td>
                        {at ? (
                          <Link
                            href={`/portal/assets/${at.ativo_id}`}
                            className="inline-flex items-center gap-1.5 text-[var(--tx)] hover:text-[var(--color-petrol-cla)]"
                          >
                            <Bandeira j={at.jurisdicao} />
                            <span className="truncate">{nomeAtivo(at)}</span>
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-[var(--tx2)]">{p.regua.nome}</td>
                      <td>
                        {/* A firmeza aparece SEMPRE, inclusive quando é boa. */}
                        <span
                          className={`pill ${p.firmeza === 'legal' ? 'pill-ok' : 'pill-avi'}`}
                          title={p.regua.fundamento}
                        >
                          {rotuloFirmeza(p.firmeza)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══ Calendário + ameaças ══════════════════════════════════════════
             As colunas ficam quase iguais: o confronto é LADO A LADO em toda parte, e para
             isso ele precisa de largura. Um formato só para a mesma informação vale mais que
             o aproveitamento do último pixel — quem já viu o cartão na aba de Ameaças
             reconhece este na hora, sem reaprender a lê-lo. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-4">
          <h2 className="sec">Calendário de prazos</h2>
          <div className="mt-4">
            <Calendario itens={v.itensCal} hoje={hoje} />
          </div>
        </section>

        {/* ── Ameaças, ao lado do calendário ────────────────────────────────
               As duas colunas respondem a mesma pergunta — "o que exige ação de mim" — uma
               pelo relógio, outra pelo conflito. Por isso são um PAR: mesmo cartão, mesmo
               título dentro, e a mesma altura. Um cartão que terminasse no meio da altura do
               outro leria como coisa inacabada.
               ⚠️ O confronto é o MESMO da aba de Ameaças, lado a lado, e não uma variante
                  espremida: espaço vazio dentro do cartão custa menos que dois formatos para
                  a mesma informação. Decisão do Gui em 07/09. */}
        <section className="card flex flex-col p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="sec">
              {v.ameacas.length === 1 ? 'Ameaça detectada' : 'Ameaças detectadas'}
            </h2>
            {v.ameacas.length > LIMITE_HOME && (
              <Link
                href="/portal/threats"
                className="text-[11px] font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
                style={{ fontFamily: 'var(--font-titulo)' }}
              >
                ver as {v.ameacas.length} →
              </Link>
            )}
          </div>

          {v.ameacas.length === 0 ? (
            <p className="mt-4 text-[12px] leading-relaxed text-[var(--tx2)]">
              Nenhuma publicação nova exigiu ação
              {v.ultima && (
                <>
                  {' '}
                  na RPI <span className="num">{v.ultima.revista}</span>, de{' '}
                  <span className="num">{dataBr(v.ultima.data)}</span>
                </>
              )}
              .
              {v.naoVigiadas.length > 0 && (
                <>
                  {' '}
                  Lembrando que em{' '}
                  <strong className="text-[var(--tx)]">
                    <span className="num">{v.naoVigiadas.length}</span>{' '}
                    {v.naoVigiadas.length === 1 ? 'jurisdição' : 'jurisdições'}
                  </strong>{' '}
                  ainda não há leitura automática — o silêncio ali é ausência de olho, não
                  ausência de risco.
                </>
              )}
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              {v.ameacas.slice(0, LIMITE_HOME).map((a) => (
                <CardAmeacaCompacta
                  key={a.colidencia_id}
                  a={a}
                  hoje={hoje}
                  href={`/portal/threats/${a.colidencia_id}`}
                  semMoldura
                />
              ))}
              {v.ameacas.length > LIMITE_HOME && (
                <Link
                  href="/portal/threats"
                  className="self-center rounded-lg border border-[var(--brd)] px-3 py-1.5 text-[11px] font-semibold text-[var(--tx2)] transition hover:border-[var(--brd-forte)] hover:text-[var(--tx)]"
                  style={{ fontFamily: 'var(--font-titulo)' }}
                >
                  Ver mais {v.ameacas.length - LIMITE_HOME}…
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ═══ Onde estão os ativos ═══════════════════════════════════════════
             Mesma lógica do painel do gestor: o mapa à esquerda e as distribuições à direita,
             no mesmo cartão de grade. As três peças respondem a UMA pergunta — "como minha
             carteira se reparte" — e por isso ficam juntas; o que exige ação está acima. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-4">
          <h2 className="sec">Onde estão seus ativos</h2>
          <p className="mb-3 mt-2 text-[11.5px] leading-snug text-[var(--tx2)]">
            Vigilância ativa em{' '}
            <strong className="text-[var(--tx)]">
              {v.pontos
                .filter((p) => p.vigiada)
                .map((p) => rotuloJurisdicao(p.jurisdicao))
                .join(', ') || 'nenhuma jurisdição'}
            </strong>
            .
            {v.ultima && (
              <>
                {' '}
                Última leitura:{' '}
                <strong className="text-[var(--tx)]">
                  RPI <span className="num">{v.ultima.revista}</span>
                </strong>
                , de <span className="num">{dataBr(v.ultima.data)}</span>.
              </>
            )}
            {v.naoVigiadas.length > 0 && (
              <>
                {' '}
                Seus ativos em <span className="num">{v.naoVigiadas.length}</span>{' '}
                {v.naoVigiadas.length === 1 ? 'outra jurisdição' : 'outras jurisdições'} ainda não
                têm leitura automática — cada um diz o motivo.
              </>
            )}
          </p>
          <Mapa pontos={v.pontos} />

          {v.naoVigiadas.length > 0 && (
            <div className="mt-4 border-t border-[var(--linha)] pt-3">
              <div className="rotulo mb-2">Sem leitura automática</div>
              <div className="flex flex-col gap-1.5">
                {v.naoVigiadas.map((p) => (
                  <div
                    key={p.jurisdicao}
                    className="flex flex-col gap-0.5 text-[11.5px] sm:flex-row sm:items-start sm:gap-2.5"
                  >
                    <span className="flex items-center gap-2 sm:w-[172px] sm:flex-shrink-0">
                      <Bandeira j={p.jurisdicao} />
                      <span className="text-[var(--tx)]">{rotuloJurisdicao(p.jurisdicao)}</span>
                      <span className="num text-[var(--tx3)]">· {p.ativos}</span>
                    </span>
                    <span className="flex-1 pl-[26px] text-[var(--tx2)] sm:pl-0">
                      {p.motivo ?? 'motivo não registrado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── As distribuições, no mesmo cartão — igual ao painel do gestor ── */}
        <section className="card flex flex-col p-4">
          <h2 className="sec">Por matéria</h2>
          <div className="mt-4 flex flex-col gap-3">
            {MATERIAS.filter((m) => (v.porMateria.get(m.id) ?? 0) > 0).map((m) => {
              const n = v.porMateria.get(m.id) ?? 0
              return (
                <Link
                  key={m.id}
                  href={`/portal/assets?materia=${m.id}`}
                  className={`chip-mat mat-${m.id} block rounded-r-lg py-1.5 pl-3 pr-3 transition hover:bg-[var(--sup-h)]`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-[12px] font-medium text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {m.plural}
                    </span>
                    <span className="num text-[13px] font-semibold text-[var(--tx)]">{n}</span>
                  </div>
                  <div className="barra mt-1.5">
                    <i style={{ width: `${(n / visao.ativos.length) * 100}%` }} />
                  </div>
                </Link>
              )
            })}
          </div>

          <h2 className="sec mt-6">Por jurisdição</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            {v.pontos.map((p) => (
              <Link
                key={p.jurisdicao}
                href={`/portal/assets?jurisdicao=${p.jurisdicao}`}
                className="flex items-center gap-2.5 rounded-md px-3 py-1.5 transition hover:bg-[var(--sup-h)]"
              >
                <Bandeira j={p.jurisdicao} />
                <span className="flex-1 truncate text-[11.5px] text-[var(--tx2)]">
                  {rotuloJurisdicao(p.jurisdicao)}
                </span>
                {p.vigiada && (
                  <span className="pill pill-ok" title="cruzamos toda publicação nova desta base">
                    Vigiada
                  </span>
                )}
                <span className="num w-6 text-right text-[12px] font-semibold text-[var(--tx)]">
                  {p.ativos}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <ComoChegaAqui />
      </div>
    </>
  )
}

function Ind({
  rotulo,
  valor,
  rodape,
  href,
}: {
  rotulo: string
  valor: number
  rodape: string
  href: string
}) {
  return (
    <Link href={href} className="card card-i block p-4">
      <span className="rotulo">{rotulo}</span>
      <div className="mt-2">
        <span className="num-g text-[30px] leading-none text-[var(--tx)]">{valor}</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">{rodape}</p>
    </Link>
  )
}
