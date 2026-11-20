'use client'

/** Um caso de ameaça aberto no próprio sistema — visão do gestor. */

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { CasoAmeaca } from '@/componentes/CasoAmeaca'
import { Vazio, BotaoVoltar } from '@/componentes/ui'
import { montarAmeacas } from '@/lib/ameacas'
import { EsqAmeaca } from '@/componentes/EsqueletosDasPaginas'

export default function CasoNoGestor() {
  const { id } = useParams<{ id: string }>()
  const { pacote, hoje, carregando } = usePortfolio()
  const a = useMemo(
    () => montarAmeacas(pacote).find((x) => x.colidencia_id === id),
    [pacote, id],
  )

  if (carregando) {
    return <EsqAmeaca />
  }
  if (!a) {
    return (
      <Vazio
        titulo="Caso não encontrado"
        detalhe="Ou o identificador não existe, ou o caso ainda não tem parecer assinado — nesse estado ele fica na fila Em análise."
        acao={
          <BotaoVoltar href="/threats">Voltar para Ameaças</BotaoVoltar>
        }
      />
    )
  }

  return (
    <CasoAmeaca a={a} hoje={hoje} hrefAtivo={`/assets/${a.ativo_id}`} hrefVoltar="/threats" />
  )
}
