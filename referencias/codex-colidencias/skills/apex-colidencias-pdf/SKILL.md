---
name: apex-colidencias-pdf
description: Gerar pareceres comparativos de colidências já analisadas e aprovadas, com identidade visual Apex, PT-BR ou inglês, especificações conflitantes destacadas, revisão visual e entrega interna organizada por thread.
---

# Skill 02 — Geração dos pareceres comparativos Apex

Exportação técnica para o repositório do projeto OpenIpWorld. Versão documental 1.0, de 06/09/2026. Referência visual: padrão de comparação ajustado pela Apex e quatro PDFs do lote piloto aprovados em 03/09/2026, com duas páginas cada.

## 1. Responsabilidade e materiais do pacote

Esta skill transforma um caso previamente analisado e aprovado em PDF voltado ao destinatário. Ela não faz nova classificação jurídica, não calcula prazos e não transforma uma similaridade numérica em parecer.

Materiais fornecidos junto aos dois Markdown:

- [Motor de oposição](../../referencias_codigo/pdf/generate_reports.py), snapshot integral de `work/rpi2899/pdf_reports/generate_reports.py`.
- [Motor de nulidade administrativa](../../referencias_codigo/pdf/generate_pan_reports.py), snapshot integral do mesmo diretório.
- [Schema legado](../../referencias_codigo/pdf/case.schema.json), para compreender os campos aceitos atualmente.
- [Logo nacional](../../assets/apex/apex_marcas_patentes.jpg) e [logo internacional](../../assets/apex/apex_intellectual_property.png).
- [Poppins Regular](../../assets/apex/fonts/Poppins-Regular.ttf), [Medium](../../assets/apex/fonts/Poppins-Medium.ttf), [SemiBold](../../assets/apex/fonts/Poppins-SemiBold.ttf), [Bold](../../assets/apex/fonts/Poppins-Bold.ttf) e [licença OFL](../../assets/apex/fonts/OFL.txt).

**O código é um snapshot de referência, não um backend pronto para instalação.** Motores e schema ainda têm constantes da RPI 2899; os PDFs posteriores foram produzidos por configurações específicas. A seção 10 enumera as adaptações necessárias. O pacote preserva o código real para o desenvolvedor inspecionar, sem afirmar que essas adaptações já foram implementadas.

Dependências do renderer: Python, ReportLab, Pillow e pypdf; Poppler para rasterização de QA. Os auxiliares visuais do comparador também usam NumPy. Não foi identificado lockfile do núcleo; fixar e testar versões no projeto de destino. As fontes Poppins devem ser distribuídas com a licença fornecida. Os logos Apex não são ativos genéricos para terceiros.

## 2. Condições de geração e autorização

Receber a conclusão da [skill de análise](../apex-colidencias-analise/SKILL.md), com os dados integrais e as evidências preservados fora do renderer.

No fluxo ordinário, gerar somente quando:

1. Caso classificado como alto risco e análise concluída.
2. Evento, medida, status e prazo verificados; pendências bloqueadoras resolvidas.
3. Aprovação expressa do usuário vinculada ao caso, rodada e revisão do conteúdo.
4. Arquivos, proveniência e disponibilidade/ausência das imagens, além do idioma, confirmados.

A aprovação já autoriza gerar, revisar e publicar internamente conforme as instruções da Apex; não solicitar segunda confirmação. Não aprovar casos por conta própria. A aprovação C02/C05 não inclui os demais candidatos. O caso demonstrativo TECNORED/TECNOCA foi uma exceção específica, não autorização geral para gerar PDFs de baixo risco.

Conservar `case_id`, versão/hash do conteúdo aprovado, responsável e momento da aprovação. Alteração material de risco, medida ou fundamento não pode herdar silenciosamente aprovação de outra revisão. Correções de apresentação que não alterem a conclusão podem gerar nova versão de arquivo com vínculo à aprovação original.

O PDF é de autoria institucional Apex. Não inserir nomes de ferramentas, prompts, comentários de execução, scores internos ou a expressão “realizado pelo Codex”. Isso não autoriza alegar revisão por advogado, assinatura ou credencial profissional inexistente.

## 3. Idioma e redação

- Titular brasileiro: PT-BR, cabeçalho nacional com **Marcas e Patentes**.
- Titular estrangeiro: inglês, cabeçalho internacional com **Intellectual Property**.
- Confirmar país do titular monitorado; país ausente não deve ser automaticamente tratado como estrangeiro.
- O renderer atual escolhe idioma, mas **não traduz**. Status, especificações, legendas, análises e narrativa precisam chegar revisados no idioma final.
- Não traduzir nomes oficiais das marcas, números de processo ou razão social como se fossem novos registros. Preservar escopo e qualificações ao traduzir especificações.
- Em inglês, o título da seção comparativa é exatamente **Possible Trademark Infringement**. O título principal é **TRADEMARK MONITORING REPORT** para oposição e **POST-GRANT TRADEMARK MONITORING REPORT** para PAN.
- Em português, usar **Comparativo das marcas** na seção. O título principal é **RELATÓRIO DE MONITORAMENTO MARCÁRIO** para oposição e **RELATÓRIO DE MONITORAMENTO PÓS-CONCESSÃO** para PAN.

Adotar texto técnico, objetivo e compreensível, com tom comercial moderado. Apresentar o risco como possível conflito, explicar por que a medida merece avaliação e convidar o cliente a manifestar interesse. Não prometer resultado nem chamar o terceiro de infrator comprovado apenas com base na publicação.

O modelo deve respeitar o vínculo real: em pesquisa proativa, usar “Em iniciativa proativa de verificação...” em vez de afirmar monitoramento recorrente de portfólio contratado. Campos de interlocutor e titular devem permitir direcionamento nominal, como “Matheus”, sem alterar a titularidade jurídica.

## 4. Estrutura editorial

### Página 1 — Identificação e comparação

1. Cabeçalho com logo Apex, identificação legível do parecer e filete ciano.
2. Título, subtítulo de possível conflito/classificação e destinatário.
3. Introdução curta: ocorrência identificada e motivo central da atenção.
4. Faixa com quatro indicadores: risco, medida potencial, prazo aplicável e prazo interno.
5. Comparativo com colunas iguais: direito monitorado e pedido/registro do terceiro.
6. Referência oficial junto à comparação: RPI, data, página, despacho e link.

### Página 2 — Fundamentação e encaminhamento

1. Síntese por dimensão: nominativa, fonética, conceitual, visual e mercadológica, ajustada ao caso.
2. Dois a quatro argumentos individualizados, anterioridade e situação processual.
3. Conclusão e fundamento jurídico pertinente à medida.
4. Recomendação e convite a encaminhar instruções.
5. Prazos, fontes e nota institucional compacta.

Preferir duas páginas nos casos individuais. Uma terceira página é admissível para conteúdo material, evidências ou consolidação que não caibam com legibilidade. Não apagar fundamentos, ressalvas ou fontes para forçar duas páginas. Não reduzir a fonte indiscriminadamente. Evitar páginas quase vazias e blocos repetidos.

Parecer de diferenciação/coexistência, como Evisary, é outro tipo documental; suas escolhas específicas — texto justificado, ordem do nome, assinatura ou imagens conceituais — não se tornam automaticamente regras de todos os relatórios de colidência.

## 5. Identidade visual e geometria verificadas

Os valores abaixo descrevem o perfil compacto efetivamente aplicado ao lote piloto. Não representam autorização para modificar os ativos originais da marca.

| Token | Valor |
|---|---|
| Papel | A4, 210 × 297 mm |
| Margens laterais | 16 mm |
| Largura útil | 178 mm |
| Reserva superior / inferior | 20 / 8 mm |
| Frame de conteúdo | x=16 mm, y=13 mm, largura=178 mm, altura=257 mm |
| Logo | caixa máxima 47 × 14,5 mm, proporção preservada |
| Posição do logo | x=16 mm, y=277 mm, coordenadas ReportLab com origem inferior |
| Filete de cabeçalho | y=273,8 mm, 1,5 pt |
| Linha/texto do rodapé | y=13 mm / 8,5 mm |
| Duas colunas comparativas | 89 mm cada |
| Painel de marca | 27 mm de altura; imagem até 47 × 14 mm |
| Tabela de dimensões | 34 / 33 / 111 mm |

| Cor | Uso |
|---|---|
| `#212121` | Texto e blocos escuros |
| `#00E0F6` | Filetes e detalhes cianos |
| `#1A6581` | Cabeçalhos de comparação e destaques |
| `#F3F6F7` | Fundo neutro claro |
| `#DCE5E8` | Bordas discretas |
| `#5D666A` | Texto secundário |
| `#EAF8FB` | Fundo das especificações |
| `#FFFFFF` | Fundo e texto sobre áreas escuras |

| Estilo | Tamanho / entrelinha, em pontos |
|---|---:|
| Título, Poppins SemiBold | 16,8 / 20 |
| Subtítulo | 8,5 / 11 |
| Destinatário | 9 / 12 |
| Corpo compacto | 7,95 / 10,9 |
| Corpo pequeno | 6,85 / 9,2 |
| Campos comparativos | 6,90 / 9,05 |
| Especificações | 7 / 9,55 |
| Fonte/notas | 6,20 / 8,10 |
| Seção | 11,2 / 14 |
| Cabeçalho da tabela | 8,4 / 10,3 |
| Marca nominativa | 12,5 / 15,5 |
| Legenda de imagem | 6,2 / 7,8 |
| Identificador documental | 6,6, Poppins Medium |

No lote piloto, corpo e comparativos são alinhados à esquerda. Espaçamentos, fonte e legibilidade devem ser avaliados no PDF renderizado em tamanho normal, não só pela tabela de parâmetros. Usar pesos tipográficos genuínos da família Poppins; verificar incorporação das fontes no PDF.

### 5.1 A correção essencial da tabela

Construir a comparação em **linhas compartilhadas**: cabeçalho; apresentação visual; dados processuais; especificações. Cada linha tem duas células. Assim o início dos blocos fica alinhado e as colunas mantêm proporção.

Não construir duas pilhas independentes contendo todo o conteúdo de cada marca: isso foi a causa da assimetria rejeitada pela Apex. A altura das células é a necessária para o maior conteúdo da linha; reduzir espaços supérfluos sem cortar texto. Limitar espaço de imagens e ajustar a escala preservando proporção.

O código também admite três colunas, um direito monitorado e dois pedidos de terceiro. Consolidar somente quando titular, núcleo, evento, prazos e fundamento permitirem leitura única, mantendo cada processo visível. Caso contrário, separar os relatórios.

## 6. Campos de comparação e imagens

Em cada parte: marca, processo, titular/país, depósito, prioridade quando existente, situação, apresentação, natureza, classes/edição, direitos relacionados e escopo pertinente. Distinguir pedido pendente de registro concedido. Para o terceiro, usar “pedido” em oposição e “registro” em PAN quando comprovada a concessão.

Imagens devem vir do depósito/base ou da RPI correspondente. Manter proveniência e ligação ao processo. Não inventar logotipo para marca nominativa. Se a marca não tiver imagem, apresentar seu nome tipograficamente e legenda adequada, sem sugerir que essa tipografia seja a identidade visual registrada.

Não usar automaticamente um recorte de coordenadas que funcionou em outra página. Conferir processo, margens e presença de texto vizinho. O auto-crop de fundo branco do legado pode remover traços muito claros; permitir preservação do original e sempre revisar o resultado.

### 6.1 Destaque das especificações

Armazenar a especificação integral na camada de domínio. `relevant_scope` é um excerto de apresentação, não a substituição do escopo jurídico integral. Selecionar trechos que sustentam o conflito e destacar **somente esses trechos**, com negrito e azul-petróleo sobre fundo azul-claro, nos dois lados.

No contrato legado v1.1, `collision_highlights` é obrigatório e cada trecho deve existir literalmente em `relevant_scope`, ignorando apenas caixa. Em inglês, os destaques precisam corresponder à tradução exibida, mantendo vínculo à fonte original.

```json
{
  "relevant_scope": "Comércio de luminárias; comércio de móveis; consultoria empresarial.",
  "collision_highlights": ["Comércio de luminárias"]
}
```

Código exemplificativo, adaptado da função real `highlighted_scope_markup`, para demonstrar a regra seletiva sem o fallback legado de destacar tudo:

```python
import html
import re

def scope_markup(scope: str, highlights: list[str]) -> str:
    if not scope or not highlights:
        raise ValueError("Escopo e trechos conflitantes são obrigatórios")
    if any(not h or not re.search(re.escape(h), scope, re.I) for h in highlights):
        raise ValueError("Destaque não encontrado no escopo exibido")
    pattern = re.compile("|".join(re.escape(h) for h in
                                 sorted(set(highlights), key=len, reverse=True)), re.I)
    out, cursor = [], 0
    for match in pattern.finditer(scope):
        out.append(html.escape(scope[cursor:match.start()]))
        out.append('<font color="#1A6581"><b>' + html.escape(match.group()) + '</b></font>')
        cursor = match.end()
    out.append(html.escape(scope[cursor:]))
    return "".join(out)
```

Escapar dados externos. Narrativas devem ser texto puro ou segmentos tipados; o formato ReportLab não deve aceitar marcação arbitrária de fontes ou formulários externos. Links precisam apontar para fontes verificadas.

## 7. Contrato de entrada existente e evolução

O núcleo recebe `{"cases": [...]}` ou array. O [schema incluído](../../referencias_codigo/pdf/case.schema.json) descreve **oposição**, não PAN. O contrato PAN é definido pelo `validate_case` de `generate_pan_reports.py`. Consulte os validadores de cada motor para os campos específicos. O schema é legado e fixa RPI/datas; ele não pode ser usado inalterado para todas as revistas.

| Campo real | Conteúdo |
|---|---|
| `schema_version` | `1.1`, com destaques seletivos obrigatórios |
| `case_id`, `report_date` | Identificação e data da análise |
| `risk_level` | Alto/high no fluxo ordinário |
| `language` | auto, pt-BR ou en |
| `measure` | oposição ou PAN, conforme validador |
| `generation_gate` | analysis_completed_by_apex, event_verified, deadline_confirmed, blocking_flags_resolved; remaining_flags vazio |
| `rpi` | número, data, página, código e descrição do despacho |
| `deadlines` | opposition + internal_instruction; ou pan_estimated + internal_instruction + target_filing |
| `client`, `third_party` | Partes da comparação |
| `additional_third_parties` | No máximo um terceiro adicional no núcleo |
| `analysis` | Dimensões, argumentos, conclusão e confiança |
| `legal` | Dispositivos pertinentes e notas específicas |
| `narrative` | Saudação, introdução, recomendação e chamada à ação |
| `evidence`, `limitations` | Consumidos pelo motor de oposição; PAN legado não preserva/renderiza esses campos |

Cada parte recebe `mark`, `process_number`, `owner`, `country_code`, `filing_date`, `priority_date`, `status`, `presentation`, `nature`, `classes`, `relevant_scope`, `collision_highlights`, `image_path`, `image_caption` e `related_rights`.

Limites atuais: escopo relevante até 850 caracteres; até 12 destaques de 240 caracteres; até seis direitos relacionados; quatro a sete dimensões e dois a quatro argumentos. São limites de composição do legado, não limites jurídicos. Se o conteúdo material exceder, paginar ou adaptar a tabela; não truncar silenciosamente.

A aplicação deve acrescentar uma aprovação persistida por caso/revisão. O booleano `analysis_completed_by_apex` apenas indica conclusão da análise; não substitui a aprovação explícita. Campos antigos referindo-se a uma ferramenta devem ser mapeados para uma semântica institucional neutra, preservando a auditoria interna.

O campo legado `remaining_flags` deve conter apenas pendências bloqueadoras da geração e estar vazio para liberar o PDF. Ressalvas não bloqueadoras continuam na auditoria e, quando materiais ao destinatário, no conteúdo do parecer: em oposição há `limitations`; para PAN a integração deve implementar sua preservação explícita, pois o legado não a faz por esse campo. Na evolução do contrato, preferir `remaining_blocking_flags` para evitar ambiguidade. O nome histórico `pan_estimated` também não dispensa a verificação representada por `deadline_confirmed`; cálculo não verificado não deve ser apresentado como prazo confirmado.

### 7.1 API de renderer proposta, ainda não implementada

```python
def render_report(case, brand_assets, layout, output_dir):
    """Recebe caso validado, aprovado e redigido; retorna PDF ainda sujeito a QA."""
    ...

# Retorno esperado:
# {case_id, case_revision, language, path, sha256, pages,
#  template_version, source_hashes, qa_status}
```

A aprovação, a classificação e os prazos pertencem à camada de domínio. O renderer não deve buscar dados sigilosos por conta própria nem inventar partes ausentes. Objetos `brand_assets`/`layout` substituem caminhos pessoais e constantes globais. A biblioteca não deve enviar Slack ou e-mail durante a geração.

## 8. Fundamentação e tom institucional

A fundamentação varia conforme o caso. Oposição pode envolver arts. 124, XIX, 129 e 158 da LPI; PAN pode envolver arts. 124, XIX, 165, 168 e 169. Selecionar os dispositivos e explicar sua relação com o conflito; não impor lista de artigos como prova de análise suficiente.

Para direito monitorado pendente, deixar claro que a exclusividade do registro não está adquirida e que a eficácia da anterioridade pode depender do exame. A adaptação ARIS mostrou por que uma frase jurídica fixa não atende todos os casos. Para PAN, não chamar a medida de oposição nem confundir concessão com deferimento.

Conclusão deve relacionar proximidade do sinal, escopo, anterioridade e providência possível. Diferenciar hipótese de conflito de infração comprovada. Recomendações devem convidar à manifestação do titular, sem anunciar protocolo já realizado.

Nota institucional orientadora, ajustável ao caso:

> Relatório elaborado pela Apex com base nas fontes identificadas e em sua metodologia de análise marcária. A classificação não representa decisão do INPI nem garantia de resultado. A adoção de eventual medida depende das instruções do titular e da confirmação dos dados processuais aplicáveis.

Não inserir uma assinatura de pessoa ou departamento não confirmado. Não copiar automaticamente assinaturas antigas e contatos de outros projetos. Em pareceres para terceiros ou demonstrativos, seguir as instruções específicas de destinatário e finalidade.

## 9. Geração e revisão

1. Congelar dados/revisão aprovada e validar os campos.
2. Selecionar idioma, logo, fontes e perfil de layout.
3. Renderizar em diretório temporário por job.
4. Validar conteúdo, estrutura, fontes e links.
5. Rasterizar **todas** as páginas e revisar visualmente.
6. Corrigir layout e repetir apenas as verificações afetadas.
7. Promover o arquivo validado ao armazenamento final e registrar manifesto.
8. Entregar internamente conforme seção 11.

Exemplo de comando Poppler, com executável configurado no ambiente:

```sh
pdftoppm -png -r 144 parecer.pdf qa/pagina
```

Verificações automáticas relevantes:

- A4 e contagem de páginas adequada ao conteúdo.
- Presença dos processos, marcas, titulares, RPI, medida e prazos esperados na entrada.
- Texto extraível, sem glifos quebrados, placeholder ou dados de outro caso.
- Autor PT: `Apex Marcas e Patentes`; EN: `Apex Intellectual Property`.
- Fontes Poppins incorporadas: conferir `FontDescriptor/FontFile2`, não apenas o nome BaseFont.
- Links oficiais, fontes de imagens e logo correspondente ao idioma.
- Destaques pertencem ao escopo e aos pares de produtos/serviços aprovados.
- Hash, tamanho, revisão e data de geração registrados.

Verificações visuais: sem cortes, sobreposições, texto fora da margem, páginas quase vazias, distorção de logos, contraste insuficiente, marcas trocadas ou áreas visualmente desproporcionais. Contagem de duas páginas não comprova qualidade de layout. Presença de qualquer imagem na página não prova que o logo correto foi aplicado.

O manifesto por job deve ser cumulativo no histórico e conter casos, revisão aprovada, idioma, hashes de fontes/assets/template/PDF, páginas, QA e entregas. Um PDF reprovado fica fora da pasta de publicação.

## 10. Como aproveitar o código sem transportar erros de acoplamento

Funções de referência no motor de oposição: `register_fonts`, `make_styles`, `ClientReportDocTemplate`, `comparison_table`, `consolidated_comparison_table`, `highlighted_scope_markup`, `build_story`, `build_report` e `validate_pdf`. PAN reutiliza o núcleo e altera validação, indicadores e conteúdo jurídico.

| Encontrado no snapshot | Adaptação necessária no OpenIpWorld |
|---|---|
| `EXPECTED_RPI`, datas e prazos de 2899 fixos | Contexto de execução verificado; remover `const` históricos do schema |
| Paths derivados de `ROOT` e estrutura do computador | Diretórios/assets por configuração ou armazenamento da aplicação |
| Cabeçalho 24 mm/rodapé 14 mm no núcleo | Aplicar perfil compacto 20/8 mm documentado nesta skill |
| Estilos do núcleo maiores que os compactos | Usar a tabela de estilo final da seção 5 ou perfil nomeado |
| Jurídico fixo por medida | Compor conforme status/anterioridade e fundamentos do caso |
| Gate sem prova de aprovação | Relacionar case/revision/hash à aprovação persistida |
| Validação após salvar em saída final | Renderizar em temporário e promover após QA |
| Manifesto sobrescrito por RPI | Manifesto por job + histórico de entregas |
| Duplicidade rejeitada apenas por terceiro | Chave de par/caso; mesmo terceiro pode afetar titulares distintos |
| `relevant_scope` limitado a 850 caracteres | Preservar integral no domínio e paginar conteúdo necessário |
| Processo validado por limpeza permissiva de dígitos | Validação por jurisdição/tipo, preservando o bruto |
| Narrativa passada diretamente ao Paragraph | Texto escapado/segmentos tipados ou marcação estritamente validada |

Os quatro PDFs do lote piloto usaram um wrapper específico para ajustar os motores. Esse wrapper removia o último `Paragraph` por posição para reduzir espaço e acessava `KeepTogether._content` no PAN. **Não transportar esses atalhos:** podem apagar conteúdo material ou quebrar com mudanças de biblioteca. Substituir por opções semânticas, como `include_repeated_source_links`, e componentes públicos de prazo/conclusão.

Recortes específicos de imagens, PDFs de clientes, arquivos JSON de casos reais e wrappers com datas particulares não acompanham este pacote. Os códigos fornecidos são referência de implementação da apresentação; ainda precisam das adaptações acima para funcionar no projeto de destino.

## 11. Publicação interna no Slack e arquivo

Este fluxo aplica-se quando a entrega no Slack foi autorizada, como no padrão recorrente aprovado pela Apex. Não enviar mensagens apenas porque a skill está sendo criada ou documentada.

Depois da aprovação e QA, publicar primeiro os PDFs e depois o resumo final. Recuperar thread e arquivos já enviados para evitar duplicidade. O destino e credenciais vêm da configuração do ambiente.

Frente nacional:

```text
LEITURA DE COLIDÊNCIAS NACIONAL - RPI [número] - [DD/MM/AAAA da leitura]
```

Cada PDF é resposta nessa thread, identificado por caso, marcas, medida e prazo. Em rodada conjunta que inclua titulares estrangeiros, criar a thread internacional correspondente e publicar nela os PDFs em inglês. Não abrir thread internacional vazia em execução restrita à frente nacional. Se uma rodada conjunta exigir registro de ausência em uma categoria, registrar sem inventar arquivos.

Em pesquisa independente com várias RPIs, como o lote piloto, usar identificação do lote e informar as revistas nos casos/resumo, por exemplo:

```text
LEITURA DE COLIDÊNCIAS NACIONAL - [LOTE] - [DD/MM/AAAA da leitura]
```

Chave de arquivo entregue: job/rodada + case_id + revisão + idioma + SHA-256. Persistir timestamps/IDs do Slack e links de armazenamento. Uma tentativa com resultado incerto exige consulta antes de reenviar. Revisão posterior deve ser identificada como nova versão, sem fingir que a anterior nunca existiu.

Modelo de resumo semanal aprovado:

```text
Relatório Semanal de Colidências
RPI [número] — [data da publicação]

✅ Processamento concluído

Resumo
Publicações analisadas: [X]
Possíveis colidências: [Y]
Taxa de sinalização: [percentual com denominador definido]
Clientes Apex potencialmente afetados: [N]

Nível de risco
🔴 Alto: [A]    🟡 Médio: [B]    🟢 Baixo: [C]

Relatório detalhado: [link verificado]
```

Em lote complementar, adaptar a identificação e deixar explícito o recorte, sem confundi-lo com análise integral de todas as revistas. Não incluir no resumo os blocos “Qualidade da análise” e “Recomendados para comunicação ao cliente”; esses dados ficam no relatório interno. Se nenhum PDF for aprovado, registrar zero PDFs quando houver autorização para fechar a rodada.

Não entregar diretamente a clientes ou protocolar medidas. Essas ações não são executadas pelo renderer nem decorrem da simples classificação como alto risco.

## 12. Aceitação do renderer integrado

Validar pelo menos:

1. Caso nacional usa logo PT, texto PT e marca/processo corretos.
2. Titular estrangeiro usa logo internacional, texto EN e `Possible Trademark Infringement`.
3. Caso pendente não recebe descrição de registro concedido.
4. PAN usa marco e linguagem corretos; prazo não é data fixa de exemplo.
5. Textos longos e imagens muito diferentes mantêm alinhamento e proporção.
6. Destaques não existentes na especificação são rejeitados antes da geração.
7. Falta de imagem gera representação nominal apropriada, não logotipo inventado.
8. Caso não aprovado ou revisão errada não publica PDF.
9. Reinício após upload não repete arquivo; resumo vem depois dos PDFs.
10. Arquivos reprovados no QA não entram na lista de entregues.

Esta skill especifica o comportamento a preservar. As cópias dos motores mostram a implementação existente; a portabilidade, o contrato unificado e os serviços de integração continuam sendo trabalho do projeto de destino.
