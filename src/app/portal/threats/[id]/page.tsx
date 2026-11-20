'use client'

/** Um caso de ameaça aberto no próprio sistema — visão do cliente. */

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { CasoAmeaca } from '@/componentes/CasoAmeaca'
import { Vazio, BotaoVoltar } from '@/componentes/ui'
import { montarAmeacas } from '@/lib/ameacas'

export default function CasoNoPortal() {
  const { id } = useParams<{ id: string }>()
  const { visao, hoje } = useCliente()
  const a = useMemo(
    () => (visao ? montarAmeacas(visao).find((x) => x.colidencia_id === id) : undefined),
    [visao, id],
  )

  if (!visao) return null
  if (!a) {
    return (
      <Vazio
        titulo="Caso não encontrado"
        detalhe="Este caso não está no seu portfólio, ou ainda não tem parecer emitido."
        acao={
          <BotaoVoltar href="/portal/threats">Voltar para Ameaças</BotaoVoltar>
        }
      />
    )
  }

  return (
    <CasoAmeaca
      a={a}
      hoje={hoje}
      hrefAtivo={`/portal/assets/${a.ativo_id}`}
      hrefVoltar="/portal/threats"
    />
  )
}
