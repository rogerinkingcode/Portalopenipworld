'use client'

/**
 * Inteligência de mercado — visão do gestor.
 *
 * Mesmo painel do portal, com um recorte por cliente. O gestor precisa dele antes do cliente:
 * é aqui que se prepara a conversa de expansão de carteira, e é aqui que se vê a lacuna antes
 * de ela virar recomendação.
 */

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { PainelInteligencia } from '@/componentes/PainelInteligencia'
import { Vazio } from '@/componentes/ui'
import { EsqBeta } from '@/componentes/EsqueletosDasPaginas'

const PAPEIS_DE_CARTEIRA = ['titular', 'cotitular', 'cliente', 'parceiro']

export default function Inteligencia() {
  const { pacote, carregando } = usePortfolio()
  const [cliente, setCliente] = useState('')

  const clientes = useMemo(() => {
    const ids = new Set(
      pacote.vinculos.filter((v) => PAPEIS_DE_CARTEIRA.includes(v.papel)).map((v) => v.pessoa_id),
    )
    return pacote.pessoas
      .filter((p) => ids.has(p.pessoa_id))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [pacote])

  const ativos = useMemo(() => {
    if (!cliente) return pacote.ativos
    const meus = new Set(
      pacote.vinculos
        .filter((v) => v.pessoa_id === cliente && PAPEIS_DE_CARTEIRA.includes(v.papel))
        .map((v) => v.ativo_id),
    )
    return pacote.ativos.filter((a) => meus.has(a.ativo_id))
  }, [pacote, cliente])

  const nome = clientes.find((c) => c.pessoa_id === cliente)?.nome

  if (carregando) {
    return <EsqBeta />
  }
  if (pacote.ativos.length === 0) {
    return (
      <Vazio
        titulo="Nenhum ativo na carteira"
        detalhe="A inteligência de mercado começa pela leitura do que já existe — sem carteira, não há o que analisar."
      />
    )
  }

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Inteligência de mercado
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{ativos.length}</span>{' '}
            {ativos.length === 1 ? 'ativo analisado' : 'ativos analisados'}
            {cliente ? ' deste cliente' : ' na carteira inteira'}
          </p>
        </div>
        <label className="flex items-center gap-2">
          <span className="rotulo">cliente</span>
          <select
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 py-1.5 text-[11.5px] text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            <option value="">Toda a carteira</option>
            {clientes.map((c) => (
              <option key={c.pessoa_id} value={c.pessoa_id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </header>

      <PainelInteligencia ativos={ativos} nomeDoTitular={nome} />
    </>
  )
}
