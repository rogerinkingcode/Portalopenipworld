---
name: project-tres-fontes-de-dado
description: A carteira vem da BASE do INPI. A revista traz só o que MUDOU na semana — correção do Gui
metadata:
  type: project
---

Correção do Gui em 06/09/2026, literal: *"O portfólio no Brasil não está na revista, está no INPI,
que inicialmente subimos manual e depois da API vai ser automático por procurador. As revistas
trazem despachos novos dos processos monitorados e colidências com novas publicações de terceiros."*

**Três fontes, três papéis — e não se misturam:**

| fonte | o que dá | quando |
|---|---|---|
| **Base do INPI** (consulta ao registro) | **a carteira**: todo processo em que a Apex é procuradora | Sprint 1 por planilha · Sprint 3 automático por procurador |
| **RPI semanal** (XML) | **o que mudou**: despachos dos monitorados → eventos e prazos; publicações de terceiros → candidatas de colidência | 1B manual · Sprint 3 automático |
| **Planilha / certificado / declarado** | o que nenhuma base cobre (exterior sem API, desenho industrial) | permanente |

⚠️ O campo `procurador` da revista serve só como **alerta de cadastro** — "apareceu em nosso nome e
não está na carteira". Nunca como origem do portfólio.

⛔ **WIPO/Madri proíbem consulta automatizada por escrito.** CNIPA responde 412. USPTO e EUIPO têm
API e **não estão integradas**. É por isso que [[project_aba_inteligencia_nasce_vazia]].
