---
name: skill-numero-que-mente-no-prazo
description: `dias: 0` não é "vence hoje", e a janela extraordinária NÃO é ajuste de feriado — ela custa dinheiro
metadata:
  type: skill
---

Dois números que mentiam no cartão de prazo, os dois corrigidos em 07/09/2026 e travados em teste.

**1. `0 dias · art. 84 LPI` ao lado de uma data de 2027.** Anuidade e prorrogação decenal têm
`dias: 0` no catálogo porque **não são regras de contagem** — a data sai do ciclo do processo
(depósito, concessão), não de um prazo que corre a partir de uma publicação. "0 dias" lê-se como
vencido hoje. Agora a tela diz `Data fixa · … · não é prazo em dias`.

**2. "prorrogado para 20/03/2027 por não haver expediente"** para uma anuidade que vence em
21/09/2026. Seis meses não são feriado: são a **janela extraordinária do art. 84 §2º, COM
retribuição adicional**. O cliente contaria com meio ano de graça achando que é de graça.
`vence_extraordinario_em` deriva de `regua.prazo_extraordinario`, que carrega `fundamento` e
`taxa_adicional` — a tela usa o que a régua diz, nunca uma explicação inventada.

**A regra geral:** número que só faz sentido dentro de um pressuposto tem de **checar o pressuposto
antes de aparecer**. E explicação de data tem de vir do dado, não da memória de quem codou.

⚠️ Corolário: a pílula de **firmeza** aparece **sempre**, inclusive quando é `legal`. Se só
aparecesse no caso ruim, a ausência viraria o código de "está tudo bem" — e ausência não se
distingue de esquecimento.
