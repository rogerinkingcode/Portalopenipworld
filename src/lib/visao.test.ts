import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prazoATratar, processoEncerrado } from './visao.ts'

const HOJE = '2026-11-18'

test('prazo a tratar: em aberto ou vencido; a prorrogação que só abre no futuro e o cumprido ficam de fora', () => {
  assert.equal(prazoATratar({ vence_em: '2026-12-01' }, HOJE), true, 'correndo')
  assert.equal(prazoATratar({ vence_em: '2026-11-16' }, HOJE), true, 'vencido')
  assert.equal(prazoATratar({ abre_em: '2030-06-02', vence_em: '2031-06-02' }, HOJE), false, 'ainda não abriu')
  assert.equal(prazoATratar({ abre_em: '2026-01-01', vence_em: '2026-12-01' }, HOJE), true, 'janela já aberta')
  assert.equal(prazoATratar({ vence_em: '2026-12-01', cumprido: { em: '2026-11-10' } }, HOJE), false, 'cumprido')
})

test('processo encerrado pela situação, como o motor de prazos lê', () => {
  for (const s of [
    'Pedido definitivamente arquivado',
    'Registro de marca extinto',
    'Pedido de registro de marca indeferido (mantido em grau de recurso)',
    'Último despacho: Arquivamento definitivo - Artigo 33 da Lei da Propriedade Industrial',
    'Pedido considerado inexistente',
  ])
    assert.equal(processoEncerrado(s), true, s)
  for (const s of [
    'Registro de marca em vigor',
    'REGISTRO',
    'PEDIDO',
    // recurso ainda cabe: não está encerrado
    'Aguardando apresentação ou exame de recurso contra o indeferimento',
    'Último despacho: Concessão de Patente ou Certificado de Adição de Invenção',
  ])
    assert.equal(processoEncerrado(s), false, s)
})
