/**
 * Todo link que promete filtro precisa filtrar.
 *
 * ACHADO REAL (07/09/2026): a tela inicial do gestor linkava para `/assets?materia=…` e
 * `/assets?jurisdicao=…`, e a lista de ativos **não lia a URL**. O clique navegava e a lista
 * abria INTEIRA, sem filtro e sem aviso nenhum. Pior: o parâmetro emitido chamava-se `materia`
 * e o estado da tela chamava-se `especie`, que são vocabulários diferentes — matéria agrupa
 * quatro espécies. Nem lendo a query o filtro casaria sem tradução.
 *
 * É o mesmo modo de falha que custou 58 regras de CSS mortas ao BI: nada quebra, nada avisa, e
 * o número na tela fica errado. Por isso a varredura é estática e roda a cada `npm test`.
 *
 * ⚠️ Sem regex de propósito. Montar a expressão por concatenação de strings quebrou duas vezes
 *    aqui — a barra invertida some quando o arquivo é gerado pelo shell. Ler caractere a
 *    caractere é feio e funciona sempre.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const ABRE_VALOR = ['{', '`', "'", '"']
const FECHA_VALOR = ['`', "'", '"', '}']

function arquivosTsx(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) arquivosTsx(p, acc)
    else if (nome.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

/** Do caminho do arquivo para a rota que ele serve. */
function rotaDe(arquivo: string, raiz: string): string {
  const rel = arquivo.slice(raiz.length).split(sep).join('/')
  const semPagina = rel.replace(/\/page\.tsx$/, '')
  return semPagina === '' ? '/' : semPagina
}

/** Extrai os destinos de `href=` que apontam para dentro do app e trazem query. */
function linksComQuery(src: string): { rota: string; param: string }[] {
  const achados: { rota: string; param: string }[] = []
  let i = src.indexOf('href=')
  while (i !== -1) {
    let k = i + 'href='.length
    while (k < src.length && ABRE_VALOR.includes(src[k])) k++
    let fim = k
    while (fim < src.length && !FECHA_VALOR.includes(src[fim]) && src[fim] !== '\n') fim++
    const alvo = src.slice(k, fim)
    const q = alvo.indexOf('?')
    if (alvo.startsWith('/') && q > 0) {
      achados.push({ rota: alvo.slice(0, q), param: alvo.slice(q + 1).split('=')[0] })
    }
    i = src.indexOf('href=', i + 'href='.length)
  }
  return achados
}

test('todo parâmetro de URL que uma tela emite é lido pela tela de destino', () => {
  const raiz = join(process.cwd(), 'src', 'app')
  const arquivos = arquivosTsx(raiz)

  const paginas = new Map<string, string>()
  for (const f of arquivos) {
    if (!f.endsWith('page.tsx')) continue
    paginas.set(rotaDe(f, raiz), readFileSync(f, 'utf8'))
  }
  assert.ok(paginas.size > 5, 'a varredura precisa achar as páginas para valer alguma coisa')

  const problemas: string[] = []
  for (const f of arquivos) {
    for (const { rota, param } of linksComQuery(readFileSync(f, 'utf8'))) {
      const destino = paginas.get(rota)
      if (!destino) {
        problemas.push(`${rota}?${param} — rota de destino não existe`)
      } else if (!destino.includes('useSearchParams')) {
        problemas.push(`${rota}?${param} — a tela de destino não lê a URL`)
      } else if (!destino.includes(`'${param}'`) && !destino.includes(`"${param}"`)) {
        problemas.push(`${rota}?${param} — a tela lê a URL, mas não este parâmetro`)
      }
    }
  }
  assert.deepEqual(problemas, [], 'links que prometem filtro e não filtram')
})

test('nenhum link interno aponta para uma rota que não existe', () => {
  const raiz = join(process.cwd(), 'src', 'app')
  const arquivos = arquivosTsx(raiz)

  const rotas = new Set<string>()
  for (const f of arquivos) {
    if (f.endsWith('page.tsx')) rotas.add(rotaDe(f, raiz))
  }

  /** `/assets/[id]` casa com `/assets/<qualquer coisa>`. */
  const existe = (r: string) => {
    if (rotas.has(r)) return true
    const partes = r.split('/')
    for (const molde of rotas) {
      const m = molde.split('/')
      if (m.length !== partes.length) continue
      if (m.every((seg, i) => seg === partes[i] || (seg.startsWith('[') && seg.endsWith(']')))) {
        return true
      }
    }
    return false
  }

  const quebrados: string[] = []
  for (const f of arquivos) {
    const src = readFileSync(f, 'utf8')
    let i = src.indexOf('href=')
    while (i !== -1) {
      let k = i + 'href='.length
      while (k < src.length && ABRE_VALOR.includes(src[k])) k++
      let fim = k
      while (fim < src.length && !FECHA_VALOR.includes(src[fim]) && src[fim] !== '\n') fim++
      const alvo = src.slice(k, fim).split('?')[0].split('#')[0]
      // Interpolação (`${...}`) vira um segmento dinâmico qualquer.
      const limpo = alvo.replace(/\$\{[^}]*\}/g, 'x')
      if (limpo.startsWith('/') && !limpo.includes('$') && !existe(limpo)) {
        quebrados.push(`${limpo}  (em ${rotaDe(f, raiz)})`)
      }
      i = src.indexOf('href=', i + 'href='.length)
    }
  }
  assert.deepEqual(quebrados, [], 'links internos apontando para rota inexistente')
})
