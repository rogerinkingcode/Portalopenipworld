'use client'

/**
 * Atividades — o histórico de quem fez o quê no sistema. Só a equipe (admin e gestor): o cliente
 * não chega aqui (o proxy o mantém no portal, e a API recusa).
 *
 * Toda ação que ALTERA algo é registrada no servidor, depois de dar certo, em nome de quem a fez
 * (backend/src/modules/core/atividades). Esta tela só lê: não há como editar nem apagar registro.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '@/componentes/Avatar'
import { Paginacao, usePaginacao } from '@/componentes/Paginacao'
import { useMensagem } from '@/componentes/Toast'
import { TextoCurto } from '@/componentes/TextoCurto'
import { Botao, Cartao, Chip, Vazio } from '@/componentes/ui'
import { api } from '@/lib/api'
import { OssoTabelaAtividades } from '@/componentes/EsqueletosDasPaginas'
import { Esqueleto } from '@/componentes/Esqueleto'

type Atividade = {
  id: string
  em: string
  usuarioId: string | null
  usuarioNome: string
  usuarioEmail: string | null
  acao: string
  categoria: string
  descricao: string
  alvoTipo: string | null
  alvoId: string | null
  alvoRotulo: string | null
  fotoSha256: string | null
}

type Filtros = {
  usuarios: { id: string; nome: string; n: number }[]
  sistema: number
  categorias: { categoria: string; n: number }[]
}

/** O nome de cada categoria na tela, e a cor do selo. */
const CATEGORIA: Record<string, { rotulo: string; tom: 'ok' | 'erro' | 'alerta' | 'info' | 'neutro' }> = {
  documento: { rotulo: 'Documentos', tom: 'info' },
  ativo: { rotulo: 'Ativos', tom: 'info' },
  vinculo: { rotulo: 'Conciliação', tom: 'info' },
  pessoa: { rotulo: 'Pessoas', tom: 'neutro' },
  ameaca: { rotulo: 'Ameaças', tom: 'alerta' },
  vigilancia: { rotulo: 'Vigilância', tom: 'ok' },
  importacao: { rotulo: 'Importações', tom: 'ok' },
  integracao: { rotulo: 'Integrações', tom: 'alerta' },
  usuario: { rotulo: 'Usuários', tom: 'alerta' },
  perfil: { rotulo: 'Perfil', tom: 'neutro' },
  backup: { rotulo: 'Backup', tom: 'info' },
  outra: { rotulo: 'Outras', tom: 'neutro' },
}
const categoria = (c: string) => CATEGORIA[c] ?? { rotulo: c, tom: 'neutro' as const }

const FMT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function haQuanto(iso: string, agora: number): string {
  const min = Math.max(0, Math.round((agora - Date.parse(iso)) / 60000))
  if (min < 1) return 'Agora'
  if (min < 60) return `Há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Há ${h} h`
  const d = Math.round(h / 24)
  if (d < 60) return `Há ${d} dia${d === 1 ? '' : 's'}`
  return `Há ${Math.round(d / 30)} meses`
}

/** Para onde o alvo leva, quando há uma tela dele. */
function linkDoAlvo(a: Atividade): string | null {
  if (!a.alvoId) return null
  if (a.alvoTipo === 'ativo') return `/assets/${a.alvoId}`
  if (a.alvoTipo === 'usuario') return '/users'
  if (a.alvoTipo === 'pessoa') return '/people'
  return null
}

const CAMPO =
  'h-9 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 text-[12px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]'

export default function Atividades() {
  const [, setErro] = useMensagem('erro')
  const [usuario, setUsuario] = useState('')
  const [cat, setCat] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaEfetiva, setBuscaEfetiva] = useState('')
  const [filtros, setFiltros] = useState<Filtros | null>(null)
  const [dados, setDados] = useState<{ total: number; itens: Atividade[] } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())
  const paginacao = usePaginacao(dados?.total ?? 0)
  const { pag, porPagina, voltarAoInicio } = paginacao

  // A busca espera a pessoa parar de digitar (0,4 s) antes de ir ao servidor.
  useEffect(() => {
    const nova = busca.trim()
    if (nova === buscaEfetiva) return
    const t = setTimeout(() => {
      setBuscaEfetiva(nova)
      voltarAoInicio()
    }, 400)
    return () => clearTimeout(t)
  }, [busca, buscaEfetiva, voltarAoInicio])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const q = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) })
      if (usuario) q.set('usuario', usuario)
      if (cat) q.set('categoria', cat)
      if (de) q.set('de', de)
      if (ate) q.set('ate', ate)
      if (buscaEfetiva) q.set('busca', buscaEfetiva)
      const [r, f] = await Promise.all([
        api<{ total: number; itens: Atividade[] }>(`/atividades?${q}`),
        api<Filtros>('/atividades/filtros'),
      ])
      setDados({ total: r.total, itens: r.itens })
      setFiltros(f)
      setAgora(Date.now())
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }, [pag, porPagina, usuario, cat, de, ate, buscaEfetiva, setErro])

  /*
   * Buscar a página no servidor é sincronizar com sistema externo — é o que o efeito serve para
   * fazer. O "carregando" liga antes do await; o lint não distingue isso de um setState solto.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
  }, [carregar])

  // Mudou um filtro: volta para a primeira página.
  const filtrar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      voltarAoInicio()
    }

  const algumFiltro = usuario || cat || de || ate || buscaEfetiva

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Atividades
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            Quem fez o quê no sistema. Toda alteração fica registrada, em nome de quem a fez.
          </p>
        </div>
        <Botao variante="secundaria" carregando={carregando} onClick={() => void carregar()}>
          Atualizar
        </Botao>
      </header>

      <Cartao titulo="Filtros">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px]">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Quem</span>
            <select value={usuario} onChange={(e) => filtrar(setUsuario)(e.target.value)} className={`${CAMPO} w-full`}>
              <option value="">Todos</option>
              {filtros?.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
              {(filtros?.sistema ?? 0) > 0 && <option value="sistema">Sistema (automático)</option>}
            </select>
          </label>
          <label className="min-w-[170px]">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Tipo</span>
            <select value={cat} onChange={(e) => filtrar(setCat)(e.target.value)} className={`${CAMPO} w-full`}>
              <option value="">Todos</option>
              {filtros?.categorias
                .map((c) => ({ ...c, rotulo: categoria(c.categoria).rotulo }))
                .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
                .map((c) => (
                  <option key={c.categoria} value={c.categoria}>
                    {c.rotulo}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">De</span>
            <input type="date" value={de} max={ate || undefined} onChange={(e) => filtrar(setDe)(e.target.value)} className={CAMPO} />
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Até</span>
            <input type="date" value={ate} min={de || undefined} onChange={(e) => filtrar(setAte)(e.target.value)} className={CAMPO} />
          </label>
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Buscar</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome de ativo, documento, pessoa…"
              className={`${CAMPO} w-full placeholder:text-[var(--tx3)]`}
            />
          </label>
          {algumFiltro && (
            <Botao
              variante="secundaria"
              onClick={() => {
                setUsuario('')
                setCat('')
                setDe('')
                setAte('')
                setBusca('')
                voltarAoInicio()
              }}
            >
              Limpar filtros
            </Botao>
          )}
        </div>
      </Cartao>

      <Cartao titulo={dados ? `Registros (${dados.total})` : 'Registros'}>
        {!dados ? (
          <Esqueleto className=""><OssoTabelaAtividades /></Esqueleto>
        ) : dados.itens.length === 0 ? (
          <Vazio
            titulo={algumFiltro ? 'Nada com esses filtros' : 'Nenhuma atividade ainda'}
            detalhe={algumFiltro ? undefined : 'As alterações feitas no sistema passam a aparecer aqui, a partir de agora.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto" style={{ opacity: carregando ? 0.55 : 1, transition: 'opacity .15s' }}>
              <table className="tb tb-meio min-w-[900px]">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Tipo</th>
                    <th>O que fez</th>
                    <th>Onde</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.itens.map((a) => {
                    const c = categoria(a.categoria)
                    const link = linkDoAlvo(a)
                    const falhou = a.acao === 'tarefa.falhou'
                    return (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap" title={FMT.format(new Date(a.em))}>
                          <span className="block text-[12px] text-[var(--tx)]">{haQuanto(a.em, agora)}</span>
                          <span className="num block text-[10px] text-[var(--tx3)]">{FMT.format(new Date(a.em))}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-2.5">
                            {a.usuarioId ? (
                              <Avatar usuarioId={a.usuarioId} fotoSha256={a.fotoSha256} nome={a.usuarioNome} tamanho={28} />
                            ) : (
                              <span
                                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[13px]"
                                style={{ background: 'var(--sup-h)', color: 'var(--color-petrol-cla)', boxShadow: '0 0 0 1px var(--brd)' }}
                                aria-label="Sistema"
                              >
                                ⚙
                              </span>
                            )}
                            <span className="leading-tight">
                              <span className="block text-[12px] font-medium text-[var(--tx)]">
                                <TextoCurto texto={a.usuarioNome} max={22} />
                              </span>
                              {a.usuarioEmail && <span className="block text-[10px] text-[var(--tx3)]">{a.usuarioEmail}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <Chip tom={falhou ? 'erro' : c.tom}>{c.rotulo}</Chip>
                        </td>
                        <td className={`text-[12px] leading-snug ${falhou ? 'text-[var(--color-erro)]' : 'text-[var(--tx)]'}`}>{a.descricao}</td>
                        <td className="whitespace-nowrap text-[12px]">
                          {a.alvoRotulo ? (
                            link ? (
                              <Link href={link} className="text-[var(--color-petrol-cla)] hover:underline">
                                <TextoCurto texto={a.alvoRotulo} max={24} />
                              </Link>
                            ) : (
                              <TextoCurto texto={a.alvoRotulo} max={24} />
                            )
                          ) : (
                            <span className="text-[var(--tx3)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Paginacao {...paginacao.props} />
          </>
        )}
      </Cartao>
    </div>
  )
}
