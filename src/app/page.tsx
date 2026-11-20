'use client'

/**
 * Painel do GESTOR — a base inteira, todos os clientes. É a ferramenta interna.
 * A experiência do cliente fica em /portal, alimentada pela projeção auditada.
 */

import Link from 'next/link'
import { useMemo } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { Mapa, type PontoMapa } from '@/componentes/Mapa'
import { Bandeira } from '@/componentes/Bandeira'
import { Vazio } from '@/componentes/ui'
import { TextoCurto } from '@/componentes/TextoCurto'
import { rotuloJurisdicao, rotuloFirmeza } from '@/lib/rotulos'
import {
  MATERIAS,
  dataBr,
  diasAte,
  materiaDe,
  nomeAtivo,
  prazoATratar,
  processoEncerrado,
  textoDias,
  urgenciaDe,
  type Materia,
} from '@/lib/visao'
import { EsqPainel } from '@/componentes/EsqueletosDasPaginas'

export default function Painel() {
  const { pacote, hoje, carregando } = usePortfolio()

  const v = useMemo(() => {
    const ativos = pacote.ativos
    const porMateria = new Map<Materia, number>()
    const porJurisdicao = new Map<string, { n: number; vigiada: boolean; motivo?: string }>()
    for (const a of ativos) {
      const m = materiaDe(a.especie)
      porMateria.set(m, (porMateria.get(m) ?? 0) + 1)
      const j = porJurisdicao.get(a.jurisdicao) ?? { n: 0, vigiada: false }
      j.n += 1
      if (a.vigilancia.ativa) j.vigiada = true
      else if (!j.motivo) j.motivo = a.vigilancia.motivo
      porJurisdicao.set(a.jurisdicao, j)
    }

    // Ameaça só conta depois do portão humano: parecer com decisão de enviar.
    const ameacas = (pacote.colidencias ?? []).filter((c) => c.parecer?.decisao === 'enviar')
    const porRisco = { alto: 0, medio: 0, baixo: 0 }
    for (const c of ameacas) porRisco[c.parecer!.risco] += 1
    // Na fila de parecer: pendente, sem decisão de enviar (inclui o "manter em análise").
    const aguardando = (pacote.colidencias ?? []).filter(
      (c) => c.approval_status === 'pending' && c.parecer?.decisao !== 'enviar',
    ).length

    // "A tratar" = em aberto ou vencido. A prorrogação que só abre daqui a anos fica de fora:
    // é ~90% dos prazos e fazia o indicador dizer mil onde há dezenas pedindo ação.
    const emAberto = pacote.prazos.filter((p) => prazoATratar(p, hoje))
    const proximos = [...emAberto].sort((a, b) => a.vence_em.localeCompare(b.vence_em))
    const vencidos = emAberto.filter((p) => diasAte(p.vence_em, hoje) < 0).length
    const urgentes = emAberto.filter((p) => {
      const d = diasAte(p.vence_em, hoje)
      return d >= 0 && d <= 30
    }).length

    // Cliente é quem CONTRATOU (vínculo de cliente). Titular e parceiro contam à parte: somar os
    // três dava 817 "clientes" onde há ~200.
    const porPapel = { cliente: new Set<string>(), titular: new Set<string>(), parceiro: new Set<string>() }
    const comCliente = new Set<string>()
    const comTitular = new Set<string>()
    for (const x of pacote.vinculos) {
      if (x.papel === 'cliente') {
        porPapel.cliente.add(x.pessoa_id)
        comCliente.add(x.ativo_id)
      } else if (x.papel === 'titular' || x.papel === 'cotitular') {
        porPapel.titular.add(x.pessoa_id)
        comTitular.add(x.ativo_id)
      } else if (x.papel === 'parceiro') porPapel.parceiro.add(x.pessoa_id)
    }
    const semCliente = ativos.filter((a) => !comCliente.has(a.ativo_id)).length
    const semTitular = ativos.filter(
      (a) => !comTitular.has(a.ativo_id) || a.pendencias.some((p) => p.tipo === 'titular_anonimo'),
    ).length
    const encerrados = ativos.filter((a) => processoEncerrado(a.situacao.texto)).length

    const revista = ameacas
      .map((c) => c.evento_gatilho)
      .sort((a, b) => b.data.localeCompare(a.data))[0]

    const pontos: PontoMapa[] = [...porJurisdicao.entries()]
      .map(([j, d]) => ({
        jurisdicao: j,
        rotulo: rotuloJurisdicao(j),
        ativos: d.n,
        vigiada: d.vigiada,
        motivo: d.motivo,
      }))
      .sort((a, b) => b.ativos - a.ativos)

    return {
      ativos,
      porMateria,
      pontos,
      ameacas,
      porRisco,
      aguardando,
      emAberto,
      proximos,
      vencidos,
      urgentes,
      clientes: porPapel.cliente.size,
      titulares: porPapel.titular.size,
      parceiros: porPapel.parceiro.size,
      semCliente,
      semTitular,
      encerrados,
      ativoPorId: new Map(ativos.map((a) => [a.ativo_id, a])),
      revista,
      vigiadas: pontos.filter((p) => p.vigiada).length,
    }
  }, [pacote, hoje])

  if (carregando) {
    return <EsqPainel />
  }

  if (v.ativos.length === 0) {
    return (
      <>
        <Cabecalho />
        <div className="mt-6">
          <Vazio
            titulo="Nenhum ativo na base"
            detalhe="Importe a carteira pela busca no INPI ou por planilha para ver as telas com dado."
            acao={
              <Link
                href="/import"
                className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
                style={{
                  fontFamily: 'var(--font-titulo)',
                  background: 'linear-gradient(135deg,#2589A8,#1A6581)',
                }}
              >
                Ir para Importar
              </Link>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Cabecalho />

      {/* ═══ Os quatro indicadores ═══════════════════════════════════════════ */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Ativos sob gestão"
          valor={v.ativos.length}
          rodape={`${v.ativos.length - v.encerrados} em vigor ou em andamento · ${v.encerrados} encerrados · ${v.pontos.length} ${v.pontos.length === 1 ? 'jurisdição' : 'jurisdições'}`}
          href="/assets"
        />
        <Indicador
          rotulo="Prazos a tratar"
          valor={v.emAberto.length}
          rodape={
            [
              v.vencidos > 0 ? `${v.vencidos} vencido${v.vencidos === 1 ? '' : 's'}` : '',
              v.urgentes > 0
                ? `${v.urgentes} ${v.urgentes === 1 ? 'vence' : 'vencem'} em 30 dias`
                : 'nenhum vence em 30 dias',
            ]
              .filter(Boolean)
              .join(' · ')
          }
          alerta={v.urgentes > 0 || v.vencidos > 0}
          href={v.vencidos > 0 ? '/deadlines?estado=vencido' : '/deadlines?estado=aberto'}
        />
        <Indicador
          rotulo="Clientes na carteira"
          valor={v.clientes}
          rodape={`${v.titulares} titulares · ${v.parceiros} ${v.parceiros === 1 ? 'parceiro' : 'parceiros'}`}
          href="/clients"
        />

        {/* ── O quarto card: AMEAÇAS DETECTADAS ─────────────────────────────
            Conta só o que passou pelo portão humano. Um número que incluísse
            candidatos da máquina contaria alarme falso como ameaça. */}
        <Link href="/threats" className="card card-i block p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="rotulo">Ameaças detectadas</span>
            {v.aguardando > 0 && (
              <span className="pill pill-neu" title="candidatos ainda em análise — não contam como ameaça">
                {v.aguardando} em análise
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="num-g text-[30px] leading-none"
              style={{ color: v.ameacas.length > 0 ? 'var(--color-erro)' : 'var(--tx)' }}
            >
              {v.ameacas.length}
            </span>
            {v.ameacas.length > 0 && (
              <span className="flex gap-1">
                {v.porRisco.alto > 0 && <span className="pill pill-neg">{v.porRisco.alto} Alto</span>}
                {v.porRisco.medio > 0 && <span className="pill pill-avi">{v.porRisco.medio} Médio</span>}
                {v.porRisco.baixo > 0 && <span className="pill pill-neu">{v.porRisco.baixo} Baixo</span>}
              </span>
            )}
          </div>
          {/* Encurtado em 25 caracteres: o texto inteiro (com a RPI e a data) fica no balão. */}
          <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">
            <TextoCurto
              max={25}
              texto={
                (v.ameacas.length === 0
                  ? 'Nenhuma publicação nova exigiu ação na última leitura.'
                  : 'Publicações de terceiros que se aproximam dos seus ativos, com parecer humano assinado.') +
                (v.revista ? ` Última leitura: RPI ${v.revista.revista}, de ${dataBr(v.revista.data)}.` : '')
              }
            />
          </p>
        </Link>
      </div>

      {/* ═══ Pendências da casa ═════════════════════════════════════════════
             O que depende de alguém aqui dentro, com o atalho para resolver. Some quando zera. */}
      {(v.semCliente > 0 || v.semTitular > 0 || v.vencidos > 0) && (
        <div className="nota mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
          <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Pendências
          </strong>
          {v.vencidos > 0 && (
            <Link href="/deadlines?estado=vencido" className="text-[var(--color-erro)] hover:underline">
              <span className="num">{v.vencidos}</span> prazo{v.vencidos === 1 ? '' : 's'} vencido
              {v.vencidos === 1 ? '' : 's'} →
            </Link>
          )}
          {v.semTitular > 0 && (
            <Link href="/reconciliation" className="text-[var(--color-petrol-cla)] hover:underline">
              <span className="num">{v.semTitular}</span> ativo{v.semTitular === 1 ? '' : 's'} sem titular →
            </Link>
          )}
          {v.semCliente > 0 && (
            <Link href="/reconciliation" className="text-[var(--color-petrol-cla)] hover:underline">
              <span className="num">{v.semCliente}</span> ativo{v.semCliente === 1 ? '' : 's'} sem cliente →
            </Link>
          )}
        </div>
      )}

      {/* ═══ Mapa + matéria ═════════════════════════════════════════════════ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-4">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="sec">Onde estão os ativos</h2>
            <span className="text-[10.5px] text-[var(--tx3)]">
              <span className="num">{v.pontos.length}</span> jurisdições
            </span>
          </div>
          <p className="mb-3 mt-2 text-[11.5px] leading-snug text-[var(--tx2)]">
            O pino diz onde há ativo. O anel diz onde há leitura automática da base oficial.
            Onde não há anel, <strong className="text-[var(--tx)]">ausência de ameaça é ausência
            de olho</strong>, não ausência de risco.
          </p>
          <Mapa pontos={v.pontos} />
        </section>

        <section className="card flex flex-col p-4">
          <h2 className="sec">Por matéria</h2>
          <div className="mt-4 flex flex-col gap-3">
            {MATERIAS.filter((m) => (v.porMateria.get(m.id) ?? 0) > 0).map((m) => {
              const n = v.porMateria.get(m.id) ?? 0
              const pct = (n / v.ativos.length) * 100
              return (
                <Link
                  key={m.id}
                  href={`/assets?materia=${m.id}`}
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
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              )
            })}
          </div>

          <h2 className="sec mt-6">Por jurisdição</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            {v.pontos.slice(0, 8).map((p) => (
              <Link
                key={p.jurisdicao}
                href={`/assets?jurisdicao=${p.jurisdicao}`}
                className="flex items-center gap-2.5 rounded-md px-3 py-1.5 transition hover:bg-[var(--sup-h)]"
              >
                <Bandeira j={p.jurisdicao} />
                <span className="flex-1 truncate text-[11.5px] text-[var(--tx2)]">
                  {rotuloJurisdicao(p.jurisdicao)}
                </span>
                {p.vigiada && (
                  <span className="pill pill-ok" title="vigilância ativa nesta jurisdição">
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

      {/* ═══ Prazos próximos ════════════════════════════════════════════════ */}
      <section className="card mt-4 p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="sec">Prazos a tratar</h2>
          <Link
            href="/deadlines"
            className="text-[11px] font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Ver todos e o calendário →
          </Link>
        </div>
        {v.proximos.length === 0 ? (
          <p className="text-[12px] text-[var(--tx2)]">Nenhum prazo em aberto ou vencido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tb">
              <thead>
                <tr>
                  <th>Vence</th>
                  <th></th>
                  <th>Ativo</th>
                  <th>Régua</th>
                  <th>Firmeza</th>
                </tr>
              </thead>
              <tbody>
                {v.proximos.slice(0, 7).map((p) => {
                  const ativo = v.ativoPorId.get(p.ativo_id)
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
                        {ativo ? (
                          <Link
                            href={`/assets/${ativo.ativo_id}`}
                            className="inline-flex items-center gap-1.5 text-[var(--tx)] hover:text-[var(--color-petrol-cla)]"
                          >
                            <Bandeira j={ativo.jurisdicao} />
                            <TextoCurto texto={nomeAtivo(ativo)} max={25} />
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-[var(--tx2)]">{p.regua.nome}</td>
                      <td>
                        <span
                          className={`pill ${p.firmeza === 'legal' ? 'pill-ok' : p.firmeza === 'estimado' ? 'pill-avi' : 'pill-neu'}`}
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
        )}
      </section>
    </>
  )
}

function Cabecalho() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Painel do gestor
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          A carteira inteira, de todos os clientes.
        </p>
      </div>
    </header>
  )
}

function Indicador({
  rotulo,
  valor,
  rodape,
  href,
  alerta,
}: {
  rotulo: string
  valor: number
  rodape: string
  href: string
  alerta?: boolean
}) {
  return (
    <Link href={href} className="card card-i block p-4">
      <span className="rotulo">{rotulo}</span>
      <div className="mt-2">
        <span
          className="num-g text-[30px] leading-none"
          style={{ color: alerta ? 'var(--color-alerta)' : 'var(--tx)' }}
        >
          {valor}
        </span>
      </div>
      {/* Rodapé sempre neutro: cor semântica vive só em pill. */}
      <p className="mt-2 text-[11px] leading-snug text-[var(--tx2)]">{rodape}</p>
    </Link>
  )
}
