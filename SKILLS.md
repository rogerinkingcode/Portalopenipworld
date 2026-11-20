# OpenIpWorld — SKILLS

Lições que custaram tempo, ou que quase custaram um erro na frente do cliente. Cada uma vem com o
**incidente** que a gerou, porque regra sem incidente vira folclore e a próxima pessoa ignora.

Ordem: o que **mente para quem lê** primeiro; depois o que **quebra**; depois o que **atrasa**.

---

## 1. Vazamento e mentira — o que chega errado a quem lê

### 1.1 `typeof` num campo OPCIONAL falha justamente no caso ausente

```ts
// ⛔ ERRADO — foi assim que candidato SEM parecer virou "ameaça aprovada"
if (typeof c.parecer === 'object') { /* … */ }
```

`typeof undefined` é `'undefined'`, não `'object'`. O ramo do `else` era o de "já aprovado", então
**candidata sem nenhum parecer humano apareceu como ameaça confirmada**, com o rodapé "parecer de —".
O portão humano — a coisa que o método inteiro existe para proteger — foi contornado por uma
comparação de tipo.

**Regra:** o discriminante tem de ser um campo que **sempre existe** num formato e **nunca** no
outro. Nunca a presença de um opcional.

```ts
// ✅ CERTO
if ('risco' in c) { /* é o formato analisado */ }
```

### 1.2 Projeção por lista branca: o ramo com `filter` sem `map` entrega o objeto INTEIRO

`projetarParaCliente()` monta o pacote do cliente por lista branca, campo a campo. Num dos ramos
havia `.filter(...)` sem o `.map(...)` correspondente. O objeto do prazo foi inteiro, e com ele o
**`prazo_interno_em`** — a antecedência operacional da casa (`legal − 10 dias`), que é exatamente o
que não pode chegar ao cliente. Chegou ao navegador dele.

O `auditarProjecao()` existia e passou: ele confere a lista de campos que alguém **lembrou de
proibir**, não a que **esqueceu de permitir**.

**Regra:** o **tipo** carrega a proibição, não só a auditoria em tempo de execução.

```ts
type PrazoCliente = Omit<Prazo, 'prazo_interno_em' | 'fonte'>
```

Com `Omit`, o `map` que esquecer de tirar o campo **não compila**. A auditoria vira a segunda
barreira, não a única.

### 1.2-bis O ramo que copia o objeto INTEIRO — a mesma família, segunda ocorrência

Em 07/09/2026, na conferência da véspera do commit, o mesmo defeito apareceu de novo, em outra
forma. Não era `filter` sem `map` — era `marca: a.marca` e `vigilancia: a.vigilancia`, dois campos
copiados por atalho dentro de um `map` que, no resto, montava campo a campo.

Escapavam quatro coisas: `marca.imagem.hash` (chave interna de deduplicação) e
`vigilancia.elegivel` / `motivos` / `fonte_feed` — que são a **régua de negócio da casa** (a
política 1.540 → 429) e o juízo dela sobre o ativo, em vocabulário nosso (`'terminal'`,
`'fora da política'`).

**O agravante:** o `CONTRATO-DADOS.md` §11 **prometia** que o hash saía. O documento estava certo
e o código é que mentia. Documentação descrevendo proteção que não existe é pior que proteção
nenhuma — quem lê para de conferir.

**E a auditoria não pegou**, de novo: `PROIBIDOS_NA_PROJECAO` tinha `'"sha256"'`, e o campo se
chama `hash`. Terceira vez que a mesma limitação morde.

**Regra:** num `map` de lista branca, **nenhum campo composto é copiado por referência**. Ou se
monta campo a campo, ou o tipo declara o `Omit`:

```ts
export type MarcaCliente = Omit<NonNullable<AtivoInterno['marca']>, 'imagem'> & {
  imagem?: { documento_id: string }   // ⛔ sem o hash
}
```

E o teste tem de **morder**: prove que ele falha com o código antigo antes de acreditar nele. A
fixture ganhou uma `imagem` com `hash` justamente porque, sem ela, o teste passaria trivialmente —
e teste que não pode falhar é pior que teste nenhum.

### 1.3 `dias: 0` não quer dizer "vence hoje"

Anuidade (art. 84) e prorrogação decenal (art. 133) têm `dias: 0` no catálogo porque **não são
regras de contagem** — a data sai do ciclo do processo (depósito, concessão), não de um prazo que
corre a partir de uma publicação. O cartão imprimia `0 dias · art. 84 LPI` ao lado de uma data de
2027. Lê-se como vencido hoje.

**Regra:** número que só faz sentido dentro de um pressuposto tem de checar o pressuposto antes de
aparecer. Hoje o cartão diz `Data fixa · … · não é prazo em dias`.

### 1.4 Janela extraordinária ≠ ajuste de dia sem expediente

O cartão dizia *"prorrogado para 20/03/2027 por não haver expediente"* para uma anuidade que vencia
em 21/09/2026. Seis meses não são feriado: são a **janela extraordinária do art. 84 §2º, com
retribuição adicional**. O cliente contaria com meio ano de graça achando que é de graça.

**Regra:** `vence_extraordinario_em` deriva de `regua.prazo_extraordinario`, que carrega
`fundamento` e `taxa_adicional`. A tela usa o que a régua diz — nunca uma explicação inventada.
Travado em teste (*janela extraordinária carrega o próprio fundamento*).

### 1.5 Proposta × derivado: somar os dois DOBRA o custo do portfólio

No Ploomes, uma proposta fechada costuma cobrir mais de um serviço (marca **e** patente) e depois se
subdivide em **cards derivados**, um por ativo, cada um com sua GRU. Quem entra na conta é o
**derivado** — é ele que sabe de qual ativo é o dinheiro. Somar proposta + derivados conta duas
vezes.

**Regra:** `Servico.papel_na_conta` é `'proposta' | 'derivado' | 'avulso' | 'indefinido'`.
`contabilizavel()` só soma `derivado` e `avulso`. **`indefinido` não soma** — e a tela **diz quantos
ficaram de fora**, senão o silêncio vira número errado com cara de certo.

### 1.6 Só entra valor com procedência

`valor.origem` é `'nota_fiscal' | 'cobranca' | 'declarado' | 'order_amount'`. Os três primeiros
chegam ao cliente; **`order_amount` não** — é o campo do CRM, e card espelhado repete o valor do
irmão (mede-se **R$ 145.153,79** de inflação no nacional). O gestor vê os quatro, e a tela avisa
quantos são de CRM, para quem opera saber por que o número dele e o do cliente não batem.

---

## 2. Divergência — duas telas mostrando o mesmo fato de jeitos diferentes

### 2.1 Um componente, ou elas divergem. Sempre.

O mesmo prazo, a mesma data: o cliente lia **"em 7 anos"** e o gestor **"em 2806 dias"**. Eram dois
componentes escritos em momentos diferentes, com a mesma aparência de origem. Divergiram em tudo o
que dá para divergir — texto do contador, lado da pílula de firmeza, cor da divisória.

Quem opera vê as duas telas e passa a duvidar de qual está certa. É pior do que um erro: é erosão de
confiança na ferramenta inteira.

**Regra:** `CardPrazo` (pequeno, da ficha) e `CardPrazoLargo` (da tela de Prazos) são **um
componente cada**, usados pelas duas visões. A única diferença legítima é a prop `mostrarInterno`, e
ela existe porque o campo **nem atravessa a projeção** do cliente.

### 2.2 Tabela de rótulos duplicada erra igual nas duas cópias — e em silêncio

`TIPO_ROTULO` existia em `documentos/page.tsx` e em `portal/documentos/page.tsx`. As duas cópias
traziam `proposta`, `comprovante` e `publicacao` — que **não existem** no enum `Documento.tipo` — e
não traziam `comprovante_gru`, `recibo_protocolo`, `comunicado` nem `imagem_marca`, que existem.

O efeito é mudo: a tela cai no `?? tipo` e mostra o identificador cru. O cliente lia
`comprovante_gru` como se fosse nome de categoria.

**Regra:** rótulo de enum mora em `src/lib/rotulos.ts`, **um por enum**, conferido contra o enum do
contrato — não contra a memória de quem escreveu.

### 2.3 "Iguale A a B" se resolve no markup, não no componente compartilhado

O pedido foi a ficha do gestor ficar igual à do cliente. A tentação é mudar o componente `Cartao` —
mas ele serve **7 telas**, e as outras 6 ninguém mandou mexer. Trocar o markup **dentro da ficha**
atende ao pedido sem espalhar. Regra do dono, literal: *"cuidado para na correção não ficar
desconfigurando outros pontos e elementos do painel que não foram solicitados edição."*

---

## 3. O que quebra

### 3.1 O shell come a barra invertida

Heredoc **sem aspas** no delimitador expande escapes: `\b` vira o byte `0x08`. A regex sobe
corrompida, **`node --check` passa**, e a regra simplesmente nunca casa — sem erro, sem aviso.

**Regra:** para JSX, regex ou markdown com crase, escreva um script Python com a ferramenta de
escrita e rode-o; não monte o arquivo por heredoc. Se precisar mesmo de uma barra invertida num
literal montado por shell: `String.fromCharCode(92)`.

*(Esta própria lição travou o shell quando foi escrita por heredoc. O aviso é literal.)*

### 3.2 Patch por substituição de texto quebra JSX

Remontar um arquivo grande trocando trechos falha porque as fronteiras se movem a cada troca — o JSX
fica com uma `</div>` a mais ou a menos, e o erro aponta 200 linhas adiante do estrago.

**Regra:** remontar por **faixas de linha**, conferindo as âncoras com `assert` antes de cortar:

```python
assert L[153].strip().startswith('<Cartao titulo="Prazos">'), L[153]
```

Sem o `assert`, uma linha que se moveu vira estrago silencioso. E sempre com cópia de reserva antes.

### 3.3 `.default()` no zod diverge o tipo de entrada do de saída

`z.enum([...]).default('x')` faz `z.input` ≠ `z.output`, e o tipo inferido passa a exigir o campo em
lugares onde ele é opcional. Use `.optional()` e trate a ausência na leitura.

### 3.4 ULID é Crockford base32: **não tem I, L, O nem U**

`01J9DEMO…` é inválido — o `O` não existe no alfabeto. Os IDs de exemplo usam `01J9DEM0…` (zero). O
validador do contrato pega, mas só depois de você já ter escrito quarenta deles.

### 3.5 `useSearchParams` exige limite de Suspense

Sem `<Suspense>`, o `next build` falha na geração estática da rota. O recuo é de uma linha e o
conteúdo aparece no mesmo quadro.

### 3.6 Efeito que chama `setState` viola `react-hooks/set-state-in-effect`

Para ler `localStorage` sem efeito, use `useSyncExternalStore` — está em `src/lib/armazenado.ts`. E
**derive** o que der para derivar, em vez de guardar em estado.

### 3.7 `var(--nome)` inexistente falha em SILÊNCIO

`var()` apontando para custom property que não existe invalida a declaração no valor computado, e a
propriedade cai para herdado/inicial. Sem erro. No BI da casa isso matou **58 regras**.

**Regra:** antes de usar, confirme que a variável existe, e escreva **sempre com literal de
reserva** — `var(--red,#C0392B)`. Se a variável sumir, a cor continua certa em vez de desaparecer.

---

## 4. Como medir que não se quebrou nada

### 4.1 Retrato antes/depois, com hash de conteúdo e diff por pixel

Antes de uma mudança que atravessa telas, tire um retrato das rotas com Puppeteer: captura de tela
mais SHA-1 do texto. Depois, compare. O script está descrito em `PROJECT_CONTEXT.md`.

**Duas armadilhas medidas:**

1. **Hasheie `.conteudo main`, não `document.body`.** Se a mudança pedida tocar a barra lateral —
   uma aba nova, por exemplo —, o hash do `body` muda em **todas** as telas e o diff não prova nada.
2. **A barra lateral tem `transition: width .18s` e a captura pega o meio da transição.** Ela sai com
   204 px ou 220 px em vez de 232, e o diff acusa deslocamento numa tela que ninguém tocou. Antes de
   acreditar num achado do diff, confira duas coisas: o arquivo foi modificado depois da linha de
   base? o texto é estável em três rodadas seguidas? Se **não** e **sim**, é artefato de captura.

Compare **mascarando a barra lateral** (`x >= 250`) e procure o **melhor deslocamento horizontal**:
se a tela bate com `dx = 27`, o conteúdo é idêntico e só a geometria da captura mudou.

### 4.2 Varredura por LISTA não é varredura

Ao tirar dado sensível de um repositório antes de publicá-lo, a primeira passada sempre sai de uma
**lista de valores** que alguém escreveu. Ela nunca basta, e falha de dois jeitos previsíveis:

1. **Outra grafia do mesmo valor.** A lista tinha `BR102022013321-2`; o repositório também tinha
   `BR 102022013321-2`, com o espaço só depois do `BR`.
2. **O nome usado como adjetivo.** A lista tinha o nome; o texto dizia "a **carga** X", "a
   **política** X", "o **wrapper** X".

**A segunda passada sai de um `grep` pelos radicais**, não da lista da primeira. A terceira sai de
um `grep` por **padrão** — `[0-9]{9}`, `CNPJ`, `BR ?[0-9]{2} ?[0-9]{4}` — comparando o que aparece
com a faixa fictícia que o projeto usa de propósito.

⚠️ E a prova final não é no arquivo: é em **`git diff --cached`**, o conteúdo encenado. São os
bytes que de fato iriam no commit. Antes disso, nada está provado.

No commit inicial deste repositório, esse método separou **11 bloqueios reais** — duas senhas
vivas, um CNPJ de cliente com dígito verificador válido, 21 identificadores de processo — de **29
falsos positivos**.

### 4.2 Varredura estática de link

`src/lib/links.test.ts` prova que **todo parâmetro de URL emitido é lido pela tela de destino**. Um
link `/ativos?materia=marca` que a lista não lê é um botão que não faz nada, e não existe teste de
unidade que pegue isso.

⚠️ Sem expressão regular nesse teste — veja 3.1.

---

## 5. Domínio — o que a lei e o INPI impõem

- **Contagem** (skill do Codex §9.1): dias corridos, 1º dia = **primeiro dia útil seguinte à
  publicação**, vencimento em dia sem expediente prorroga, recesso forense **não** suspende. Explica
  os 62 dias medidos onde a lei diz 60.
- **PAN** conta da **concessão/certificado**, nunca do deferimento. Retificação **não** reabre prazo.
- **Restauração é o art. 87**, não o 161 — o 161 trata de expedição de certificado. O catálogo citava
  o errado; há teste travando.
- **Caducidade tem duas naturezas** (art. 143) e a tela não pode confundi-las.
- Toda régua carrega **firmeza**: `legal` (dispositivo confirmado pela casa) · `praticado` ·
  `estimado` · `informado`. A pílula aparece **sempre**, inclusive quando é `legal` — se só
  aparecesse no caso ruim, a ausência viraria o código de "está tudo bem", e ausência não se
  distingue de esquecimento.
- **P0–P3 do comparador não são alto/médio/baixo** — são **fila de recuperação**. O `risk_level` é
  campo separado, e o **score nunca é publicado** ao cliente.
- **Prazo pode existir antes de abrir.** `abre_em` é campo próprio, e o estado `a_abrir` é diferente
  de `aberto`: a prorrogação decenal existe hoje e só se pode peticionar em 2033. Esconder o que
  ainda não abriu faz o cliente achar que não existe; mostrar como "em aberto" faz achar que corre.

---

## 6. Identidade visual — é medida, não escolhida

- O degradê **tem nome no manual**: p. 21, combinação **C+D**, marcada "+ usado".
- A fonte de número é **DM Sans** com `tabular-nums`. ⛔ Nenhum monospace — JetBrains Mono é a fonte
  que o dono **rejeita** em número grande. ⛔ Nenhuma fonte de sistema como família primária.
- **Vidro só no tema escuro.** No claro, cartão sólido com sombra tingida de petrol. Já foi rejeitado
  duas vezes; não é preferência, é decisão travada.
- `--brd` é a borda **externa** do cartão; `--linha` é a divisória **interna**. Usar a externa por
  dentro polui a tela com o que o dono chama de "linha em caixa".
- Cartões lado a lado se alinham **em baixo também**: use `flex flex-col` no cartão e evite
  `items-start` no grid, senão um cartão curto deixa buraco ao lado do vizinho comprido.

Quando houver dúvida de identidade, a resposta está no manual de marca — não no gosto de quem
implementa.
