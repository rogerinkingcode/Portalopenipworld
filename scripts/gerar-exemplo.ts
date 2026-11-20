/**
 * Gera `dados-exemplo/portfolio.exemplo.json` A PARTIR DO CÓDIGO.
 *
 * ⚠️ O arquivo NÃO é escrito à mão. Já foi, e o validador do contrato pegou o erro: os
 * identificadores "legíveis" que inventei (`01J9EXEMPLO…`) não são ULID — as letras I, L,
 * O e U não existem no alfabeto Crockford. Gerando do código, o exemplo e o contrato não
 * podem divergir: se o contrato muda, isto quebra na hora de gerar.
 *
 * Rodar:  npx tsx scripts/gerar-exemplo.ts
 */

import { writeFileSync } from 'node:fs'
import { carregarExemplo } from '../src/lib/exemplo.ts'
import { zPacote } from '../src/contrato/tipos.ts'
import { auditarProjecao, projetarParaCliente } from '../src/projecao/cliente.ts'

const pacote = carregarExemplo()

// 1) O pacote precisa valer contra o contrato — é o mesmo portão do importador.
const r = zPacote.safeParse(pacote)
if (!r.success) {
  console.error('❌ o exemplo não passa no contrato:')
  for (const i of r.error.issues.slice(0, 10)) {
    console.error(`   ${i.path.join('.')} — ${i.message}`)
  }
  process.exit(1)
}

// 2) Toda projeção de cliente precisa passar na auditoria de vazamento. Se um campo
//    interno escapasse, o exemplo publicado no repositório carregaria o defeito junto.
let portais = 0
for (const p of pacote.pessoas) {
  if (!pacote.vinculos.some((v) => v.pessoa_id === p.pessoa_id && v.publicavel)) continue
  try {
    auditarProjecao(projetarParaCliente(pacote, p.pessoa_id))
    portais += 1
  } catch (e) {
    console.error(`❌ vazamento na projeção de ${p.nome}: ${(e as Error).message}`)
    process.exit(1)
  }
}

writeFileSync(
  new URL('../dados-exemplo/portfolio.exemplo.json', import.meta.url),
  JSON.stringify(pacote, null, 2) + '\n',
  'utf8',
)

const conta = (o: object[]) => String(o.length).padStart(3)
console.log('✅ dados-exemplo/portfolio.exemplo.json gerado')
console.log(`   ${conta(pacote.pessoas)} pessoas`)
console.log(`   ${conta(pacote.ativos)} ativos`)
console.log(`   ${conta(pacote.vinculos)} vínculos`)
console.log(`   ${conta(pacote.eventos)} eventos`)
console.log(`   ${conta(pacote.prazos)} prazos`)
console.log(`   ${conta(pacote.documentos)} documentos`)
console.log(`   ${conta(pacote.servicos)} serviços`)
console.log(`   ${conta(pacote.colidencias ?? [])} colidências`)
console.log(`   ${String(portais).padStart(3)} portais de cliente, todos auditados`)
