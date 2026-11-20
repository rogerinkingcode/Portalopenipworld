'use client'

/**
 * Documentos — o acervo inteiro, na visão do gestor.
 *
 * O portal já tinha a tela; o gestor não. A diferença não é só de escopo: aqui aparecem os
 * documentos **não publicáveis** — carta de agente, minuta, rascunho de parecer — e o carimbo
 * de quem liberou cada um para o cliente.
 *
 * ⛔ Lista por REFERÊNCIA, nunca por link direto. Medido: a URL do anexo no CRM responde 206
 *    com o conteúdo sem credencial nenhuma, sem assinatura e sem expiração.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { Bandeira } from '@/componentes/Bandeira'
import { BarraDeFiltro, contar } from '@/componentes/Filtros'
import { Cartao, Vazio } from '@/componentes/ui'
import { AcoesDocumento, EnviarDocumento } from '@/componentes/Documentos'
import { rotuloDocumento } from '@/lib/rotulos'
import { dataBr, nomeAtivo } from '@/lib/visao'
import { EsqDocumentos } from '@/componentes/EsqueletosDasPaginas'


function tamanho(b?: number): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Documentos() {
  const { pacote, carregando } = usePortfolio()
  const [porTipo, setPorTipo] = useState<string | null>(null)
  const [soInternos, setSoInternos] = useState(false)

  const todos = pacote.documentos

  const lista = useMemo(() => {
    let l = todos
    if (porTipo) l = l.filter((d) => d.tipo === porTipo)
    if (soInternos) l = l.filter((d) => !d.publicavel)
    return l
  }, [todos, porTipo, soInternos])

  const opcoesTipo = useMemo(
    () => contar(todos, (d) => d.tipo, (t) => rotuloDocumento(t)),
    [todos],
  )
  const internos = todos.filter((d) => !d.publicavel).length

  if (carregando) {
    return <EsqDocumentos />
  }
  if (todos.length === 0) {
    return (
      <>
        <Cartao titulo="Enviar documento">
          <EnviarDocumento />
        </Cartao>
        <div className="mt-4">
          <Vazio
            titulo="Nenhum documento no acervo"
            detalhe="Envie acima: certificado, procuração, guia paga, parecer… Marque “o cliente pode ver” para aparecer no portal dele."
          />
        </div>
      </>
    )
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[22px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Documentos
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            <span className="num">{lista.length}</span>
            {lista.length !== todos.length && (
              <>
                {' '}de <span className="num">{todos.length}</span>
              </>
            )}{' '}
            no acervo · <span className="num">{internos}</span>{' '}
            {internos === 1 ? 'não publicável' : 'não publicáveis'}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--tx2)]">
          <input
            type="checkbox"
            checked={soInternos}
            onChange={(e) => setSoInternos(e.target.checked)}
          />
          só os que o cliente NÃO vê
        </label>
      </header>

      <div className="mt-5">
        <Cartao titulo="Enviar documento">
          <EnviarDocumento />
        </Cartao>
      </div>

      <BarraDeFiltro
        titulo="categoria"
        opcoes={opcoesTipo}
        escolhido={porTipo}
        aoEscolher={setPorTipo}
        totalSemFiltro={todos.length}
        totalComFiltro={lista.length}
      />

      <section className="card mt-4 p-4">
        <div className="overflow-x-auto">
          <table className="tb tb-meio min-w-[820px]">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Ativo</th>
                <th>Tamanho</th>
                <th>Idioma</th>
                <th>Publicável</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => {
                const at = pacote.ativos.find((a) => a.ativo_id === d.ativo_id)
                return (
                  <tr key={d.documento_id}>
                    <td className="text-[var(--tx)]">{d.nome}</td>
                    <td className="text-[var(--tx2)]">{rotuloDocumento(d.tipo)}</td>
                    <td>
                      {at ? (
                        <Link
                          href={`/assets/${at.ativo_id}?ver=documentos`}
                          className="inline-flex max-w-[340px] items-center gap-1.5 text-[var(--tx)] hover:text-[var(--color-petrol-cla)]"
                          title={nomeAtivo(at)}
                        >
                          <Bandeira j={at.jurisdicao} />
                          <span className="truncate">{nomeAtivo(at)}</span>
                        </Link>
                      ) : (
                        <span className="text-[var(--tx3)]">Sem ativo vinculado</span>
                      )}
                    </td>
                    <td className="num">{tamanho(d.tamanho_bytes)}</td>
                    <td className="uppercase">{d.idioma ?? '—'}</td>
                    <td>
                      {d.publicavel ? (
                        <span
                          className="pill pill-pos"
                          title={
                            d.publicavel_por
                              ? `Liberado por ${d.publicavel_por} em ${dataBr(d.publicavel_em)}`
                              : 'Liberado sem registro de quem liberou'
                          }
                        >
                          Sim
                        </span>
                      ) : (
                        <span className="pill pill-neu">Não</span>
                      )}
                    </td>
                    <td className="text-right">
                      <AcoesDocumento d={d} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10.5px] leading-snug text-[var(--tx3)]">
          Os arquivos saem só pela API autenticada: a equipe baixa tudo; o cliente, só o que for
          publicável e de um ativo dele. Nunca há link público.
        </p>
      </section>
    </>
  )
}
