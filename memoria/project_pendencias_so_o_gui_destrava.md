---
name: project-pendencias-so-o-gui-destrava
description: Sete pendências travam trabalho e são todas dele — a política de elegibilidade é a mais cara
metadata:
  type: project
---

O que **bloqueia** trabalho no OpenIpWorld e depende de decisão do Gui. Lista viva em
`PERGUNTAS-ABERTAS.md`; o resumo do que trava está no `PROJECT_CONTEXT.md` §4.

| o quê | por que trava |
|---|---|
| ⭐ **política única de elegibilidade** (1.540 ativos → 429 na varredura) | hoje são **duas** políticas: `includedInWeeklyScreening` + `strongTerminal` no normalizador, e um filtro extra na carga. O Wallet precisa de **uma**, escrita |
| **confirmar a regra de contagem** como `legal` | hoje toda régua nasce `praticado` ou `estimado` e a tela avisa em amarelo. Com a confirmação, 11 réguas viram `legal` |
| **régua de anuidade e prorrogação** | a base normalizada traz `renewalStart/End`; falta a regra para os que vieram sem data |
| **de-para de código de despacho → texto** (o que o APOL fazia) | sem ele o cliente lê `IPAS158` em vez de "concessão de registro" |
| **o que o Webseek faz** que o Wallet não faz | é metade do custo que o projeto substitui |
| **base-mestra normalizada** (1.540 linhas, 10,16 MB) | está na máquina dele, fora do repo. É a 1ª carga real e o teste do importador |
| endpoints da base | são do Breno — as 8 perguntas do `ONBOARDING-BRENO.md` |

⚠️ Nenhuma delas impede o front de rodar com dado de exemplo. Todas impedem a **primeira carga
real**.

Ver [[project_apexwallet_estado]] e [[feedback_o_oraculo_e_o_gui]].
