'use client'

/**
 * Documentos do cliente.
 *
 * Duas formas de recortar, e o Gui pediu as duas: por CATEGORIA (certificado, procuração,
 * proposta), que é como se procura quando se sabe o tipo, e por ATIVO, que é como se procura
 * quando se sabe o processo. A ficha do ativo linka para cá já filtrada.
 *
 * ⛔ A tela lista por REFERÊNCIA, nunca por link direto ao arquivo. Medido: a URL do anexo no CRM
 *    responde 206 com o conteúdo sem nenhuma credencial, sem assinatura e sem expiração — quem
 *    tiver o endereço abre o documento. Por isso `origem.ref` e o hash não saem na projeção, e o
 *    download nasce com a API, por endpoint autenticado.
 */

import Link from 'next/link'
import { linkDoArquivo } from '@/componentes/Documentos'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, Suspense } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { Bandeira } from '@/componentes/Bandeira'
import { BarraDeFiltro, contar } from '@/componentes/Filtros'
import { rotuloDocumento } from '@/lib/rotulos'
import { nomeAtivo } from '@/lib/visao'
import { LinkIcone, IconeBaixar } from '@/componentes/ui'
import { EsqPortalDocumentos } from '@/componentes/EsqueletosDasPaginas'


function tamanho(b?: number): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function MeusDocumentos() {
  const { visao } = useCliente()
  const params = useSearchParams()
  const [porAtivo, setPorAtivo] = useState<string | null>(params.get('ativo'))
  const [porTipo, setPorTipo] = useState<string | null>(null)

  // memorizado para a identidade não mudar a cada render e invalidar os useMemo abaixo
  const todos = useMemo(() => visao?.documentos ?? [], [visao])

  const porAtivoFiltrados = useMemo(
    () => (porAtivo ? todos.filter((d) => d.ativo_id === porAtivo) : todos),
    [todos, porAtivo],
  )
  const lista = useMemo(
    () => (porTipo ? porAtivoFiltrados.filter((d) => d.tipo === porTipo) : porAtivoFiltrados),
    [porAtivoFiltrados, porTipo],
  )

  const nomeDoAtivo = (id: string) => {
    const a = visao?.ativos.find((x) => x.ativo_id === id)
    return a ? nomeAtivo(a) : id
  }
  const opcoesAtivo = useMemo(
    () =>
      contar(
        todos,
        (d) => d.ativo_id,
        nomeDoAtivo,
        (id) => visao?.ativos.find((x) => x.ativo_id === id)?.jurisdicao,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, visao],
  )
  const opcoesTipo = useMemo(
    () =>
      contar(
        porAtivoFiltrados,
        (d) => d.tipo,
        (t) => rotuloDocumento(t),
      ),
    [porAtivoFiltrados],
  )

  const grupos = useMemo(() => {
    const m = new Map<string, typeof lista>()
    for (const d of lista) m.set(d.tipo, [...(m.get(d.tipo) ?? []), d])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [lista])

  if (!visao) return null

  const ativoEscolhido = porAtivo ? visao.ativos.find((a) => a.ativo_id === porAtivo) : null

  return (
    <>
      <header>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Documentos
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          <span className="num">{lista.length}</span>
          {lista.length !== todos.length && (
            <>
              {' '}
              de <span className="num">{todos.length}</span>
            </>
          )}{' '}
          {todos.length === 1 ? 'documento' : 'documentos'} do seu portfólio
          {ativoEscolhido && (
            <>
              {' · '}
              <Link
                href={`/portal/assets/${ativoEscolhido.ativo_id}`}
                className="font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
              >
                abrir {nomeAtivo(ativoEscolhido)} →
              </Link>
            </>
          )}
        </p>
      </header>

      {todos.length > 0 && (
        <>
          <BarraDeFiltro
            titulo="ativo"
            opcoes={opcoesAtivo}
            escolhido={porAtivo}
            aoEscolher={(v) => {
              setPorAtivo(v)
              setPorTipo(null)
            }}
            totalSemFiltro={todos.length}
            totalComFiltro={porAtivoFiltrados.length}
            forcar={!!porAtivo}
          />
          <BarraDeFiltro
            titulo="categoria"
            opcoes={opcoesTipo}
            escolhido={porTipo}
            aoEscolher={setPorTipo}
            totalSemFiltro={porAtivoFiltrados.length}
            totalComFiltro={lista.length}
          />
        </>
      )}

      {todos.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          Nenhum documento publicado ainda.
        </p>
      ) : lista.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          Nenhum documento com esses filtros.
        </p>
      ) : (
        grupos.map(([tipo, docs]) => (
          <section key={tipo} className="mt-6">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="sec">{rotuloDocumento(tipo)}</h2>
              <span className="num text-[11px] text-[var(--tx3)]">{docs.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {docs.map((d) => {
                const at = visao.ativos.find((a) => a.ativo_id === d.ativo_id)
                return (
                  <div key={d.documento_id} className="card flex items-center gap-3 p-3">
                    <span
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[11px] font-semibold"
                      style={{
                        background: 'rgba(0,224,246,.1)',
                        color: 'var(--color-petrol-cla)',
                        fontFamily: 'var(--font-titulo)',
                      }}
                    >
                      {d.mime?.includes('pdf') ? 'PDF' : '▤'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[var(--tx)]">
                        {d.nome}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-[var(--tx3)]">
                        {at && (
                          <Link
                            href={`/portal/assets/${at.ativo_id}`}
                            className="inline-flex items-center gap-1 transition hover:text-[var(--color-petrol-cla)]"
                          >
                            <Bandeira j={at.jurisdicao} />
                            {nomeAtivo(at)}
                          </Link>
                        )}
                        {d.tamanho_bytes && <span className="num">{tamanho(d.tamanho_bytes)}</span>}
                        {d.idioma && <span className="uppercase">{d.idioma}</span>}
                      </span>
                    </span>
                    <LinkIcone href={linkDoArquivo(d.documento_id)} rotulo={`Baixar ${d.nome}`} baixar>
                      <IconeBaixar />
                    </LinkIcone>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <div className="nota mt-6">
        Os arquivos ficam guardados com o escritório e só são entregues a quem está logado — e só os seus.
      </div>
    </>
  )
}

/**
 * `useSearchParams` exige um limite de Suspense para a rota poder ser pré-renderizada —
 * sem ele o `next build` falha na geração estática desta página. O recuo é só uma linha:
 * o conteúdo aparece assim que o roteador resolve a query, no mesmo quadro.
 */
export default function Pagina() {
  return (
    <Suspense fallback={<EsqPortalDocumentos />}>
      <MeusDocumentos />
    </Suspense>
  )
}
