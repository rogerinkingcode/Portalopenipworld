'use client'

/**
 * Inteligência de mercado — visão do cliente.
 *
 * Mesmo painel do gestor, sem recorte: o cliente só tem a carteira dele. Ele entra pela
 * projeção auditada, como todas as telas do portal — nada aqui lê o pacote inteiro.
 */

import { useCliente } from '@/componentes/EstadoCliente'
import { PainelInteligencia } from '@/componentes/PainelInteligencia'
import { EsqBeta } from '@/componentes/EsqueletosDasPaginas'

export default function InteligenciaDoCliente() {
  const { visao } = useCliente()

  if (!visao) {
    return <EsqBeta />
  }

  return (
    <>
      <header className="mb-4">
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Inteligência de mercado
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          Onde a sua carteira está hoje — e o que ainda precisa ser medido para dizer onde ela
          deveria estar amanhã.
        </p>
      </header>

      <PainelInteligencia ativos={visao.ativos} />
    </>
  )
}
