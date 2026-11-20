/**
 * Copia para o frontend os arquivos que os dois lados compartilham.
 *
 * A FONTE é o backend (`backend/src/...`): é ele que roda no Docker, e o contêiner só enxerga a
 * pasta dele. O frontend recebe uma cópia gerada, com um cabeçalho "não edite" e o hash do
 * conteúdo copiado.
 *
 *   node scripts/sincronizar-compartilhado.mjs            copia o que mudou no backend
 *   node scripts/sincronizar-compartilhado.mjs --conferir só confere; sai com erro se divergir
 *
 * Roda sozinho antes de `npm run dev`, `npm test` e `npm run build` (ver package.json).
 *
 * ⛔ Se a cópia do frontend foi editada à mão, o script PARA com erro e não sobrescreve nada —
 *    para a edição não sumir em silêncio. Leve a mudança para o arquivo do backend.
 * ⚠️ Sem a pasta do backend ao lado (build do frontend sozinho), mantém as cópias como estão.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAIZ = join(FRONT, '..')
const BACK = join(RAIZ, 'backend')

/** Os arquivos compartilhados, pelo caminho dentro de `src/` (igual nos dois lados). */
const ARQUIVOS = [
  'contrato/tipos.ts',
  'regras/calendario.ts',
  'regras/processo.ts',
  'regras/reguas.ts',
  'projecao/cliente.ts',
]

const MARCA = '// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.'
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)

function cabecalho(origem, h) {
  return [
    MARCA,
    `// Fonte: ${origem} (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,`,
    '// que roda sozinho antes de dev, testes e build).',
    `// hash-da-fonte: ${h}`,
    '',
    '',
  ].join('\n')
}

/** Separa o cabeçalho gerado do corpo; devolve o hash gravado e o corpo. */
function ler(conteudo) {
  if (!conteudo.startsWith(MARCA)) return { hashGravado: null, corpo: conteudo }
  const m = conteudo.match(/^\/\/ hash-da-fonte: ([0-9a-f]+)\n\n/m)
  if (!m) return { hashGravado: null, corpo: conteudo }
  return { hashGravado: m[1], corpo: conteudo.slice(m.index + m[0].length) }
}

const conferir = process.argv.includes('--conferir')

if (!existsSync(join(BACK, 'src'))) {
  console.log('[compartilhado] pasta do backend não encontrada: mantendo as cópias do frontend como estão.')
  process.exit(0)
}

let erros = 0
let copiados = 0
for (const rel of ARQUIVOS) {
  const fonte = join(BACK, 'src', rel)
  const destino = join(FRONT, 'src', rel)
  const origem = relative(RAIZ, fonte).replaceAll('\\', '/')
  if (!existsSync(fonte)) {
    console.error(`[compartilhado] ✗ fonte não existe: ${origem}`)
    erros++
    continue
  }
  const corpoFonte = readFileSync(fonte, 'utf8').replaceAll('\r\n', '\n')
  const esperado = cabecalho(origem, hash(corpoFonte)) + corpoFonte

  const atual = existsSync(destino) ? readFileSync(destino, 'utf8').replaceAll('\r\n', '\n') : null
  if (atual === esperado) continue

  // A cópia foi mexida à mão? (o corpo dela não bate com o hash que o próprio script gravou)
  if (atual !== null) {
    const { hashGravado, corpo } = ler(atual)
    const editadaAMao = hashGravado === null ? corpo !== corpoFonte : hash(corpo) !== hashGravado
    if (editadaAMao) {
      console.error(
        `[compartilhado] ✗ ${relative(RAIZ, destino).replaceAll('\\', '/')} foi editado à mão.\n` +
          `  Leve a mudança para ${origem} e apague a edição do frontend (ou rode de novo depois).`,
      )
      erros++
      continue
    }
  }

  if (conferir) {
    console.error(`[compartilhado] ✗ desatualizado: ${relative(RAIZ, destino).replaceAll('\\', '/')} (rode npm run sincronizar)`)
    erros++
    continue
  }
  writeFileSync(destino, esperado)
  copiados++
  console.log(`[compartilhado] ✓ ${origem} → frontend/src/${rel}`)
}

if (erros) process.exit(1)
if (!conferir && copiados === 0) console.log('[compartilhado] tudo em dia.')
