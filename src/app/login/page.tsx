'use client'

/**
 * Entrar.
 *
 * O formulário manda e-mail e senha para a API (via `/api/backend/login`); a API confere com
 * bcrypt, conta as tentativas erradas e, se der certo, grava a sessão num cookie httpOnly — a
 * página nunca vê o token. Depois disso o `proxy.ts` decide a casa: o gestor vai ao painel, o
 * cliente vai ao portal dele.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api, ErroApi } from '@/lib/api'
import { useMensagem } from '@/componentes/Toast'
import { Girando } from '@/componentes/ui'
import { lerCredenciais, salvarCredenciais } from '@/lib/credenciais'
import { CampoSenha } from '@/componentes/CampoSenha'

export default function Login() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  )
}

/** Só caminho interno: um `?de=https://…` não pode virar redirecionamento para fora. */
function destinoSeguro(de: string | null, papel: string): string {
  // O operador da plataforma vai sempre ao painel das empresas.
  if (papel === 'operador') return '/platform'
  const casa = papel === 'cliente' ? '/portal' : '/'
  if (!de || !de.startsWith('/') || de.startsWith('//') || de.startsWith('/login')) return casa
  // O cliente nunca é mandado ao painel do gestor, nem que o link peça.
  if (papel === 'cliente' && !de.startsWith('/portal')) return casa
  return de
}

function Formulario() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useMensagem('erro')

  /*
   * Lido depois da montagem: no servidor não há localStorage e o HTML inicial tem de bater
   * (um valor inicial lido no render quebraria a hidratação). É sincronizar com um sistema
   * externo — o armazenamento do navegador —, que é o que o efeito serve para fazer.
   */
  useEffect(() => {
    const c = lerCredenciais()
    if (c) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(c.email)
      setSenha(c.senha)
    }
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const r = await api<{ payload: { role: string } }>('/login', {
        metodo: 'POST',
        corpo: { email: email.trim(), password: senha },
        semRedirecionar: true,
      })
      salvarCredenciais(email.trim(), senha)
      // Navegação completa: o proxy relê o cookie novo e os provedores nascem com a sessão.
      window.location.assign(destinoSeguro(params.get('de'), r.payload.role))
    } catch (e) {
      setErro(e instanceof ErroApi || e instanceof Error ? e.message : String(e))
      setEnviando(false)
    }
  }

  return (
    <div
      className="grid min-h-screen place-items-center px-5"
      style={{ background: 'linear-gradient(168deg,#1A6581 0%,#0E3A4A 40%,#08171d 100%)' }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-bold text-[#08171d]"
            style={{
              background: 'linear-gradient(135deg,#00E0F6,#1A6581)',
              boxShadow: '0 4px 14px rgba(0,224,246,.28)',
              fontFamily: 'var(--font-titulo)',
            }}
          >
            A
          </span>
          <span className="leading-tight">
            <span
              className="block text-[18px] font-semibold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              OpenIpWorld
            </span>
            <span className="block text-[9px] uppercase tracking-[.12em] text-[rgba(0,224,246,.62)]">
              Propriedade Intelectual
            </span>
          </span>
        </div>

        <form onSubmit={entrar} className="card p-6" noValidate>
          <h1
            className="text-[16px] font-semibold text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Entrar
          </h1>
          <p className="mt-1 text-[12px] text-[var(--tx2)]">
            A carteira de propriedade intelectual do seu escritório.
          </p>

          <label className="mt-5 block">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">E-mail</span>
            <input
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[13px] text-[var(--tx)] outline-none focus:border-[#00E0F6]"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Senha</span>
            <CampoSenha
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[13px] text-[var(--tx)] outline-none focus:border-[#00E0F6]"
            />
          </label>

          {erro && (
            <p role="alert" className="mt-3 text-[12px] text-[var(--color-erro)]">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !email || !senha}
            aria-busy={enviando || undefined}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[12.5px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-titulo)',
              background: 'linear-gradient(135deg,#2589A8,#1A6581)',
              boxShadow: '0 2px 10px rgba(26,101,129,.35)',
            }}
          >
            {enviando && <Girando />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-[10.5px] text-[rgba(232,237,239,.5)]">
          Sem acesso? Peça o login ao administrador do seu escritório.
        </p>
      </div>
    </div>
  )
}
