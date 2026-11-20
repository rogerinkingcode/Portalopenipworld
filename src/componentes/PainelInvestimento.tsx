'use client'

/**
 * O painel de investimento — o mesmo componente para as duas visões.
 *
 * O cliente vê o portfólio dele; o gestor vê a carteira inteira ou a de um cliente escolhido.
 * A leitura é a mesma, então o componente é um só: o que muda é o conjunto de serviços que
 * entra e o rótulo de cada ativo.
 *
 * ⚠️ Três avisos que a tela precisa dar, e dá:
 *    1. quantas contratações ficaram FORA da soma por não ter valor conferido;
 *    2. que moedas não são convertidas nem somadas entre si;
 *    3. que um serviço com vários ativos/países entra inteiro em cada grupo — por isso a soma
 *       dos recortes pode passar do total geral.
 */

import { useState } from 'react'
import { Bandeira } from './Bandeira'
import { rotuloJurisdicao } from '@/lib/rotulos'
import {
  dinheiro,
  rotuloMes,
  somarInvestimento,
  type Recorte,
  type ServicoComValor,
  type Soma,
} from '@/lib/investimento'
import { dataBr } from '@/lib/visao'

type Corte = 'ativo' | 'pais' | 'materia'

export function PainelInvestimento({
  servicos,
  nomeDoAtivo,
  hrefDoAtivo,
  jurisdicaoDoAtivo,
}: {
  servicos: ServicoComValor[]
  nomeDoAtivo: (id: string) => string
  hrefDoAtivo?: (id: string) => string
  jurisdicaoDoAtivo?: (id: string) => string | undefined
}) {
  const inv = somarInvestimento(servicos)
  const [corte, setCorte] = useState<Corte>('ativo')
  const [aberto, setAberto] = useState<string | null>(null)
  const [serie, setSerie] = useState<'ano' | 'mes'>('ano')

  if (inv.comValor === 0) {
    return (
      <div className="card p-6">
        <h2
          className="text-[14px] font-semibold text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Nenhuma contratação com valor conferido ainda.
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--tx2)]">
          Os valores entram aqui à medida que a nota é emitida ou a cobrança é gerada.
          {inv.semValor > 0 && (
            <>
              {' '}
              Há <span className="num">{inv.semValor}</span>{' '}
              {inv.semValor === 1 ? 'contratação registrada' : 'contratações registradas'} sem
              valor conferido.
            </>
          )}
        </p>
      </div>
    )
  }

  const recorte: Recorte[] =
    corte === 'ativo' ? inv.porAtivo : corte === 'pais' ? inv.porPais : inv.porMateria
  const serieAtual = serie === 'ano' ? inv.porAno : inv.porMes
  const maiorSerie = Math.max(1, ...serieAtual.map((r) => r.somas[0]?.total ?? 0))

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ O total, decomposto nas três naturezas ═════════════════════════ */}
      <section className="card p-4">
        <h2 className="sec">Desde o início</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {inv.porMoeda.map((m) => (
            <CartaoMoeda key={m.moeda} s={m} />
          ))}
        </div>
        {inv.semValor > 0 && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-snug"
            style={{
              background: 'rgba(230,138,0,.1)',
              border: '1px solid rgba(230,138,0,.24)',
              color: 'var(--color-alerta)',
            }}
          >
            ⚠️ <span className="num">{inv.semValor}</span>{' '}
            {inv.semValor === 1 ? 'contratação está' : 'contratações estão'} fora desta soma por
            ainda não ter valor conferido. Os totais são um <strong>piso</strong>, não o custo
            fechado.
          </p>
        )}
      </section>

      {/* ═══ A série ═══════════════════════════════════════════════════════ */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="sec">Ao longo do tempo</h2>
          <div className="seg">
            <button data-on={serie === 'ano' ? 'sim' : 'nao'} onClick={() => setSerie('ano')}>
              Por ano
            </button>
            <button data-on={serie === 'mes' ? 'sim' : 'nao'} onClick={() => setSerie('mes')}>
              Por mês
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {[...serieAtual]
            .sort((a, b) => b.chave.localeCompare(a.chave))
            .map((r) => (
              <div key={r.chave}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className="num text-[12.5px] font-semibold text-[var(--tx)]"
                    style={{ fontFamily: 'var(--font-titulo)' }}
                  >
                    {serie === 'mes' ? rotuloMes(r.chave) : r.chave}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-3">
                    {r.somas.map((s) => (
                      <span key={s.moeda} className="num text-[12.5px] text-[var(--tx)]">
                        {dinheiro(s.total, s.moeda)}
                      </span>
                    ))}
                    <span className="num text-[10px] text-[var(--tx3)]">
                      {r.n} {r.n === 1 ? 'serviço' : 'serviços'}
                    </span>
                  </span>
                </div>
                {r.somas.map((s) => (
                  <div key={s.moeda} className="barra mb-1">
                    <i style={{ width: `${(s.total / maiorSerie) * 100}%` }} />
                  </div>
                ))}
              </div>
            ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-snug text-[var(--tx3)]">
          A data é a da conclusão do serviço; quando ele ainda corre, a da abertura. As barras
          comparam períodos dentro da mesma moeda — moedas diferentes não são somadas, porque
          converter exigiria uma cotação escolhida por nós, e a escolha mudaria o número.
        </p>
      </section>

      {/* ═══ Os recortes ═══════════════════════════════════════════════════ */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="sec">Onde o dinheiro foi</h2>
          <div className="seg">
            <button data-on={corte === 'ativo' ? 'sim' : 'nao'} onClick={() => setCorte('ativo')}>
              Por ativo
            </button>
            <button data-on={corte === 'pais' ? 'sim' : 'nao'} onClick={() => setCorte('pais')}>
              Por país
            </button>
            <button
              data-on={corte === 'materia' ? 'sim' : 'nao'}
              onClick={() => setCorte('materia')}
            >
              Por matéria
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          {recorte.map((r) => {
            const expandido = aberto === `${corte}:${r.chave}`
            const doGrupo = servicos.filter((s) =>
              corte === 'ativo'
                ? s.ativo_ids.includes(r.chave)
                : corte === 'pais'
                  ? (s.paises ?? []).includes(r.chave)
                  : (s.materia ?? []).includes(r.chave),
            )
            return (
              <div key={r.chave}>
                <button
                  onClick={() => setAberto(expandido ? null : `${corte}:${r.chave}`)}
                  className="flex w-full flex-wrap items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--sup-h)]"
                >
                  {corte === 'pais' && <Bandeira j={r.chave} />}
                  {corte === 'ativo' && jurisdicaoDoAtivo?.(r.chave) && (
                    <Bandeira j={jurisdicaoDoAtivo(r.chave)!} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--tx)]">
                    {corte === 'ativo'
                      ? nomeDoAtivo(r.chave)
                      : corte === 'pais'
                        ? rotuloJurisdicao(r.chave)
                        : r.chave}
                  </span>
                  <span className="num text-[10.5px] text-[var(--tx3)]">
                    {r.n} {r.n === 1 ? 'serviço' : 'serviços'}
                    {r.semValor > 0 && (
                      <span className="text-[var(--color-alerta)]"> · {r.semValor} sem valor</span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-2">
                    {r.somas.map((s) => (
                      <span key={s.moeda} className="num-g text-[14px] text-[var(--tx)]">
                        {dinheiro(s.total, s.moeda)}
                      </span>
                    ))}
                  </span>
                  <span className="text-[10px] text-[var(--tx3)]">{expandido ? '▴' : '▾'}</span>
                </button>

                {expandido && (
                  <div className="mb-2 ml-2 border-l-2 border-[var(--linha)] pl-3">
                    {doGrupo.map((s) => (
                      <div
                        key={s.servico_id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-1.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] text-[var(--tx)]">
                            {s.tipo ?? 'serviço'}
                          </span>
                          <span className="num text-[10px] text-[var(--tx3)]">
                            {dataBr(s.datas?.conclusao ?? s.datas?.abertura)}
                            {corte !== 'ativo' &&
                              ` · ${s.ativo_ids.map(nomeDoAtivo).join(', ')}`}
                          </span>
                        </span>
                        {s.valor ? (
                          <span className="flex flex-wrap items-baseline gap-2.5">
                            <span className="text-[10px] text-[var(--tx3)]">
                              hon. {dinheiro(s.valor.honorario ?? 0, s.valor.moeda)}
                              {(s.valor.taxa_oficial ?? 0) > 0 &&
                                ` · GRU ${dinheiro(s.valor.taxa_oficial!, s.valor.moeda)}`}
                              {(s.valor.taxa_internacional ?? 0) > 0 &&
                                ` · assoc. ${dinheiro(s.valor.taxa_internacional!, s.valor.moeda)}`}
                            </span>
                            <span className="num text-[12px] font-semibold text-[var(--tx)]">
                              {dinheiro(s.valor.total, s.valor.moeda)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-alerta)]">
                            valor não conferido
                          </span>
                        )}
                      </div>
                    ))}
                    {hrefDoAtivo && corte === 'ativo' && (
                      <a
                        href={hrefDoAtivo(r.chave)}
                        className="mt-1 inline-block text-[10.5px] font-semibold text-[var(--color-petrol-cla)]"
                        style={{ fontFamily: 'var(--font-titulo)' }}
                      >
                        abrir o ativo →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-3 border-t border-[var(--linha)] pt-2.5 text-[10.5px] leading-snug text-[var(--tx3)]">
          Um serviço pode cobrir mais de um ativo, país ou matéria — nesses casos ele entra
          inteiro em cada grupo, e por isso a soma dos grupos pode passar do total geral acima.
        </p>
      </section>
    </div>
  )
}

function CartaoMoeda({ s }: { s: Soma }) {
  const partes = [
    { r: 'Honorários', v: s.honorario, t: 'o que fica com o escritório' },
    { r: 'Taxas oficiais (GRU)', v: s.taxaOficial, t: 'repasse ao INPI' },
    { r: 'Taxas internacionais', v: s.taxaInternacional, t: 'associados e autarquias no exterior' },
    { r: 'Não classificado', v: s.outros, t: 'ainda sem decomposição registrada' },
  ].filter((p) => p.v > 0)

  return (
    <div className="rounded-lg border border-[var(--linha)] p-4">
      <span className="rotulo">Total em {s.moeda}</span>
      <div className="num-g mt-1 text-[26px] text-[var(--tx)]">{dinheiro(s.total, s.moeda)}</div>
      <dl className="mt-3 flex flex-col gap-1.5 border-t border-[var(--linha)] pt-2.5 text-[11px]">
        {partes.map((p) => (
          <div key={p.r} className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--tx2)]" title={p.t}>
              {p.r}
            </dt>
            <dd className="num text-[var(--tx)]">{dinheiro(p.v, s.moeda)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 text-[var(--tx3)]">
          <dt>Contratações</dt>
          <dd className="num">{s.n}</dd>
        </div>
      </dl>
    </div>
  )
}
