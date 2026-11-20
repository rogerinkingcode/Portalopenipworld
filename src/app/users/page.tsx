'use client'

/**
 * Usuários — quem entra no OpenIpWorld, e com qual papel.
 *
 *   admin    a carteira inteira + esta tela
 *   gestor   a carteira inteira
 *   cliente  só o portal, e só o recorte da PESSOA a que o login está ligado
 *
 * ⚠️ O login do cliente é ligado a uma pessoa da carteira (titular, cliente ou parceiro). É o
 *    servidor que usa esse vínculo para projetar o portal; nada na requisição do cliente escolhe
 *    de quem é o recorte. Conta nova nasce liberada por escolha explícita aqui.
 *
 * Bloquear vale na hora: a sessão é conferida no banco a cada requisição, então o cliente
 * bloqueado cai para o login no próximo clique, mesmo com a sessão aberta.
 *
 * "Último login" é a última senha certa; "visto por último" é a última requisição (resolução de
 * 5 min) — a sessão dura 18 h, e só o login não diria se o cliente continua usando.
 *
 * Só o admin chega aos dados: a API recusa qualquer outro papel nesta rota.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { ROTULO_PERFIL, useSessao, type Papel, type Usuario } from '@/componentes/EstadoSessao'
import { BuscaPessoa, normalizarBusca } from '@/componentes/BuscaPessoa'
import { BotaoIcone, Cartao, Chip, IconeCadeado, IconeChave, IconeLixeira, Vazio, Girando } from '@/componentes/ui'
import { TextoCurto } from '@/componentes/TextoCurto'
import { Confirmacao } from '@/componentes/Confirmacao'
import { Janela } from '@/componentes/Janela'
import { api } from '@/lib/api'
import { useMensagem } from '@/componentes/Toast'
import { Avatar } from '@/componentes/Avatar'
import { EsqUsuarios, OssoTabelaUsuarios } from '@/componentes/EsqueletosDasPaginas'
import { Esqueleto } from '@/componentes/Esqueleto'
import { CampoSenha } from '@/componentes/CampoSenha'

type Linha = Usuario & {
  isBlocked: boolean
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
}
type Recorte = 'cliente' | 'equipe' | 'todos'

const CAMPO =
  'w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-1.5 text-[12.5px] text-[var(--tx)] outline-none focus:border-[#00E0F6]'

const FMT_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "Há 5 min", "Há 3 h", "Há 2 dias" — e a data exata no title. */
function haQuanto(iso: string, agora: number): string {
  const min = Math.max(0, Math.round((agora - Date.parse(iso)) / 60000))
  if (min < 1) return 'Agora'
  if (min < 60) return `Há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Há ${h} h`
  const d = Math.round(h / 24)
  if (d < 60) return `Há ${d} dia${d === 1 ? '' : 's'}`
  const m = Math.round(d / 30)
  return `Há ${m} meses`
}

function Quando({ iso, agora, nunca }: { iso: string | null; agora: number; nunca: string }) {
  if (!iso) return <span className="text-[var(--tx3)]">{nunca}</span>
  return (
    <span title={FMT_DATA_HORA.format(new Date(iso))}>
      <span className="text-[var(--tx)]">{haQuanto(iso, agora)}</span>
      <span className="block text-[10px] text-[var(--tx3)]">{FMT_DATA_HORA.format(new Date(iso))}</span>
    </span>
  )
}

type Pedido = { tipo: 'bloquear' | 'senha' | 'excluir'; id: string; nome: string; email: string }

export default function Usuarios() {
  return (
    <Suspense fallback={<EsqUsuarios />}>
      <TelaUsuarios />
    </Suspense>
  )
}

function TelaUsuarios() {
  const { usuario } = useSessao()
  const { pacote } = usePortfolio()
  const pessoaPedida = useSearchParams().get('pessoa') ?? ''
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')
  const [recorte, setRecorte] = useState<Recorte>('cliente')
  const [busca, setBusca] = useState('')
  const [agora, setAgora] = useState(() => Date.now())
  /*
   * Bloquear, trocar senha e excluir pedem confirmação no diálogo da casa. O pedido fica guardado
   * durante a animação de saída (o texto não some antes da caixa); `pedidoAberto` abre e fecha.
   */
  // O formulário de novo login vive numa janela. Abre sozinho quando a página chega com
  // `?pessoa=` (o atalho "criar login" da ficha do cliente).
  const [novoAberto, setNovoAberto] = useState(pessoaPedida !== '')
  const fecharNovo = useCallback(() => setNovoAberto(false), [])
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [pedidoAberto, setPedidoAberto] = useState(false)
  const [rodando, setRodando] = useState<string | null>(null)
  const fecharPedido = useCallback(() => setPedidoAberto(false), [])
  const pedir = (p: Pedido) => {
    setPedido(p)
    setPedidoAberto(true)
  }

  const recarregar = useCallback(async () => {
    try {
      const r = await api<{ items: Linha[] }>('/users?pageSize=500')
      setLinhas(r.items)
      setAgora(Date.now())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [setErro])

  useEffect(() => {
    // Carga da lista na API — sincronização com sistema externo; setState depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar()
  }, [recarregar])

  // Quem pode ter portal: pessoa com vínculo publicável de titular, cliente ou parceiro.
  const { candidatos, comoCliente } = useMemo(() => {
    const ids = new Set<string>()
    const comoCliente = new Map<string, number>()
    for (const v of pacote.vinculos) {
      if (v.publicavel && ['titular', 'cotitular', 'cliente', 'parceiro'].includes(v.papel))
        ids.add(v.pessoa_id)
      if (v.papel === 'cliente') comoCliente.set(v.pessoa_id, (comoCliente.get(v.pessoa_id) ?? 0) + 1)
    }
    return {
      candidatos: pacote.pessoas
        .filter((p) => ids.has(p.pessoa_id))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      comoCliente,
    }
  }, [pacote])

  const visiveis = useMemo(() => {
    if (!linhas) return []
    const q = normalizarBusca(busca)
    return linhas
      .filter(
        (u) => recorte === 'todos' || (recorte === 'cliente' ? u.role === 'cliente' : u.role !== 'cliente'),
      )
      .filter(
        (u) =>
          !q || normalizarBusca(`${u.firstName} ${u.lastName} ${u.email} ${u.pessoaNome ?? ''}`).includes(q),
      )
  }, [linhas, recorte, busca])

  async function acao(fn: () => Promise<unknown>, ok: string, chave?: string) {
    setAviso(null)
    if (chave) setRodando(chave)
    try {
      await fn()
      await recarregar()
      setAviso(ok)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      if (chave) setRodando(null)
    }
  }

  function confirmarPedido(texto: string) {
    if (!pedido) return
    setPedidoAberto(false)
    const { tipo, id, nome, email } = pedido
    if (tipo === 'bloquear')
      void acao(() => api(`/users/${id}`, { metodo: 'PUT', corpo: { isBlocked: true } }), `${nome} bloqueado: o acesso foi cortado.`, `bloquear:${id}`)
    else if (tipo === 'senha')
      void acao(() => api(`/users/${id}`, { metodo: 'PUT', corpo: { password: texto } }), `Senha de ${nome} trocada.`, `senha:${id}`)
    else void acao(() => api(`/users/${id}`, { metodo: 'DELETE' }), `${email} excluído.`, `excluir:${id}`)
  }

  if (usuario && usuario.role !== 'admin')
    return <Vazio titulo="Acesso restrito" detalhe="Só o administrador gere os usuários." />

  const n = (r: Recorte) =>
    (linhas ?? []).filter(
      (u) => r === 'todos' || (r === 'cliente' ? u.role === 'cliente' : u.role !== 'cliente'),
    ).length

  return (
    <div className="space-y-4">
      <Janela
        aberto={novoAberto}
        titulo="Novo login"
        subtitulo="Quem vai entrar no OpenIpWorld, e o que essa pessoa pode ver."
        aoFechar={fecharNovo}
        largura={760}
      >
        <NovoUsuario
          key={pessoaPedida}
          pessoas={candidatos}
          comoCliente={comoCliente}
          pessoaInicial={candidatos.some((p) => p.pessoa_id === pessoaPedida) ? pessoaPedida : ''}
          aoCriar={async (email) => {
            setNovoAberto(false)
            await recarregar()
            setAviso(`Login ${email} criado e liberado.`)
          }}
        />
      </Janela>

      <Cartao
        titulo="Usuários"
        acessorio={
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition"
            style={{
              fontFamily: 'var(--font-titulo)',
              background: 'linear-gradient(135deg,#2589A8,#1A6581)',
              boxShadow: '0 2px 10px rgba(26,101,129,.35)',
            }}
          >
            <span aria-hidden className="text-[14px] leading-none">+</span> Novo login
          </button>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="seg">
            {(
              [
                ['cliente', 'Clientes'],
                ['equipe', 'Equipe'],
                ['todos', 'Todos'],
              ] as [Recorte, string][]
            ).map(([r, rotulo]) => (
              <button key={r} data-on={recorte === r ? 'sim' : 'nao'} onClick={() => setRecorte(r)}>
                {rotulo} <span className="num">{n(r)}</span>
              </button>
            ))}
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cliente"
            className={`${CAMPO} max-w-xs`}
          />
        </div>

        {erro && <p className="mb-3 text-[12px] text-[var(--color-erro)]">{erro}</p>}
        {aviso && <p className="mb-3 text-[12px] text-[var(--tx)]">✓ {aviso}</p>}
        {!linhas ? (
          <Esqueleto className=""><OssoTabelaUsuarios /></Esqueleto>
        ) : visiveis.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-[var(--tx2)]">
            {recorte === 'cliente' && n('cliente') === 0
              ? 'Nenhum cliente tem login ainda. Crie o primeiro em “Novo login”.'
              : 'Ninguém com esse filtro.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Uma linha por usuário: nenhuma célula quebra o texto, cada coluna cresce até o
                conteúdo caber e a tabela rola para o lado quando passa da tela. */}
            <table className="tb tb-meio min-w-[980px] whitespace-nowrap">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Portal de</th>
                  <th>Último login</th>
                  <th>Visto por último</th>
                  <th>Acesso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((u) => {
                  const euMesmo = u.id === usuario?.id
                  const nome = `${u.firstName} ${u.lastName}`.trim()
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="inline-flex items-center gap-2.5">
                          <Avatar usuarioId={u.id} fotoSha256={u.fotoSha256} nome={nome} tamanho={28} />
                          <TextoCurto texto={nome} max={15} />
                        </span>
                      </td>
                      <td className="text-[var(--tx2)]">
                        <TextoCurto texto={u.email} max={15} />
                      </td>
                      <td>{ROTULO_PERFIL[u.role] ?? u.role}</td>
                      <td>
                        {u.role !== 'cliente' ? (
                          '—'
                        ) : u.pessoaNome ? (
                          <TextoCurto texto={u.pessoaNome} max={15} />
                        ) : (
                          <Chip tom="alerta" titulo="A pessoa saiu da carteira numa reimportação">
                            Sem pessoa
                          </Chip>
                        )}
                      </td>
                      <td className="text-[11.5px]">
                        <Quando iso={u.lastLoginAt} agora={agora} nunca="Nunca entrou" />
                      </td>
                      <td className="text-[11.5px]">
                        <Quando iso={u.lastSeenAt} agora={agora} nunca="—" />
                      </td>
                      <td>
                        {u.isBlocked ? <Chip tom="erro">Bloqueado</Chip> : <Chip tom="ok">Liberado</Chip>}
                      </td>
                      <td>
                        {!euMesmo && (
                          <div className="flex justify-end gap-1.5">
                            {u.isBlocked ? (
                              <BotaoIcone
                                rotulo={`Desbloquear ${nome}`}
                                variante="primaria"
                                onClick={() =>
                                  void acao(
                                    () =>
                                      api(`/users/${u.id}`, {
                                        metodo: 'PUT',
                                        corpo: { isBlocked: false },
                                      }),
                                    `${nome} pode entrar de novo.`,
                                  )
                                }
                              >
                                <IconeCadeado aberto />
                              </BotaoIcone>
                            ) : (
                              <BotaoIcone
                                rotulo={`Bloquear ${nome}`}
                                variante="perigo"
                                carregando={rodando === `bloquear:${u.id}`}
                                disabled={rodando !== null}
                                onClick={() => pedir({ tipo: 'bloquear', id: u.id, nome, email: u.email })}
                              >
                                <IconeCadeado />
                              </BotaoIcone>
                            )}
                            <BotaoIcone
                              rotulo={`Trocar a senha de ${nome}`}
                              carregando={rodando === `senha:${u.id}`}
                              disabled={rodando !== null}
                              onClick={() => pedir({ tipo: 'senha', id: u.id, nome, email: u.email })}
                            >
                              <IconeChave />
                            </BotaoIcone>
                            <BotaoIcone
                              rotulo={`Excluir ${nome}`}
                              variante="perigo"
                              carregando={rodando === `excluir:${u.id}`}
                              disabled={rodando !== null}
                              onClick={() => pedir({ tipo: 'excluir', id: u.id, nome, email: u.email })}
                            >
                              <IconeLixeira />
                            </BotaoIcone>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      <Confirmacao
        aberto={pedidoAberto}
        titulo={
          pedido?.tipo === 'bloquear'
            ? `Bloquear o acesso de ${pedido.nome}?`
            : pedido?.tipo === 'senha'
              ? `Trocar a senha de ${pedido.nome}`
              : `Excluir o usuário ${pedido?.nome ?? ''}?`
        }
        rotuloConfirmar={pedido?.tipo === 'bloquear' ? 'Bloquear' : pedido?.tipo === 'senha' ? 'Trocar senha' : 'Excluir'}
        perigo={pedido?.tipo !== 'senha'}
        campo={
          pedido?.tipo === 'senha'
            ? { rotulo: `Nova senha para ${pedido.email}`, tipo: 'senha', minimo: 8, placeholder: 'Pelo menos 8 caracteres' }
            : undefined
        }
        aoCancelar={fecharPedido}
        aoConfirmar={confirmarPedido}
      >
        {pedido?.tipo === 'bloquear' && (
          <>
            A pessoa não consegue mais entrar. Se estiver com o sistema aberto, cai para o login no
            próximo clique. Dá para desbloquear depois, sem perder nada.
          </>
        )}
        {pedido?.tipo === 'senha' && <>A senha atual deixa de valer assim que a nova for salva. Avise a pessoa da troca.</>}
        {pedido?.tipo === 'excluir' && (
          <>
            O login <strong className="text-[var(--tx)]">{pedido.email}</strong> é apagado de vez. Para
            só suspender o acesso, use Bloquear.
          </>
        )}
      </Confirmacao>
    </div>
  )
}

function NovoUsuario({
  pessoas,
  comoCliente,
  pessoaInicial,
  aoCriar,
}: {
  pessoas: { pessoa_id: string; nome: string; nome_normalizado: string }[]
  comoCliente: Map<string, number>
  pessoaInicial: string
  aoCriar: (email: string) => Promise<void>
}) {
  const vazio = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'cliente' as Papel,
    pessoaId: pessoaInicial,
  }
  const [f, setF] = useState(vazio)
  const [erro, setErro] = useMensagem('erro')
  const [enviando, setEnviando] = useState(false)

  const campo = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (f.role === 'cliente' && !f.pessoaId) {
      setErro('Escolha de quem é o portal (a pessoa da carteira).')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const email = f.email.trim()
      await api('/users', {
        metodo: 'POST',
        corpo: {
          firstName: f.firstName,
          lastName: f.lastName,
          email,
          password: f.password,
          role: f.role,
          pessoaId: f.role === 'cliente' ? f.pessoaId : undefined,
          // Criada aqui por um admin, de propósito: nasce liberada.
          isBlocked: false,
        },
      })
      setF({ ...vazio, pessoaId: '' })
      await aoCriar(email)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={criar} className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Papel</span>
          <select value={f.role} onChange={campo('role')} className={CAMPO}>
            <option value="cliente">Cliente — só o portal dele</option>
            <option value="gestor">Gestor — a carteira inteira</option>
            <option value="admin">Administrador — carteira + usuários</option>
          </select>
        </label>
        {f.role === 'cliente' && (
          <div className="flex">
            <BuscaPessoa
              rotulo="Portal de (pessoa da carteira)"
              pessoas={pessoas}
              comoCliente={comoCliente}
              valor={f.pessoaId}
              onEscolher={(id) => setF((x) => ({ ...x, pessoaId: id }))}
              obrigatorio
            />
          </div>
        )}
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Nome de quem vai entrar</span>
          <input required value={f.firstName} onChange={campo('firstName')} className={CAMPO} />
        </label>
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Sobrenome</span>
          <input required value={f.lastName} onChange={campo('lastName')} className={CAMPO} />
        </label>
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">E-mail (é o login)</span>
          <input type="email" required value={f.email} onChange={campo('email')} className={CAMPO} />
        </label>
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Senha inicial (8+ caracteres)</span>
          <CampoSenha
            autoComplete="new-password"
            required
            minLength={8}
            value={f.password}
            onChange={campo('password')}
            className={CAMPO}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            aria-busy={enviando || undefined}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-titulo)',
              background: 'linear-gradient(135deg,#2589A8,#1A6581)',
              boxShadow: '0 2px 10px rgba(26,101,129,.35)',
            }}
          >
            {enviando && <Girando />}
            {enviando ? 'Criando…' : 'Criar login'}
          </button>
          {erro && <p className="text-[12px] text-[var(--color-erro)]">{erro}</p>}
        </div>
        {f.role === 'cliente' && (
          <p className="text-[10.5px] leading-snug text-[var(--tx3)] sm:col-span-2">
            Ao entrar com este e-mail e senha, o cliente cai direto no portal dele e vê só os ativos dessa
            pessoa — o recorte é feito no servidor. Passe a senha inicial por um canal seguro.
          </p>
        )}
    </form>
  )
}
