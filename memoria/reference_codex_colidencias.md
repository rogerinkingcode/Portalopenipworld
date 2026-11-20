---
name: reference-codex-colidencias
description: As skills do Codex estão NO REPO (referencias/) — especificação de domínio, não backend pronto
metadata:
  type: reference
---

Em `referencias/codex-colidencias/` estão, versionados no repositório: duas `SKILL.md`, o
`case.schema.json` v1.1, cinco scripts Python de referência, os logos da Apex e a fonte Poppins com
a licença OFL. Conferido: zero token, zero credencial, zero dado de cliente.

**O que é:** especificação de domínio + snapshot de código. **Não é** backend pronto — a própria
skill diz isso.

**O que muda no Wallet:**

- **Comparador v1.2.0**: `combinado = 0,55·nominativo + 0,20·fonético + 0,10·classe +
  0,15·especificação`; a **especificação tem veto** sobre o combinado; 44 pares de afinidade de
  classe; `same_owner` só por igualdade **exata** da chave normalizada; coalescência `c.r.i.a.r.` →
  `CRIAR`.
- ⚠️ **P0–P3 NÃO são alto/médio/baixo** — são **fila de recuperação**. `risk_level` é campo separado.
  O **score nunca é publicado** ao cliente.
- **Regra de contagem** (§9.1): dias corridos, 1º dia = **primeiro dia útil seguinte à publicação**,
  vencimento em dia sem expediente prorroga, recesso forense **não** suspende. Explica os 62 dias
  medidos onde a lei diz 60.
- **PAN** conta da concessão/certificado, **nunca** do deferimento. Retificação não reabre prazo.
- **12 testes de regressão** (§14) entram **antes** da primeira linha do 1B.
- O **renderer do parecer** é Python/ReportLab e fica **ao lado**, como serviço. O Wallet emite o
  `case` v1.1 — não se reescreve o renderer em TypeScript.

⛔ Não transportar os atalhos do wrapper (`KeepTogether._content`, remover o último `Paragraph` por
posição).
