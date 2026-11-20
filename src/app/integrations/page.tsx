'use client'

/**
 * Integrações — a credencial da API do OpenIP World, de onde vem a carteira do INPI.
 *
 * Fica no banco desta instalação, configurada aqui, e não no .env: cada escritório que usa o
 * sistema tem a própria conta no OpenIP World. O admin cola o REFRESH token gerado no painel de
 * lá; o servidor o testa na hora (pedindo um par novo) e, dali em diante, renova sozinho e grava
 * cifrado. A tela nunca recebe o token de volta — só a situação.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSessao } from '@/componentes/EstadoSessao'
import { Cartao, Chip, Girando, Vazio } from '@/componentes/ui'
import { Confirmacao } from '@/componentes/Confirmacao'
import { api } from '@/lib/api'
import { dataBr } from '@/lib/tempo'
import { useMensagem } from '@/componentes/Toast'
import { Osso } from '@/componentes/Esqueleto'
import { CampoSenha } from '@/componentes/CampoSenha'

type Situacao =
  | { configurado: false }
  | {
      configurado: true
      situacao: 'ok' | 'invalida'
      dica: string
      escopo: string | null
      access_expira_em: string | null
      refresh_expira_em: string | null
      renovado_em: string | null
      configurado_por: string
      configurado_em: string
      ultimo_erro: string | null
      api: string
    }

const CAMPO =
  'w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[12.5px] text-[var(--tx)] outline-none focus:border-[#00E0F6]'

const quando = (iso: string | null) =>
  iso ? `${dataBr(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—'

export default function Integracoes() {
  const { usuario } = useSessao()
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [token, setToken] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')
  const [confirmandoRemover, setConfirmandoRemover] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const cancelarRemover = useCallback(() => setConfirmandoRemover(false), [])

  const recarregar = useCallback(async () => {
    try {
      const r = await api<{ integracao: Situacao }>('/integracoes/openip')
      setSituacao(r.integracao)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [setErro])

  useEffect(() => {
    // Leitura da situação na API — sincronização com sistema externo; setState depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar()
  }, [recarregar])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await api<{ integracao: Situacao }>('/integracoes/openip', {
        metodo: 'PUT',
        corpo: { refresh_token: token.trim() },
      })
      setSituacao(r.integracao)
      setToken('')
      setAviso('Token aceito pela API. A partir de agora o sistema renova sozinho.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  async function remover() {
    setRemovendo(true)
    try {
      await api('/integracoes/openip', { metodo: 'DELETE' })
      await recarregar()
      setAviso('Credencial do OpenIP World removida.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setRemovendo(false)
    }
  }

  if (usuario && usuario.role !== 'admin')
    return <Vazio titulo="Acesso restrito" detalhe="Só o administrador configura as integrações." />

  return (
    <div className="space-y-4">
      <Cartao
        titulo="OpenIP World — base do INPI"
        acessorio={
          situacao?.configurado ? (
            situacao.situacao === 'ok' ? <Chip tom="ok">Conectado</Chip> : <Chip tom="erro">Token recusado</Chip>
          ) : situacao ? (
            <Chip tom="neutro">Não configurado</Chip>
          ) : (
            <Osso w={96} h={20} r={999} />
          )
        }
      >
        <p className="text-[12.5px] leading-relaxed text-[var(--tx2)]">
          É por aqui que a carteira chega da base do INPI: na tela <strong className="text-[var(--tx)]">Importar</strong>,
          você informa o CNPJ ou o nome do procurador e o sistema busca todas as marcas em nome dele.
        </p>

        {situacao?.configurado && (
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
            <Linha rotulo="Token em uso" valor={`terminado em …${situacao.dica}`} />
            <Linha rotulo="Escopo" valor={situacao.escopo ?? '—'} />
            <Linha rotulo="Última renovação" valor={quando(situacao.renovado_em)} />
            <Linha rotulo="Renovação vale até" valor={quando(situacao.refresh_expira_em)} />
            <Linha rotulo="Configurado por" valor={`${situacao.configurado_por} em ${quando(situacao.configurado_em)}`} />
            <Linha rotulo="API" valor={situacao.api} />
          </dl>
        )}

        {situacao?.configurado && situacao.situacao === 'invalida' && (
          <p className="mt-3 text-[12px] text-[var(--color-erro)]">
            A API recusou o token{situacao.ultimo_erro ? `: ${situacao.ultimo_erro}` : '.'} Gere um novo no painel do
            OpenIP World e cole abaixo.
          </p>
        )}
      </Cartao>

      <Cartao titulo={situacao?.configurado ? 'Trocar o token' : 'Configurar'}>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-[12px] text-[var(--tx2)]">
          <li>No painel do OpenIP World, gere um token de API com escopo <strong className="text-[var(--tx)]">read</strong>.</li>
          <li>Copie o <strong className="text-[var(--tx)]">refresh token</strong> (começa com <span className="num">oiw_rt_</span>) e cole aqui.</li>
          <li>
            ⚠️ Use esse token <strong className="text-[var(--tx)]">só neste sistema</strong>. A API troca o token a
            cada renovação: se ele estiver em outro lugar, quem renovar primeiro derruba o outro.
          </li>
        </ol>
        <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Refresh token</span>
            <CampoSenha
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="oiw_rt_…"
              className={CAMPO}
            />
          </label>
          <button
            type="submit"
            disabled={enviando || removendo || token.trim().length < 20}
            aria-busy={enviando || undefined}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-titulo)',
              background: 'linear-gradient(135deg,#2589A8,#1A6581)',
              boxShadow: '0 2px 10px rgba(26,101,129,.35)',
            }}
          >
            {enviando && <Girando />}
            {enviando ? 'Testando…' : 'Salvar e testar'}
          </button>
          {situacao?.configurado && (
            <button
              type="button"
              onClick={() => setConfirmandoRemover(true)}
              disabled={enviando || removendo}
              aria-busy={removendo || undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: 'rgba(192,57,43,.3)', color: 'var(--color-erro)', background: 'rgba(192,57,43,.08)' }}
            >
              {removendo && <Girando />}
              {removendo ? 'Removendo…' : 'Remover'}
            </button>
          )}
        </form>
        <Confirmacao
          aberto={confirmandoRemover}
          titulo="Remover a credencial do OpenIP World?"
          rotuloConfirmar="Remover"
          perigo
          aoCancelar={cancelarRemover}
          aoConfirmar={() => {
            setConfirmandoRemover(false)
            void remover()
          }}
        >
          A busca da carteira no INPI, a importação e o complemento pela base do INPI param de funcionar
          até um novo token ser colado aqui.
        </Confirmacao>
        {aviso && <p className="mt-3 text-[12px] text-[var(--tx2)]">✓ {aviso}</p>}
        {erro && <p className="mt-3 text-[12px] text-[var(--color-erro)]">{erro}</p>}
        <p className="mt-4 text-[10.5px] text-[var(--tx3)]">
          O token fica cifrado no banco e nunca volta para a tela. O sistema o renova sozinho antes de vencer.
        </p>
      </Cartao>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[10.5px] text-[var(--tx2)]">{rotulo}</dt>
      <dd className="text-[var(--tx)]">{valor}</dd>
    </div>
  )
}
