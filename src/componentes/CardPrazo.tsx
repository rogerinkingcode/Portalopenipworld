'use client'

/**
 * O cartão de um prazo — UM componente para as duas visões.
 *
 * Existia em duas versões escritas em momentos diferentes, e elas divergiam em tudo que se
 * pode divergir: o cliente lia "em 7 anos" e o gestor "em 2806 dias" para a MESMA data; a
 * pílula de firmeza ficava em lados opostos; as divisórias tinham cores diferentes. Duas
 * telas que mostram o mesmo fato com aparências diferentes fazem quem opera duvidar de qual
 * está certa.
 *
 * A única diferença legítima é o `prazo_interno_em`: a antecedência operacional da casa
 * (medida em `legal − 10 dias`) aparece no gestor e **nunca** no portal — ela nem atravessa
 * a projeção do cliente.
 */

import type { Firmeza } from '@/contrato/tipos'
import { dataBr, diasAte, estadoDoPrazo, textoDias, urgenciaDe } from '@/lib/visao'
import { rotuloFirmeza } from '@/lib/rotulos'

export const FIRMEZA_TEXTO: Record<string, string> = {
  legal: 'Prazo previsto em lei.',
  praticado: 'Prática da casa — o dia inicial ainda não foi confirmado.',
  estimado: 'Régua ainda não confirmada. Confirme conosco antes de contar com esta data.',
  informado: 'Informado por terceiro, sem régua nossa.',
}

export type PrazoExibivel = {
  prazo_id: string
  abre_em?: string
  vence_em: string
  vence_extraordinario_em?: string
  /** ⛔ Só o gestor recebe. No portal este campo não existe. */
  prazo_interno_em?: string
  firmeza: Firmeza
  cumprido?: { em: string }
  regua: { nome: string; fundamento: string; dias: number }
}

export function CardPrazo({
  p,
  hoje,
  mostrarInterno = false,
}: {
  p: PrazoExibivel
  hoje: string
  /** liga a linha de antecedência operacional — só na visão do gestor */
  mostrarInterno?: boolean
}) {
  const dias = diasAte(p.vence_em, hoje)
  const u = urgenciaDe(dias)
  const estado = estadoDoPrazo(p, hoje)

  const cor = p.cumprido
    ? 'var(--color-ok)'
    : estado === 'a_abrir'
      ? 'var(--color-petrol-cla)'
      : u === 'urgente' || u === 'vencido'
        ? 'var(--color-erro)'
        : u === 'atencao'
          ? 'var(--color-alerta)'
          : 'var(--color-petrol-cla)'

  return (
    <div
      className="rounded-lg border-l-[3px] p-3"
      style={{ borderLeftColor: cor, background: 'var(--sup2)' }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {p.cumprido ? (
          <span className="pill pill-pos">cumprido em {dataBr(p.cumprido.em)}</span>
        ) : estado === 'a_abrir' ? (
          <span
            className="pill pill-neu"
            title="a janela para agir ainda não abriu — não há o que fazer antes disso"
          >
            abre em {dataBr(p.abre_em!)}
          </span>
        ) : (
          <span
            className={`pill ${u === 'urgente' || u === 'vencido' ? 'pill-neg' : u === 'atencao' ? 'pill-avi' : 'pill-neu'}`}
          >
            {textoDias(dias)}
          </span>
        )}
        {/* A firmeza aparece SEMPRE, inclusive quando é boa: se só aparecesse no caso ruim,
            a ausência da pílula viraria o código de "legal" — e ausência não se distingue
            de esquecimento. */}
        <span
          className={`pill ${p.firmeza === 'legal' ? 'pill-ok' : 'pill-avi'}`}
          title={FIRMEZA_TEXTO[p.firmeza]}
        >
          {rotuloFirmeza(p.firmeza)}
        </span>
      </div>

      <div
        className="mt-1.5 text-[12.5px] font-medium text-[var(--tx)]"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        {p.regua.nome}
      </div>
      <div className="num mt-0.5 text-[15px] font-semibold text-[var(--tx)]">
        {dataBr(p.vence_em)}
      </div>

      <p className="mt-1 text-[10px] leading-snug text-[var(--tx3)]">{p.regua.fundamento}</p>

      {p.vence_extraordinario_em && (
        <p className="mt-1 text-[10px] leading-snug text-[var(--tx3)]">
          extraordinário até <span className="num">{dataBr(p.vence_extraordinario_em)}</span> (com
          retribuição adicional)
        </p>
      )}

      {mostrarInterno && p.prazo_interno_em && (
        <p
          className="mt-1 text-[10px] leading-snug text-[var(--tx3)]"
          title="antecedência operacional da casa — não aparece no portal do cliente"
        >
          prazo interno: <span className="num">{dataBr(p.prazo_interno_em)}</span>
        </p>
      )}

      {p.firmeza !== 'legal' && (
        <p className="mt-1 text-[10px] leading-snug text-[var(--color-alerta)]">
          ⚠ {FIRMEZA_TEXTO[p.firmeza]}
        </p>
      )}
    </div>
  )
}
