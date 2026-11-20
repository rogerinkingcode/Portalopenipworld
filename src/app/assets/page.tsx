'use client'

/**
 * Ativos — a carteira inteira, linha a linha.
 *
 * Com ~1.750 ativos a tabela é PAGINADA (10 por página, ajustável até 100): montar tudo de uma vez travava a tela.
 * Busca, filtros e ordem valem sobre a carteira inteira; a página só recorta o resultado.
 *
 * ⚠️ A home linka para cá com `?materia=` e `?jurisdicao=`, e até 07/09 esta tela não lia a
 *    URL: o clique navegava e a lista abria INTEIRA, sem filtro e sem aviso. Matéria e espécie
 *    são vocabulários diferentes (patente e certificado de adição são uma matéria só), por isso
 *    os dois filtros existem.
 */

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, Suspense } from 'react'
import { FichaAtivo } from '@/componentes/FichaAtivo'
import { Paginacao, usePaginacao } from '@/componentes/Paginacao'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { AvisoCompletude, CarimboVigilancia, Cartao, Chip, Vazio } from '@/componentes/ui'
import { normalizarBusca } from '@/componentes/BuscaPessoa'
import { dataBr } from '@/lib/tempo'
import { Bandeira } from '@/componentes/Bandeira'
import { rotuloEspecie, rotuloJurisdicao } from '@/lib/rotulos'
import { MATERIAS, diasAte, estadoDoPrazo, materiaDe, processoEncerrado, type Materia } from '@/lib/visao'
import { EsqAtivos } from '@/componentes/EsqueletosDasPaginas'

type Situacao = '' | 'andamento' | 'encerrado'
type FiltroPrazo = '' | 'a_tratar' | 'vencido' | 'em30'
type Ordem = 'nome' | 'prazo' | 'vigencia'

const SELECT = 'rounded border border-borda bg-transparent px-2 py-1.5 text-[12.5px] outline-none focus:border-petrol'

function Ativos() {
  const { pacote, carregando, hoje } = usePortfolio()
  const params = useSearchParams()
  const [busca, setBusca] = useState('')
  const [especie, setEspecie] = useState('')
  const [materia, setMateria] = useState<Materia | ''>((params.get('materia') as Materia | null) ?? '')
  const [jurisdicao, setJurisdicao] = useState(params.get('jurisdicao') ?? '')
  const [situacao, setSituacao] = useState<Situacao>((params.get('situacao') as Situacao | null) ?? '')
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>((params.get('prazo') as FiltroPrazo | null) ?? '')
  const [semCliente, setSemCliente] = useState(params.get('sem_cliente') === '1')
  const [soDesvigiados, setSoDesvigiados] = useState(false)
  const [ordem, setOrdem] = useState<Ordem>('nome')
  // A linha clicada abre a ficha em tela cheia; null = fechada.
  const [aberto, setAberto] = useState<string | null>(null)
  const fecharFicha = useCallback(() => setAberto(null), [])

  /*
   * Tudo que a linha mostra e que a busca procura, calculado UMA vez por carga da carteira:
   * titulares, clientes, prazos a tratar e o texto normalizado da busca.
   */
  const linhas = useMemo(() => {
    const nomes = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p.nome]))
    const titulares = new Map<string, string[]>()
    const clientes = new Map<string, string[]>()
    for (const v of pacote.vinculos) {
      const alvo = v.papel === 'titular' || v.papel === 'cotitular' ? titulares : v.papel === 'cliente' ? clientes : null
      if (!alvo) continue
      alvo.set(v.ativo_id, [...(alvo.get(v.ativo_id) ?? []), nomes.get(v.pessoa_id) ?? '(desconhecido)'])
    }
    const prazos = new Map<string, { vencidos: number; aTratar: number; em30: number; proximo?: string }>()
    for (const z of pacote.prazos) {
      const e = estadoDoPrazo(z, hoje)
      if (e !== 'aberto' && e !== 'vencido') continue
      const c = prazos.get(z.ativo_id) ?? { vencidos: 0, aTratar: 0, em30: 0 }
      c.aTratar += 1
      if (e === 'vencido') c.vencidos += 1
      else if (diasAte(z.vence_em, hoje) <= 30) c.em30 += 1
      if (!c.proximo || z.vence_em < c.proximo) c.proximo = z.vence_em
      prazos.set(z.ativo_id, c)
    }
    return pacote.ativos.map((a) => {
      const nome = a.marca?.nome ?? a.patente?.titulo ?? '(sem nome)'
      const tit = titulares.get(a.ativo_id) ?? []
      const cli = clientes.get(a.ativo_id) ?? []
      return {
        a,
        nome,
        titulares: tit,
        clientes: cli,
        prazo: prazos.get(a.ativo_id),
        encerrado: processoEncerrado(a.situacao.texto),
        indice: normalizarBusca(
          [
            nome,
            ...a.identificadores.flatMap((i) => [i.valor_normalizado, i.valor_bruto]),
            ...tit,
            ...cli,
          ].join(' '),
        ),
      }
    })
  }, [pacote, hoje])

  const filtrados = useMemo(() => {
    const q = normalizarBusca(busca)
    const f = linhas.filter((l) => {
      const { a } = l
      if (especie && a.especie !== especie) return false
      if (materia && materiaDe(a.especie) !== materia) return false
      if (jurisdicao && a.jurisdicao !== jurisdicao) return false
      if (situacao === 'andamento' && l.encerrado) return false
      if (situacao === 'encerrado' && !l.encerrado) return false
      if (filtroPrazo === 'a_tratar' && !l.prazo) return false
      if (filtroPrazo === 'vencido' && !l.prazo?.vencidos) return false
      if (filtroPrazo === 'em30' && !l.prazo?.em30) return false
      if (semCliente && l.clientes.length > 0) return false
      if (soDesvigiados && a.vigilancia.ativa) return false
      return !q || l.indice.includes(q)
    })
    return f.sort((x, y) => {
      if (ordem === 'prazo') {
        const px = x.prazo?.proximo ?? '9999'
        const py = y.prazo?.proximo ?? '9999'
        return px.localeCompare(py) || x.nome.localeCompare(y.nome)
      }
      if (ordem === 'vigencia') {
        const vx = x.a.datas.vigencia_ate ?? '9999'
        const vy = y.a.datas.vigencia_ate ?? '9999'
        return vx.localeCompare(vy) || x.nome.localeCompare(y.nome)
      }
      return x.nome.localeCompare(y.nome, 'pt-BR')
    })
  }, [linhas, busca, especie, materia, jurisdicao, situacao, filtroPrazo, semCliente, soDesvigiados, ordem])

  const paginacao = usePaginacao(filtrados.length)

  const especies = useMemo(() => [...new Set(pacote.ativos.map((a) => a.especie))].sort(), [pacote.ativos])
  const jurisdicoes = useMemo(() => [...new Set(pacote.ativos.map((a) => a.jurisdicao))].sort(), [pacote.ativos])
  const desvigiados = pacote.ativos.filter((a) => !a.vigilancia.ativa).length
  const nSemCliente = linhas.filter((l) => l.clientes.length === 0).length

  // Qualquer mudança de filtro volta para a primeira página.
  const mudar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      paginacao.voltarAoInicio()
    }

  if (carregando) return <EsqAtivos />
  if (pacote.ativos.length === 0)
    return (
      <Vazio
        titulo="Nenhum ativo no portfólio"
        detalhe="A carteira vem da base do INPI e da planilha. Importe para começar."
        acao={
          <Link href="/import" className="text-[12.5px] font-medium text-petrol underline">
            Ir para Importar
          </Link>
        }
      />
    )

  const daPagina = paginacao.fatia(filtrados)
  const algumFiltro =
    busca || especie || materia || jurisdicao || situacao || filtroPrazo || semCliente || soDesvigiados

  return (
    <div className="space-y-4">
      <Cartao>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-[10.5px] text-tx2">Buscar por marca, número, titular ou cliente</span>
            <input
              value={busca}
              onChange={(e) => mudar(setBusca)(e.target.value)}
              placeholder="HIDROVALE · 934567890 · BR102023012345-6"
              className="w-full rounded border border-[var(--linha)] bg-transparent px-3 py-1.5 text-[12.5px] outline-none focus:border-petrol"
            />
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-tx2">Matéria</span>
            <select value={materia} onChange={(e) => mudar(setMateria)(e.target.value as Materia | '')} className={SELECT}>
              <option value="">Todas</option>
              {MATERIAS.filter((m) => pacote.ativos.some((a) => materiaDe(a.especie) === m.id)).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.plural}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-tx2">Espécie</span>
            <select value={especie} onChange={(e) => mudar(setEspecie)(e.target.value)} className={SELECT}>
              <option value="">Todas</option>
              {especies.map((e) => (
                <option key={e} value={e}>
                  {rotuloEspecie(e)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-tx2">Jurisdição</span>
            <select value={jurisdicao} onChange={(e) => mudar(setJurisdicao)(e.target.value)} className={SELECT}>
              <option value="">Todas</option>
              {jurisdicoes.map((j) => (
                <option key={j} value={j}>
                  {rotuloJurisdicao(j)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-tx2">Situação</span>
            <select value={situacao} onChange={(e) => mudar(setSituacao)(e.target.value as Situacao)} className={SELECT}>
              <option value="">Todas</option>
              <option value="andamento">Em vigor ou em andamento</option>
              <option value="encerrado">Encerrados (arquivado, extinto…)</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-tx2">Prazo</span>
            <select
              value={filtroPrazo}
              onChange={(e) => mudar(setFiltroPrazo)(e.target.value as FiltroPrazo)}
              className={SELECT}
            >
              <option value="">Qualquer</option>
              <option value="a_tratar">Com prazo a tratar</option>
              <option value="vencido">Com prazo vencido</option>
              <option value="em30">Vence em 30 dias</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px]">
          {nSemCliente > 0 && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={semCliente} onChange={(e) => mudar(setSemCliente)(e.target.checked)} />
              <span>só os sem cliente ({nSemCliente})</span>
            </label>
          )}
          {/* Só faz sentido quando parte da carteira é vigiada; com nenhuma, o filtro devolve tudo. */}
          {desvigiados > 0 && desvigiados < pacote.ativos.length && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={soDesvigiados}
                onChange={(e) => mudar(setSoDesvigiados)(e.target.checked)}
              />
              <span title="Ativos sem fonte automatizada — ninguém está olhando por eles">
                só os sem vigilância ({desvigiados})
              </span>
            </label>
          )}
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[10.5px] text-tx2">ordenar por</span>
            <span className="seg">
              <button data-on={ordem === 'nome' ? 'sim' : 'nao'} onClick={() => mudar(setOrdem)('nome')}>
                Nome
              </button>
              <button data-on={ordem === 'prazo' ? 'sim' : 'nao'} onClick={() => mudar(setOrdem)('prazo')}>
                Prazo mais próximo
              </button>
              <button data-on={ordem === 'vigencia' ? 'sim' : 'nao'} onClick={() => mudar(setOrdem)('vigencia')}>
                Fim da vigência
              </button>
            </span>
          </span>
        </div>
      </Cartao>

      <Cartao
        titulo={`Ativos (${filtrados.length}${filtrados.length !== pacote.ativos.length ? ` de ${pacote.ativos.length}` : ''})`}
      >
        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-tx2">
            Nenhum ativo com {algumFiltro ? 'esses filtros' : 'esse critério'}.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Uma linha por ativo: nenhuma célula quebra o texto, cada coluna cresce até o
                  conteúdo caber e a tabela rola para o lado quando passa da tela. */}
              <table className="tb min-w-[1100px] whitespace-nowrap">
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Identificador</th>
                    <th>Espécie</th>
                    <th>Jurisdição</th>
                    <th>Titular</th>
                    <th>Cliente</th>
                    <th>Situação</th>
                    <th>Vigência</th>
                    <th>Prazos</th>
                    <th>Vigilância</th>
                  </tr>
                </thead>
                <tbody>
                  {daPagina.map((l) => {
                    const { a } = l
                    const semTitular = a.pendencias.some((p) => p.tipo === 'titular_anonimo')
                    return (
                      <tr
                        key={a.ativo_id}
                        className="cursor-pointer"
                        tabIndex={0}
                        title="Clique para ver todas as informações"
                        onClick={() => setAberto(a.ativo_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setAberto(a.ativo_id)
                          }
                        }}
                      >
                        <td>
                          <Link
                            href={`/assets/${a.ativo_id}`}
                            className="font-medium text-petrol hover:underline"
                            // O nome continua levando à página do ativo; o resto da linha abre a ficha.
                            onClick={(e) => e.stopPropagation()}
                          >
                            {l.nome}
                          </Link>
                          {a.marca && a.marca.classes.length > 0 && (
                            <span className="ml-2 text-[10.5px] text-tx2">
                              cl. {[...new Set(a.marca.classes.map((c) => c.codigo))].join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="tabular">
                          {a.identificadores.length > 0 ? (
                            a.identificadores.map((i) => i.valor_normalizado).join(' · ')
                          ) : (
                            <Chip tom="alerta" titulo="Ativo em nascimento — o número chega quando o INPI atribuir">
                              sem número
                            </Chip>
                          )}
                        </td>
                        <td>{rotuloEspecie(a.especie)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Bandeira j={a.jurisdicao} />
                            {rotuloJurisdicao(a.jurisdicao)}
                          </span>
                        </td>
                        <td>
                          {semTitular ? (
                            <Chip tom="erro" titulo="Sem titular identificado, o ativo não é publicável para ninguém">
                              anônimo
                            </Chip>
                          ) : (
                            l.titulares.join(' · ') || '—'
                          )}
                        </td>
                        <td>
                          {l.clientes.length > 0 ? (
                            l.clientes.join(' · ')
                          ) : (
                            <span className="text-[var(--tx3)]" title="Resolva na Conciliação">
                              —
                            </span>
                          )}
                        </td>
                        <td className={l.encerrado ? 'text-[var(--tx3)]' : ''}>{a.situacao.texto}</td>
                        <td className="tabular">{dataBr(a.datas.vigencia_ate)}</td>
                        <td>
                          {l.prazo?.vencidos ? (
                            <Chip tom="erro">{l.prazo.vencidos} vencido{l.prazo.vencidos === 1 ? '' : 's'}</Chip>
                          ) : l.prazo?.em30 ? (
                            <Chip tom="alerta">Vence {dataBr(l.prazo.proximo)}</Chip>
                          ) : l.prazo ? (
                            <span className="text-[11px] text-tx2">Vence {dataBr(l.prazo.proximo)}</span>
                          ) : (
                            <span className="text-[var(--tx3)]">—</span>
                          )}
                        </td>
                        <td>
                          <CarimboVigilancia vigilancia={a.vigilancia} />
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
        <AvisoCompletude {...pacote.completude.ativos} />
      </Cartao>

      <FichaAtivo
        ativo={aberto ? (pacote.ativos.find((x) => x.ativo_id === aberto) ?? null) : null}
        pacote={pacote}
        hoje={hoje}
        aoFechar={fecharFicha}
      />
    </div>
  )
}

/**
 * `useSearchParams` exige um limite de Suspense para a rota poder ser pré-renderizada —
 * sem ele o `next build` falha na geração estática desta página.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<EsqAtivos />}>
      <Ativos />
    </Suspense>
  )
}
