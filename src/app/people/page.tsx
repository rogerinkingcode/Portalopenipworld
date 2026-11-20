'use client'

/**
 * Pessoas — o cadastro de quem aparece na carteira (titular, cliente, parceiro, procurador…).
 *
 * Duas limpezas, as duas por decisão HUMANA:
 *
 *   duplicadas  a mesma empresa entra pela planilha (sem CNPJ) e pelo INPI (com CNPJ). O sistema
 *               só SUGERE grupos pelo nome sem a forma societária; quem confirma "são a mesma" é
 *               a pessoa. Ao juntar, a que fica herda vínculos, login e documentos, e o nome das
 *               outras vira apelido dela — a próxima importação não as recria.
 *   órfãs       pessoa sem vínculo, login nem documento (o titular que a planilha escreveu e o
 *               INPI trocou). Saem sem perder nada; toda importação já tira as novas.
 *
 * ⛔ Mesmidade de pessoa é por DOCUMENTO ou por decisão registrada — nunca por nome sozinho. Dois
 *    CNPJs diferentes nunca se juntam: o servidor recusa.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { normalizarBusca } from '@/componentes/BuscaPessoa'
import { Botao, Cartao, Chip, Vazio } from '@/componentes/ui'
import { EXPLICA_PAPEL, rotuloPapel } from '@/lib/rotulos'
import { api } from '@/lib/api'
import type { Pacote } from '@/contrato/tipos'
import { Paginacao, usePaginacao } from '@/componentes/Paginacao'
import { Confirmacao } from '@/componentes/Confirmacao'
import { TextoCurto } from '@/componentes/TextoCurto'
import { useMensagem } from '@/componentes/Toast'
import { EsqPessoas } from '@/componentes/EsqueletosDasPaginas'

type Pessoa = Pacote['pessoas'][number]
type Linha = { pessoa: Pessoa; papeis: string[]; nAtivos: number }


/** Formas societárias e conectivos: "DOMPEL LTDA" e "DOMPEL" são candidatas a ser a mesma. */
const SOCIETARIAS = new Set(
  'LTDA LTD ME EPP EIRELI SA S A SLU INC LLC CORP CORPORATION CO COMPANY LIMITED GMBH AG SPA SRL BV DE DA DO E'.split(' '),
)
const chaveGrupo = (nome: string) =>
  normalizarBusca(nome)
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !SOCIETARIAS.has(t))
    .join(' ')

const ROTULO_FONTE: Record<string, string> = { upload_manual: 'planilha', inpi_consulta: 'INPI', decisao_humana: 'à mão' }
const docs = (p: Pessoa) => p.documentos.map((d) => `${d.tipo.toUpperCase()} ${d.valor}`)

export default function Pessoas() {
  const { pacote, carregando, recarregar } = usePortfolio()
  const [aba, setAba] = useState<'duplicadas' | 'todas'>('duplicadas')
  const [busca, setBusca] = useState('')
  const [orfas, setOrfas] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')
  const [confirmandoOrfas, setConfirmandoOrfas] = useState(false)
  const [removendoOrfas, setRemovendoOrfas] = useState(false)
  const cancelarOrfas = useCallback(() => setConfirmandoOrfas(false), [])

  const contarOrfas = useCallback(async () => {
    try {
      setOrfas((await api<{ orfas: number }>('/pessoas/orfas')).orfas)
    } catch {
      setOrfas(null)
    }
  }, [])
  useEffect(() => {
    // Contagem no servidor: só ele sabe quem tem login. setState depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void contarOrfas()
  }, [contarOrfas, pacote.gerado_em])

  const linhas = useMemo((): Linha[] => {
    const por = new Map<string, { papeis: Set<string>; ativos: Set<string> }>()
    for (const v of pacote.vinculos) {
      const e = por.get(v.pessoa_id) ?? { papeis: new Set<string>(), ativos: new Set<string>() }
      e.papeis.add(v.papel)
      e.ativos.add(v.ativo_id)
      por.set(v.pessoa_id, e)
    }
    return pacote.pessoas
      .map((p) => ({ pessoa: p, papeis: [...(por.get(p.pessoa_id)?.papeis ?? [])], nAtivos: por.get(p.pessoa_id)?.ativos.size ?? 0 }))
      .sort((a, b) => b.nAtivos - a.nAtivos || a.pessoa.nome.localeCompare(b.pessoa.nome))
  }, [pacote])

  // Grupos sugeridos: mesmo nome sem forma societária, no mesmo país (ou um nome que começa com o outro).
  const grupos = useMemo(() => {
    const m = new Map<string, Linha[]>()
    for (const l of linhas) {
      if (l.nAtivos === 0) continue // órfã sai pela limpeza, não pela junção
      const k = `${chaveGrupo(l.pessoa.nome)}|${l.pessoa.pais}`
      if (k.startsWith('|')) continue
      m.set(k, [...(m.get(k) ?? []), l])
    }
    /*
     * Também o nome que COMEÇA com o outro inteiro: "DOMPEL INDUSTRIA" e "DOMPEL INDUSTRIA COMERCIO"
     * (a razão social mais longa). Só quando o nome curto tem corpo (2+ palavras ou 6+ letras), para
     * "CASA" não puxar metade do cadastro. Em ordem alfabética, quem começa com X vem logo depois de X.
     */
    // Ordena pelo NOME (não pela chave com "|país"): " " < "|" faria "X Y|BR" vir antes de "X|BR".
    const nomeDe = (k: string) => k.slice(0, k.lastIndexOf('|'))
    // Comparação por código de caractere (os nomes já são A–Z, 0–9 e espaço): o espaço vem antes das
    // letras, então "X", depois todo "X …", depois "XA" — as continuações de X ficam juntas.
    const ordinal = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0)
    const chaves = [...m.keys()].sort((a, b) => ordinal(nomeDe(a), nomeDe(b)) || ordinal(a, b))
    const pai = new Map(chaves.map((k) => [k, k]))
    const raiz = (k: string): string => (pai.get(k) === k ? k : raiz(pai.get(k)!))
    for (let i = 0; i < chaves.length; i++) {
      const nome = nomeDe(chaves[i])
      const pais = chaves[i].slice(nome.length + 1)
      if (nome.split(' ').length < 2 && nome.length < 6) continue
      for (let j = i + 1; j < chaves.length; j++) {
        const outro = nomeDe(chaves[j])
        const paisOutro = chaves[j].slice(outro.length + 1)
        if (!outro.startsWith(nome)) break
        if (paisOutro === pais && outro.startsWith(`${nome} `)) pai.set(raiz(chaves[j]), raiz(chaves[i]))
      }
    }
    const juntos = new Map<string, Linha[]>()
    for (const k of chaves) juntos.set(raiz(k), [...(juntos.get(raiz(k)) ?? []), ...m.get(k)!])
    return [...juntos.values()].filter((g) => g.length > 1).sort((a, b) => b.reduce((s, l) => s + l.nAtivos, 0) - a.reduce((s, l) => s + l.nAtivos, 0))
  }, [linhas])

  const filtradas = useMemo(() => {
    const q = normalizarBusca(busca)
    return q ? linhas.filter((l) => normalizarBusca(`${l.pessoa.nome} ${docs(l.pessoa).join(' ')}`).includes(q)) : linhas
  }, [linhas, busca])
  const gruposFiltrados = useMemo(() => {
    const q = normalizarBusca(busca)
    return q ? grupos.filter((g) => g.some((l) => normalizarBusca(l.pessoa.nome).includes(q))) : grupos
  }, [grupos, busca])

  async function executar(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await fn()
      await recarregar()
      await contarOrfas()
      setAviso(ok)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  const lista = aba === 'duplicadas' ? gruposFiltrados : filtradas
  const paginacao = usePaginacao(lista.length)

  if (carregando) return <EsqPessoas />
  if (pacote.pessoas.length === 0)
    return <Vazio titulo="Nenhuma pessoa" detalhe="Pessoas entram junto com a carteira, na importação." />


  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Pessoas
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{pacote.pessoas.length}</span> no cadastro ·{' '}
            <span className="num">{linhas.filter((l) => l.pessoa.documentos.length === 0).length}</span> sem CPF/CNPJ
          </p>
        </div>
        <div className="seg">
          <button data-on={aba === 'duplicadas' ? 'sim' : 'nao'} onClick={() => { setAba('duplicadas'); paginacao.voltarAoInicio() }}>
            Possíveis duplicadas <span className="num">{grupos.length}</span>
          </button>
          <button data-on={aba === 'todas' ? 'sim' : 'nao'} onClick={() => { setAba('todas'); paginacao.voltarAoInicio() }}>
            Todas <span className="num">{linhas.length}</span>
          </button>
        </div>
      </header>

      {orfas !== null && orfas > 0 && (
        <div className="nota flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <span>
            <strong className="text-[var(--tx)]">
              <span className="num">{orfas}</span> pessoa{orfas === 1 ? '' : 's'} sem vínculo com nenhum ativo
            </strong>{' '}
            — em geral o titular que a planilha escreveu e o INPI substituiu. Não têm login nem documento; saem sem
            perder nada.
          </span>
          <Botao variante="secundaria" disabled={ocupado} carregando={removendoOrfas} onClick={() => setConfirmandoOrfas(true)}>
            Remover as {orfas}
          </Botao>
          <Confirmacao
            aberto={confirmandoOrfas}
            titulo={`Remover ${orfas} pessoa${orfas === 1 ? '' : 's'} sem vínculo?`}
            rotuloConfirmar="Remover"
            perigo
            aoCancelar={cancelarOrfas}
            aoConfirmar={async () => {
              setConfirmandoOrfas(false)
              setRemovendoOrfas(true)
              try {
                await executar(
                  () => api('/pessoas/orfas/remocao', { metodo: 'POST', corpo: {} }),
                  `${orfas} pessoa${orfas === 1 ? '' : 's'} sem vínculo removida${orfas === 1 ? '' : 's'}.`,
                )
              } finally {
                setRemovendoOrfas(false)
              }
            }}
          >
            São cadastros que não estão ligados a nenhum ativo: em geral o titular que a planilha
            escreveu e o INPI substituiu. Não têm login nem documento, então saem sem perder nada.
          </Confirmacao>
        </div>
      )}

      {erro && <p className="text-[12px] text-[var(--color-erro)]">{erro}</p>}
      {aviso && <p className="text-[12px] text-[var(--tx)]">✓ {aviso}</p>}

      <input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          paginacao.voltarAoInicio()
        }}
        placeholder={aba === 'duplicadas' ? 'Filtrar grupos pelo nome' : 'Buscar por nome ou CPF/CNPJ'}
        className="w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3.5 py-2 text-[12.5px] text-[var(--tx)] placeholder:text-[var(--tx3)]"
      />

      {aba === 'duplicadas' ? (
        <>
          <p className="text-[11.5px] leading-relaxed text-[var(--tx2)]">
            Sugestões pelo nome sem a forma societária (LTDA, ME, S.A.…) no mesmo país, ou quando um nome começa com o outro inteiro. <strong>Confira antes de juntar</strong>:
            nome parecido não prova que é a mesma pessoa. A que fica herda vínculos, login e documentos; o nome das outras vira
            apelido dela, para a próxima importação não as recriar.
          </p>
          {gruposFiltrados.length === 0 ? (
            <Vazio titulo="Nenhuma duplicada sugerida" />
          ) : (
            paginacao
              .fatia(gruposFiltrados)
              .map((g) => (
                <GrupoDuplicado
                  key={g.map((l) => l.pessoa.pessoa_id).join('|')}
                  grupo={g}
                  ocupado={ocupado}
                  onJuntar={(principal, outras) =>
                    executar(
                      () => api('/pessoas/juntar', { metodo: 'POST', corpo: { principal, outras } }),
                      `${outras.length + 1} cadastros viraram um: ${g.find((l) => l.pessoa.pessoa_id === principal)?.pessoa.nome}.`,
                    )
                  }
                />
              ))
          )}
        </>
      ) : (
        <Cartao titulo={`Pessoas (${filtradas.length})`}>
          <div className="overflow-x-auto">
            <table className="tb min-w-[760px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>País</th>
                  <th>Origem</th>
                  <th>Papéis</th>
                  <th>Ativos</th>
                </tr>
              </thead>
              <tbody>
                {paginacao.fatia(filtradas).map(({ pessoa, papeis, nAtivos }) => (
                  <tr key={pessoa.pessoa_id}>
                    <td>
                      {nAtivos > 0 ? (
                        <Link href={`/clients/${pessoa.pessoa_id}`} className="text-petrol hover:underline">
                          <TextoCurto texto={pessoa.nome} />
                        </Link>
                      ) : (
                        <TextoCurto texto={pessoa.nome} />
                      )}
                    </td>
                    <td className="text-[10.5px]">{pessoa.tipo === 'fisica' ? 'Pessoa física' : 'Pessoa jurídica'}</td>
                    <td className="tabular">
                      {pessoa.documentos.length > 0 ? (
                        docs(pessoa).join(' · ')
                      ) : (
                        <Chip tom="alerta" titulo="Sem documento, a mesmidade só se resolve por decisão humana">
                          sem documento
                        </Chip>
                      )}
                    </td>
                    <td>{pessoa.pais}</td>
                    <td className="text-[11px] text-[var(--tx2)]">{ROTULO_FONTE[pessoa.fonte] ?? pessoa.fonte}</td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {papeis.map((p) => (
                          <Chip key={p} tom={p === 'agente' ? 'neutro' : 'info'} titulo={EXPLICA_PAPEL[p as never]}>
                            {rotuloPapel(p)}
                          </Chip>
                        ))}
                      </span>
                    </td>
                    <td className="tabular">{nAtivos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      <Paginacao {...paginacao.props} />
    </div>
  )
}

function GrupoDuplicado({
  grupo,
  ocupado,
  onJuntar,
}: {
  grupo: Linha[]
  ocupado: boolean
  onJuntar: (principal: string, outras: string[]) => Promise<void> | void
}) {
  // Sugestão de quem fica: quem tem documento, depois quem veio do INPI, depois quem tem mais ativos.
  const sugerida = [...grupo].sort(
    (a, b) =>
      b.pessoa.documentos.length - a.pessoa.documentos.length ||
      Number(b.pessoa.fonte === 'inpi_consulta') - Number(a.pessoa.fonte === 'inpi_consulta') ||
      b.nAtivos - a.nAtivos,
  )[0].pessoa.pessoa_id
  const [principal, setPrincipal] = useState(sugerida)
  const [fora, setFora] = useState<Set<string>>(new Set())
  // Gira só no grupo cujo botão foi clicado; o "ocupado" trava os outros.
  const [juntando, setJuntando] = useState(false)
  const juntas = grupo.filter((l) => !fora.has(l.pessoa.pessoa_id))
  const outras = juntas.map((l) => l.pessoa.pessoa_id).filter((id) => id !== principal)
  // Dois documentos diferentes do mesmo tipo: não são a mesma (o servidor também recusa).
  const conflito = ['cnpj', 'cpf'].some(
    (t) => new Set(juntas.flatMap((l) => l.pessoa.documentos.filter((d) => d.tipo === t).map((d) => d.valor))).size > 1,
  )

  return (
    <div className="card p-3">
      {/* Duas escolhas diferentes por linha, cada uma com rótulo próprio: QUEM entra na junção
          (a chave) e QUAL delas sobrevive (o botão redondo). Coladas e sem nome, pareciam uma só. */}
      <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[.06em] text-[var(--tx3)]">
            <th className="w-[92px] pb-1.5 pr-3 font-semibold" title="Desligue quem NÃO é a mesma pessoa: ela fica de fora da junção">
              Entra na junção?
            </th>
            <th className="w-[118px] pb-1.5 pr-3 font-semibold" title="A que fica herda os vínculos, o login e os documentos das outras">
              Qual fica?
            </th>
            <th className="pb-1.5 pr-3 font-semibold">Nome</th>
            <th className="pb-1.5 pr-3 font-semibold">Fonte</th>
            <th className="pb-1.5 pr-3 font-semibold">Documento</th>
            <th className="pb-1.5 pr-3 font-semibold">Papéis</th>
            <th className="pb-1.5 text-right font-semibold">Ativos</th>
          </tr>
        </thead>
        <tbody>
          {grupo.map((l) => {
            const id = l.pessoa.pessoa_id
            const incluida = !fora.has(id)
            return (
              <tr key={id} className="border-t border-[var(--linha)]">
                <td className="py-1.5 pr-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--tx2)]">
                    <input
                      type="checkbox"
                      checked={incluida}
                      onChange={() => {
                        const s = new Set(fora)
                        if (s.has(id)) s.delete(id)
                        else s.add(id)
                        setFora(s)
                      }}
                    />
                    {incluida ? 'Sim' : 'Não'}
                  </label>
                </td>
                <td className="py-1.5 pr-3">
                  {incluida ? (
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
                      <input type="radio" checked={principal === id} onChange={() => setPrincipal(id)} />
                      {principal === id ? (
                        <span className="font-semibold text-[var(--color-ok)]">Esta fica</span>
                      ) : (
                        <span className="text-[var(--tx2)]">Será juntada</span>
                      )}
                    </label>
                  ) : (
                    <span className="text-[11px] text-[var(--tx3)]">Fora da junção</span>
                  )}
                </td>
                <td className={`py-1.5 pr-3 font-medium text-[var(--tx)] ${incluida ? '' : 'opacity-40'}`}>{l.pessoa.nome}</td>
                <td className={`py-1.5 pr-3 text-[11px] text-[var(--tx2)] ${incluida ? '' : 'opacity-40'}`}>{ROTULO_FONTE[l.pessoa.fonte] ?? l.pessoa.fonte}</td>
                <td className={`tabular py-1.5 pr-3 text-[11px] ${incluida ? '' : 'opacity-40'}`}>{docs(l.pessoa).join(' · ') || <span className="text-[var(--tx3)]">sem documento</span>}</td>
                <td className={`py-1.5 pr-3 text-[11px] text-[var(--tx2)] ${incluida ? '' : 'opacity-40'}`}>{l.papeis.map((p) => rotuloPapel(p)).join(', ')}</td>
                <td className={`num py-1.5 text-right ${incluida ? '' : 'opacity-40'}`}>
                  {l.nAtivos} ativo{l.nAtivos === 1 ? '' : 's'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Botao
          disabled={ocupado || conflito || outras.length === 0 || fora.has(principal)}
          carregando={juntando}
          onClick={async () => {
            setJuntando(true)
            try {
              await onJuntar(principal, outras)
            } finally {
              setJuntando(false)
            }
          }}
        >
          Juntar {outras.length + 1} em uma
        </Botao>
        {!conflito && outras.length > 0 && !fora.has(principal) && (
          <span className="text-[11.5px] text-[var(--tx2)]">
            <strong className="text-[var(--tx)]">{grupo.find((l) => l.pessoa.pessoa_id === principal)?.pessoa.nome}</strong> fica e
            recebe os vínculos, o login e os documentos de {outras.length === 1 ? 'outra pessoa' : `outras ${outras.length}`}.
          </span>
        )}
        {fora.has(principal) && (
          <span className="text-[11.5px] text-[var(--color-alerta)]">A pessoa marcada para ficar está fora da junção: escolha outra em “Qual fica?”.</span>
        )}
        {conflito && (
          <span className="text-[11.5px] text-[var(--color-erro)]">CPF/CNPJ diferentes: não são a mesma pessoa. Desmarque uma.</span>
        )}
      </div>
    </div>
  )
}
