'use client'

/**
 * Estado global do portfólio — a carteira INTEIRA, que só a equipe (admin e gestor) carrega.
 *
 * ⚠️ Toda leitura e escrita passa pelo `PortfolioRepository` — a tela NUNCA fala com o
 * armazenamento. O cliente nem chega a pedir a carteira: o portal dele vem já projetado do
 * servidor (`EstadoCliente`), e a API recusaria de qualquer forma.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Pacote, Papel } from '@/contrato/tipos'
import { pacoteVazio } from '@/contrato/tipos'
import { repositorio } from '@/repositorio/api'
import type { ResultadoAtribuicao } from '@/repositorio/tipos'
import { agoraIso, hojeIso } from '@/lib/tempo'
import { useSessao } from './EstadoSessao'
import { useMensagem } from './Toast'

type Contexto = {
  pacote: Pacote
  carregando: boolean
  /** A carga falhou — a tela diz isso em vez de mostrar uma carteira vazia que parece real. */
  erro: string | null
  origem: string
  /** Data de referência de todo cálculo derivado. Explícita, para poder ser fixada em teste. */
  hoje: string
  /** Substitui a carteira no servidor e passa a mostrar o que ficou gravado (com os ids dele). */
  atribuirPapel: (dados: { ativo_ids: string[]; pessoa_id: string; papel: Papel }) => Promise<ResultadoAtribuicao>
  removerVinculo: (vinculoId: string) => Promise<void>
  recarregar: () => Promise<void>
}

const Ctx = createContext<Contexto | null>(null)

export function ProvedorPortfolio({ children }: { children: React.ReactNode }) {
  const { ehEquipe, carregando: carregandoSessao } = useSessao()
  const [pacote, setPacote] = useState<Pacote>(() => pacoteVazio(agoraIso()))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useMensagem('erro')
  const hoje = useMemo(() => hojeIso(), [])
  const origem = repositorio().origem

  const recarregar = useCallback(async () => {
    try {
      const p = await repositorio().carregar()
      setPacote(p)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }, [setErro])

  useEffect(() => {
    if (carregandoSessao) return
    /*
     * Carga inicial a partir da API — sincronização com sistema externo, que é exatamente para
     * o que o efeito serve. Os setState de `recarregar` acontecem depois do await; o lint não
     * atravessa o await e marca falso positivo.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ehEquipe) void recarregar()
    else setCarregando(false)
  }, [ehEquipe, carregandoSessao, recarregar])

  const atribuirPapel = useCallback(
    async (dados: { ativo_ids: string[]; pessoa_id: string; papel: Papel }) => {
      const r = await repositorio().atribuirPapel(dados)
      await recarregar()
      return r
    },
    [recarregar],
  )

  const removerVinculo = useCallback(
    async (vinculoId: string) => {
      await repositorio().removerVinculo(vinculoId)
      await recarregar()
    },
    [recarregar],
  )

  const valor = useMemo(
    () => ({ pacote, carregando, erro, origem, hoje, atribuirPapel, removerVinculo, recarregar }),
    [pacote, carregando, erro, origem, hoje, atribuirPapel, removerVinculo, recarregar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function usePortfolio(): Contexto {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePortfolio precisa estar dentro de <ProvedorPortfolio>')
  return c
}
