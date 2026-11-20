import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * ⛔ O `CLAUDE.md` deste repositório é documento de PROJETO — as regras da casa, as decisões
   * datadas e o que o Breno precisa saber. O Next 16 anexa um bloco próprio nele a cada `next dev`;
   * desligado aqui para o arquivo não virar ruído.
   * O guia do Next fica em `node_modules/next/dist/docs/`.
   */
  agentRules: false,

  /**
   * O emblema de desenvolvimento do Next fica fixo no canto inferior esquerdo — exatamente
   * onde mora o rodapé da nossa sidebar, e o cobre. Como as telas são validadas por captura,
   * ele apareceria em toda imagem de revisão. Desligado; a sobreposição de erro continua.
   */
  devIndicators: false,

  experimental: {
    /**
     * Com `proxy.ts` no projeto, o Next guarda em memória o corpo de cada requisição até 10 MB —
     * inclusive as repassadas à API — e corta o resto (a API recebia meio arquivo e o navegador
     * via um 500). A planilha vai como bytes até 20 MB (o limite da API); a folga deixa a própria
     * API responder "grande demais" com a mensagem certa.
     */
    proxyClientMaxBodySize: '21mb',
  },

  /**
   * DESENVOLVIMENTO: o navegador chama `/api/backend/*` no próprio domínio do front, e o servidor
   * do Next repassa para `IPAW_API_URL`.
   * PRODUÇÃO: sem repasse — o navegador fala direto com a API (NEXT_PUBLIC_API_URL), que libera
   * por CORS só a origem do front (ORIGENS_FRONT no backend).
   */
  async rewrites() {
    // Em produção (Vercel) o navegador chama a API direto, em NEXT_PUBLIC_API_URL — ver lib/api.ts.
    // O repasse abaixo é só do desenvolvimento.
    if (process.env.NEXT_PUBLIC_API_URL) return []
    const api = process.env.IPAW_API_URL
    if (!api) throw new Error('Defina IPAW_API_URL (desenvolvimento) ou NEXT_PUBLIC_API_URL (produção) — veja o .env.example')
    return [{ source: '/api/backend/:caminho*', destination: `${api.replace(/\/$/, '')}/:caminho*` }]
  },
}

export default nextConfig
