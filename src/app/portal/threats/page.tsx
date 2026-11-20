'use client'

/** Ameaças — o que o cliente vê. Só o que tem parecer humano assinado. */

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, Suspense } from 'react'
import { useCliente } from '@/componentes/EstadoCliente'
import { CardAmeaca, ComoChegaAqui } from '@/componentes/Ameaca'
import { CardAmeacaCompacta } from '@/componentes/AmeacaCompacta'
import { ProcessoDoTerceiro } from '@/componentes/CasoAmeaca'
import { BarraDeFiltro, contar } from '@/componentes/Filtros'
import { montarAmeacas } from '@/lib/ameacas'
import { dataBr } from '@/lib/visao'
import { rotuloJurisdicao } from '@/lib/rotulos'
import { EsqPortalAmeacas } from '@/componentes/EsqueletosDasPaginas'

function MinhasAmeacas() {
  const { visao, hoje } = useCliente()
  const params = useSearchParams()
  // a ficha do ativo linka para cá já filtrada por ele
  const [porAtivo, setPorAtivo] = useState<string | null>(params.get('ativo'))
  const [porPais, setPorPais] = useState<string | null>(null)
  // A lista nasce RECOLHIDA: o confronto inteiro ocupa muito e, com mais de um caso, some a
  // noção de quantos são. Expandir é escolha de quem lê, um de cada vez.
  const [aberto, setAberto] = useState<string | null>(null)

  const todas = useMemo(() => (visao ? montarAmeacas(visao) : []), [visao])

  // Os dois filtros se compõem, e cada um conta sobre o que o OUTRO já deixou passar —
  // senão a barra oferece opções que resultariam em lista vazia.
  const porPaisFiltradas = useMemo(
    () => (porPais ? todas.filter((a) => (a.terceiro.pais ?? 'BR') === porPais) : todas),
    [todas, porPais],
  )
  const lista = useMemo(
    () => (porAtivo ? porPaisFiltradas.filter((a) => a.ativo_id === porAtivo) : porPaisFiltradas),
    [porPaisFiltradas, porAtivo],
  )

  const opcoesAtivo = useMemo(
    () =>
      contar(
        porPaisFiltradas,
        (a) => a.ativo_id,
        (id) => todas.find((a) => a.ativo_id === id)?.meu.nome ?? id,
      ),
    [porPaisFiltradas, todas],
  )
  const opcoesPais = useMemo(
    () =>
      contar(
        todas,
        (a) => a.terceiro.pais ?? 'BR',
        (p) => rotuloJurisdicao(p),
        (p) => p,
      ),
    [todas],
  )

  if (!visao) return null

  const vigiadas = [
    ...new Set(visao.ativos.filter((a) => a.vigilancia.ativa).map((a) => a.jurisdicao)),
  ]
  // A outra metade da verdade: onde há ativo e NÃO há leitura automática. Sem isto, o
  // estado vazio afirma cobertura que a casa não tem.
  const naoVigiadas = [
    ...new Set(visao.ativos.filter((a) => !a.vigilancia.ativa).map((a) => a.jurisdicao)),
  ]
  const ultima = todas.map((a) => a.gatilho).sort((x, y) => y.data.localeCompare(x.data))[0]
  const vigiados = visao.ativos.filter((a) => a.vigilancia.ativa).length

  return (
    <>
      <header>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Ameaças detectadas
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          Pedidos de terceiros que se aproximam das suas marcas.
        </p>
      </header>

      {todas.length > 0 && (
        <>
          <BarraDeFiltro
            titulo="ativo"
            opcoes={opcoesAtivo}
            escolhido={porAtivo}
            aoEscolher={setPorAtivo}
            totalSemFiltro={porPaisFiltradas.length}
            totalComFiltro={lista.length}
            forcar={!!porAtivo}
          />
          <BarraDeFiltro
            titulo="jurisdição"
            opcoes={opcoesPais}
            escolhido={porPais}
            aoEscolher={(v) => {
              setPorPais(v)
              setPorAtivo(null)
            }}
            totalSemFiltro={todas.length}
            totalComFiltro={porPaisFiltradas.length}
          />
        </>
      )}

      {todas.length === 0 ? (
        /* O estado vazio é o mais comum — e não pode parecer "tudo certo" com um check
           verde: a cobertura é parcial por jurisdição, e o check sugere um alcance que
           a casa não tem. */
        <div className="card mt-5 p-6">
          <h2
            className="text-[15px] font-semibold text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Nenhuma ameaça no seu portfólio nesta leitura.
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--tx2)]">
            {ultima ? (
              <>
                Lemos a RPI <span className="num">{ultima.revista}</span> (
                <span className="num">{dataBr(ultima.data)}</span>) inteira contra os seus{' '}
                <span className="num">{vigiados}</span>{' '}
                {vigiados === 1 ? 'ativo vigiado' : 'ativos vigiados'}.
              </>
            ) : (
              <>
                Lemos cada Revista da Propriedade Industrial contra os seus{' '}
                <span className="num">{vigiados}</span>{' '}
                {vigiados === 1 ? 'ativo vigiado' : 'ativos vigiados'}.
              </>
            )}{' '}
            Nenhuma publicação nova exigiu ação.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--tx2)]">
            Vigilância ativa em:{' '}
            <strong className="text-[var(--tx)]">
              {vigiadas.map(rotuloJurisdicao).join(', ') || 'nenhuma jurisdição'}
            </strong>
            .
            {naoVigiadas.length > 0 && (
              <>
                {' '}
                Em{' '}
                <strong className="text-[var(--tx)]">
                  {naoVigiadas.map(rotuloJurisdicao).join(', ')}
                </strong>{' '}
                você tem ativo, mas ainda não temos leitura automática da base —{' '}
                <strong className="text-[var(--tx)]">
                  o silêncio ali é ausência de olho, não ausência de risco
                </strong>
                .{' '}
                <Link
                  href="/portal/assets"
                  className="font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
                >
                  cada ativo diz o motivo →
                </Link>
              </>
            )}
          </p>
        </div>
      ) : lista.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-[var(--tx2)]">
          Nenhuma ameaça com esses filtros.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {lista.map((a) => (
            <div key={a.colidencia_id} className="flex flex-col gap-2">
              <CardAmeacaCompacta
                a={a}
                hoje={hoje}
                expandido={aberto === a.colidencia_id}
                aoExpandir={() =>
                  setAberto(aberto === a.colidencia_id ? null : a.colidencia_id)
                }
              />
              {/* O expandido traz TUDO — confronto e processo do terceiro. Um clique a mais
                  para ver o que já cabe aqui não paga: as únicas saídas são "ver o seu ativo"
                  e "conferir no INPI". Decisão do Gui em 06/09. */}
              {aberto === a.colidencia_id && (
                <>
                  <CardAmeaca a={a} hoje={hoje} href={`/portal/assets/${a.ativo_id}`} />
                  <ProcessoDoTerceiro a={a} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ComoChegaAqui />
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
    <Suspense fallback={<EsqPortalAmeacas />}>
      <MinhasAmeacas />
    </Suspense>
  )
}
