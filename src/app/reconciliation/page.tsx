'use client'

/**
 * Conciliação — a tela que dá dono aos ativos.
 *
 * ⚠️ Por que ela é de primeira classe: 69,6% dos ativos apontam pelo contato do CRM para um
 * AGENTE, não para o dono; e o titular está anônimo em 61,54% dos serviços nacionais onde
 * titular ≠ cliente. Nenhum algoritmo resolve isso — quem sabe é o Gui e o Márcio.
 *
 * Três filas:
 *   sem cliente   o trabalho grande. Agrupado por TITULAR, porque o mesmo titular quase sempre
 *                 tem o mesmo cliente: um clique resolve o grupo inteiro. A sugestão vem dos
 *                 OUTROS ativos do mesmo titular que já têm cliente — dado, não adivinhação.
 *   sem titular   o ativo não é publicável para ninguém enquanto não tiver dono.
 *   decisões      o que foi atribuído à mão, com autor — e o desfazer.
 *
 * Toda atribuição vira `fonte: 'decisao_humana'` com autor e data — o autor é QUEM ESTÁ LOGADO,
 * registrado pelo servidor, nunca um nome digitado. ⛔ E nem o sync do CRM nem uma reimportação
 * da carteira sobrescrevem decisão humana: o servidor devolve estes vínculos a cada carga.
 */

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { useSessao } from '@/componentes/EstadoSessao'
import { Botao, Cartao, Vazio } from '@/componentes/ui'
import { BuscaPessoa } from '@/componentes/BuscaPessoa'
import { Confirmacao } from '@/componentes/Confirmacao'
import { TextoCurto } from '@/componentes/TextoCurto'
import { EXPLICA_PAPEL, rotuloPapel } from '@/lib/rotulos'
import type { Pacote, Papel } from '@/contrato/tipos'
import { useMensagem } from '@/componentes/Toast'
import { EsqConciliacao } from '@/componentes/EsqueletosDasPaginas'

type Ativo = Pacote['ativos'][number]
type Pessoa = Pacote['pessoas'][number]
type Vinculo = Pacote['vinculos'][number]
type Aba = 'cliente' | 'titular' | 'decisoes'

const PAPEIS: Papel[] = ['titular', 'cotitular', 'cliente', 'parceiro', 'agente', 'procurador']
const POR_PAGINA = 10
const SEM_TITULAR = '__sem_titular'

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()

const nomeDoAtivo = (a: Ativo) => a.marca?.nome ?? a.patente?.titulo ?? '(sem nome)'
const numeroDoAtivo = (a: Ativo) => a.identificadores[0]?.valor_normalizado ?? 'sem número'

type Grupo = {
  chave: string
  titular?: Pessoa
  ativos: Ativo[]
  /** Clientes dos OUTROS ativos deste titular, do mais frequente ao menos. */
  sugestoes: { pessoa: Pessoa; n: number }[]
}

export default function Conciliacao() {
  const { pacote, carregando, atribuirPapel, removerVinculo } = usePortfolio()
  const { usuario } = useSessao()
  const [aba, setAba] = useState<Aba>('cliente')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)
  const [ocupado, setOcupado] = useState(false)
  // Desfazer pede confirmação no diálogo da casa. O vínculo fica guardado durante a animação
  // de saída, para o texto não sumir antes da caixa.
  const [aDesfazer, setADesfazer] = useState<Vinculo | null>(null)
  const [confirmandoDesfazer, setConfirmandoDesfazer] = useState(false)
  const [desfazendo, setDesfazendo] = useState<string | null>(null)
  const cancelarDesfazer = useCallback(() => setConfirmandoDesfazer(false), [])
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')

  const base = useMemo(() => {
    const pessoaPorId = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p]))
    const vincPorAtivo = new Map<string, Vinculo[]>()
    for (const v of pacote.vinculos) vincPorAtivo.set(v.ativo_id, [...(vincPorAtivo.get(v.ativo_id) ?? []), v])
    const titularDe = (a: Ativo) => {
      const t = (vincPorAtivo.get(a.ativo_id) ?? [])
        .filter((v) => v.papel === 'titular')
        .sort((x, y) => (x.ordem ?? 99) - (y.ordem ?? 99))[0]
      return t ? pessoaPorId.get(t.pessoa_id) : undefined
    }
    const temPapel = (a: Ativo, papel: Papel) => (vincPorAtivo.get(a.ativo_id) ?? []).some((v) => v.papel === papel)

    // Clientes já conhecidos de cada titular: a base das sugestões.
    const clientesDoTitular = new Map<string, Map<string, number>>()
    for (const a of pacote.ativos) {
      const t = titularDe(a)
      if (!t) continue
      for (const v of vincPorAtivo.get(a.ativo_id) ?? []) {
        if (v.papel !== 'cliente') continue
        const m = clientesDoTitular.get(t.pessoa_id) ?? new Map<string, number>()
        m.set(v.pessoa_id, (m.get(v.pessoa_id) ?? 0) + 1)
        clientesDoTitular.set(t.pessoa_id, m)
      }
    }

    const grupos = new Map<string, Grupo>()
    for (const a of pacote.ativos) {
      if (temPapel(a, 'cliente')) continue
      const t = titularDe(a)
      const chave = t?.pessoa_id ?? SEM_TITULAR
      const g = grupos.get(chave) ?? { chave, titular: t, ativos: [], sugestoes: [] }
      g.ativos.push(a)
      grupos.set(chave, g)
    }
    for (const g of grupos.values()) {
      const m = g.titular ? clientesDoTitular.get(g.titular.pessoa_id) : undefined
      g.sugestoes = [...(m ?? new Map<string, number>())]
        .map(([id, n]) => ({ pessoa: pessoaPorId.get(id)!, n }))
        .filter((s) => s.pessoa)
        .sort((x, y) => y.n - x.n)
        .slice(0, 3)
      g.ativos.sort((x, y) => nomeDoAtivo(x).localeCompare(nomeDoAtivo(y)))
    }

    const semTitular = pacote.ativos.filter(
      (a) => a.pendencias.some((p) => p.tipo === 'titular_anonimo') || !temPapel(a, 'titular'),
    )
    const decisoes = pacote.vinculos.filter((v) => v.fonte === 'decisao_humana')
    // Quantos ativos cada pessoa já tem como cliente: ajuda a escolher na busca.
    const comoCliente = new Map<string, number>()
    for (const v of pacote.vinculos) if (v.papel === 'cliente') comoCliente.set(v.pessoa_id, (comoCliente.get(v.pessoa_id) ?? 0) + 1)

    return {
      pessoaPorId,
      grupos: [...grupos.values()].sort((x, y) => y.ativos.length - x.ativos.length),
      semCliente: [...grupos.values()].reduce((n, g) => n + g.ativos.length, 0),
      semTitular,
      decisoes,
      comoCliente,
      ativoPorId: new Map(pacote.ativos.map((a) => [a.ativo_id, a])),
    }
  }, [pacote])

  const termo = normalizar(busca)
  const casa = (a: Ativo) => !termo || normalizar(nomeDoAtivo(a)).includes(termo) || numeroDoAtivo(a).includes(termo)
  const gruposVisiveis = base.grupos.filter(
    (g) => !termo || (g.titular && normalizar(g.titular.nome).includes(termo)) || g.ativos.some(casa),
  )
  const semTitularVisiveis = base.semTitular.filter(casa)

  async function atribuir(ativoIds: string[], pessoaId: string, papel: Papel) {
    if (!pessoaId || ativoIds.length === 0) return
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await atribuirPapel({ ativo_ids: ativoIds, pessoa_id: pessoaId, papel })
      const quem = base.pessoaPorId.get(pessoaId)?.nome ?? 'pessoa'
      setAviso(
        `${rotuloPapel(papel)} ${quem} atribuído a ${r.criados} ativo${r.criados === 1 ? '' : 's'}` +
          (r.ja_existiam ? ` (${r.ja_existiam} já tinha${r.ja_existiam === 1 ? '' : 'm'} esse vínculo)` : '') +
          '.',
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  async function desfazer(v: Vinculo) {
    setOcupado(true)
    setDesfazendo(v.vinculo_id)
    setErro(null)
    setAviso(null)
    try {
      await removerVinculo(v.vinculo_id)
      setAviso('Vínculo desfeito. A remoção fica registrada no histórico do ativo.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
      setDesfazendo(null)
    }
  }

  if (carregando) return <EsqConciliacao />
  if (pacote.ativos.length === 0) return <Vazio titulo="Portfólio vazio" detalhe="Importe a carteira primeiro." />

  const trocarAba = (a: Aba) => {
    setAba(a)
    setLimite(POR_PAGINA)
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Conciliação
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            Quem é o dono e quem é o cliente de cada ativo. Cada atribuição fica registrada com data e com o seu
            nome: <strong className="text-tinta">{usuario ? `${usuario.firstName} ${usuario.lastName}` : '—'}</strong>.
          </p>
        </div>
        <div className="seg">
          <button data-on={aba === 'cliente' ? 'sim' : 'nao'} onClick={() => trocarAba('cliente')}>
            Sem cliente <span className="num">{base.semCliente}</span>
          </button>
          <button data-on={aba === 'titular' ? 'sim' : 'nao'} onClick={() => trocarAba('titular')}>
            Sem titular <span className="num">{base.semTitular.length}</span>
          </button>
          <button data-on={aba === 'decisoes' ? 'sim' : 'nao'} onClick={() => trocarAba('decisoes')}>
            Decisões à mão <span className="num">{base.decisoes.length}</span>
          </button>
        </div>
      </header>

      {erro && <p className="rounded-lg border border-[var(--brd)] px-3 py-2 text-[12px] text-erro">{erro}</p>}
      {aviso && <p className="rounded-lg border border-[var(--brd)] px-3 py-2 text-[12px] text-[var(--tx)]">✓ {aviso}</p>}

      {aba !== 'decisoes' && (
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setLimite(POR_PAGINA)
          }}
          placeholder={aba === 'cliente' ? 'Filtrar por titular, marca ou número…' : 'Filtrar por marca ou número…'}
          className="w-full rounded-lg border border-borda bg-transparent px-3 py-2 text-[12.5px] outline-none focus:border-petrol"
        />
      )}

      {aba === 'cliente' &&
        (base.grupos.length === 0 ? (
          <Vazio titulo="Todos os ativos têm cliente" detalhe="Nada a conciliar nesta fila." />
        ) : (
          <>
            <p className="text-[11.5px] text-tx2">
              Agrupado por titular: o mesmo titular quase sempre tem o mesmo cliente. A sugestão vem dos outros ativos
              do titular que já têm cliente. {EXPLICA_PAPEL.cliente}
            </p>
            {gruposVisiveis.slice(0, limite).map((g) => (
              <GrupoSemCliente
                key={g.chave}
                grupo={g}
                pessoas={pacote.pessoas}
                comoCliente={base.comoCliente}
                ocupado={ocupado}
                onAtribuir={(ids, pessoaId) => atribuir(ids, pessoaId, 'cliente')}
              />
            ))}
            <Paginacao total={gruposVisiveis.length} limite={limite} rotulo="titulares" onMais={() => setLimite(limite + POR_PAGINA)} />
          </>
        ))}

      {aba === 'titular' &&
        (base.semTitular.length === 0 ? (
          <Vazio
            titulo="Nenhuma pendência de titularidade"
            detalhe="Todos os ativos têm titular atribuído."
            acao={
              <Link href="/assets" className="text-[12.5px] font-medium text-petrol underline">
                Ver os ativos
              </Link>
            }
          />
        ) : (
          <Cartao titulo={`Ativos sem titular (${base.semTitular.length})`}>
            <p className="mb-3 text-[12.5px] text-tx2">
              Enquanto não houver titular, o ativo <strong>não é publicável para nenhum cliente</strong> — a projeção o
              remove.
            </p>
            <div className="space-y-3">
              {semTitularVisiveis.slice(0, limite).map((a) => (
                <LinhaSemTitular
                  key={a.ativo_id}
                  ativo={a}
                  pessoas={pacote.pessoas}
                  ocupado={ocupado}
                  onAtribuir={(pessoaId, papel) => atribuir([a.ativo_id], pessoaId, papel)}
                />
              ))}
            </div>
            <Paginacao total={semTitularVisiveis.length} limite={limite} rotulo="ativos" onMais={() => setLimite(limite + POR_PAGINA)} />
          </Cartao>
        ))}

      {aba === 'decisoes' &&
        (base.decisoes.length === 0 ? (
          <Vazio titulo="Nenhuma decisão à mão ainda" detalhe="O que for atribuído nesta tela aparece aqui, com autor." />
        ) : (
          <Cartao titulo="Atribuídos à mão">
            <p className="mb-3 text-[11.5px] text-tx2">
              Só estes podem ser desfeitos aqui. O que veio da planilha ou do INPI volta a cada importação — corrige-se na
              fonte.
            </p>
            <div className="overflow-x-auto">
              <table className="tb min-w-[700px]">
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Pessoa</th>
                    <th>Papel</th>
                    <th>Decidido por</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {base.decisoes.slice(0, limite).map((v) => {
                    const ativo = base.ativoPorId.get(v.ativo_id)
                    return (
                      <tr key={v.vinculo_id}>
                        <td>
                          {ativo ? (
                            <Link href={`/assets/${ativo.ativo_id}`} className="text-petrol hover:underline">
                              <TextoCurto texto={nomeDoAtivo(ativo)} />
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <TextoCurto texto={base.pessoaPorId.get(v.pessoa_id)?.nome ?? '—'} />
                        </td>
                        <td className="text-[10.5px]" title={EXPLICA_PAPEL[v.papel]}>
                          {rotuloPapel(v.papel)}
                        </td>
                        <td className="text-tx2">{v.decidido_por ?? '—'}</td>
                        <td className="text-right">
                          <Botao
                            variante="secundaria"
                            disabled={ocupado}
                            carregando={desfazendo === v.vinculo_id}
                            onClick={() => {
                              setADesfazer(v)
                              setConfirmandoDesfazer(true)
                            }}
                          >
                            Desfazer
                          </Botao>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Paginacao total={base.decisoes.length} limite={limite} rotulo="decisões" onMais={() => setLimite(limite + POR_PAGINA)} />
          </Cartao>
        ))}

      <Confirmacao
        aberto={confirmandoDesfazer}
        titulo="Desfazer este vínculo?"
        rotuloConfirmar="Desfazer"
        perigo
        aoCancelar={cancelarDesfazer}
        aoConfirmar={() => {
          setConfirmandoDesfazer(false)
          if (aDesfazer) void desfazer(aDesfazer)
        }}
      >
        {aDesfazer && (
          <>
            <strong className="text-[var(--tx)]">{base.pessoaPorId.get(aDesfazer.pessoa_id)?.nome ?? 'Pessoa'}</strong>{' '}
            deixa de ser {rotuloPapel(aDesfazer.papel).toLowerCase()} de{' '}
            <strong className="text-[var(--tx)]">
              {(() => {
                const at = base.ativoPorId.get(aDesfazer.ativo_id)
                return at ? nomeDoAtivo(at) : 'ativo'
              })()}
            </strong>
            . A remoção fica registrada no histórico do ativo.
          </>
        )}
      </Confirmacao>
    </div>
  )
}

function Paginacao({ total, limite, rotulo, onMais }: { total: number; limite: number; rotulo: string; onMais: () => void }) {
  if (total === 0) return <p className="py-6 text-center text-[12px] text-tx2">Nada com esse filtro.</p>
  return (
    <div className="flex items-center justify-between pt-1 text-[11.5px] text-tx2">
      <span>
        Mostrando <span className="num">{Math.min(limite, total)}</span> de <span className="num">{total}</span> {rotulo}
      </span>
      {limite < total && (
        <Botao variante="secundaria" onClick={onMais}>
          Mostrar mais
        </Botao>
      )}
    </div>
  )
}

function GrupoSemCliente({
  grupo,
  pessoas,
  comoCliente,
  ocupado,
  onAtribuir,
}: {
  grupo: Grupo
  pessoas: Pessoa[]
  comoCliente: Map<string, number>
  ocupado: boolean
  onAtribuir: (ativoIds: string[], pessoaId: string) => Promise<void> | void
}) {
  const [aberto, setAberto] = useState(false)
  const [fora, setFora] = useState<Set<string>>(new Set())
  const [pessoaId, setPessoaId] = useState('')
  // O "ocupado" é da tela inteira; isto diz QUAL botão disparou a tarefa (e só ele gira).
  // 'titular', 'busca' ou 'sugestao:<pessoa_id>'.
  const [rodando, setRodando] = useState<string | null>(null)
  async function rodar(qual: string, pessoa: string) {
    setRodando(qual)
    try {
      await onAtribuir(selecionados, pessoa)
    } finally {
      setRodando(null)
    }
  }
  const selecionados = grupo.ativos.filter((a) => !fora.has(a.ativo_id)).map((a) => a.ativo_id)
  const n = selecionados.length
  const alternar = (id: string) => {
    const s = new Set(fora)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setFora(s)
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold text-[var(--tx)]">
          {grupo.titular ? grupo.titular.nome : <span className="text-tx2">Sem titular</span>}
        </div>
        <button className="text-[11.5px] text-petrol hover:underline" onClick={() => setAberto(!aberto)}>
          {grupo.ativos.length} ativo{grupo.ativos.length === 1 ? '' : 's'} sem cliente {aberto ? '▴' : '▾'}
        </button>
      </div>

      {aberto ? (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {grupo.ativos.map((a) => (
            <li key={a.ativo_id} className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!fora.has(a.ativo_id)} onChange={() => alternar(a.ativo_id)} />
              <Link href={`/assets/${a.ativo_id}`} className="text-petrol hover:underline">
                {nomeDoAtivo(a)}
              </Link>
              <span className="tabular text-[10.5px] text-tx2">{numeroDoAtivo(a)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11.5px] text-tx2">
          {grupo.ativos
            .slice(0, 6)
            .map((a) => nomeDoAtivo(a))
            .join(' · ')}
          {grupo.ativos.length > 6 ? ` · +${grupo.ativos.length - 6}` : ''}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {grupo.sugestoes.map((s) => (
          <Botao
            key={s.pessoa.pessoa_id}
            disabled={ocupado || n === 0}
            carregando={rodando === `sugestao:${s.pessoa.pessoa_id}`}
            onClick={() => void rodar(`sugestao:${s.pessoa.pessoa_id}`, s.pessoa.pessoa_id)}
          >
            {s.pessoa.nome}
            <span className="text-[10px] opacity-80">
              cliente em {s.n} ativo{s.n === 1 ? '' : 's'} do titular
            </span>
          </Botao>
        ))}
        {grupo.titular && (
          <Botao
            variante="secundaria"
            disabled={ocupado || n === 0}
            carregando={rodando === 'titular'}
            onClick={() => void rodar('titular', grupo.titular!.pessoa_id)}
            titulo="Cliente direto: quem contratou é o próprio dono"
          >
            O próprio titular é o cliente
          </Botao>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <BuscaPessoa pessoas={pessoas} comoCliente={comoCliente} valor={pessoaId} onEscolher={setPessoaId} />
        <Botao
          disabled={!pessoaId || ocupado || n === 0}
          carregando={rodando === 'busca'}
          onClick={() => void rodar('busca', pessoaId)}
        >
          Atribuir cliente {n === grupo.ativos.length ? `aos ${n}` : `a ${n} de ${grupo.ativos.length}`}
        </Botao>
      </div>
    </div>
  )
}

function LinhaSemTitular({
  ativo,
  pessoas,
  ocupado,
  onAtribuir,
}: {
  ativo: Ativo
  pessoas: Pessoa[]
  ocupado: boolean
  onAtribuir: (pessoaId: string, papel: Papel) => Promise<void> | void
}) {
  const [pessoaId, setPessoaId] = useState('')
  const [papel, setPapel] = useState<Papel>('titular')
  // Gira só na linha cujo botão foi clicado; o "ocupado" trava as outras.
  const [atribuindo, setAtribuindo] = useState(false)
  async function atribuirAqui() {
    setAtribuindo(true)
    try {
      await onAtribuir(pessoaId, papel)
    } finally {
      setAtribuindo(false)
    }
  }

  return (
    <div className="rounded border border-[var(--linha)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/assets/${ativo.ativo_id}`} className="text-[12.5px] font-medium text-petrol hover:underline">
          {nomeDoAtivo(ativo)}
        </Link>
        <span className="tabular text-[10.5px] text-tx2">{ativo.identificadores.map((i) => i.valor_normalizado).join(' · ') || 'sem número'}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <BuscaPessoa pessoas={pessoas} valor={pessoaId} onEscolher={setPessoaId} />
        <label>
          <span className="mb-1 block text-[10.5px] text-tx2">Papel</span>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value as Papel)}
            title={EXPLICA_PAPEL[papel]}
            className="rounded border border-[var(--linha)] bg-transparent px-2 py-1.5 text-[12.5px] outline-none focus:border-petrol"
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {rotuloPapel(p)}
              </option>
            ))}
          </select>
        </label>
        <Botao disabled={!pessoaId || ocupado} carregando={atribuindo} onClick={() => void atribuirAqui()}>
          Atribuir
        </Botao>
      </div>
    </div>
  )
}
