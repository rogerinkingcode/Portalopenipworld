'use client'

/**
 * Ameaças — visão do GESTOR. Mostra as aprovadas E as que aguardam parecer.
 * A fila de análise é o trabalho interno; ela nunca chega ao cliente.
 */

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { CardAmeaca, ComoChegaAqui } from '@/componentes/Ameaca'
import { CardAmeacaCompacta } from '@/componentes/AmeacaCompacta'
import { ProcessoDoTerceiro } from '@/componentes/CasoAmeaca'
import { FilaAnalise } from '@/componentes/FilaAnalise'
import { PainelVigilancia } from '@/componentes/PainelVigilancia'
import { Vazio } from '@/componentes/ui'
import { BarraDeFiltro, contar } from '@/componentes/Filtros'
import { montarAmeacas } from '@/lib/ameacas'
import { rotuloJurisdicao } from '@/lib/rotulos'
import { dataBr, nomeAtivo } from '@/lib/visao'
import { EsqAmeacas } from '@/componentes/EsqueletosDasPaginas'

export default function Ameacas() {
  const { pacote, hoje, carregando } = usePortfolio()
  const [aba, setAba] = useState<'aprovadas' | 'analise' | 'descartadas'>('aprovadas')
  const [porAtivo, setPorAtivo] = useState<string | null>(null)
  const [porPais, setPorPais] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  const aprovadas = useMemo(() => montarAmeacas(pacote), [pacote])
  // Na fila: o que ninguém decidiu (ou ficou "em análise" com anotação). Descartado sai da fila.
  const emAnalise = useMemo(
    () => (pacote.colidencias ?? []).filter((c) => c.approval_status === 'pending' && c.parecer?.decisao !== 'enviar'),
    [pacote],
  )
  const descartadas = useMemo(
    () => (pacote.colidencias ?? []).filter((c) => c.approval_status === 'rejected'),
    [pacote],
  )

  // Os filtros valem para as DUAS abas: a fila de análise é justamente a que cresce.
  const base = aba === 'aprovadas' ? aprovadas : aba === 'analise' ? emAnalise : descartadas
  const idDoAtivo = (x: { ativo_id: string }) => x.ativo_id
  const paisDe = (x: { terceiro: { pais?: string } }) => x.terceiro.pais ?? 'BR'

  const porPaisFiltradas = useMemo(
    () => (porPais ? base.filter((x) => paisDe(x) === porPais) : base),
    [base, porPais],
  )
  const lista = useMemo(
    () => (porAtivo ? porPaisFiltradas.filter((x) => idDoAtivo(x) === porAtivo) : porPaisFiltradas),
    [porPaisFiltradas, porAtivo],
  )

  const nomeDoAtivo = (id: string) => {
    const a = pacote.ativos.find((x) => x.ativo_id === id)
    return a ? nomeAtivo(a) : id
  }
  const opcoesAtivo = useMemo(
    () => contar(porPaisFiltradas, idDoAtivo, nomeDoAtivo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porPaisFiltradas, pacote],
  )
  const opcoesPais = useMemo(
    () => contar(base, paisDe, rotuloJurisdicao, (p) => p),
    [base],
  )

  const ultima = useMemo(() => {
    const todas = (pacote.colidencias ?? []).map((c) => c.evento_gatilho)
    return todas.sort((a, b) => b.data.localeCompare(a.data))[0]
  }, [pacote])

  if (carregando) {
    return <EsqAmeacas />
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Ameaças detectadas
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
            Publicações de terceiros que se aproximam dos ativos sob gestão.
          </p>
        </div>
        {ultima && (
          <span className="text-[10.5px] text-[var(--tx3)]">
            última leitura: RPI <span className="num">{ultima.revista}</span> ·{' '}
            <span className="num">{dataBr(ultima.data)}</span>
          </span>
        )}
      </header>

      <PainelVigilancia />

      <div className="seg mt-4">
        <button data-on={aba === 'aprovadas' ? 'sim' : 'nao'} onClick={() => setAba('aprovadas')}>
          Com parecer ({aprovadas.length})
        </button>
        <button data-on={aba === 'analise' ? 'sim' : 'nao'} onClick={() => setAba('analise')}>
          Em análise ({emAnalise.length})
        </button>
        <button data-on={aba === 'descartadas' ? 'sim' : 'nao'} onClick={() => setAba('descartadas')}>
          Descartadas ({descartadas.length})
        </button>
      </div>

      {base.length > 0 && (
        <>
          <BarraDeFiltro
            titulo="ativo"
            opcoes={opcoesAtivo}
            escolhido={porAtivo}
            aoEscolher={setPorAtivo}
            totalSemFiltro={porPaisFiltradas.length}
            totalComFiltro={lista.length}
          />
          <BarraDeFiltro
            titulo="jurisdição"
            opcoes={opcoesPais}
            escolhido={porPais}
            aoEscolher={(v) => {
              setPorPais(v)
              setPorAtivo(null)
            }}
            totalSemFiltro={base.length}
            totalComFiltro={porPaisFiltradas.length}
          />
        </>
      )}

      {aba === 'aprovadas' ? (
        <div className="mt-4 flex flex-col gap-3">
          {aprovadas.length === 0 ? (
            <Vazio
              titulo="Nenhuma ameaça com parecer assinado"
              detalhe="Candidatos levantados pelo cruzamento ficam na aba Em análise até alguém decidir."
            />
          ) : lista.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-[var(--tx2)]">
              Nenhuma ameaça com esses filtros.
            </p>
          ) : (
            (lista as typeof aprovadas).map((a) => (
              <div key={a.colidencia_id} className="flex flex-col gap-2">
                <CardAmeacaCompacta
                  a={a}
                  hoje={hoje}
                  expandido={aberto === a.colidencia_id}
                  aoExpandir={() =>
                    setAberto(aberto === a.colidencia_id ? null : a.colidencia_id)
                  }
                />
                {aberto === a.colidencia_id && (
                  <>
                    <CardAmeaca a={a} hoje={hoje} href={`/assets/${a.ativo_id}`} />
                    <ProcessoDoTerceiro a={a} />
                  </>
                )}
              </div>
            ))
          )}
        </div>
      ) : aba === 'analise' ? (
        <div className="mt-4">
          <div className="nota mb-4">
            <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
              Isto é fila de recuperação, não risco.
            </strong>{' '}
            A ordem P0 a P3 diz o que o computador achou mais parecido, não o que é conflito. O
            juízo é da pessoa que assina o parecer, e{' '}
            <strong className="text-[var(--tx)]">nada aqui chega ao cliente</strong> antes disso.
          </div>

          {lista.length === 0 ? (
            <Vazio titulo={emAnalise.length === 0 ? 'Nada aguardando parecer' : 'Nada com esses filtros'} />
          ) : (
            <FilaAnalise candidatos={lista as typeof emAnalise} />
          )}
        </div>
      ) : (
        <div className="mt-4">
          {lista.length === 0 ? (
            <Vazio titulo="Nenhum caso descartado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tb">
                <thead>
                  <tr>
                    <th>Caso</th>
                    <th>Ativo</th>
                    <th>Terceiro</th>
                    <th>RPI</th>
                    <th>Descartado por</th>
                    <th>Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {(lista as typeof descartadas).map((c) => {
                    const ativo = pacote.ativos.find((a) => a.ativo_id === c.ativo_id)
                    return (
                      <tr key={c.colidencia_id}>
                        <td className="num">{c.caso_id}</td>
                        <td>{ativo ? nomeAtivo(ativo) : '—'}</td>
                        <td className="font-medium text-[var(--tx)]">{c.terceiro.marca}</td>
                        <td className="num whitespace-nowrap">
                          {c.evento_gatilho.revista} · {dataBr(c.evento_gatilho.data)}
                        </td>
                        <td className="text-[var(--tx2)]">
                          {c.parecer?.por} · {dataBr(c.parecer?.em)}
                        </td>
                        <td className="text-[var(--tx2)]">{c.parecer?.justificativa}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <ComoChegaAqui />
      </div>
    </>
  )
}
