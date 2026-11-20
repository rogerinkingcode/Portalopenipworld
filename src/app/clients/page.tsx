'use client'

/**
 * A carteira por CLIENTE — a lista que faltava no gestor.
 *
 * A tela de Ativos responde "quais ativos existem"; esta responde "de quem são". São perguntas
 * diferentes e nenhuma das duas substitui a outra: numa carteira de milhares de ativos, achar o
 * portfólio de um cliente varrendo a lista de ativos é trabalho manual.
 *
 * ⚠️ Uma pessoa acumula papéis, e isso é normal: papel é da relação com o ativo, não da pessoa.
 *    O recorte padrão é CLIENTE (quem contratou); titular e parceiro têm o próprio recorte.
 *    Agente correspondente NÃO é cliente e fica de fora desta lista.
 *
 * Prazo "a tratar" = em aberto ou vencido. A prorrogação que só abre daqui a anos não conta:
 * ela é quase todo o volume da carteira e afogaria o que precisa de ação agora.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { Bandeira } from '@/componentes/Bandeira'
import { Vazio } from '@/componentes/ui'
import { rotuloPapel } from '@/lib/rotulos'
import { diasAte, estadoDoPrazo } from '@/lib/visao'
import { EsqClientes } from '@/componentes/EsqueletosDasPaginas'

const PAPEIS_DE_CARTEIRA = ['titular', 'cotitular', 'cliente', 'parceiro']
const POR_PAGINA = 15

type Recorte = 'cliente' | 'parceiro' | 'titular' | 'todos'
const RECORTES: { id: Recorte; rotulo: string }[] = [
  { id: 'cliente', rotulo: 'Clientes' },
  { id: 'parceiro', rotulo: 'Parceiros' },
  { id: 'titular', rotulo: 'Titulares' },
  { id: 'todos', rotulo: 'Todos' },
]

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()

export default function Clientes() {
  const { pacote, hoje, carregando } = usePortfolio()
  const [busca, setBusca] = useState('')
  const [recorte, setRecorte] = useState<Recorte>('cliente')
  const [ordem, setOrdem] = useState<'ativos' | 'prazos' | 'nome'>('ativos')
  const [limite, setLimite] = useState(POR_PAGINA)

  const { linhas, semCliente } = useMemo(() => {
    // Índices uma vez só: com 1.700 ativos e 800 pessoas, filtrar a carteira por pessoa trava a tela.
    const porPessoa = new Map<string, { papeis: Set<string>; ativos: Set<string> }>()
    const comCliente = new Set<string>()
    for (const v of pacote.vinculos) {
      if (v.papel === 'cliente') comCliente.add(v.ativo_id)
      if (!PAPEIS_DE_CARTEIRA.includes(v.papel)) continue
      const e = porPessoa.get(v.pessoa_id) ?? { papeis: new Set<string>(), ativos: new Set<string>() }
      e.papeis.add(v.papel)
      e.ativos.add(v.ativo_id)
      porPessoa.set(v.pessoa_id, e)
    }
    const ativoPorId = new Map(pacote.ativos.map((a) => [a.ativo_id, a]))
    const prazosPorAtivo = new Map<string, { vencido: number; aberto: number; em30: number }>()
    for (const z of pacote.prazos) {
      const estado = estadoDoPrazo(z, hoje)
      if (estado !== 'aberto' && estado !== 'vencido') continue
      const c = prazosPorAtivo.get(z.ativo_id) ?? { vencido: 0, aberto: 0, em30: 0 }
      c[estado] += 1
      if (estado === 'aberto' && diasAte(z.vence_em, hoje) <= 30) c.em30 += 1
      prazosPorAtivo.set(z.ativo_id, c)
    }
    const ameacasPorAtivo = new Map<string, number>()
    for (const c of pacote.colidencias ?? []) {
      if (c.parecer?.decisao !== 'enviar') continue
      ameacasPorAtivo.set(c.ativo_id, (ameacasPorAtivo.get(c.ativo_id) ?? 0) + 1)
    }

    const linhas = pacote.pessoas
      .map((p) => {
        const e = porPessoa.get(p.pessoa_id)
        if (!e || e.ativos.size === 0) return null
        const jurisdicoes = new Set<string>()
        let vencidos = 0
        let aTratar = 0
        let em30 = 0
        let ameacas = 0
        for (const id of e.ativos) {
          const a = ativoPorId.get(id)
          if (a) jurisdicoes.add(a.jurisdicao)
          const z = prazosPorAtivo.get(id)
          if (z) {
            vencidos += z.vencido
            aTratar += z.vencido + z.aberto
            em30 += z.em30
          }
          ameacas += ameacasPorAtivo.get(id) ?? 0
        }
        return {
          pessoa: p,
          nome: normalizar(p.nome),
          papeis: [...e.papeis],
          nAtivos: e.ativos.size,
          jurisdicoes: [...jurisdicoes],
          vencidos,
          aTratar,
          em30,
          ameacas,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    return { linhas, semCliente: pacote.ativos.filter((a) => !comCliente.has(a.ativo_id)).length }
  }, [pacote, hoje])

  const porRecorte = useMemo(
    (): Record<Recorte, typeof linhas> => ({
      cliente: linhas.filter((l) => l.papeis.includes('cliente')),
      parceiro: linhas.filter((l) => l.papeis.includes('parceiro')),
      titular: linhas.filter((l) => l.papeis.includes('titular') || l.papeis.includes('cotitular')),
      todos: linhas,
    }),
    [linhas],
  )

  const visiveis = useMemo(() => {
    const q = normalizar(busca)
    const base = porRecorte[recorte]
    const f = q ? base.filter((l) => l.nome.includes(q)) : base
    return [...f].sort((a, b) => {
      if (ordem === 'nome') return a.pessoa.nome.localeCompare(b.pessoa.nome)
      if (ordem === 'prazos') return b.vencidos - a.vencidos || b.aTratar - a.aTratar || b.nAtivos - a.nAtivos
      return b.nAtivos - a.nAtivos || a.pessoa.nome.localeCompare(b.pessoa.nome)
    })
  }, [porRecorte, busca, ordem, recorte])

  if (carregando) {
    return <EsqClientes />
  }
  if (linhas.length === 0) {
    return (
      <Vazio
        titulo="Nenhum cliente com ativo vinculado"
        detalhe="Clientes aparecem aqui quando existe vínculo de titular, cotitular, cliente ou parceiro com algum ativo. A conciliação é onde esses vínculos se decidem."
        acao={
          <Link
            href="/reconciliation"
            className="text-[12px] font-semibold text-[var(--color-petrol-cla)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            ir para a Conciliação →
          </Link>
        }
      />
    )
  }

  const total = porRecorte[recorte].length

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Carteira por cliente
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{visiveis.length}</span>
            {visiveis.length !== total && (
              <>
                {' '}
                de <span className="num">{total}</span>
              </>
            )}{' '}
            {RECORTES.find((r) => r.id === recorte)!.rotulo.toLowerCase()} com ativo vinculado
          </p>
        </div>
        <div className="seg">
          <button data-on={ordem === 'ativos' ? 'sim' : 'nao'} onClick={() => setOrdem('ativos')}>
            Mais ativos
          </button>
          <button data-on={ordem === 'prazos' ? 'sim' : 'nao'} onClick={() => setOrdem('prazos')}>
            Prazos a tratar
          </button>
          <button data-on={ordem === 'nome' ? 'sim' : 'nao'} onClick={() => setOrdem('nome')}>
            A–Z
          </button>
        </div>
      </header>

      {semCliente > 0 && (
        <p className="nota mt-4">
          <span className="num">{semCliente}</span> {semCliente === 1 ? 'ativo ainda não tem' : 'ativos ainda não têm'}{' '}
          cliente e só aparecem aqui pelo titular.{' '}
          <Link href="/reconciliation" className="font-semibold text-[var(--color-petrol-cla)]">
            Resolver na Conciliação →
          </Link>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {RECORTES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setRecorte(r.id)
              setLimite(POR_PAGINA)
            }}
            className="rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition"
            style={{
              fontFamily: 'var(--font-titulo)',
              borderColor: recorte === r.id ? 'var(--color-ciano)' : 'var(--brd)',
              background: recorte === r.id ? 'rgba(0,224,246,.1)' : 'transparent',
              color: recorte === r.id ? 'var(--tx)' : 'var(--tx2)',
            }}
          >
            {r.rotulo} <span className="num text-[var(--tx3)]">{porRecorte[r.id].length}</span>
          </button>
        ))}
      </div>

      <input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          setLimite(POR_PAGINA)
        }}
        placeholder="Buscar pelo nome"
        className="mt-3 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3.5 py-2 text-[12.5px] text-[var(--tx)] placeholder:text-[var(--tx3)]"
      />

      {visiveis.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">Ninguém com esse nome neste recorte.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.slice(0, limite).map((l) => (
              <Link key={l.pessoa.pessoa_id} href={`/clients/${l.pessoa.pessoa_id}`} className="card card-i block p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#2589A8,#1A6581)', fontFamily: 'var(--font-titulo)' }}
                  >
                    {l.pessoa.nome.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] font-semibold text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {l.pessoa.nome}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      {l.papeis.map((p) => (
                        <span key={p} className="pill pill-neu">
                          {rotuloPapel(p)}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--linha)] pt-2.5">
                  <span>
                    <span className="rotulo block">Ativos</span>
                    <span className="num-g text-[19px] text-[var(--tx)]">{l.nAtivos}</span>
                  </span>
                  <span className="flex flex-1 flex-wrap items-center justify-end gap-1">
                    {l.jurisdicoes.slice(0, 5).map((j) => (
                      <Bandeira key={j} j={j} />
                    ))}
                    {l.jurisdicoes.length > 5 && (
                      <span className="num text-[10px] text-[var(--tx3)]">+{l.jurisdicoes.length - 5}</span>
                    )}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {l.vencidos > 0 && (
                    <span className="pill pill-neg">
                      {l.vencidos} {l.vencidos === 1 ? 'prazo vencido' : 'prazos vencidos'}
                    </span>
                  )}
                  {l.em30 > 0 && (
                    <span className="pill pill-avi">
                      {l.em30} {l.em30 === 1 ? 'prazo' : 'prazos'} em 30 dias
                    </span>
                  )}
                  {l.ameacas > 0 && (
                    <span className="pill pill-neg">
                      {l.ameacas} {l.ameacas === 1 ? 'ameaça' : 'ameaças'}
                    </span>
                  )}
                  {l.vencidos === 0 && l.em30 === 0 && l.ameacas === 0 && (
                    <span className="text-[10.5px] text-[var(--tx3)]">
                      {l.aTratar === 0
                        ? 'nenhum prazo a tratar'
                        : `${l.aTratar} ${l.aTratar === 1 ? 'prazo' : 'prazos'} a tratar`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {limite < visiveis.length && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setLimite(limite + POR_PAGINA)}
                className="rounded-lg border border-[var(--brd)] px-3.5 py-2 text-[12px] font-semibold text-[var(--tx2)] hover:text-[var(--tx)]"
              >
                Mostrar mais ({visiveis.length - limite} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
