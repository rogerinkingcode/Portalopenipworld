'use client'

/**
 * O portfólio de UM cliente, na visão do gestor.
 *
 * Aqui o gestor vê tudo — inclusive o que a projeção não publica. Por isso a tela oferece o botão
 * **"ver como o cliente vê"**: quem opera precisa poder conferir a diferença entre as duas telas
 * antes de mandar um aviso, e adivinhar não serve.
 */

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { useSessao } from '@/componentes/EstadoSessao'
import { Bandeira } from '@/componentes/Bandeira'
import { CardAmeaca } from '@/componentes/Ameaca'
import { Vazio, BotaoVoltar } from '@/componentes/ui'
import { montarAmeacas } from '@/lib/ameacas'
import { gravarArmazenado } from '@/lib/armazenado'
import { rotuloJurisdicao, rotuloPapel } from '@/lib/rotulos'
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
import { EsqCliente } from '@/componentes/EsqueletosDasPaginas'

const PAPEIS_DE_CARTEIRA = ['titular', 'cotitular', 'cliente', 'parceiro']
const ATIVOS_POR_MATERIA = 25

export default function PortfolioDoCliente() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { pacote, hoje, carregando } = usePortfolio()
  const { usuario } = useSessao()
  const [todosPrazos, setTodosPrazos] = useState(false)
  const [materiasAbertas, setMateriasAbertas] = useState<Set<Materia>>(new Set())

  const d = useMemo(() => {
    const pessoa = pacote.pessoas.find((p) => p.pessoa_id === id)
    if (!pessoa) return null

    // Quem o parceiro gere entra junto: é o portfólio que ele responde.
    const geridas = new Set(
      pacote.pessoas.filter((p) => p.gerido_por === pessoa.pessoa_id).map((p) => p.pessoa_id),
    )
    const dele = new Set([pessoa.pessoa_id, ...geridas])

    const vinculos = pacote.vinculos.filter(
      (v) => dele.has(v.pessoa_id) && PAPEIS_DE_CARTEIRA.includes(v.papel),
    )
    const ids = new Set(vinculos.map((v) => v.ativo_id))
    const ativos = pacote.ativos.filter((a) => ids.has(a.ativo_id))
    // "A tratar" = em aberto ou vencido. A prorrogação que só abre daqui a anos fica à parte:
    // ela é quase todo o volume e esconderia o que pede ação agora.
    const doCliente = pacote.prazos.filter((p) => ids.has(p.ativo_id))
    const prazos = doCliente
      .filter((p) => {
        const e = estadoDoPrazo(p, hoje)
        return e === 'aberto' || e === 'vencido'
      })
      .sort((a, b) => a.vence_em.localeCompare(b.vence_em))
    const aAbrir = doCliente
      .filter((p) => estadoDoPrazo(p, hoje) === 'a_abrir')
      .sort((a, b) => (a.abre_em ?? a.vence_em).localeCompare(b.abre_em ?? b.vence_em))

    // De quem são os ativos deste cliente: um cliente responde por vários titulares.
    const titularesN = new Map<string, number>()
    for (const v of pacote.vinculos) {
      if (!ids.has(v.ativo_id) || (v.papel !== 'titular' && v.papel !== 'cotitular')) continue
      if (v.pessoa_id === pessoa.pessoa_id) continue
      titularesN.set(v.pessoa_id, (titularesN.get(v.pessoa_id) ?? 0) + 1)
    }
    const pessoaPorId = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p]))
    const titulares = [...titularesN]
      .map(([pid, n]) => ({ pessoa: pessoaPorId.get(pid)!, n }))
      .filter((x) => x.pessoa)
      .sort((a, b) => b.n - a.n)
    const ameacas = montarAmeacas(pacote).filter((a) => ids.has(a.ativo_id))
    const emAnalise = (pacote.colidencias ?? []).filter(
      (c) => ids.has(c.ativo_id) && c.parecer?.decisao !== 'enviar',
    )

    const porMateria = new Map<Materia, typeof ativos>()
    for (const a of ativos) {
      const k = materiaDe(a.especie)
      porMateria.set(k, [...(porMateria.get(k) ?? []), a])
    }
    const porJur = new Map<string, number>()
    for (const a of ativos) porJur.set(a.jurisdicao, (porJur.get(a.jurisdicao) ?? 0) + 1)

    const papeis = [...new Set(vinculos.filter((v) => v.pessoa_id === pessoa.pessoa_id).map((v) => v.papel))]
    const publicavel = vinculos.some((v) => v.publicavel && v.pessoa_id === pessoa.pessoa_id)

    return {
      pessoa,
      papeis,
      publicavel,
      geridas: pacote.pessoas.filter((p) => geridas.has(p.pessoa_id)),
      ativos,
      prazos,
      aAbrir,
      titulares,
      ativoPorId: new Map(pacote.ativos.map((a) => [a.ativo_id, a])),
      ameacas,
      emAnalise,
      porMateria,
      porJur: [...porJur.entries()].sort((a, b) => b[1] - a[1]),
      documentos: pacote.documentos.filter((x) => x.ativo_id && ids.has(x.ativo_id)),
      servicos: pacote.servicos.filter((s) => s.ativo_ids.some((x) => ids.has(x))),
    }
  }, [pacote, id, hoje])

  if (carregando) {
    return <EsqCliente />
  }
  if (!d) {
    return (
      <Vazio
        titulo="Cliente não encontrado"
        acao={
          <BotaoVoltar href="/clients">Voltar para Carteira</BotaoVoltar>
        }
      />
    )
  }

  const vencidos = d.prazos.filter((p) => diasAte(p.vence_em, hoje) < 0).length
  const urgentes = d.prazos.filter((p) => {
    const x = diasAte(p.vence_em, hoje)
    return x >= 0 && x <= 30
  }).length
  const proximoAAbrir = d.aAbrir[0]
  const rodapePrazos = [
    vencidos > 0 ? `${vencidos} vencido${vencidos === 1 ? '' : 's'}` : '',
    urgentes > 0 ? `${urgentes} nos próximos 30 dias` : '',
    `${d.aAbrir.length} ainda não aberto${d.aAbrir.length === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  function verComoCliente() {
    // Pelo mesmo armazenamento que o portal lê: grava E avisa quem já está ouvindo a chave.
    gravarArmazenado('apex-portal-pessoa', d!.pessoa.pessoa_id)
    router.push('/portal')
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <BotaoVoltar href="/clients">Voltar para Carteira</BotaoVoltar>
          <h1
            className="mt-1.5 text-[22px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {d.pessoa.nome}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {d.papeis.map((p) => (
              <span key={p} className="pill pill-neu">
                {rotuloPapel(p)}
              </span>
            ))}
            <span className="text-[11px] text-[var(--tx3)]">
              {d.pessoa.tipo === 'juridica' ? 'pessoa jurídica' : 'pessoa física'} ·{' '}
              {rotuloJurisdicao(d.pessoa.pais)}
            </span>
          </p>
        </div>

        {d.publicavel ? (
          <div className="flex flex-wrap items-center gap-2">
            {usuario?.role === 'admin' && (
              <Link
                href={`/users?pessoa=${d.pessoa.pessoa_id}`}
                className="rounded-lg border border-[var(--brd)] px-3.5 py-2 text-[12px] font-semibold text-[var(--tx2)] transition hover:text-[var(--tx)]"
                style={{ fontFamily: 'var(--font-titulo)' }}
                title="cria o login com que esta pessoa entra no portal dela"
              >
                Criar login do portal
              </Link>
            )}
            <button
              onClick={verComoCliente}
              className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white"
              style={{
                fontFamily: 'var(--font-titulo)',
                background: 'linear-gradient(135deg,#2589A8,#1A6581)',
                boxShadow: '0 2px 10px rgba(26,101,129,.35)',
              }}
              title="abre o portal com esta pessoa escolhida, exatamente como ela veria"
            >
              Ver como o cliente vê →
            </button>
          </div>
        ) : (
          <span
            className="pill pill-avi"
            title="Não há vínculo publicável desta pessoa: nada deste portfólio chegaria ao portal dela"
          >
            Sem vínculo publicável
          </span>
        )}
      </header>

      {d.geridas.length > 0 && (
        <div className="nota mt-4">
          Este parceiro responde por <strong className="text-[var(--tx)]">{d.geridas.length}</strong>{' '}
          {d.geridas.length === 1 ? 'cliente final' : 'clientes finais'}:{' '}
          {d.geridas.map((g) => g.nome).join(' · ')}. Os ativos deles entram nesta contagem.
        </div>
      )}

      {/* ── Indicadores ─────────────────────────────────────────────────── */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Ind
          rotulo="Ativos"
          valor={d.ativos.length}
          rodape={`${d.porJur.length} ${d.porJur.length === 1 ? 'jurisdição' : 'jurisdições'}`}
        />
        <Ind
          rotulo="Prazos a tratar"
          valor={d.prazos.length}
          rodape={rodapePrazos}
          alerta={vencidos > 0 || urgentes > 0}
        />
        <Ind
          rotulo="Ameaças"
          valor={d.ameacas.length}
          rodape={d.emAnalise.length > 0 ? `${d.emAnalise.length} ainda em análise` : 'com parecer assinado'}
          alerta={d.ameacas.length > 0}
        />
        <Ind
          rotulo="Documentos"
          valor={d.documentos.length}
          rodape={`${d.servicos.length} serviços registrados`}
        />
      </div>

      {/* ── Ameaças ─────────────────────────────────────────────────────── */}
      {d.ameacas.length > 0 && (
        <section className="mt-6">
          <h2 className="sec">Ameaças com parecer</h2>
          <div className="mt-3 flex flex-col gap-4">
            {d.ameacas.map((a) => (
              <CardAmeaca key={a.colidencia_id} a={a} hoje={hoje} href={`/assets/${a.ativo_id}`} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* ── Ativos por matéria ────────────────────────────────────────── */}
        <section className="card p-4">
          <h2 className="sec">Os ativos</h2>
          <div className="mt-4 flex flex-col gap-5">
            {MATERIAS.filter((m) => d.porMateria.has(m.id)).map((m) => (
              <div key={m.id}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--tx2)]"
                    style={{ fontFamily: 'var(--font-titulo)' }}
                  >
                    {m.plural}
                  </span>
                  <span className="num text-[10.5px] text-[var(--tx3)]">
                    {d.porMateria.get(m.id)!.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {d.porMateria
                    .get(m.id)!
                    .slice(0, materiasAbertas.has(m.id) ? undefined : ATIVOS_POR_MATERIA)
                    .map((a) => (
                      <Link
                        key={a.ativo_id}
                        href={`/assets/${a.ativo_id}`}
                        className={`chip-mat mat-${m.id} flex items-center gap-2.5 rounded-r-lg py-1.5 pl-3 pr-3 transition hover:bg-[var(--sup-h)]`}
                      >
                        <Bandeira j={a.jurisdicao} />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--tx)]">
                          {nomeAtivo(a)}
                        </span>
                        <span className="num text-[10.5px] text-[var(--tx3)]">
                          {a.identificadores[0]?.valor_bruto ?? '—'}
                        </span>
                        {!a.vigilancia.ativa && (
                          <span className="pill pill-neu" title={a.vigilancia.motivo}>
                            sem leitura
                          </span>
                        )}
                      </Link>
                    ))}
                  {d.porMateria.get(m.id)!.length > ATIVOS_POR_MATERIA && (
                    <button
                      onClick={() => {
                        const s = new Set(materiasAbertas)
                        if (s.has(m.id)) s.delete(m.id)
                        else s.add(m.id)
                        setMateriasAbertas(s)
                      }}
                      className="mt-1 self-start text-[11px] font-semibold text-[var(--color-petrol-cla)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {materiasAbertas.has(m.id)
                        ? 'mostrar menos'
                        : `mostrar todos os ${d.porMateria.get(m.id)!.length} →`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4">
          {/* ── Titulares ──────────────────────────────────────────────── */}
          {d.titulares.length > 0 && (
            <section className="card p-4">
              <h2 className="sec">{d.titulares.length === 1 ? 'Titular' : 'Titulares'}</h2>
              <div className="mt-3 flex flex-col gap-1.5">
                {d.titulares.slice(0, 12).map((t) => (
                  <Link
                    key={t.pessoa.pessoa_id}
                    href={`/clients/${t.pessoa.pessoa_id}`}
                    className="flex items-center gap-2.5 transition hover:text-[var(--tx)]"
                  >
                    <span className="flex-1 truncate text-[11.5px] text-[var(--tx2)]">{t.pessoa.nome}</span>
                    <span className="num text-[12px] font-semibold text-[var(--tx)]">{t.n}</span>
                  </Link>
                ))}
                {d.titulares.length > 12 && (
                  <span className="text-[10.5px] text-[var(--tx3)]">e mais {d.titulares.length - 12}</span>
                )}
              </div>
            </section>
          )}

          {/* ── Por jurisdição ─────────────────────────────────────────── */}
          <section className="card p-4">
            <h2 className="sec">Por jurisdição</h2>
            <div className="mt-3 flex flex-col gap-1.5">
              {d.porJur.map(([j, n]) => (
                <div key={j} className="flex items-center gap-2.5">
                  <Bandeira j={j} />
                  <span className="flex-1 truncate text-[11.5px] text-[var(--tx2)]">
                    {rotuloJurisdicao(j)}
                  </span>
                  <span className="num text-[12px] font-semibold text-[var(--tx)]">{n}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Prazos ─────────────────────────────────────────────────── */}
          <section className="card p-4">
            <h2 className="sec">Prazos a tratar</h2>
            {d.prazos.length === 0 ? (
              <p className="mt-3 text-[12px] text-[var(--tx2)]">Nenhum prazo em aberto ou vencido.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {d.prazos.slice(0, todosPrazos ? undefined : 8).map((p) => {
                  const at = d.ativoPorId.get(p.ativo_id)
                  const x = diasAte(p.vence_em, hoje)
                  const u = urgenciaDe(x)
                  return (
                    <div key={p.prazo_id} className="flex items-start gap-2.5">
                      <span
                        className={`pill ${u === 'urgente' ? 'pill-neg' : u === 'atencao' ? 'pill-avi' : 'pill-neu'} mt-[1px] flex-shrink-0`}
                      >
                        {textoDias(x)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium text-[var(--tx)]">
                          {p.regua.nome}
                        </span>
                        <span className="block truncate text-[10.5px] text-[var(--tx3)]">
                          {at ? nomeAtivo(at) : '—'} · <span className="num">{dataBr(p.vence_em)}</span>
                          {p.firmeza !== 'legal' && ` · ${p.firmeza}`}
                        </span>
                      </span>
                    </div>
                  )
                })}
                {d.prazos.length > 8 && (
                  <button
                    onClick={() => setTodosPrazos(!todosPrazos)}
                    className="mt-1 self-start text-[11px] font-semibold text-[var(--color-petrol-cla)]"
                    style={{ fontFamily: 'var(--font-titulo)' }}
                  >
                    {todosPrazos ? 'mostrar menos' : `ver os outros ${d.prazos.length - 8} →`}
                  </button>
                )}
              </div>
            )}
            {proximoAAbrir && (
              <p className="mt-3 border-t border-[var(--linha)] pt-2.5 text-[10.5px] leading-snug text-[var(--tx3)]">
                Mais <span className="num">{d.aAbrir.length}</span> ainda não{' '}
                {d.aAbrir.length === 1 ? 'aberto' : 'abertos'} (prorrogações, anuidades e quinquênios
                futuros). O próximo abre em{' '}
                <span className="num">{dataBr(proximoAAbrir.abre_em ?? proximoAAbrir.vence_em)}</span>:{' '}
                {proximoAAbrir.regua.nome}
                {d.ativoPorId.get(proximoAAbrir.ativo_id)
                  ? ` · ${nomeAtivo(d.ativoPorId.get(proximoAAbrir.ativo_id)!)}`
                  : ''}
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function Ind({
  rotulo,
  valor,
  rodape,
  alerta,
}: {
  rotulo: string
  valor: number
  rodape: string
  alerta?: boolean
}) {
  return (
    <div className="card p-4">
      <span className="rotulo">{rotulo}</span>
      <div className="mt-2">
        <span
          className="num-g text-[28px] leading-none"
          style={{ color: alerta ? 'var(--color-alerta)' : 'var(--tx)' }}
        >
          {valor}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">{rodape}</p>
    </div>
  )
}
