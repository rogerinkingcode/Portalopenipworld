# OpenIpWorld — PROJECT_CONTEXT

**Estado vivo do projeto.** O `PLANO.md` diz para onde vamos e por quê; este arquivo diz onde
estamos hoje, o que está decidido, o que trava, e o que vem em seguida. Quando divergirem, **este
ganha** — e o `PLANO.md` é corrigido.

> Atualizado em **07/09/2026**, no primeiro commit.

---

## 1. Onde estamos

**Sprint 1, entrega 1A + redesenho: pronto e validado no navegador.** Este commit é o ponto em que
o projeto sai da máquina do Gui e vira repositório.

| | |
|---|---|
| testes de regressão | **106 passando**, 0 falhando |
| erros de tipo | 0 (`tsc --noEmit`) |
| lint | 0 erro, 0 aviso (`eslint src`) |
| build de produção | ✅ **26 rotas** |
| erros de console no Chrome | **0**, em 23 telas percorridas |
| vulnerabilidades | 0 (`npm audit`) |
| dado real no repositório | **nenhum** — tudo em `dados-exemplo/` é fictício |

### As duas visões

| | rota | quem vê | o que tem |
|---|---|---|---|
| **Gestor** | `/` | Gui e Márcio | a carteira inteira, de todos os clientes; a fila de colidências; o prazo interno |
| **Cliente** | `/portal` | titular, cliente ou parceiro | só os ativos dele, pela projeção auditada |

A visão do cliente lê **exclusivamente** de `projetarParaCliente()`, e a projeção passa por
`auditarProjecao()`, que **aborta** se um campo interno escapar. Trocar a escolha de demonstração
por um login autenticado não muda nenhuma tela — muda só de onde vem o `pessoa_id`.

### As 26 rotas

```
gestor   /                     painel: mapa, distribuições, prazos próximos, ameaças
         /ativos               lista agrupada por matéria, com filtro, busca e bandeira
         /ativos/[id]          ficha em sub-abas: geral · colidências · documentos · contratações
         /ameacas              fila de colidências · /ameacas/[id] o caso
         /prazos               lista em cartão + calendário
         /investimentos        custo do portfólio, com recorte por cliente
         /documentos           acervo, com o filtro "só os que o cliente NÃO vê"
         /clientes             a carteira por titular · /clientes/[id] o portfólio dele
         /pessoas              cadastro · /conciliacao  titular↔cliente↔parceiro↔agente
         /comunicados          BETA — caixa de saída (só gestor)
         /inteligencia         BETA — inteligência de mercado, com recorte por cliente
         /importar /exportar   entrada e saída no formato do contrato

cliente  /portal               casa: atenção, mapa, calendário, distribuições, ameaças
         /portal/ativos        · /portal/ativos/[id] a mesma ficha, projetada
         /portal/prazos  /portal/ameacas  /portal/ameacas/[id]
         /portal/investimentos /portal/documentos  /portal/historico
         /portal/inteligencia  BETA
```

### O que funciona hoje

Importar planilha com recusa explícita por linha · lista de ativos com filtro, busca e bandeira ·
ficha do ativo em sub-abas · **ameaças detectadas** com o choque lado a lado, as dimensões da
aproximação em palavras e o prazo com a régua visível · o processo do terceiro abrindo **dentro** do
sistema · conciliação com trilha · prazos em cartão e em calendário, com o estado `a_abrir` separado
de `aberto` · mapa das jurisdições com as duas camadas (onde há ativo × onde há leitura automática)
· **investimentos** por ativo, país, matéria e natureza da despesa · documentos por referência ·
histórico · exportação com auditoria · tema claro e escuro · três abas em beta.

---

## 2. O que este commit contém e o que **não** contém

**Contém:** o front do Sprint 1 inteiro, o contrato de dados executável (zod), o catálogo de réguas de prazo (14 em
`CATALOGO` + 3 em `JANELAS` — janela abre e permanece, prazo vence e some), o extrator de número de processo, o calendário do INPI, a projeção auditada, o
repositório em IndexedDB atrás de uma interface, 106 testes, a documentação inteira e as referências
de domínio do Codex.

**Não contém, por decisão:** nenhuma chave, nenhum `.env`, nenhum dado real de cliente, nenhuma
planilha ou XML de RPI baixado, nenhum PDF de parecer real. O `.gitignore` nasceu **antes** do
primeiro commit — e foi auditado por varredura automática antes deste push.

**Não contém, por ainda não existir:** a entrega **1B** (importar a RPI → eventos, prazos e
candidatas de colidência, com portão humano) e a **1C** (histórico de serviços do Ploomes). O
`ApiRepository` é um esqueleto: a interface existe, a implementação é do Sprint 3.

---

## 3. Decisões travadas — não reabrir sem motivo novo

| # | decisão | por quê |
|---|---|---|
| D1 | **Repositório separado do BI** | o BI é 100% interno, servido só na Tailscale, HTML num arquivo só. O OpenIpWorld tem parte externa com login. Modelo de segurança, stack e ciclo de vida diferentes. **O BI não é tocado por este projeto.** |
| D2 | **A tela nunca fala com o armazenamento** | só com `PortfolioRepository`. Quando a API existir, troca-se a implementação e nenhum componente muda |
| D3 | **`ativo_id` é ULID opaco**, nunca derivado do número | 17,86% dos ativos vivos não têm número; e número muda (pedido vira registro) |
| D4 | **Papel é do vínculo, não da pessoa** | titular ≠ cliente em 16,05% dos nacionais e 97,51% dos estrangeiros; 69,6% dos ativos apontam para um agente |
| D5 | **Prazo carrega régua + firmeza** | a casa não tinha *nenhum* prazo legal documentado. A tela mostra a aritmética inteira e avisa quando a régua não foi confirmada |
| D6 | **O cliente nunca vê score de colidência** | o número ordena a fila de recuperação; quem decide é a pessoa que assina o parecer |
| D7 | **Documento por referência, nunca por link direto** | a URL de anexo do CRM responde HTTP 206 com o conteúdo **sem credencial nenhuma** |
| D8 | **A carteira vem da BASE do INPI, não da revista** | correção do Gui em 06/09. A revista lista só quem teve despacho na semana |
| D9 | **Um componente por fato, usado pelas duas visões** | o mesmo prazo lia "em 7 anos" no cliente e "em 2806 dias" no gestor |
| D10 | **Identidade visual é medida, não escolhida** | o degradê tem nome no manual (p. 21, C+D); a fonte de número é DM Sans; vidro só no escuro |
| D11 | **Comunicados é só do gestor** | o cliente vê o *efeito* do aviso, não o registro do envio. Expor a caixa de saída criaria a pergunta "por que não me avisaram daquele outro?" sobre casos que a casa decidiu, com razão, não comunicar |
| D12 | **O Wallet nunca envia** | grava um `Comunicado` na caixa de saída; quem despacha é o motor único do BI/n8n, que é onde já vivem o token e a lista de opt-in |

---

## 4. O que trava, e de quem é

Detalhe e procedência em `PERGUNTAS-ABERTAS.md`. Resumo do que **bloqueia** trabalho:

| o quê | de quem | por que trava |
|---|---|---|
| **política única de elegibilidade** (1.540 ativos → 429 na varredura semanal) | **Gui** | hoje são duas políticas: `includedInWeeklyScreening` + `strongTerminal` no normalizador, e um filtro extra na carga. O Wallet precisa de **uma**, escrita |
| **confirmar o `dies a quo`** (1º dia útil seguinte, corridos, prorroga em dia sem expediente) | **Gui** | ⚠️ o que falta **não** é a contagem de dias: 6 réguas já são `legal`, porque o número de dias vem de artigo explícito da LPI. O que aguarda confirmação é **quando a contagem começa** — e é isso que não produz 62 dias — a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe** medidos em 19/19 oposições onde a lei diz 60 |
| **régua de anuidade e prorrogação** | **Gui** | a base normalizada traz `renewalStart/End` por processo; falta a regra para os que vieram sem data |
| **de-para de código de despacho → texto** (o que o APOL fazia) | **Gui** | sem ele, o cliente lê `IPAS158` em vez de "concessão de registro" |
| **o que o Webseek faz** que o Wallet ainda não faz | **Gui** | é metade do custo que este projeto substitui; sem a lista, não dá para declarar pronto |
| **base-mestra normalizada** (`Base_Processual_Apex_Normalizada.json`, 1.540 linhas, 10,16 MB) | **Gui** | está na máquina dele, fora do repo. É a 1ª carga real e o teste do importador |
| **endpoints da base do Breno** | **Breno** | as 8 perguntas do `ONBOARDING-BRENO.md` |

⛔ **WIPO/Madri proíbem consulta automatizada por escrito.** CNIPA responde 412. USPTO e EUIPO têm
API e **não estão integradas**. É por isso que a aba de Inteligência de mercado nasce mostrando só a
leitura da própria carteira, com a lacuna nomeada — e não um mapa de concorrência estimado.

---

## 5. Como medir que uma mudança não quebrou o resto

Há um retrato automatizado das telas, com Puppeteer, usado antes e depois de toda mudança que
atravessa telas. Ele não está no repositório porque depende do caminho do Chrome na máquina; o
método está descrito em `SKILLS.md` §4, com as duas armadilhas que ele já produziu.

Resumo: capture as rotas com `screenshot` + SHA-1 do texto de `.conteudo main` (não do `body` — a
barra lateral contamina tudo), e compare por pixel **mascarando os 250 px da esquerda**. Se uma tela
que ninguém tocou acusar diferença, confira duas coisas antes de acreditar: o arquivo foi modificado
depois da linha de base? o texto é estável em três rodadas? Se **não** e **sim**, é a transição de
largura da barra lateral aparecendo na foto.

Na sessão de 06–07/09, esse método provou que **12 de 19 telas ficaram idênticas em 0,00%** enquanto
5 mudavam — e as 5 eram exatamente as pedidas.

---

## 6. O que vem a seguir, na ordem

1. **1B — a RPI.** Upload de `RM####.zip` / `P####.zip` → despachos dos monitorados viram eventos
   (idempotentes, `evento_id` por conteúdo) e prazos por régua; publicações de terceiros viram
   candidatas, pelo comparador v1.2.0 portado para TypeScript, com os **12 testes de regressão** da
   skill do Codex escritos **antes** da primeira linha. Termina na **lista de revisão** — a análise
   jurídica é etapa humana e o PDF só sai com aprovação registrada.
2. **1C — o histórico do Ploomes.** Serviço ↔ ativo é N:N; o número costuma estar no **título** do
   card (3.322 casos) mais do que no campo (1.692). `papel_na_conta` decide o que soma.
3. **Fechar as três abas beta**, na ordem em que houver fonte: Documentos já lê o acervo;
   Comunicados espera o contrato de envio com o BI; Inteligência espera USPTO/EUIPO.
4. **Sprint 3 — o Breno.** Base própria, consulta ao INPI por procurador, fontes internacionais.
   O front sobe para servidor novo trocando só a implementação do repositório.

---

## 7. Quem faz o quê

| quem | o quê |
|---|---|
| **Gui** | o oráculo: o que ele confirma vira a regra. Opera o Sprint 1 manualmente, decide as pendências do §4 |
| **Márcio** | opera junto no Sprint 1 |
| **Breno** | Sprint 3: a base, a consulta ao INPI, as fontes internacionais. Assume o front depois |
| **Claude Code** | constrói o front do Sprint 1 e mantém a documentação em dia |

⛔ **Autorização é explícita.** "Ficou bom" valida o visual; **não** autoriza deploy nem commit. O
commit inicial deste repositório saiu do "pode commitar" literal, em 07/09/2026.
