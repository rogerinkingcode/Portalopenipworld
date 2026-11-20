'use client'

/**
 * Ligar ou desligar a vigilância de UM ativo. A política vigia toda marca brasileira viva; a
 * equipe pode tirar um ativo (cliente que não renovou, marca abandonada), sempre com o motivo —
 * e o cliente passa a ver "sem vigilância" com esse motivo. Religar devolve à política.
 *
 * Só aparece onde a escolha existe: marca BR viva (vigiada) ou desligada à mão.
 */

import { useCallback, useState } from 'react'
import type { Pacote } from '@/contrato/tipos'
import { usePortfolio } from './EstadoPortfolio'
import { Botao } from './ui'
import { Confirmacao } from './Confirmacao'
import { api } from '@/lib/api'
import { useMensagem, toast } from './Toast'

type Vigilancia = Pacote['ativos'][number]['vigilancia']

export function ControleVigilancia({ ativoId, vigilancia }: { ativoId: string; vigilancia: Vigilancia }) {
  const { recarregar } = usePortfolio()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useMensagem('erro')
  const [pedindoMotivo, setPedindoMotivo] = useState(false)
  const cancelar = useCallback(() => setPedindoMotivo(false), [])
  const desligadaAMao = vigilancia.motivos.includes('desligada à mão')
  if (!vigilancia.ativa && !desligadaAMao) return null

  /** Desligar exige motivo (vem do diálogo); religar não pede nada. */
  async function mudar(ativa: boolean, motivo?: string) {
    setOcupado(true)
    setErro(null)
    try {
      await api(`/ativos/${ativoId}/vigilancia`, { metodo: 'PUT', corpo: { ativa, motivo } })
      await recarregar()
      toast.sucesso(ativa ? 'Vigilância religada: o ativo volta à leitura semanal da RPI.' : 'Vigilância desligada.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--tx2)]">
      {vigilancia.ativa ? (
        <>
          <span>
            Vigiada na RPI toda semana
            {vigilancia.atualizado_em && ` · última leitura ${vigilancia.atualizado_em.split('-').reverse().join('/')}`}.
          </span>
          <Botao variante="secundaria" disabled={ocupado} carregando={ocupado} onClick={() => setPedindoMotivo(true)}>
            Desligar vigilância
          </Botao>
        </>
      ) : (
        <Botao disabled={ocupado} carregando={ocupado} onClick={() => void mudar(true)}>
          Religar vigilância
        </Botao>
      )}
      {erro && <span className="text-[var(--color-erro)]">{erro}</span>}

      <Confirmacao
        aberto={pedindoMotivo}
        titulo="Desligar a vigilância deste ativo?"
        rotuloConfirmar="Desligar vigilância"
        perigo
        campo={{
          rotulo: 'Motivo (o cliente vê este texto)',
          placeholder: 'Ex.: cliente não renovou o contrato de vigilância',
        }}
        aoCancelar={cancelar}
        aoConfirmar={(motivo) => {
          setPedindoMotivo(false)
          void mudar(false, motivo)
        }}
      >
        A marca deixa de ser comparada com a RPI toda semana, e publicações parecidas de terceiros
        não serão mais levantadas. Dá para religar depois.
      </Confirmacao>
    </div>
  )
}
