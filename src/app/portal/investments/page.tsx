'use client'

/** Investimentos — o custo do portfólio, na visão do cliente. */

import { useCliente } from '@/componentes/EstadoCliente'
import { PainelInvestimento } from '@/componentes/PainelInvestimento'
import { nomeAtivo } from '@/lib/visao'

export default function MeusInvestimentos() {
  const { visao } = useCliente()
  if (!visao) return null

  const acha = (id: string) => visao.ativos.find((a) => a.ativo_id === id)

  return (
    <>
      <header className="mb-5">
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Investimentos
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          O que já foi investido na proteção do seu portfólio, e onde.
        </p>
      </header>

      <PainelInvestimento
        servicos={visao.servicos}
        nomeDoAtivo={(id) => {
          const a = acha(id)
          return a ? nomeAtivo(a) : id
        }}
        hrefDoAtivo={(id) => `/portal/assets/${id}?ver=servicos`}
        jurisdicaoDoAtivo={(id) => acha(id)?.jurisdicao}
      />
    </>
  )
}
