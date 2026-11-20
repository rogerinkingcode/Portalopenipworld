'use client'

/**
 * O cartão LARGO de um prazo — o da tela de Prazos, nas duas visões.
 *
 * Irmão do `CardPrazo` (o pequeno, da ficha do ativo). Este nasceu no portal e o Gui pediu
 * que o gestor o adotasse: *"Prazos do cliente está melhor que o prazos do gestor, melhor
 * aplicar o mesmo modelo de cliente para o gestor."*
 *
 * A razão é de leitura, não de gosto. Na tabela que o gestor tinha, o fundamento
 * (`art. 84 LPI — REGRA NÃO CONFIRMADA PELA CASA`) ficava espremido numa coluna estreita e o
 * aviso de régua estimada virava uma tarja no topo da página — longe da linha que ele
 * qualifica. Quem lê tinha de cruzar os dois. Aqui o aviso mora DENTRO do prazo que ele
 * qualifica, e a aritmética inteira (dias · fundamento · contagem · dies a quo) aparece na
 * mesma respiração.
 *
 * ⛔ Só o gestor recebe `mostrarInterno`. O `prazo_interno_em` é antecedência operacional da
 *    casa e nem atravessa a projeção do cliente.
 */

import { Bandeira } from './Bandeira'
import { FIRMEZA_TEXTO, type PrazoExibivel } from './CardPrazo'
import { dataBr, diasAte, estadoDoPrazo, textoDias, urgenciaDe } from '@/lib/visao'
import { rotuloFirmeza } from '@/lib/rotulos'

export type PrazoLargo = PrazoExibivel & {
  regua: PrazoExibivel['regua'] & {
    contagem: string
    dies_a_quo: string
    /** Janela extraordinária da própria régua — traz o fundamento e se cobra taxa. */
    prazo_extraordinario?: { dias: number; fundamento: string; taxa_adicional: boolean }
  }
}

export function CardPrazoLargo({
  p,
  hoje,
  ativo,
  href,
  destacado = false,
  mostrarInterno = false,
}: {
  p: PrazoLargo
  hoje: string
  /** o ativo a que o prazo pertence — some quando o pacote não o traz */
  ativo?: { jurisdicao: string; nome: string }
  /** para onde a linha do ativo leva; sem isto o nome não vira link */
  href?: string
  destacado?: boolean
  mostrarInterno?: boolean
}) {
  const d = diasAte(p.vence_em, hoje)
  const u = urgenciaDe(d)
  const est = estadoDoPrazo(p, hoje)

  const nome = ativo && (
    <span className="inline-flex items-center gap-1.5">
      <Bandeira j={ativo.jurisdicao} />
      {ativo.nome}
    </span>
  )

  return (
    <article
      className="card p-4"
      style={destacado ? { borderColor: 'var(--color-ciano)' } : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="text-[13.5px] font-semibold text-[var(--tx)]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              {p.regua.nome}
            </h3>
            {est === 'cumprido' ? (
              <span className="pill pill-pos">cumprido em {dataBr(p.cumprido!.em)}</span>
            ) : est === 'a_abrir' ? (
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
                {textoDias(d)}
              </span>
            )}
            {/* A firmeza aparece SEMPRE — inclusive quando é boa: se só aparecesse no caso
                ruim, a ausência da pílula viraria o código de "legal", e ausência não se
                distingue de esquecimento. */}
            <span
              className={`pill ${p.firmeza === 'legal' ? 'pill-ok' : 'pill-avi'}`}
              title={FIRMEZA_TEXTO[p.firmeza]}
            >
              {rotuloFirmeza(p.firmeza)}
            </span>
          </div>
          {ativo && (
            <p className="mt-1.5 text-[11.5px] text-[var(--tx2)]">
              {href ? (
                <a href={href} className="hover:text-[var(--color-petrol-cla)]">
                  {nome}
                </a>
              ) : (
                nome
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="rotulo">{est === 'a_abrir' ? 'prazo final' : 'vence em'}</div>
          <div className="num-g text-[17px] text-[var(--tx)]">{dataBr(p.vence_em)}</div>
          {mostrarInterno && p.prazo_interno_em && (
            <div
              className="num mt-0.5 text-[10px] text-[var(--tx3)]"
              title="antecedência operacional da casa — não aparece no portal do cliente"
            >
              interno {dataBr(p.prazo_interno_em)}
            </div>
          )}
        </div>
      </div>

      {/* A aritmética visível — é contrato: "a régua INTEIRA vai junto; a tela mostra". */}
      <div className="mt-3 border-t border-[var(--linha)] pt-2.5 text-[11px] leading-relaxed text-[var(--tx2)]">
        {/* ⚠️ `dias: 0` não quer dizer "vence hoje" — quer dizer que a régua NÃO é de contagem:
            anuidade e prorrogação decenal saem da data de depósito/concessão, não de um prazo
            que corre. Escrever "0 dias" ao lado de uma data futura é um número que mente. */}
        {p.regua.dias > 0 ? (
          <>
            <strong className="text-[var(--tx)]">
              <span className="num">{p.regua.dias}</span> dias
            </strong>{' '}
            · {p.regua.fundamento} · contagem em dias {p.regua.contagem} ·{' '}
            {p.regua.dies_a_quo === 'primeiro_dia_util_seguinte'
              ? 'início no primeiro dia útil seguinte à publicação'
              : p.regua.dies_a_quo}
          </>
        ) : (
          <>
            <strong className="text-[var(--tx)]">Data fixa</strong> · {p.regua.fundamento} · não é
            prazo em dias: a data sai do próprio ciclo do processo
          </>
        )}
        {/* ⚠️ Isto NÃO é ajuste de feriado. É a janela extraordinária da lei, que na anuidade
            (art. 84 §2º) e na prorrogação (art. 133 §1º) custa retribuição adicional. Dizer
            "prorrogado por não haver expediente" faria o cliente contar com seis meses de
            graça achando que são de graça. */}
        {p.vence_extraordinario_em && (
          <>
            {' '}
            · janela extraordinária até{' '}
            <span className="num">{dataBr(p.vence_extraordinario_em)}</span>
            {p.regua.prazo_extraordinario?.fundamento
              ? ` (${p.regua.prazo_extraordinario.fundamento}`
              : ' ('}
            {p.regua.prazo_extraordinario?.taxa_adicional === false
              ? ', sem taxa adicional)'
              : ', com retribuição adicional)'}
          </>
        )}
        {p.firmeza !== 'legal' && (
          <div className="mt-1.5 text-[var(--color-alerta)]">⚠ {FIRMEZA_TEXTO[p.firmeza]}</div>
        )}
      </div>
    </article>
  )
}
