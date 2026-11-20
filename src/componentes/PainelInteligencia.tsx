'use client'

/**
 * Inteligência de mercado — o mesmo painel para as duas visões.
 *
 * Pedido do Gui: sugerir mercados a partir do padrão do segmento, comparar a carteira do
 * cliente com a dos concorrentes e dos líderes, e transformar isso em decisão de proteção.
 *
 * ⚠️ ESTA TELA É A MAIS FÁCIL DE MENTIR DE TODO O PRODUTO, e por dois motivos que se somam.
 *
 * 1. **Ela dá conselho, não informa fato.** "Proteja na China" é uma recomendação de gasto —
 *    depósito de marca lá custa dinheiro e o cliente vai perguntar por que. Sem a base que
 *    sustente, é palpite com aparência de análise.
 *
 * 2. **A base para sustentá-la não existe ainda.** Medido: a casa lê o INPI brasileiro por
 *    bulk semanal; USPTO e EUIPO têm API e **não estão integradas**; CNIPA responde 412; e
 *    WIPO/Madri **proíbem por escrito** consulta automatizada. Ou seja: para dizer onde os
 *    concorrentes protegem, faltam exatamente as bases de fora do Brasil.
 *
 * Por isso a tela nasce mostrando o que JÁ dá para afirmar do portfólio do próprio cliente —
 * concentração, cobertura, lacunas — e deixa a parte comparativa como estrutura declarada,
 * vazia, com a fonte que falta nomeada. ⛔ Nenhum número de concorrente aparece aqui até
 * existir base para ele.
 */

import { useMemo } from 'react'
import { Bandeira } from './Bandeira'
import { TarjaBeta, EsqueletoBeta } from './Beta'
import { rotuloJurisdicao } from '@/lib/rotulos'
import { MATERIAS, materiaDe, type Materia } from '@/lib/visao'

type AtivoMin = {
  ativo_id: string
  especie: string
  jurisdicao: string
  vigilancia: { ativa: boolean; motivo?: string }
}

export function PainelInteligencia({
  ativos,
  nomeDoTitular,
}: {
  ativos: AtivoMin[]
  /** quando dado, a tela fala "a carteira de X"; senão, "a carteira" */
  nomeDoTitular?: string
}) {
  const d = useMemo(() => {
    const porJur = new Map<string, number>()
    const porMat = new Map<Materia, number>()
    for (const a of ativos) {
      porJur.set(a.jurisdicao, (porJur.get(a.jurisdicao) ?? 0) + 1)
      const m = materiaDe(a.especie as Parameters<typeof materiaDe>[0])
      porMat.set(m, (porMat.get(m) ?? 0) + 1)
    }
    const jur = [...porJur.entries()].sort((a, b) => b[1] - a[1])
    const total = ativos.length || 1

    /*
     * Concentração pelo índice de Herfindahl, normalizado: 1 = tudo numa jurisdição só,
     * perto de 0 = espalhado. É aritmética sobre o que a casa TEM, não inferência sobre o
     * mercado — por isso pode aparecer sem ressalva.
     */
    const hhi = jur.reduce((s, [, n]) => s + (n / total) ** 2, 0)

    const semVigilancia = ativos.filter((a) => !a.vigilancia.ativa)
    const jurSemVigilancia = [...new Set(semVigilancia.map((a) => a.jurisdicao))]

    return {
      jur,
      mat: [...porMat.entries()].sort((a, b) => b[1] - a[1]),
      total: ativos.length,
      hhi,
      concentracao:
        hhi >= 0.9 ? 'muito concentrada' : hhi >= 0.5 ? 'concentrada' : 'distribuída',
      semVigilancia: semVigilancia.length,
      jurSemVigilancia,
    }
  }, [ativos])

  const dono = nomeDoTitular ? `a carteira de ${nomeDoTitular}` : 'a carteira'

  return (
    <div className="flex flex-col gap-4">
      <TarjaBeta
        oQueJaFaz="a leitura da própria carteira: concentração, cobertura por jurisdição e onde não há vigilância"
        oQueFalta="a comparação com concorrentes e líderes — nenhum número de terceiro aparece ainda"
        deOndeVemODado="USPTO e EUIPO têm API e não estão integradas; CNIPA responde 412; WIPO proíbe consulta automatizada por escrito"
      />

      {/* ═══ O que JÁ dá para afirmar ═════════════════════════════════════════ */}
      <section className="card p-4">
        <h2 className="sec">Como {dono} está hoje</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--linha)] p-3.5">
            <span className="rotulo">Concentração geográfica</span>
            <div
              className="mt-1 text-[17px] font-semibold text-[var(--tx)]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              {d.concentracao}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--tx2)]">
              <span className="num">{d.jur.length}</span>{' '}
              {d.jur.length === 1 ? 'jurisdição' : 'jurisdições'}
              {d.jur[0] && (
                <>
                  , com <span className="num">{Math.round((d.jur[0][1] / d.total) * 100)}%</span> em{' '}
                  {rotuloJurisdicao(d.jur[0][0])}
                </>
              )}
              .
            </p>
          </div>

          <div className="rounded-lg border border-[var(--linha)] p-3.5">
            <span className="rotulo">Diversidade de matéria</span>
            <div
              className="mt-1 text-[17px] font-semibold text-[var(--tx)]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              {d.mat.length === 1 ? 'uma só' : `${d.mat.length} matérias`}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--tx2)]">
              {d.mat
                .map(([m, n]) => `${MATERIAS.find((x) => x.id === m)?.plural ?? m}: ${n}`)
                .join(' · ')}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--linha)] p-3.5">
            <span className="rotulo">Sem vigilância automática</span>
            <div
              className="num-g mt-1 text-[17px]"
              style={{ color: d.semVigilancia > 0 ? 'var(--color-alerta)' : 'var(--tx)' }}
            >
              {d.semVigilancia}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--tx2)]">
              {d.semVigilancia === 0
                ? 'toda a carteira está sob leitura automática'
                : `em ${d.jurSemVigilancia.map(rotuloJurisdicao).join(', ')}`}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--linha)] pt-3">
          <div className="rotulo mb-2">onde a carteira está</div>
          <div className="flex flex-col gap-1.5">
            {d.jur.map(([j, n]) => (
              <div key={j} className="flex items-center gap-2.5">
                <Bandeira j={j} />
                <span className="w-[190px] flex-shrink-0 truncate text-[11.5px] text-[var(--tx2)]">
                  {rotuloJurisdicao(j)}
                </span>
                <span className="barra flex-1">
                  <i style={{ width: `${(n / d.total) * 100}%` }} />
                </span>
                <span className="num w-8 text-right text-[12px] font-semibold text-[var(--tx)]">
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-snug text-[var(--tx3)]">
          Tudo acima é aritmética sobre os ativos que o escritório tem cadastrados — não é inferência
          sobre o mercado, e por isso pode ser lido sem ressalva.
        </p>
      </section>

      {/* ═══ O que AINDA NÃO dá ═══════════════════════════════════════════════ */}
      <EsqueletoBeta
        titulo="Onde os concorrentes protegem"
        descricao="A comparação com concorrentes e líderes do segmento exige ler as bases de fora do Brasil, e é exatamente o que ainda não temos. Enquanto não houver fonte, esta seção fica vazia: um mapa de concorrência montado a partir do que se supõe é pior que mapa nenhum, porque vira decisão de gasto."
        itens={[
          'Quem são os concorrentes diretos no segmento — hoje isso não está em lugar nenhum da casa, nem no CRM',
          'O portfólio de cada um por jurisdição (USPTO e EUIPO têm API; falta integrar)',
          'Onde os líderes do setor protegem e o cliente não — a lacuna que vira recomendação',
          'Movimentos recentes: depósitos novos do segmento, por país e por classe',
          'O que a China mostra — CNIPA responde 412 a consulta automatizada; hoje só pelo certificado do agente',
        ]}
      />

      <EsqueletoBeta
        titulo="Mercados sugeridos"
        descricao="A sugestão de onde proteger em seguida depende de três coisas que se cruzam: para onde o cliente exporta ou pretende exportar, onde o segmento dele se movimenta, e onde há risco de terceiro registrar antes. A primeira é do cliente, a segunda vem das bases estrangeiras, a terceira exige vigilância naquela jurisdição."
        itens={[
          'Destinos comerciais declarados pelo cliente — nunca inferidos do portfólio',
          'Países onde o segmento concentra depósitos, medido nas bases oficiais',
          'Custo estimado por jurisdição, com taxa oficial e honorário separados',
          'Prazo de prioridade unionista ainda aberto (6 meses de marca, 12 de patente)',
          'Onde já existe pedido de terceiro parecido — o risco que torna a decisão urgente',
        ]}
      />

      <div className="nota">
        <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          Por que esta tela é conservadora de propósito.
        </strong>{' '}
        As outras telas do painel mostram <em>fato</em>: um despacho publicado, um prazo que
        corre, um pedido de terceiro. Esta daria <em>conselho</em> — e conselho de proteção é
        decisão de gasto. Enquanto a base que o sustenta não existir, ela mostra a estrutura e
        nomeia a lacuna, em vez de preencher com estimativa.
      </div>
    </div>
  )
}
