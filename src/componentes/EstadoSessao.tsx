'use client'

/**
 * Quem está logado.
 *
 * A sessão mora num cookie httpOnly que o JavaScript não lê — de propósito. Para saber o nome e
 * o papel, a tela pergunta à API (`/me`). O `proxy.ts` já garantiu que só chega aqui quem tem
 * cookie válido; se a API discordar (conta bloqueada, papel mudado), ela responde 401 e o
 * `lib/api` leva de volta ao login.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'

/** `operador` = quem opera a PLATAFORMA (o painel das empresas); não vê carteira nenhuma. */
export type Papel = 'admin' | 'gestor' | 'cliente' | 'operador'

export type Usuario = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Papel
  pessoaId: string | null
  pessoaNome: string | null
  /** Hash da foto de perfil (no bucket); null = sem foto, a tela mostra o boneco padrão. */
  fotoSha256: string | null
}

type Ctx = {
  usuario: Usuario | null
  carregando: boolean
  /** admin ou gestor: vê a carteira inteira. */
  ehEquipe: boolean
  sair: () => Promise<void>
  /** Troca o usuário em memória pelo que a API devolveu (depois de editar o perfil). */
  atualizarUsuario: (u: Usuario) => void
}

const C = createContext<Ctx | null>(null)

export function ProvedorSessao({ children }: { children: React.ReactNode }) {
  const caminho = usePathname()
  const naTelaDeLogin = caminho === '/login'
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(!naTelaDeLogin)

  useEffect(() => {
    if (naTelaDeLogin) return
    let vivo = true
    /*
     * Leitura da sessão no servidor — sincronização com sistema externo, que é o que o efeito
     * faz. Os setState acontecem depois do await (o lint não atravessa o await).
     */
    api<{ user: Usuario }>('/me')
      .then((r) => {
        if (vivo) setUsuario(r.user)
      })
      .catch(() => {
        /* 401 já levou ao login; outro erro deixa a tela sem usuário, e ela diz isso */
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [naTelaDeLogin])

  const sair = useCallback(async () => {
    try {
      await api('/logout', { metodo: 'POST', semRedirecionar: true })
    } finally {
      // Recarga completa, e não router.push: nada do estado em memória do usuário anterior
      // (a carteira, o portal) pode sobreviver à troca de sessão.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login')
    }
  }, [])

  const valor = useMemo(
    () => ({
      usuario,
      carregando,
      ehEquipe: usuario?.role === 'admin' || usuario?.role === 'gestor',
      sair,
      atualizarUsuario: setUsuario,
    }),
    [usuario, carregando, sair],
  )

  return <C.Provider value={valor}>{children}</C.Provider>
}

export function useSessao(): Ctx {
  const c = useContext(C)
  if (!c) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>')
  return c
}

export const ROTULO_PERFIL: Record<Papel, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  cliente: 'Cliente',
  operador: 'Operador da plataforma',
}
