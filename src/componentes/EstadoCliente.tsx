'use client'

/**
 * De quem é o portal que está na tela.
 *
 *   cliente logado — a pessoa vem da SESSÃO, no servidor. Não há escolha: o portal é o dele.
 *   equipe         — pré-visualização: o gestor escolhe uma pessoa e vê o portal como ela vê.
 *
 * Nos dois casos o recorte é PROJETADO E AUDITADO NO SERVIDOR (`GET /portal`): o navegador do
 * cliente nunca recebe a carteira inteira para filtrar — "não pode ver" é "não está no arquivo".
 * A auditoria roda de novo aqui, como segunda barreira: se um campo proibido chegar, a tela
 * mostra o erro em vez do dado. Falhar alto é melhor que vazar em silêncio.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { useSessao } from './EstadoSessao'
import { useArmazenado } from '@/lib/armazenado'
import { auditarProjecao, type PacoteCliente } from '@/projecao/cliente'
import { repositorio } from '@/repositorio/api'

type Ctx = {
  /** `cliente`: o portal do logado. `previa`: a equipe vendo o portal de alguém. */
  modo: 'cliente' | 'previa'
  pessoaId: string | null
  nome: string | null
  /** Só na prévia. */
  escolher: (id: string | null) => void
  /** Já auditado. `null` enquanto carrega ou enquanto ninguém foi escolhido. */
  visao: PacoteCliente | null
  carregando: boolean
  erro: string | null
  /** Prévia: quem pode ter portal — tem vínculo publicável de titular, cliente ou parceiro. */
  candidatos: { pessoa_id: string; nome: string; papel: string; papeis: string[]; ativos: number }[]
  hoje: string
}

const C = createContext<Ctx | null>(null)
const CHAVE = 'apex-portal-pessoa'
const PAPEIS = ['titular', 'cotitular', 'cliente', 'parceiro']

export function ProvedorCliente({ children }: { children: React.ReactNode }) {
  const { pacote, hoje } = usePortfolio()
  const { usuario, ehEquipe } = useSessao()
  const [escolhida, gravar] = useArmazenado(CHAVE)
  const escolher = useCallback((id: string | null) => gravar(id), [gravar])

  const modo: Ctx['modo'] = ehEquipe ? 'previa' : 'cliente'
  const pessoaId = ehEquipe ? escolhida : (usuario?.pessoaId ?? null)

  const [estado, setEstado] = useState<{
    de: string | null
    visao: PacoteCliente | null
    nome: string | null
    erro: string | null
  }>({ de: null, visao: null, nome: null, erro: null })

  // O pedido de agora: a pessoa (prévia) ou o próprio logado (cliente). `null` = nada a pedir.
  const pedido = !usuario ? null : ehEquipe ? escolhida : 'eu'

  useEffect(() => {
    if (!pedido) return
    let vivo = true
    /*
     * Busca no servidor — sincronização com sistema externo. Os setState vêm depois do await.
     */
    repositorio()
      .portal(pedido === 'eu' ? undefined : pedido)
      .then((r) => {
        auditarProjecao(r.visao)
        if (vivo) setEstado({ de: pedido, visao: r.visao, nome: r.pessoa.nome, erro: null })
      })
      .catch((e: unknown) => {
        // Pessoa da prévia que sumiu da carteira (reimportação): volta à escolha, sem erro.
        if (ehEquipe && e instanceof Error && 'status' in e && (e as { status: number }).status === 404) {
          gravar(null)
          return
        }
        if (vivo) setEstado({ de: pedido, visao: null, nome: null, erro: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      vivo = false
    }
  }, [pedido, ehEquipe, gravar, pacote.gerado_em])

  const candidatos = useMemo(() => {
    if (!ehEquipe) return []
    const m = new Map<string, { papeis: Set<string>; ativos: Set<string> }>()
    for (const v of pacote.vinculos) {
      if (!v.publicavel || !PAPEIS.includes(v.papel)) continue
      const e = m.get(v.pessoa_id) ?? { papeis: new Set<string>(), ativos: new Set<string>() }
      e.papeis.add(v.papel)
      e.ativos.add(v.ativo_id)
      m.set(v.pessoa_id, e)
    }
    const pessoaPorId = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p]))
    return [...m.entries()]
      .map(([pessoa_id, e]) => ({
        pessoa_id,
        nome: pessoaPorId.get(pessoa_id)?.nome ?? pessoa_id,
        // O papel que mais diz sobre o portal: parceiro vê os clientes dele; cliente, o dele.
        papel: e.papeis.has('parceiro') ? 'parceiro' : e.papeis.has('cliente') ? 'cliente' : [...e.papeis][0],
        papeis: [...e.papeis],
        ativos: e.ativos.size,
      }))
      .filter((c) => c.ativos > 0)
      .sort((a, b) => b.ativos - a.ativos)
  }, [pacote, ehEquipe])

  // O que está na tela só vale se responde ao pedido de AGORA (troca de pessoa na prévia).
  const atual = estado.de === pedido && pedido !== null
  const valor = useMemo(
    () => ({
      modo,
      pessoaId,
      nome: atual ? estado.nome : null,
      escolher,
      visao: atual ? estado.visao : null,
      carregando: pedido !== null && !atual,
      erro: atual ? estado.erro : null,
      candidatos,
      hoje,
    }),
    [modo, pessoaId, atual, estado, escolher, pedido, candidatos, hoje],
  )

  return <C.Provider value={valor}>{children}</C.Provider>
}

export function useCliente(): Ctx {
  const c = useContext(C)
  if (!c) throw new Error('useCliente precisa estar dentro de <ProvedorCliente>')
  return c
}
