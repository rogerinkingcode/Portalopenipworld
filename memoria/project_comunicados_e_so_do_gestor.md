---
name: project-comunicados-e-so-do-gestor
description: O cliente vê o EFEITO do comunicado, não o registro do envio — e o Wallet nunca envia
metadata:
  type: project
---

Decisão do Gui, literal: *"O cliente não vai precisar ter aba de comunicados, eu acho, pois esse
controle é nosso."*

**Por quê:** o cliente vê o **efeito** do comunicado — a ameaça no portal, o prazo na lista. Expor a
caixa de saída criaria a pergunta *"por que vocês não me avisaram daquele outro?"* sobre casos que a
casa decidiu, com razão, **não** comunicar.

⛔ **O Wallet NUNCA envia.** Ele grava um `Comunicado` numa caixa de saída e o **motor único** — no
BI/n8n — despacha. O painel nunca vê o token do WhatsApp nem do e-mail. Dois motores de envio
significam duas listas de opt-in, e a segunda sempre atrasa.

⛔ **Nada sai sem opt-in do canal.** Aviso sobre serviço contratado é execução de contrato;
marketing exige consentimento específico, não pré-marcado — são **flags separadas**.

Contexto do WhatsApp (decidido em 06/09): 1 BM · 1 WABA · **3 números por finalidade** —
① Guilherme·Apex IP (CSAT/NPS) · ② Apex Propriedade Intelectual (pushes do portfólio, **push-only**)
· ③ Assistente Apex (SDR, **assistente declarado**). O registro é frente do BI, não deste projeto.
