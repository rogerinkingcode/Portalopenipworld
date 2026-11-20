import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carregarExemplo } from './exemplo.ts'
import { montarAmeacas } from './ameacas.ts'
import { diasAte, isoBandeira, materiaDe, textoDias, urgenciaDe } from './visao.ts'
import { rotuloJurisdicao } from './rotulos.ts'
import { COORDENADA } from './visao.ts'
import { projetarParaCliente } from '../projecao/cliente.ts'

// ───────────────────────────────────────────────────────────────────────────
// O PORTÃO — a regra que mais importa nesta tela
// ───────────────────────────────────────────────────────────────────────────

test('candidato SEM parecer nunca vira ameaça', () => {
  const p = carregarExemplo()
  const pendentes = (p.colidencias ?? []).filter((c) => !c.parecer)
  assert.ok(pendentes.length > 0, 'o exemplo precisa ter pendentes para o teste valer')

  const vistas = montarAmeacas(p)
  for (const pend of pendentes) {
    assert.ok(
      !vistas.some((v) => v.colidencia_id === pend.colidencia_id),
      `${pend.caso_id} não tem parecer e não pode aparecer como ameaça`,
    )
  }
})

test('toda ameaça exibida tem risco e data de parecer preenchidos', () => {
  // Se o portão vaza, o rodapé sai com "parecer de —". Este teste pega isso.
  for (const a of montarAmeacas(carregarExemplo())) {
    assert.ok(['alto', 'medio', 'baixo'].includes(a.risco), `${a.caso_id} sem risco`)
    assert.match(a.parecer_em, /^\d{4}-\d{2}-\d{2}$/, `${a.caso_id} sem data de parecer`)
  }
})

test('a contagem do card bate com a lista', () => {
  const p = carregarExemplo()
  const aprovadas = (p.colidencias ?? []).filter((c) => c.parecer?.decisao === 'enviar')
  assert.equal(montarAmeacas(p).length, aprovadas.length)
})

test('a projeção do cliente e o pacote concordam sobre o que é ameaça', () => {
  const p = carregarExemplo()
  for (const pessoa of p.pessoas) {
    const temVinculo = p.vinculos.some((v) => v.pessoa_id === pessoa.pessoa_id && v.publicavel)
    if (!temVinculo) continue
    const vc = projetarParaCliente(p, pessoa.pessoa_id)
    for (const a of montarAmeacas(vc)) {
      const orig = (p.colidencias ?? []).find((c) => c.colidencia_id === a.colidencia_id)
      assert.equal(orig?.parecer?.decisao, 'enviar', `${a.caso_id} chegou ao cliente sem parecer`)
    }
  }
})

test('score cru nunca acompanha a vista da ameaça', () => {
  const s = JSON.stringify(montarAmeacas(carregarExemplo()))
  for (const proibido of ['scores', 'combinado', 'nominativo', 'tier', 'triagem', '94.12', '87.66']) {
    assert.ok(!s.includes(proibido), `${proibido} não pode sair`)
  }
})

// ───────────────────────────────────────────────────────────────────────────
// LEITURA — o que a tela mostra a partir do dado
// ───────────────────────────────────────────────────────────────────────────

test('dias vira texto legível, e prazo longo não vira número gigante', () => {
  assert.equal(textoDias(0), 'Vence hoje')
  assert.equal(textoDias(1), 'Vence amanhã')
  assert.equal(textoDias(12), '12 dias')
  assert.equal(textoDias(-3), 'Venceu há 3 dias')
  // 2807 dias é a prorrogação decenal. Ler "2807 dias" não diz nada a ninguém.
  assert.equal(textoDias(2807), 'Em 7 anos')
  assert.equal(textoDias(400), 'Em 1 ano')
  assert.equal(textoDias(200), '200 dias')
})

test('urgência é relógio, e a faixa de 10 dias é a antecedência da casa', () => {
  assert.equal(urgenciaDe(-1), 'vencido')
  assert.equal(urgenciaDe(0), 'urgente')
  assert.equal(urgenciaDe(10), 'urgente')
  assert.equal(urgenciaDe(11), 'atencao')
  assert.equal(urgenciaDe(30), 'atencao')
  assert.equal(urgenciaDe(31), 'tranquilo')
})

test('diasAte não erra por fuso ao atravessar o horário de verão', () => {
  assert.equal(diasAte('2026-09-07', '2026-09-06'), 1)
  assert.equal(diasAte('2026-11-01', '2026-10-01'), 31)
  assert.equal(diasAte('2027-01-01', '2026-12-31'), 1)
})

test('espécie do contrato vira a matéria que a casa fala', () => {
  assert.equal(materiaDe('marca'), 'marca')
  assert.equal(materiaDe('patente_invencao'), 'patente')
  assert.equal(materiaDe('certificado_adicao'), 'patente')
  assert.equal(materiaDe('modelo_utilidade'), 'modelo')
  assert.equal(materiaDe('desenho_industrial'), 'desenho')
})

test('marca regional e registro internacional não recebem bandeira de país', () => {
  assert.equal(isoBandeira('BR'), 'br')
  assert.equal(isoBandeira('EM'), 'eu', 'EUIPO usa a bandeira da União')
  assert.equal(isoBandeira('WO'), null, 'Madri/PCT não é país')
  assert.equal(isoBandeira('ND'), null)
})

test('toda jurisdição do exemplo tem nome e posição no mapa', () => {
  const p = carregarExemplo()
  for (const j of new Set(p.ativos.map((a) => a.jurisdicao))) {
    const r = rotuloJurisdicao(j)
    assert.notEqual(r, j, `${j} aparece como sigla crua na tela`)
    if (j !== 'WO' && j !== 'ND') {
      assert.ok(COORDENADA[j], `${j} não tem coordenada e sumiria do mapa`)
    }
  }
})
