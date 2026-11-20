'use client'

/**
 * A tarja de BETA.
 *
 * Existe para uma coisa só: impedir que uma tela em construção seja lida como pronta. Ela diz
 * o que já funciona, o que ainda não, e — o mais importante — **de onde virá o dado**. Uma
 * tela beta sem essa terceira parte vira promessa sem prazo.
 *
 * ⛔ Nenhuma tela marcada como beta pode exibir número derivado de dado que não existe. Onde
 *    falta fonte, a tela mostra a estrutura vazia e nomeia a lacuna — nunca um valor de
 *    exemplo com cara de real, que é como um protótipo vira um número citado em reunião.
 */

export function TarjaBeta({
  oQueJaFaz,
  oQueFalta,
  deOndeVemODado,
}: {
  oQueJaFaz: string
  oQueFalta: string
  deOndeVemODado: string
}) {
  return (
    <div
      className="mb-5 rounded-xl px-4 py-3"
      style={{
        background: 'rgba(230,138,0,.08)',
        border: '1px solid rgba(230,138,0,.24)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill pill-avi">beta</span>
        <span
          className="text-[12px] font-semibold text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Tela em construção — o que você vê aqui ainda não é dado de produção
        </span>
      </div>
      <dl className="mt-2.5 grid gap-x-6 gap-y-1.5 text-[11.5px] leading-snug sm:grid-cols-3">
        <div>
          <dt className="rotulo mb-0.5">já funciona</dt>
          <dd className="text-[var(--tx2)]">{oQueJaFaz}</dd>
        </div>
        <div>
          <dt className="rotulo mb-0.5">ainda não</dt>
          <dd className="text-[var(--tx2)]">{oQueFalta}</dd>
        </div>
        <div>
          <dt className="rotulo mb-0.5">de onde virá o dado</dt>
          <dd className="text-[var(--tx2)]">{deOndeVemODado}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Bloco de seção ainda sem fonte de dado — mostra a estrutura, nunca um número inventado. */
export function EsqueletoBeta({
  titulo,
  descricao,
  itens,
}: {
  titulo: string
  descricao: string
  itens: string[]
}) {
  return (
    <section className="card p-4">
      <h2 className="sec">{titulo}</h2>
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--tx2)]">{descricao}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {itens.map((i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-lg border border-dashed border-[var(--brd)] px-3 py-2.5 text-[11.5px] text-[var(--tx2)]"
          >
            <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--tx3)]" />
            {i}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10.5px] text-[var(--tx3)]">
        Sem fonte ligada, esta seção fica vazia de propósito — um valor de exemplo aqui viraria
        número citado em reunião.
      </p>
    </section>
  )
}
