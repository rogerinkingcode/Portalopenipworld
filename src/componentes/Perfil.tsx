'use client'

/**
 * Meu perfil — o usuário logado muda o que é dele: foto, nome, sobrenome e senha.
 *
 * ⛔ O e-mail NÃO muda (é o login — regra de todo sistema). Papel e "portal de" também não:
 *    são decisões do administrador, na tela Usuários. A tela mostra os três, travados, com o
 *    motivo, para ninguém procurar onde se troca.
 *
 * Um componente só para as duas visões: a equipe chega por /profile, o cliente por /portal/profile
 * (o cliente só navega dentro do portal).
 */

import { useRef, useState } from 'react'
import { useSessao, ROTULO_PERFIL } from './EstadoSessao'
import { Avatar } from './Avatar'
import { Botao, Cartao } from './ui'
import { toast, useMensagem } from './Toast'
import { api } from '@/lib/api'
import { atualizarSenhaLembrada } from '@/lib/credenciais'
import type { Usuario } from './EstadoSessao'
import { EsqPerfil } from './EsqueletosDasPaginas'
import { CampoSenha } from './CampoSenha'

const CAMPO =
  'h-9 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]'
const CAMPO_TRAVADO =
  'flex h-9 w-full items-center gap-2 rounded-lg border border-dashed border-[var(--brd)] px-3 text-[12.5px] text-[var(--tx2)]'
const LIMITE_FOTO = 5 * 1024 * 1024
const MIN_SENHA = 8

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">{children}</span>
}

function Cadeado() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="flex-shrink-0 text-[var(--tx3)]">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  )
}

export function Perfil() {
  const { usuario, carregando } = useSessao()
  if (carregando) return <EsqPerfil />
  if (!usuario) return <p className="py-16 text-center text-[13px] text-[var(--tx2)]">Não foi possível carregar o seu perfil.</p>
  // A chave remonta os formulários se a sessão trocar de usuário.
  return <PerfilDe key={usuario.id} usuario={usuario} />
}

function PerfilDe({ usuario }: { usuario: Usuario }) {
  const nomeCompleto = `${usuario.firstName} ${usuario.lastName}`.trim()
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          Meu perfil
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">Seus dados de acesso ao OpenIpWorld.</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
        <SecaoFoto usuario={usuario} nome={nomeCompleto} />
        <div className="space-y-4">
          <SecaoDados usuario={usuario} />
          <SecaoSenha email={usuario.email} />
        </div>
      </div>
    </div>
  )
}

// ── Foto ──────────────────────────────────────────────────────────────────────────────────

function SecaoFoto({ usuario, nome }: { usuario: Usuario; nome: string }) {
  const { atualizarUsuario } = useSessao()
  const [, setErro] = useMensagem('erro')
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  async function enviar(f: File | null) {
    if (entrada.current) entrada.current.value = ''
    if (!f) return
    if (!/\.(png|jpe?g|webp)$/i.test(f.name)) return setErro('Imagem não aceita: envie PNG, JPG ou WEBP.')
    if (f.size > LIMITE_FOTO) return setErro(`A imagem tem ${(f.size / 1024 / 1024).toFixed(1)} MB; o limite é 5 MB.`)
    setEnviando(true)
    try {
      const r = await api<{ user: Usuario }>('/me/foto', { metodo: 'POST', arquivo: f })
      atualizarUsuario(r.user)
      toast.sucesso('Foto atualizada.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  async function remover() {
    setRemovendo(true)
    try {
      const r = await api<{ user: Usuario }>('/me/foto', { metodo: 'DELETE' })
      atualizarUsuario(r.user)
      toast.sucesso('Foto removida.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <Cartao titulo="Foto">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={enviando}
          title="Trocar a foto"
          className="group relative rounded-full"
        >
          <Avatar usuarioId={usuario.id} fotoSha256={usuario.fotoSha256} nome={nome} tamanho={112} />
          {/* Ao passar o mouse, a foto escurece e mostra a câmera: dá para clicar nela. */}
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        <div>
          <p className="text-[14px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            {nome}
          </p>
          <p className="text-[11.5px] text-[var(--tx2)]">{ROTULO_PERFIL[usuario.role]}</p>
        </div>
        <input ref={entrada} type="file" accept=".png,.jpg,.jpeg,.webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void enviar(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap justify-center gap-2">
          <Botao carregando={enviando} disabled={removendo} onClick={() => entrada.current?.click()}>
            {enviando ? 'Enviando…' : usuario.fotoSha256 ? 'Trocar foto' : 'Adicionar foto'}
          </Botao>
          {usuario.fotoSha256 && (
            <Botao variante="secundaria" carregando={removendo} disabled={enviando} onClick={() => void remover()}>
              Remover
            </Botao>
          )}
        </div>
        <p className="text-[10.5px] leading-snug text-[var(--tx3)]">PNG, JPG ou WEBP, até 5 MB. Aparece no menu e na lista de usuários.</p>
      </div>
    </Cartao>
  )
}

// ── Dados ─────────────────────────────────────────────────────────────────────────────────

function SecaoDados({ usuario }: { usuario: Usuario }) {
  const { atualizarUsuario } = useSessao()
  const [, setErro] = useMensagem('erro')
  const [nome, setNome] = useState(usuario.firstName)
  const [sobrenome, setSobrenome] = useState(usuario.lastName)
  const [salvando, setSalvando] = useState(false)
  const mudou = nome.trim() !== usuario.firstName || sobrenome.trim() !== usuario.lastName
  const pronto = mudou && nome.trim() !== '' && sobrenome.trim() !== ''

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!pronto) return
    setSalvando(true)
    try {
      const r = await api<{ user: Usuario }>('/me', { metodo: 'PUT', corpo: { firstName: nome.trim(), lastName: sobrenome.trim() } })
      atualizarUsuario(r.user)
      toast.sucesso('Dados salvos.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao titulo="Dados pessoais">
      <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
        <label>
          <Rotulo>Nome</Rotulo>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} required className={CAMPO} />
        </label>
        <label>
          <Rotulo>Sobrenome</Rotulo>
          <input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} maxLength={150} required className={CAMPO} />
        </label>
        <div className="sm:col-span-2">
          <Rotulo>E-mail</Rotulo>
          <div className={CAMPO_TRAVADO} title="O e-mail é o seu login e não pode ser alterado">
            <Cadeado />
            <span className="truncate">{usuario.email}</span>
          </div>
          <span className="mt-1 block text-[10.5px] text-[var(--tx3)]">O e-mail é o seu login e não pode ser alterado.</span>
        </div>
        <div>
          <Rotulo>Perfil de acesso</Rotulo>
          <div className={CAMPO_TRAVADO} title="Definido pelo administrador">
            <Cadeado />
            {ROTULO_PERFIL[usuario.role]}
          </div>
        </div>
        {usuario.role === 'cliente' && (
          <div>
            <Rotulo>Portal de</Rotulo>
            <div className={CAMPO_TRAVADO} title="Definido pelo administrador">
              <Cadeado />
              <span className="truncate">{usuario.pessoaNome ?? '—'}</span>
            </div>
          </div>
        )}
        <p className="text-[10.5px] text-[var(--tx3)] sm:col-span-2">Perfil de acesso{usuario.role === 'cliente' ? ' e portal' : ''} são definidos pelo administrador.</p>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Botao disabled={!pronto} carregando={salvando}>
            {salvando ? 'Salvando…' : 'Salvar dados'}
          </Botao>
          {!mudou && <span className="text-[11px] text-[var(--tx3)]">Nenhuma alteração.</span>}
        </div>
      </form>
    </Cartao>
  )
}

// ── Senha ─────────────────────────────────────────────────────────────────────────────────

function SecaoSenha({ email }: { email: string }) {
  const [, setErro] = useMensagem('erro')
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const curta = nova.length > 0 && nova.length < MIN_SENHA
  const diferentes = confirmacao.length > 0 && nova !== confirmacao
  const pronto = atual !== '' && nova.length >= MIN_SENHA && nova === confirmacao

  async function trocar(e: React.FormEvent) {
    e.preventDefault()
    if (!pronto) return
    setSalvando(true)
    try {
      await api('/me/senha', { metodo: 'PUT', corpo: { atual, nova } })
      atualizarSenhaLembrada(email, nova)
      setAtual('')
      setNova('')
      setConfirmacao('')
      toast.sucesso('Senha trocada. Use a nova no próximo login.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao titulo="Senha">
      <form onSubmit={trocar} className="grid gap-3 sm:grid-cols-3">
        {/* O e-mail escondido ajuda o gerenciador de senhas do navegador a saber de qual conta é. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label>
          <Rotulo>Senha atual</Rotulo>
          <CampoSenha autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} className={CAMPO} />
        </label>
        <label>
          <Rotulo>Senha nova</Rotulo>
          <CampoSenha autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className={CAMPO} />
          {curta && <span className="mt-1 block text-[10.5px] text-[var(--color-alerta)]">Mínimo de {MIN_SENHA} caracteres.</span>}
        </label>
        <label>
          <Rotulo>Repita a senha nova</Rotulo>
          <CampoSenha autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={CAMPO} />
          {diferentes && <span className="mt-1 block text-[10.5px] text-[var(--color-alerta)]">As duas não conferem.</span>}
        </label>
        <div className="sm:col-span-3">
          <Botao disabled={!pronto} carregando={salvando}>
            {salvando ? 'Trocando…' : 'Trocar senha'}
          </Botao>
        </div>
      </form>
    </Cartao>
  )
}
