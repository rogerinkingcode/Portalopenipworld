---
name: feedback-autorizacao-e-explicita
description: "Ficou bom" valida o visual e NÃO autoriza commit nem deploy — precisa da frase
metadata:
  type: feedback
---

⛔ **"Ficou bom" valida o visual. Não autoriza nada.**

Commit, deploy e qualquer coisa que saia da máquina exigem a frase explícita: *"pode commitar"*,
*"pode subir"*, *"aprovado"*. O primeiro commit do OpenIpWorld esperou dias por isso, com o MVP
inteiro pronto em `localhost`.

**Por quê:** este é o único projeto da casa com superfície externa — extranet de cliente. O que sai
daqui pode ser visto por quem não é da Apex. O gatilho fica com uma pessoa; a detecção é automática.

Corolário que ele também disse, literal: *"cuidado para na correção não ficar desconfigurando outros
pontos e elementos do painel que não foram solicitados edição."* O escopo pedido é o entregue — nem
menos, nem mais. A prova de que não se desconfigurou o resto está em [[skill_retrato_antes_e_depois]].

**Par obrigatório:** [[feedback_o_oraculo_e_o_gui]].
