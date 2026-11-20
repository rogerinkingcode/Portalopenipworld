/**
 * A camada que separa a tela do armazenamento.
 *
 * Regra 2 do `CLAUDE.md`: **a tela nunca fala com o armazenamento.** Ela fala com
 * `PortfolioRepository`. A implementação é a API do backend (`./api.ts`); trocar a
 * implementação não toca componente nenhum.
 *
 * ⚠️ Quem emite id é o SERVIDOR. O pacote que a tela envia (conjunto de exemplo) leva só
 *    referências provisórias; o que volta de `importar` já traz
 *    os ids definitivos — é ele que a tela passa a usar.
 */

import type { Pacote, Papel } from '@/contrato/tipos'
import type { PacoteCliente } from '@/projecao/cliente'

/** O recorte do portal, já projetado E auditado no servidor. */
export type Portal = {
  pessoa: { pessoa_id: string; nome: string }
  visao: PacoteCliente
}

export interface PortfolioRepository {
  /** Nome legível da implementação, para a tela poder dizer de onde o dado veio. */
  readonly origem: string

  /** A carteira inteira (só equipe). */
  carregar(): Promise<Pacote>
  /**
   * Substitui a carteira, de forma ATÔMICA no servidor: ou o pacote todo entra, ou nada muda.
   * Devolve o pacote gravado, com os ids emitidos pelo servidor.
   */
  /**
   * Conciliação: dá um papel a uma pessoa em um ou vários ativos. Quem decidiu é quem está
   * logado. O vínculo que já existe não é duplicado.
   */
  atribuirPapel(dados: { ativo_ids: string[]; pessoa_id: string; papel: Papel }): Promise<ResultadoAtribuicao>
  /** Desfaz um vínculo atribuído à mão (só esses: o resto se corrige na fonte). */
  removerVinculo(vinculoId: string): Promise<void>
  /**
   * O portal. Para o cliente, a pessoa vem da sessão (o argumento é ignorado pelo servidor se
   * não for a dele). Para a equipe, é a pré-visualização do portal daquela pessoa.
   */
  portal(pessoaId?: string): Promise<Portal>
}

export type ResultadoAtribuicao = { criados: number; ja_existiam: number }
