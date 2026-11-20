/**
 * Monta a vista de uma ameaça — a partir do pacote completo (gestor) ou da projeção
 * do cliente. As duas telas mostram a MESMA coisa, porque o que o gestor vê de uma
 * ameaça aprovada já é o que o cliente pode ver: o portão humano acontece antes.
 *
 * A diferença entre as visões está em QUANTAS ameaças cada um enxerga, não em quanto
 * de cada uma. O gestor vê também as pendentes; o cliente, só as aprovadas.
 */

import type { Pacote } from '../contrato/tipos.ts'
import type { PacoteCliente } from '../projecao/cliente.ts'
import { nomeAtivo } from './visao.ts'

/** O que a tela precisa para desenhar um choque. Vive aqui, não no componente. */
export type AmeacaVista = {
  colidencia_id: string
  caso_id: string
  ativo_id: string
  meu: {
    nome: string
    processo?: string | null
    jurisdicao: string
    classes: string[]
    /** A especificação do SEU registro, para a comparação de produto ficar de pé nos dois lados. */
    especificacoes: { codigo: string; texto?: string }[]
    deposito?: string | null
    situacao?: string
  }
  terceiro: {
    processo: string
    marca: string
    titular: string
    pais?: string
    uf?: string
    deposito?: string
    apresentacao?: string
    natureza?: string
    classes: { codigo: string; edicao_ncl?: string; especificacao_bruta?: string }[]
  }
  gatilho: { revista: number; data: string; codigo: string; pagina?: number }
  medida: string
  risco: string
  parecer_em: string
  dimensoes: { dimensao: string; avaliacao: string; fundamento: string }[]
  prazo?: { vence_em: string; firmeza: string; regua: string; fundamento: string }
}

type Fonte = Pacote | PacoteCliente

export function montarAmeacas(p: Fonte): AmeacaVista[] {
  const colidencias = 'colidencias' in p ? (p.colidencias ?? []) : []
  const vistas: AmeacaVista[] = []

  for (const c of colidencias) {
    /*
     * ⚠️ O PORTÃO. Duas formas de entrada, e a distinção precisa ser DETERMINÍSTICA:
     *
     *   projeção do cliente — traz `risco` achatado. Chegar até aqui já É o filtro:
     *                         `projetarParaCliente` só inclui parecer com decisão de enviar.
     *   pacote completo     — traz `parecer` como objeto, e pode não trazer nada.
     *
     * A primeira versão disto perguntava `typeof c.parecer === 'object'` para decidir qual
     * era qual. Quando `parecer` é `undefined` — exatamente o caso pendente —, o teste dava
     * falso, o filtro era pulado e o candidato SEM parecer entrava na lista de aprovadas.
     * Custou dois cards visíveis com "parecer de —" no rodapé.
     */
    const daProjecao = 'risco' in c
    if (!daProjecao) {
      const par = (c as Pacote['colidencias'][number]).parecer
      if (par?.decisao !== 'enviar') continue
    }

    const ativo = p.ativos.find((a) => a.ativo_id === c.ativo_id)
    if (!ativo) continue

    const prazo = c.prazo_id ? p.prazos.find((z) => z.prazo_id === c.prazo_id) : undefined
    const cc = c as unknown as {
      colidencia_id: string
      caso_id: string
      ativo_id: string
      terceiro: {
        processo: string
        marca: string
        titular: string
        pais?: string
        uf?: string
        classes: { codigo: string; edicao_ncl?: string }[]
        deposito?: string
      }
      evento_gatilho: { revista: number; data: string; codigo: string; pagina?: number }
      medida: string
      dimensoes?: { dimensao: string; avaliacao: string; fundamento: string }[]
      risco?: string
      parecer_em?: string
      parecer?: { risco: string; em: string }
    }

    vistas.push({
      colidencia_id: cc.colidencia_id,
      caso_id: cc.caso_id,
      ativo_id: cc.ativo_id,
      meu: {
        nome: nomeAtivo(ativo),
        processo: ativo.identificadores[0]?.valor_bruto ?? null,
        jurisdicao: ativo.jurisdicao,
        classes: (ativo.marca?.classes ?? []).map((k) => k.codigo),
        especificacoes: (ativo.marca?.classes ?? []).map((k) => ({
          codigo: k.codigo,
          texto: k.especificacao_bruta,
        })),
        deposito: ativo.datas.deposito,
        situacao: ativo.situacao.texto,
      },
      terceiro: cc.terceiro,
      gatilho: cc.evento_gatilho,
      medida: cc.medida,
      risco: cc.risco ?? cc.parecer?.risco ?? 'baixo',
      parecer_em: cc.parecer_em ?? cc.parecer?.em ?? '',
      dimensoes: cc.dimensoes ?? [],
      prazo: prazo
        ? {
            vence_em: prazo.vence_em,
            firmeza: prazo.firmeza,
            regua: prazo.regua.nome,
            fundamento: prazo.regua.fundamento,
          }
        : undefined,
    })
  }

  // Mais urgente primeiro; sem prazo vai para o fim.
  return vistas.sort((a, b) => {
    if (a.prazo && b.prazo) return a.prazo.vence_em.localeCompare(b.prazo.vence_em)
    if (a.prazo) return -1
    if (b.prazo) return 1
    return b.gatilho.data.localeCompare(a.gatilho.data)
  })
}
