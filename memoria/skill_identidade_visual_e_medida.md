---
name: skill-identidade-visual-e-medida
description: O degradê TEM NOME no manual (p.21, C+D, "+ usado"); a fonte de número é DM Sans; vidro só no escuro
metadata:
  type: skill
---

A identidade da Apex não se escolhe por gosto — **mede-se no manual de marca**. Quando houver
dúvida, a resposta está lá, não na preferência de quem implementa.

| | de onde veio |
|---|---|
| paleta | manual p. 20 — cinco cores, A a E. Verde, vermelho e âmbar **não** estão no manual: são semântica de produto e vivem só em etiqueta |
| o azul em degradê | manual p. 21, bloco `GRADIENTE / DEGRADÊ`, combinação **C+D** marcada **"+ usado"** (`#1A6581 → #000000`). A barra lateral do BI e a do Papi são execuções dele |
| fontes | manual p. 30 + a regra da casa: **Poppins** título e etiqueta · **Raleway** corpo · **DM Sans** todo número, com `tabular-nums` |
| vidro | **só no tema escuro**. No claro o cartão é sólido, com sombra tingida de petrol — ele rejeitou vidro no claro **duas vezes** |

⛔ **Nenhum monospace.** JetBrains Mono é a fonte que ele rejeita em número grande — e o CLAUDE.md do
BI dizia que a fonte de número era JetBrains, o que estava **errado** e foi corrigido.
⛔ **Nenhuma fonte de sistema como família primária.** "Fonte de sistema" na boca dele **não** é Arial.

⚠️ `--brd` é a borda **externa** do cartão; `--linha` é a divisória **interna**. Usar a externa por
dentro polui a tela com o que ele chama de **"linha em caixa"** — foi pedido explícito tirar.
⚠️ `var(--nome)` inexistente falha em **silêncio** (58 regras mortas no BI). Confira que existe e
escreva sempre com literal de reserva: `var(--red,#C0392B)`.
