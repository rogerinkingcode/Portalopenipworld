---
name: skill-um-componente-para-as-duas-visoes
description: O mesmo prazo lia "em 7 anos" no cliente e "em 2806 dias" no gestor — dois códigos parecidos
metadata:
  type: skill
---

O OpenIpWorld tem duas visões da mesma coisa: gestor e cliente. Sempre que um fato aparece nas duas,
ele tem de sair de **um componente só**.

**O incidente:** o mesmo prazo, a mesma data. O cliente lia **"em 7 anos"**; o gestor, **"em 2806
dias"**. Eram dois componentes escritos em momentos diferentes, iguais na origem. Divergiram no
texto do contador, no lado da pílula de firmeza e na cor da divisória.

Quem opera vê as duas telas e passa a **duvidar de qual está certa**. É pior que um erro: é erosão
de confiança na ferramenta.

**Hoje:** `CardPrazo` (pequeno, da ficha) e `CardPrazoLargo` (da tela de Prazos) servem as duas
visões. A **única** diferença legítima é a prop `mostrarInterno` — e ela existe porque o
`prazo_interno_em` nem atravessa a projeção do cliente.

⚠️ O mesmo vale para tabela de rótulos: `TIPO_ROTULO` duplicada em duas telas errou **igual nas
duas** — trazia chaves que não existem no enum e faltava as que existem. O efeito é mudo: cai no
`?? tipo` e mostra `comprovante_gru` cru ao cliente. Rótulo de enum mora em `src/lib/rotulos.ts`.

⛔ Mas quando o pedido for "iguale A a B", troque o **markup da tela**, não o componente
compartilhado — `Cartao` serve 7 telas e 6 delas ninguém mandou mexer.
