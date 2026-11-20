'use client'

/**
 * Comunicados — a caixa de saída da casa. **Só o gestor.**
 *
 * Decisão do Gui: o cliente não tem aba de comunicados, porque este controle é nosso. O que
 * o cliente vê é o **efeito** do comunicado (a ameaça no portal, o prazo na lista), não o
 * registro do envio.
 *
 * ⚠️ O OpenIpWorld NUNCA envia. Ele grava um `Comunicado` na caixa de saída e o motor único
 *    de envio — no BI/n8n — despacha. O painel nunca vê o token do WhatsApp nem do e-mail:
 *    dois motores de envio significam duas listas de opt-in, e a segunda sempre atrasa.
 *
 * ⛔ E nada sai sem opt-in do canal. Aviso sobre serviço contratado é execução de contrato;
 *    marketing exige consentimento específico, não pré-marcado — são flags separadas.
 */

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { TarjaBeta, EsqueletoBeta } from '@/componentes/Beta'
import { Bandeira } from '@/componentes/Bandeira'
import { dataBr, nomeAtivo } from '@/lib/visao'
import { EsqBeta } from '@/componentes/EsqueletosDasPaginas'

const ESTADO_PILL: Record<string, string> = {
  rascunho: 'pill-neu',
  pronto: 'pill-ok',
  enviado: 'pill-pos',
  falhou: 'pill-neg',
  cancelado: 'pill-neu',
}

export default function Comunicados() {
  const { pacote, carregando } = usePortfolio()
  const [canal, setCanal] = useState<string>('todos')

  const comunicados = useMemo(() => pacote.comunicados ?? [], [pacote])
  const lista = useMemo(
    () => (canal === 'todos' ? comunicados : comunicados.filter((c) => c.canal === canal)),
    [comunicados, canal],
  )

  const canais = [...new Set(comunicados.map((c) => c.canal))]

  if (carregando) {
    return <EsqBeta />
  }

  return (
    <>
      <header className="mb-4">
        <h1
          className="text-[22px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Comunicados
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">
          A caixa de saída da casa — o que foi avisado, a quem, por qual canal e quando.
        </p>
      </header>

      <TarjaBeta
        oQueJaFaz="o contrato de `Comunicado` existe e a tela lê a caixa de saída"
        oQueFalta="gravar, agendar e acompanhar entrega — e as três flags de opt-in por canal"
        deOndeVemODado="o envio é do motor único no BI/n8n; aqui só se enfileira e se lê o estado"
      />

      {comunicados.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="card p-6">
            <h2
              className="text-[14px] font-semibold text-[var(--tx)]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              Nenhum comunicado na caixa de saída.
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--tx2)]">
              Comunicados nascem de um fato do portfólio — uma ameaça aprovada, um prazo que se
              aproxima, um despacho publicado. O painel enfileira; quem despacha é o motor único
              do BI, que é onde já vivem o token e a lista de opt-in.
            </p>
          </div>

          <EsqueletoBeta
            titulo="O que esta tela vai mostrar"
            descricao="Cada linha é um comunicado, com o fato que o gerou, o destinatário, o canal e o estado da entrega. Nada aqui é enviado pelo painel."
            itens={[
              'Fila de saída: rascunho → pronto → enviado, com quem aprovou e quando',
              'O fato de origem: qual ameaça, qual prazo, qual despacho gerou o aviso',
              'Canal e destinatário, com a flag de opt-in que autorizou aquele canal',
              'Entregas que falharam, com o motivo — e o que a casa fez a respeito',
              'Os três números do WhatsApp por finalidade, medidos separadamente',
            ]}
          />

          <div className="nota">
            <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
              Por que o cliente não tem esta aba.
            </strong>{' '}
            Ele vê o <em>efeito</em> do comunicado — a ameaça no portal, o prazo na lista. O
            registro do envio é controle da casa, e expô-lo criaria a pergunta &quot;por que vocês
            não me avisaram daquele outro?&quot; sobre casos que a casa decidiu, com razão, não
            comunicar.
          </div>
        </div>
      ) : (
        <>
          {canais.length > 1 && (
            <div className="seg mb-4">
              <button data-on={canal === 'todos' ? 'sim' : 'nao'} onClick={() => setCanal('todos')}>
                Todos ({comunicados.length})
              </button>
              {canais.map((c) => (
                <button key={c} data-on={canal === c ? 'sim' : 'nao'} onClick={() => setCanal(c)}>
                  {c} ({comunicados.filter((x) => x.canal === c).length})
                </button>
              ))}
            </div>
          )}

          <section className="card p-4">
            <div className="overflow-x-auto">
              <table className="tb min-w-[820px]">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Estado</th>
                    <th>Canal</th>
                    <th>Template</th>
                    <th>Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => {
                    const at = pacote.ativos.find((a) => a.ativo_id === c.ativo_id)
                    return (
                      <tr key={c.comunicado_id}>
                        <td className="num whitespace-nowrap">
                          {dataBr((c.enviado_em ?? c.criado_em).slice(0, 10))}
                        </td>
                        <td>
                          <span className={`pill ${ESTADO_PILL[c.estado] ?? 'pill-neu'}`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="text-[var(--tx2)]">{c.canal}</td>
                        <td className="text-[var(--tx)]">{c.template_id}</td>
                        <td>
                          {at && (
                            <span className="inline-flex items-center gap-1.5">
                              <Bandeira j={at.jurisdicao} />
                              {nomeAtivo(at)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
