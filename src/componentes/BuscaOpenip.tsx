'use client'

/**
 * A carteira de um procurador — marcas, patentes e desenhos industriais —, vinda da base do INPI
 * (API do OpenIP World). Programa de computador e contrato não entram: o INPI não registra
 * procurador neles.
 *
 * Duas etapas, porque quem opera precisa decidir antes de gravar:
 *   1. Buscar   — o servidor lista os processos de cada categoria; nas marcas, conta por situação.
 *   2. Importar — escolhidas as categorias e, nas marcas, as situações (as encerradas vêm
 *                 desmarcadas, mas a escolha é de quem opera), o servidor lê o detalhe de cada
 *                 processo e mescla na carteira.
 *
 * As duas rodam em segundo plano no servidor (uma carteira grande leva minutos, mais do que uma
 * requisição aguenta). A tela acompanha pela execução gravada no banco — e, se for recarregada no
 * meio, retoma de onde estava.
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { useSessao } from './EstadoSessao'
import { Cartao, Chip, Girando } from './ui'
import { api } from '@/lib/api'
import { useMensagem, toast } from './Toast'

type Situacao = { texto: string; n: number; sugerida: boolean }

type Categoria = 'marcas' | 'patentes' | 'desenhos'

const CATEGORIAS: { id: Categoria; nome: string; singular: string }[] = [
  { id: 'marcas', nome: 'Marcas', singular: 'marca' },
  { id: 'patentes', nome: 'Patentes', singular: 'patente' },
  { id: 'desenhos', nome: 'Desenhos industriais', singular: 'desenho industrial' },
]

type ResultadoBusca = {
  procurador: { documento?: string; nome?: string }
  /** Total de cada categoria buscada. Ausente nas buscas anteriores a patentes e desenhos. */
  categorias?: Partial<Record<Categoria, { total: number }>>
  /** Das marcas. */
  total: number
  situacoes: Situacao[]
}

type Contagem = { processos: number; novas: number; atualizadas: number; pessoas_novas: number; eventos: number; sem_titular: number }

type ResultadoImportacao = {
  selecionadas: number
  marcas: number
  novas: number
  atualizadas: number
  pessoas_novas: number
  eventos: number
  sem_titular: number
  fora_da_carteira?: number
  por_categoria?: Partial<Record<Categoria, Contagem>>
  falhas: { categoria?: Categoria; numero: string; motivo: string }[]
}

/** Total por categoria; busca antiga (só marcas) cai no total das marcas. */
const totais = (r: ResultadoBusca): Partial<Record<Categoria, number>> =>
  r.categorias
    ? Object.fromEntries(Object.entries(r.categorias).map(([c, v]) => [c, v?.total ?? 0]))
    : { marcas: r.total }

type Execucao = {
  id: string
  tipo: 'openip_busca' | 'openip_marcas'
  parametros: { documento?: string; nome?: string; situacoes?: string[] }
  estado: 'rodando' | 'concluida' | 'falhou'
  fase: string | null
  total: number
  processados: number
  resultado: (ResultadoBusca | ResultadoImportacao | { recusas: string[] }) | null
  erro: string | null
}

const CAMPO =
  'w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[12.5px] text-[var(--tx)] outline-none focus:border-[#00E0F6]'

const ESTILO_BOTAO = {
  fontFamily: 'var(--font-titulo)',
  background: 'linear-gradient(135deg,#2589A8,#1A6581)',
  boxShadow: '0 2px 10px rgba(26,101,129,.35)',
}

/** "17210627000170" → "17.210.627/0001-70" (só para mostrar). */
function formatarDocumento(d?: string) {
  if (!d) return ''
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return d
}

export function BuscaOpenip() {
  const { usuario } = useSessao()
  const { recarregar } = usePortfolio()
  const [configurado, setConfigurado] = useState<boolean | null>(null)
  const [documento, setDocumento] = useState('')
  const [nome, setNome] = useState('')
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [busca, setBusca] = useState<Execucao | null>(null)
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set())
  const [categoriasEscolhidas, setCategoriasEscolhidas] = useState<Set<Categoria>>(new Set())
  const [erro, setErro] = useMensagem('erro')
  const [pedindo, setPedindo] = useState<'busca' | 'importacao' | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Acompanha uma execução até terminar. */
  const acompanhar = useCallback(
    (id: string) => {
      const passo = async () => {
        try {
          const r = await api<{ execucao: Execucao }>(`/importacao/execucoes/${id}`)
          const ex = r.execucao
          setExecucao(ex)
          if (ex.estado === 'rodando') {
            temporizador.current = setTimeout(passo, 1500)
            return
          }
          if (ex.estado === 'concluida' && ex.tipo === 'openip_busca') {
            setBusca(ex)
            const res = ex.resultado as ResultadoBusca
            setEscolhidas(new Set(res.situacoes.filter((s) => s.sugerida).map((s) => s.texto)))
            const t = totais(res)
            setCategoriasEscolhidas(new Set(CATEGORIAS.map((c) => c.id).filter((c) => (t[c] ?? 0) > 0)))
            toast.info('Busca no INPI concluída: escolha o que importar.')
          }
          if (ex.estado === 'concluida' && ex.tipo === 'openip_marcas') {
            setBusca(null)
            await recarregar()
            toast.sucesso('Importação do INPI concluída: a carteira foi atualizada.')
          }
          if (ex.estado === 'falhou') toast.erro(ex.erro ?? 'A tarefa no INPI falhou.')
        } catch (e) {
          setErro(e instanceof Error ? e.message : String(e))
        }
      }
      void passo()
    },
    [recarregar, setErro],
  )

  useEffect(() => {
    // Situação da integração e, se houver tarefa rodando, retoma o acompanhamento —
    // sincronização com sistema externo; os setState vêm depois do await.
    let vivo = true
    void (async () => {
      try {
        const [i, u] = await Promise.all([
          api<{ integracao: { configurado: boolean } }>('/integracoes/openip'),
          api<{ execucao: Execucao | null }>('/importacao/execucoes/ultima'),
        ])
        if (!vivo) return
        setConfigurado(i.integracao.configurado)
        if (u.execucao?.estado === 'rodando' && u.execucao.tipo.startsWith('openip')) acompanhar(u.execucao.id)
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      vivo = false
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [acompanhar, setErro])

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setBusca(null)
    setExecucao(null)
    setPedindo('busca')
    try {
      const r = await api<{ execucao_id: string }>('/importacao/openip/busca', {
        metodo: 'POST',
        corpo: { procurador_documento: documento, procurador: nome },
      })
      acompanhar(r.execucao_id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPedindo(null)
    }
  }

  async function importar() {
    if (!busca) return
    setErro(null)
    const { procurador } = busca.resultado as ResultadoBusca
    setPedindo('importacao')
    try {
      const r = await api<{ execucao_id: string }>('/importacao/openip/marcas', {
        metodo: 'POST',
        corpo: {
          procurador_documento: procurador.documento ?? '',
          procurador: procurador.nome ?? '',
          categorias: [...categoriasEscolhidas],
          situacoes: categoriasEscolhidas.has('marcas') ? [...escolhidas] : [],
        },
      })
      acompanhar(r.execucao_id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPedindo(null)
    }
  }

  const rodando = execucao?.estado === 'rodando'
  // Gira do clique (o pedido ainda indo ao servidor) até a tarefa terminar.
  const buscando = pedindo === 'busca' || (rodando && execucao?.tipo === 'openip_busca')
  const importando = pedindo === 'importacao' || (rodando && execucao?.tipo !== 'openip_busca')
  const resBusca = busca?.resultado as ResultadoBusca | undefined
  const totalPorCategoria = resBusca ? totais(resBusca) : {}
  const marcasSelecionadas = resBusca ? resBusca.situacoes.filter((s) => escolhidas.has(s.texto)).reduce((a, s) => a + s.n, 0) : 0
  const selecionadas = CATEGORIAS.reduce(
    (soma, c) => soma + (!categoriasEscolhidas.has(c.id) ? 0 : c.id === 'marcas' ? marcasSelecionadas : (totalPorCategoria[c.id] ?? 0)),
    0,
  )
  const encontrados = CATEGORIAS.reduce((soma, c) => soma + (totalPorCategoria[c.id] ?? 0), 0)

  return (
    <Cartao titulo="Buscar a carteira no INPI" acessorio={<Chip tom="info">OpenIP World</Chip>}>
      <p className="mb-3 text-[12.5px] text-[var(--tx2)]">
        Traz as marcas, patentes e desenhos industriais do Brasil em que o procurador informado consta no INPI.
        Programas de computador e contratos não entram: o INPI não registra procurador neles. Informe o{' '}
        <strong className="text-[var(--tx)]">CNPJ</strong> do procurador (o critério mais confiável: o nome aparece com
        grafias diferentes no INPI) e, se quiser, o nome — o sistema junta os dois resultados.
      </p>

      {configurado === false ? (
        <div className="nota">
          A integração com o OpenIP World ainda não foi configurada.{' '}
          {usuario?.role === 'admin' ? (
            <Link href="/integrations" className="font-semibold text-[var(--color-petrol-cla)]">
              Configurar agora →
            </Link>
          ) : (
            'Peça ao administrador para configurá-la em Integrações.'
          )}
        </div>
      ) : (
        <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <label>
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">CNPJ/CPF do procurador</span>
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="00.000.000/0000-00" className={CAMPO} />
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Nome do procurador (opcional, mais lento)</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Trecho do nome, como consta no INPI" className={CAMPO} />
          </label>
          <button
            type="submit"
            disabled={rodando || pedindo !== null || configurado === null || (!documento.trim() && !nome.trim())}
            aria-busy={buscando || undefined}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={ESTILO_BOTAO}
          >
            {buscando && <Girando />}
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
      )}

      {/* ── Progresso ─────────────────────────────────────────────────────── */}
      {rodando && execucao && (
        <div className="mt-4 rounded-lg border border-[var(--brd)] p-3">
          <p className="flex items-center gap-2 text-[12px] text-[var(--tx)]">
            <Girando />
            {execucao.tipo === 'openip_busca' ? 'Buscando…' : 'Importando…'} {execucao.fase}
          </p>
          {execucao.total > 0 && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--sup2)]">
                <div
                  className="h-full rounded-full bg-[#00E0F6] transition-all"
                  style={{ width: `${Math.min(100, (execucao.processados / execucao.total) * 100)}%` }}
                />
              </div>
              <p className="num mt-1 text-[10.5px] text-[var(--tx2)]">
                {execucao.processados} de {execucao.total}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Falha ─────────────────────────────────────────────────────────── */}
      {execucao?.estado === 'falhou' && (
        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'rgba(192,57,43,.3)' }}>
          <p className="text-[12px] text-[var(--color-erro)]">A {execucao.tipo === 'openip_busca' ? 'busca' : 'importação'} falhou: {execucao.erro}</p>
          {execucao.resultado && 'recusas' in execucao.resultado && (
            <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-[11px] text-[var(--tx2)]">
              {execucao.resultado.recusas.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10.5px] text-[var(--tx2)]">A carteira não foi alterada.</p>
        </div>
      )}

      {/* ── Resultado da busca: escolher o que trazer ─────────────────────── */}
      {resBusca && !rodando && (
        <div className="mt-4 rounded-lg border border-[var(--brd)] p-3">
          <p className="text-[12.5px] text-[var(--tx)]">
            <strong className="num">{encontrados}</strong> processos encontrados
            {resBusca.procurador.documento && <> para o CNPJ/CPF <span className="num">{formatarDocumento(resBusca.procurador.documento)}</span></>}
            {resBusca.procurador.nome && <> {resBusca.procurador.documento ? 'e' : 'para'} o nome “{resBusca.procurador.nome}”</>}.
          </p>
          {encontrados === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--tx2)]">Nada a importar. Confira o documento ou tente pelo nome.</p>
          ) : (
            <>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                {CATEGORIAS.filter((c) => totalPorCategoria[c.id] !== undefined).map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded border border-[var(--linha)] px-2.5 py-1.5 text-[12px]">
                    <input
                      type="checkbox"
                      disabled={(totalPorCategoria[c.id] ?? 0) === 0}
                      checked={categoriasEscolhidas.has(c.id)}
                      onChange={(e) => {
                        const nova = new Set(categoriasEscolhidas)
                        if (e.target.checked) nova.add(c.id)
                        else nova.delete(c.id)
                        setCategoriasEscolhidas(nova)
                      }}
                    />
                    <span className="flex-1 font-semibold text-[var(--tx)]">{c.nome}</span>
                    <span className="num text-[var(--tx2)]">{totalPorCategoria[c.id] ?? 0}</span>
                  </label>
                ))}
              </div>

              {categoriasEscolhidas.has('marcas') && resBusca.situacoes.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] text-[var(--tx2)]">
                    Nas marcas, escolha as situações que entram. Processos encerrados (extintos, arquivados, indeferidos…) vêm
                    desmarcados — marque se quiser o histórico completo.
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {resBusca.situacoes.map((s) => (
                      <label key={s.texto} className="flex cursor-pointer items-center gap-2 rounded border border-[var(--linha)] px-2.5 py-1.5 text-[12px]">
                        <input
                          type="checkbox"
                          checked={escolhidas.has(s.texto)}
                          onChange={(e) => {
                            const nova = new Set(escolhidas)
                            if (e.target.checked) nova.add(s.texto)
                            else nova.delete(s.texto)
                            setEscolhidas(nova)
                          }}
                        />
                        <span className="flex-1 text-[var(--tx)]">{s.texto}</span>
                        <span className="num text-[var(--tx2)]">{s.n}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {(categoriasEscolhidas.has('patentes') || categoriasEscolhidas.has('desenhos')) && (
                <p className="mt-2 text-[11px] text-[var(--tx2)]">
                  Patentes e desenhos não têm situação na base do INPI: vêm todos, e a situação de cada um é o último despacho.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void importar()}
                  disabled={selecionadas === 0 || importando}
                  aria-busy={importando || undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={ESTILO_BOTAO}
                >
                  {importando && <Girando />}
                  {importando ? 'Importando…' : `Importar ${selecionadas} processo${selecionadas === 1 ? '' : 's'}`}
                </button>
                <span className="text-[10.5px] text-[var(--tx2)]">
                  Mescla na carteira: processos já existentes são atualizados; o resto da carteira e a conciliação ficam.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Resultado da importação ───────────────────────────────────────── */}
      {execucao?.estado === 'concluida' && execucao.tipo === 'openip_marcas' && execucao.resultado && (
        <ResumoImportacao r={execucao.resultado as ResultadoImportacao} />
      )}

      {erro && <p className="mt-3 text-[12px] text-[var(--color-erro)]">{erro}</p>}
    </Cartao>
  )
}

function ResumoImportacao({ r }: { r: ResultadoImportacao }) {
  const linhas = CATEGORIAS.filter((c) => r.por_categoria?.[c.id])
  return (
    <div className="mt-4 rounded-lg border border-[var(--brd)] p-3">
      <p className="text-[12.5px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
        Importação concluída
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Numero rotulo="Selecionados" valor={r.selecionadas} />
        <Numero rotulo="Novos" valor={r.novas} />
        <Numero rotulo="Atualizados" valor={r.atualizadas} />
        <Numero rotulo="Pessoas novas" valor={r.pessoas_novas} />
        <Numero rotulo="Despachos" valor={r.eventos} />
      </div>
      {linhas.length > 0 && (
        <table className="tb mt-3 text-[11.5px]">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="text-right">Lidos</th>
              <th className="text-right">Novos</th>
              <th className="text-right">Atualizados</th>
              <th className="text-right">Despachos</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((c) => {
              const x = r.por_categoria![c.id]!
              return (
                <tr key={c.id} className="border-t border-[var(--linha)]">
                  <td>{c.nome}</td>
                  <td className="num text-right">{x.processos}</td>
                  <td className="num text-right">{x.novas}</td>
                  <td className="num text-right">{x.atualizadas}</td>
                  <td className="num text-right">{x.eventos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {r.sem_titular > 0 && (
        <p className="mt-2 text-[11px] text-[var(--tx2)]">
          {r.sem_titular} processo(s) vieram sem titular e ficaram pendentes —{' '}
          <Link href="/reconciliation" className="font-semibold text-[var(--color-petrol-cla)]">resolver na Conciliação</Link>.
        </p>
      )}
      {(r.fora_da_carteira ?? 0) > 0 && (
        <p className="mt-2 text-[11px] text-[var(--tx2)]">
          {r.fora_da_carteira} patente(s)/desenho(s) ficaram de fora: o procurador informado já não é o vigente no INPI.
        </p>
      )}
      {r.falhas.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-[var(--color-erro)]">
            {r.falhas.length} processo(s) não puderam ser lidos e ficaram de fora (a lista de ativos declara que está parcial):
          </p>
          <ul className="mt-1 max-h-32 list-disc overflow-auto pl-5 text-[10.5px] text-[var(--tx2)]">
            {r.falhas.map((f) => (
              <li key={`${f.categoria ?? 'marcas'}-${f.numero}`}>
                <span className="num">{f.numero}</span>
                {f.categoria && f.categoria !== 'marcas' && <> ({CATEGORIAS.find((c) => c.id === f.categoria)?.singular})</>} — {f.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href="/assets" className="mt-3 inline-block text-[12px] font-semibold text-[var(--color-petrol-cla)]">
        Ver os ativos →
      </Link>
    </div>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded border border-[var(--linha)] p-2">
      <p className="text-[10px] text-[var(--tx2)]">{rotulo}</p>
      <p className="num text-[16px] font-semibold text-[var(--tx)]">{valor}</p>
    </div>
  )
}
