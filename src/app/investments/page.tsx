'use client'

/**
 * Investimentos — a mesma leitura, na visão do gestor.
 *
 * Aqui entra a carteira inteira, com recorte por cliente. Uma diferença importante em relação
 * ao portal: o gestor vê TODOS os serviços, inclusive os de procedência `order_amount`, que
 * não chegam ao cliente. Por isso a tela avisa quantos são — quem opera precisa saber que o
 * número dele e o número que o cliente vê podem não bater, e por quê.
 */

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { PainelInvestimento } from '@/componentes/PainelInvestimento'
import { Vazio } from '@/componentes/ui'
import { nomeAtivo } from '@/lib/visao'
import { EsqBeta } from '@/componentes/EsqueletosDasPaginas'

const PAPEIS_DE_CARTEIRA = ['titular', 'cotitular', 'cliente', 'parceiro']

export default function Investimentos() {
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

  const servicos = useMemo(() => {
    if (!cliente) return pacote.servicos
    const meus = new Set(
      pacote.vinculos
        .filter((v) => v.pessoa_id === cliente && PAPEIS_DE_CARTEIRA.includes(v.papel))
        .map((v) => v.ativo_id),
    )
    return pacote.servicos.filter((s) => s.ativo_ids.some((id) => meus.has(id)))
  }, [pacote, cliente])

  const soDoCrm = servicos.filter((s) => s.valor?.origem === 'order_amount').length

  if (carregando) {
    return <EsqBeta />
  }
  if (pacote.servicos.length === 0) {
    return (
      <Vazio
        titulo="Nenhum serviço registrado"
        detalhe="O histórico de contratação vem do Ploomes, na entrega 1C."
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
            Investimentos
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{servicos.length}</span>{' '}
            {servicos.length === 1 ? 'serviço' : 'serviços'}
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

      {soDoCrm > 0 && (
        <p
          className="mb-4 rounded-lg px-3.5 py-2.5 text-[11.5px] leading-snug"
          style={{
            background: 'rgba(230,138,0,.1)',
            border: '1px solid rgba(230,138,0,.24)',
            color: 'var(--color-alerta)',
          }}
        >
          ⚠️ <span className="num">{soDoCrm}</span>{' '}
          {soDoCrm === 1 ? 'serviço tem valor' : 'serviços têm valor'} vindo apenas do campo do
          CRM (<span className="num">order_amount</span>), que{' '}
          <strong>infla o nacional em R$ 145.153,79</strong> porque card espelhado repete o valor
          do irmão. {soDoCrm === 1 ? 'Ele entra' : 'Eles entram'} nesta soma interna, mas{' '}
          <strong>não chegam ao cliente</strong> — o número dele será menor, e é por isso.
        </p>
      )}

      <PainelInvestimento
        servicos={servicos}
        nomeDoAtivo={(id) => {
          const a = pacote.ativos.find((x) => x.ativo_id === id)
          return a ? nomeAtivo(a) : id
        }}
        hrefDoAtivo={(id) => `/assets/${id}`}
        jurisdicaoDoAtivo={(id) => pacote.ativos.find((x) => x.ativo_id === id)?.jurisdicao}
      />
    </>
  )
}
