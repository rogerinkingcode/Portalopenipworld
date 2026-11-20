---
name: skill-retrato-antes-e-depois
description: Diff por pixel prova que não se quebrou o resto — mas a barra lateral em transição vira falso achado
metadata:
  type: skill
---

Antes de uma mudança que atravessa telas, tire um **retrato** das rotas com Puppeteer (captura +
SHA-1 do texto) e compare depois. Foi assim que se provou, em 07/09/2026, que **12 de 19 telas
ficaram idênticas em 0,00%** enquanto 5 mudavam — e as 5 eram exatamente as pedidas.

**Duas armadilhas, as duas medidas:**

1. **Hasheie `.conteudo main`, não `document.body`.** Se a mudança pedida tocar a barra lateral (uma
   aba nova, por exemplo), o hash do `body` muda em **todas** as telas e o diff não prova nada.
2. **A barra lateral tem `transition: width .18s` e a captura pega o meio dela.** Sai com 204 px ou
   220 px em vez de 232, e o diff acusa deslocamento numa tela que ninguém tocou.

**Antes de acreditar num achado do diff, faça duas perguntas:** o arquivo foi modificado depois da
linha de base? o texto é estável em três rodadas seguidas? Se **não** e **sim**, é artefato de foto.

Compare **mascarando os 250 px da esquerda** e procure o **melhor deslocamento horizontal**: se a
tela bate com `dx = 27`, o conteúdo é idêntico e só a geometria da captura mudou.

Isto é o que sustenta [[feedback_autorizacao_e_explicita]] na prática: dá para afirmar, com medição,
que só mudou o que foi pedido.
