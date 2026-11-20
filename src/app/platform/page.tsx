'use client'

/**
 * Plataforma — o painel do OPERADOR (multi-tenant, um banco por empresa).
 *
 * Aqui se criam as empresas clientes: cada uma com o próprio banco MySQL (criado e migrado na
 * hora) e a própria conta no Backblaze B2, e o primeiro admin dela. Também se aplicam as
 * migrações em todos os bancos de uma vez, quando o sistema ganha uma versão nova.
 *
 * ⛔ O operador não vê a carteira de empresa nenhuma — só a administração delas. Senha do banco e
 *    application key do B2 nunca voltam do servidor: na edição, campo em branco = mantém a guardada.
 */

import { useCallback, useEffect, useState } from 'react'
import { BotaoIcone, Cartao, Chip, Girando, Vazio } from '@/componentes/ui'
import { Janela } from '@/componentes/Janela'
import { Confirmacao } from '@/componentes/Confirmacao'
import { Esqueleto, OssoCabecalho, OssoTabela } from '@/componentes/Esqueleto'
import { toast, useMensagem } from '@/componentes/Toast'
import { TextoCurto } from '@/componentes/TextoCurto'
import { api } from '@/lib/api'
import { CampoSenha } from '@/componentes/CampoSenha'

type Empresa = {
  id: string
  slug: string
  nome: string
  status: 'ativa' | 'suspensa'
  banco: { host: string; porta: number; usuario: string; nome: string }
  b2: { endpoint: string | null; regiao: string | null; bucket: string | null; keyId: string | null; configurado: boolean }
  migracao: string | null
  migradaEm: string | null
  criadaEm: string
  logins: number
}

type Resultado = { empresa: string; nome: string; ok: boolean; aplicadas: string[]; ultima: string | null; erro?: string }

const FMT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Plataforma() {
  const [, setErro] = useMensagem('erro')
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null)
  const [editando, setEditando] = useState<Empresa | 'nova' | null>(null)
  const [janelaAberta, setJanelaAberta] = useState(false)
  const [confirmandoTodas, setConfirmandoTodas] = useState(false)
  const [migrandoTodas, setMigrandoTodas] = useState(false)
  const [migrandoUma, setMigrandoUma] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado[] | null>(null)

  const carregar = useCallback(async () => {
    try {
      setEmpresas((await api<{ empresas: Empresa[] }>('/plataforma/empresas')).empresas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [setErro])

  useEffect(() => {
    // Leitura da lista na API — sincronização com sistema externo; setState depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
  }, [carregar])

  const abrir = (e: Empresa | 'nova') => {
    setEditando(e)
    setJanelaAberta(true)
  }
  const fecharJanela = useCallback(() => setJanelaAberta(false), [])
  const cancelarTodas = useCallback(() => setConfirmandoTodas(false), [])

  async function migrarTodas() {
    setMigrandoTodas(true)
    try {
      const r = await api<{ resultado: Resultado[] }>('/plataforma/migrar-todas', { metodo: 'POST', corpo: {} })
      setResultado(r.resultado)
      const falhas = r.resultado.filter((x) => !x.ok).length
      if (falhas) toast.erro(`${falhas} empresa${falhas === 1 ? '' : 's'} falhou ao migrar — veja o resultado.`)
      else toast.sucesso(`Migrações aplicadas em ${r.resultado.length} empresa${r.resultado.length === 1 ? '' : 's'}.`)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setMigrandoTodas(false)
    }
  }

  async function migrarUma(e: Empresa) {
    setMigrandoUma(e.id)
    try {
      const r = await api<Resultado & { saida: string }>(`/plataforma/empresas/${e.id}/migrar`, { metodo: 'POST', corpo: {} })
      if (r.ok) toast.sucesso(r.aplicadas.length ? `${e.nome}: ${r.aplicadas.length} migração(ões) aplicada(s).` : `${e.nome}: o banco já estava em dia.`)
      else setErro(`${e.nome}: a migração falhou. ${r.saida?.slice(-300) ?? ''}`)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setMigrandoUma(null)
    }
  }

  if (!empresas) {
    return (
      <Esqueleto>
        <OssoCabecalho acao={220} titulo={150} />
        <section className="card p-4">
          <OssoTabela colunas={[180, 200, 90, 50, 170, 70, 80]} linhas={5} />
        </section>
      </Esqueleto>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Empresas
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            Cada empresa cliente tem o próprio banco de dados e a própria conta no Backblaze B2.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={migrandoTodas || empresas.length === 0}
            onClick={() => setConfirmandoTodas(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3.5 py-2 text-[12px] font-semibold text-[var(--tx)] transition hover:border-[var(--color-ciano)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {migrandoTodas && <Girando />}
            {migrandoTodas ? 'Aplicando…' : 'Aplicar migrações em todas'}
          </button>
          <button
            type="button"
            onClick={() => abrir('nova')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white transition"
            style={{ fontFamily: 'var(--font-titulo)', background: 'linear-gradient(135deg,#2589A8,#1A6581)', boxShadow: '0 2px 10px rgba(26,101,129,.35)' }}
          >
            <span aria-hidden className="text-[14px] leading-none">+</span> Nova empresa
          </button>
        </div>
      </header>

      <Cartao titulo={`Empresas (${empresas.length})`}>
        {empresas.length === 0 ? (
          <Vazio titulo="Nenhuma empresa ainda" detalhe="Crie a primeira em “Nova empresa”: ela já nasce com o banco migrado e o admin pronto para entrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tb tb-meio min-w-[980px] whitespace-nowrap">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Banco de dados</th>
                  <th>Backblaze B2</th>
                  <th>Logins</th>
                  <th>Última migração</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="block font-medium text-[var(--tx)]">
                        <TextoCurto texto={e.nome} max={26} />
                      </span>
                      <span className="block text-[10.5px] text-[var(--tx3)]">{e.slug}</span>
                    </td>
                    <td className="text-[11.5px] text-[var(--tx2)]">
                      <span className="block">
                        {e.banco.host}:{e.banco.porta}
                      </span>
                      <span className="block text-[10.5px] text-[var(--tx3)]">{e.banco.nome}</span>
                    </td>
                    <td>{e.b2.configurado ? <Chip tom="ok">Configurado</Chip> : <Chip tom="alerta">Não configurado</Chip>}</td>
                    <td className="num">{e.logins}</td>
                    <td className="text-[11.5px]">
                      <span className="block text-[var(--tx)]">{e.migracao ?? '—'}</span>
                      {e.migradaEm && <span className="block text-[10px] text-[var(--tx3)]">{FMT.format(new Date(e.migradaEm))}</span>}
                    </td>
                    <td>{e.status === 'ativa' ? <Chip tom="ok">Ativa</Chip> : <Chip tom="erro">Suspensa</Chip>}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <BotaoIcone rotulo={`Aplicar as migrações no banco de ${e.nome}`} carregando={migrandoUma === e.id} disabled={migrandoUma !== null || migrandoTodas} onClick={() => void migrarUma(e)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <ellipse cx="12" cy="6" rx="7" ry="2.5" />
                            <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5" />
                            <path d="M17 15v6M14.5 18.5 17 21l2.5-2.5" />
                          </svg>
                        </BotaoIcone>
                        <BotaoIcone rotulo={`Editar ${e.nome}`} onClick={() => abrir(e)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                          </svg>
                        </BotaoIcone>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {resultado && (
        <Cartao titulo="Resultado da última aplicação em lote" acessorio={<BotaoIcone rotulo="Fechar o resultado" onClick={() => setResultado(null)}>✕</BotaoIcone>}>
          <ul className="space-y-2 text-[12px]">
            {resultado.map((r) => (
              <li key={r.empresa} className="rounded-lg border border-[var(--linha)] px-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  {r.ok ? <Chip tom="ok">OK</Chip> : <Chip tom="erro">Falhou</Chip>}
                  <strong className="text-[var(--tx)]">{r.nome}</strong>
                  <span className="text-[var(--tx2)]">
                    {r.ok ? (r.aplicadas.length ? `${r.aplicadas.length} migração(ões) aplicada(s)` : 'já estava em dia') : 'nada aplicado'}
                    {r.ultima ? ` · última: ${r.ultima}` : ''}
                  </span>
                </span>
                {r.erro && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[10.5px] text-[var(--color-erro)]">{r.erro}</pre>}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Janela
        aberto={janelaAberta}
        titulo={editando === 'nova' ? 'Nova empresa' : `Editar ${editando?.nome ?? ''}`}
        subtitulo={editando === 'nova' ? 'O banco é criado (se não existir) e migrado na hora; o admin já pode entrar em seguida.' : 'Campos de senha em branco mantêm a guardada.'}
        aoFechar={fecharJanela}
        largura={820}
      >
        {editando && (
          <FormEmpresa
            key={editando === 'nova' ? 'nova' : editando.id}
            empresa={editando === 'nova' ? null : editando}
            aoSalvar={async () => {
              setJanelaAberta(false)
              await carregar()
            }}
          />
        )}
      </Janela>

      <Confirmacao
        aberto={confirmandoTodas}
        titulo={`Aplicar as migrações em todas as ${empresas.length} empresas?`}
        rotuloConfirmar="Aplicar em todas"
        aoCancelar={cancelarTodas}
        aoConfirmar={() => {
          setConfirmandoTodas(false)
          void migrarTodas()
        }}
      >
        O comando aplica só as migrações que faltam em cada banco, uma empresa por vez, e nunca apaga dado. Pode levar alguns minutos com
        muitas empresas.
      </Confirmacao>
    </div>
  )
}

// ── O formulário de criar / editar ─────────────────────────────────────────────────────────

const CAMPO =
  'h-9 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)] placeholder:text-[var(--tx3)]'

function Campo({ rotulo, children, largo = false }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <label className={largo ? 'sm:col-span-2' : ''}>
      <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">{rotulo}</span>
      {children}
    </label>
  )
}

function Bloco({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-[var(--linha)] p-3.5">
      <legend className="px-1.5 text-[11px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
        {titulo}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {acao && <div className="mt-3 flex flex-wrap items-center gap-2">{acao}</div>}
    </fieldset>
  )
}

const slugDe = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

function FormEmpresa({ empresa, aoSalvar }: { empresa: Empresa | null; aoSalvar: () => Promise<void> }) {
  const nova = empresa === null
  const [, setErro] = useMensagem('erro')
  const [nome, setNome] = useState(empresa?.nome ?? '')
  const [slug, setSlug] = useState(empresa?.slug ?? '')
  const [slugTocado, setSlugTocado] = useState(!nova)
  const [status, setStatus] = useState(empresa?.status ?? 'ativa')
  const [banco, setBanco] = useState({
    host: empresa?.banco.host ?? 'db-mysql',
    porta: String(empresa?.banco.porta ?? 3306),
    usuario: empresa?.banco.usuario ?? 'root',
    senha: '',
    nome: empresa?.banco.nome ?? '',
  })
  const [b2, setB2] = useState({
    endpoint: empresa?.b2.endpoint ?? '',
    regiao: empresa?.b2.regiao ?? '',
    bucket: empresa?.b2.bucket ?? '',
    keyId: empresa?.b2.keyId ?? '',
    appKey: '',
  })
  const [adm, setAdm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState<'banco' | 'b2' | null>(null)

  const nomeDoBancoSugerido = `portalopenipworld_${slugDe(nome).replace(/-/g, '_')}`.slice(0, 64)
  const corpoBanco = { ...banco, porta: Number(banco.porta), nome: banco.nome || nomeDoBancoSugerido }
  const temB2 = Object.values(b2).some((v) => v.trim())

  async function testar(qual: 'banco' | 'b2') {
    setTestando(qual)
    try {
      if (qual === 'banco') {
        const r = await api<{ bancoExiste: boolean; versao: string }>('/plataforma/testar-banco', {
          metodo: 'POST',
          corpo: { empresaId: empresa?.id, banco: corpoBanco },
        })
        toast.sucesso(`Conexão ok (MySQL ${r.versao}). O banco “${corpoBanco.nome}” ${r.bancoExiste ? 'já existe' : 'ainda não existe e será criado'}.`)
      } else {
        const r = await api<{ temArquivos: boolean }>('/plataforma/testar-b2', { metodo: 'POST', corpo: { empresaId: empresa?.id, b2 } })
        toast.sucesso(`Acesso ao bucket ok${r.temArquivos ? ' (já tem arquivos)' : ' (vazio)'}.`)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setTestando(null)
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      if (nova) {
        await api('/plataforma/empresas', {
          metodo: 'POST',
          corpo: { nome, slug, banco: corpoBanco, b2: temB2 ? b2 : undefined, admin: adm },
        })
        toast.sucesso(`Empresa “${nome}” criada: banco migrado e o admin ${adm.email} já pode entrar.`)
      } else {
        await api(`/plataforma/empresas/${empresa.id}`, { metodo: 'PUT', corpo: { nome, status, banco: corpoBanco, b2 } })
        toast.sucesso(`Empresa “${nome}” atualizada.`)
      }
      await aoSalvar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  const pronto =
    nome.trim() !== '' &&
    slug.trim().length >= 3 &&
    banco.host.trim() !== '' &&
    banco.usuario.trim() !== '' &&
    (nova ? banco.senha !== '' && adm.firstName.trim() && adm.lastName.trim() && adm.email.trim() && adm.password.length >= 8 : true)

  const botaoTeste = (qual: 'banco' | 'b2', rotulo: string, desabilitado = false) => (
    <button
      type="button"
      disabled={testando !== null || desabilitado}
      onClick={() => void testar(qual)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brd)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--tx)] transition hover:border-[var(--color-ciano)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {testando === qual && <Girando />}
      {testando === qual ? 'Testando…' : rotulo}
    </button>
  )

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Bloco titulo="Empresa">
        <Campo rotulo="Nome">
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!slugTocado) setSlug(slugDe(e.target.value))
            }}
            required
            className={CAMPO}
            placeholder="Silva Marcas e Patentes"
          />
        </Campo>
        <Campo rotulo={nova ? 'Identificador (slug)' : 'Identificador (slug) — não muda'}>
          <input
            value={slug}
            disabled={!nova}
            onChange={(e) => {
              setSlugTocado(true)
              setSlug(slugDe(e.target.value))
            }}
            required
            className={`${CAMPO} disabled:opacity-60`}
            placeholder="silva-marcas"
          />
        </Campo>
        {!nova && (
          <Campo rotulo="Situação">
            <select value={status} onChange={(e) => setStatus(e.target.value as 'ativa' | 'suspensa')} className={CAMPO}>
              <option value="ativa">Ativa</option>
              <option value="suspensa">Suspensa (ninguém da empresa entra)</option>
            </select>
          </Campo>
        )}
      </Bloco>

      <Bloco titulo="Banco de dados MySQL" acao={botaoTeste('banco', 'Testar conexão', nova && banco.senha === '')}>
        <Campo rotulo="Host">
          <input value={banco.host} onChange={(e) => setBanco({ ...banco, host: e.target.value })} required className={CAMPO} placeholder="10.0.0.5 ou db-mysql" />
        </Campo>
        <Campo rotulo="Porta">
          <input value={banco.porta} onChange={(e) => setBanco({ ...banco, porta: e.target.value.replace(/\D/g, '') })} required className={CAMPO} />
        </Campo>
        <Campo rotulo="Usuário">
          <input value={banco.usuario} onChange={(e) => setBanco({ ...banco, usuario: e.target.value })} required className={CAMPO} />
        </Campo>
        <Campo rotulo={nova ? 'Senha' : 'Senha (em branco = mantém a guardada)'}>
          <CampoSenha autoComplete="new-password" value={banco.senha} onChange={(e) => setBanco({ ...banco, senha: e.target.value })} className={CAMPO} />
        </Campo>
        <Campo rotulo="Nome do banco" largo>
          <input
            value={banco.nome}
            onChange={(e) => setBanco({ ...banco, nome: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
            className={CAMPO}
            placeholder={nomeDoBancoSugerido || 'portalopenipworld_empresa'}
          />
        </Campo>
      </Bloco>

      <Bloco titulo="Backblaze B2 (pode completar depois)" acao={botaoTeste('b2', 'Testar acesso ao bucket', !temB2 && !empresa?.b2.configurado)}>
        <Campo rotulo="Endpoint" largo>
          <input value={b2.endpoint} onChange={(e) => setB2({ ...b2, endpoint: e.target.value })} className={CAMPO} placeholder="https://s3.us-east-005.backblazeb2.com" />
        </Campo>
        <Campo rotulo="Região">
          <input value={b2.regiao} onChange={(e) => setB2({ ...b2, regiao: e.target.value })} className={CAMPO} placeholder="us-east-005" />
        </Campo>
        <Campo rotulo="Bucket">
          <input value={b2.bucket} onChange={(e) => setB2({ ...b2, bucket: e.target.value })} className={CAMPO} />
        </Campo>
        <Campo rotulo="keyID">
          <input value={b2.keyId} onChange={(e) => setB2({ ...b2, keyId: e.target.value })} className={CAMPO} />
        </Campo>
        <Campo rotulo={empresa?.b2.configurado ? 'applicationKey (em branco = mantém a guardada)' : 'applicationKey'}>
          <CampoSenha autoComplete="new-password" value={b2.appKey} onChange={(e) => setB2({ ...b2, appKey: e.target.value })} className={CAMPO} />
        </Campo>
      </Bloco>

      {nova && (
        <Bloco titulo="Primeiro administrador da empresa">
          <Campo rotulo="Nome">
            <input value={adm.firstName} onChange={(e) => setAdm({ ...adm, firstName: e.target.value })} required className={CAMPO} />
          </Campo>
          <Campo rotulo="Sobrenome">
            <input value={adm.lastName} onChange={(e) => setAdm({ ...adm, lastName: e.target.value })} required className={CAMPO} />
          </Campo>
          <Campo rotulo="E-mail (é o login — único na plataforma)">
            <input type="email" value={adm.email} onChange={(e) => setAdm({ ...adm, email: e.target.value })} required className={CAMPO} />
          </Campo>
          <Campo rotulo="Senha inicial (8+ caracteres)">
            <CampoSenha autoComplete="new-password" value={adm.password} onChange={(e) => setAdm({ ...adm, password: e.target.value })} required className={CAMPO} />
          </Campo>
        </Bloco>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {nova && <span className="text-[11px] text-[var(--tx3)]">Criar leva alguns segundos: o banco é criado e todas as migrações são aplicadas.</span>}
        <button
          type="submit"
          disabled={!pronto || salvando}
          aria-busy={salvando || undefined}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontFamily: 'var(--font-titulo)', background: 'linear-gradient(135deg,#2589A8,#1A6581)' }}
        >
          {salvando && <Girando />}
          {salvando ? (nova ? 'Criando…' : 'Salvando…') : nova ? 'Criar empresa' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
