'use client'

/** Os ativos do cliente, agrupados por matéria e depois por jurisdição. */

import Link from 'next/link'
import { useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCliente } from '@/componentes/EstadoCliente'
import { Bandeira } from '@/componentes/Bandeira'
import { rotuloJurisdicao } from '@/lib/rotulos'
import {
  MATERIAS,
  dataBr,
  materiaDe,
  nomeAtivo,
  type Materia,
} from '@/lib/visao'
import type { AtivoCliente } from '@/projecao/cliente'
import { EsqPortalAtivos } from '@/componentes/EsqueletosDasPaginas'

function MeusAtivos() {
  const { visao } = useCliente()
  const params = useSearchParams()
  // a home linka para cá com ?materia=marca — a lista abre já filtrada
  const inicial = (params.get('materia') as Materia | null) ?? 'todas'
  const [materia, setMateria] = useState<Materia | 'todas'>(inicial)
  const [jurisdicao, setJurisdicao] = useState<string>(params.get('jurisdicao') ?? 'todas')
  const [busca, setBusca] = useState('')

  const grupos = useMemo(() => {
    if (!visao) return []
    const q = busca.trim().toLowerCase()
    const filtrados = visao.ativos.filter((a) => {
      if (materia !== 'todas' && materiaDe(a.especie) !== materia) return false
      if (jurisdicao !== 'todas' && a.jurisdicao !== jurisdicao) return false
      if (q) {
        const alvo = [nomeAtivo(a), ...a.identificadores.map((i) => i.valor_bruto)].join(' ').toLowerCase()
        if (!alvo.includes(q)) return false
      }
      return true
    })
    const m = new Map<Materia, AtivoCliente[]>()
    for (const a of filtrados) {
      const k = materiaDe(a.especie)
      m.set(k, [...(m.get(k) ?? []), a])
    }
    return MATERIAS.filter((x) => m.has(x.id)).map((x) => ({
      ...x,
      itens: (m.get(x.id) ?? []).sort((a, b) => nomeAtivo(a).localeCompare(nomeAtivo(b))),
    }))
  }, [visao, materia, jurisdicao, busca])

  if (!visao) return null

  const jurisdicoes = [...new Set(visao.ativos.map((a) => a.jurisdicao))].sort()
  const total = grupos.reduce((s, g) => s + g.itens.length, 0)

  return (
    <>
      <header>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Meus ativos
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          <span className="num">{total}</span> de <span className="num">{visao.ativos.length}</span>{' '}
          {visao.ativos.length === 1 ? 'ativo' : 'ativos'}
        </p>
      </header>

      {/* filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="seg">
          <button data-on={materia === 'todas' ? 'sim' : 'nao'} onClick={() => setMateria('todas')}>
            Todas
          </button>
          {MATERIAS.filter((m) => visao.ativos.some((a) => materiaDe(a.especie) === m.id)).map((m) => (
            <button
              key={m.id}
              data-on={materia === m.id ? 'sim' : 'nao'}
              onClick={() => setMateria(m.id)}
            >
              {m.plural}
            </button>
          ))}
        </div>

        <select
          value={jurisdicao}
          onChange={(e) => setJurisdicao(e.target.value)}
          className="rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 py-1.5 text-[11.5px] text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          <option value="todas">Todas as jurisdições</option>
          {jurisdicoes.map((j) => (
            <option key={j} value={j}>
              {rotuloJurisdicao(j)}
            </option>
          ))}
        </select>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou número"
          className="min-w-[190px] flex-1 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-1.5 text-[11.5px] text-[var(--tx)] placeholder:text-[var(--tx3)]"
        />
      </div>

      {grupos.length === 0 && (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          Nenhum ativo com esses filtros.
        </p>
      )}

      {grupos.map((g) => (
        <section key={g.id} className="mt-6">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="sec">{g.plural}</h2>
            <span className="num text-[11px] text-[var(--tx3)]">{g.itens.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.itens.map((a) => (
              <CardAtivo key={a.ativo_id} a={a} materia={g.id} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function CardAtivo({ a, materia }: { a: AtivoCliente; materia: Materia }) {
  const numero = a.identificadores[0]?.valor_bruto
  const classes = a.marca?.classes?.map((c) => c.codigo) ?? []

  return (
    <Link
      href={`/portal/assets/${a.ativo_id}`}
      id={a.ativo_id}
      className={`card card-i chip-mat mat-${materia} block overflow-hidden p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className="text-[14px] font-semibold leading-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          {nomeAtivo(a)}
        </h3>
        <Bandeira j={a.jurisdicao} grande />
      </div>

      {numero && <p className="num mt-1 text-[11px] text-[var(--tx2)]">{numero}</p>}

      <p className="mt-2.5 text-[11.5px] leading-snug text-[var(--tx)]">{a.situacao.texto}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10.5px]">
        {a.datas.deposito && <Par r="Depósito" v={dataBr(a.datas.deposito)} />}
        {a.datas.concessao && <Par r="Concessão" v={dataBr(a.datas.concessao)} />}
        {a.datas.vigencia_ate && <Par r="Vigente até" v={dataBr(a.datas.vigencia_ate)} />}
        {classes.length > 0 && <Par r="Classes" v={classes.join(' · ')} />}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--linha)] pt-2.5">
        {a.vigilancia.ativa ? (
          <span className="pill pill-ok" title="cruzamos toda publicação nova desta base contra este ativo">
            Vigilância ativa
          </span>
        ) : (
          <span className="pill pill-neu" title={a.vigilancia.motivo ?? 'sem leitura automática desta base'}>
            Sem leitura automática
          </span>
        )}
        {!a.vigilancia.ativa && a.vigilancia.motivo && (
          <span className="text-[10px] text-[var(--tx3)]">{a.vigilancia.motivo}</span>
        )}
        <span
          className="ml-auto text-[11px] font-semibold text-[var(--color-petrol-cla)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Abrir →
        </span>
      </div>
    </Link>
  )
}

function Par({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-[var(--tx3)]" style={{ fontFamily: 'var(--font-titulo)' }}>
        {r}
      </dt>
      <dd className="num text-[11px] text-[var(--tx)]">{v}</dd>
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
    <Suspense fallback={<EsqPortalAtivos />}>
      <MeusAtivos />
    </Suspense>
  )
}
