---
name: skill-projecao-o-tipo-carrega-a-regra
description: `filter` sem `map` mandou o prazo interno da casa ao navegador do cliente — e a auditoria passou
metadata:
  type: skill
---

`projetarParaCliente()` monta o pacote do cliente por **lista branca**, campo a campo. Num ramo
havia `.filter(...)` sem o `.map(...)` correspondente: o objeto do prazo foi **inteiro**, e com ele o
`prazo_interno_em` — a antecedência operacional da casa (`legal − 10 dias`).

**A auditoria existia e passou.** `auditarProjecao()` confere a lista de campos que alguém **lembrou
de proibir**, não a que **esqueceu de permitir**. Uma lista branca implementada com filtro não é
lista branca.

**Conserto que impede a repetição:** o **tipo** carrega a proibição.

```ts
type PrazoCliente = Omit<Prazo, 'prazo_interno_em' | 'fonte'>
```

Com `Omit`, o `map` que esquecer de tirar o campo **não compila**. A auditoria vira a segunda
barreira, não a única.

⚠️ Irmão desta lição: `typeof c.parecer === 'object'` num campo **opcional** fez candidata **sem
parecer** aparecer como ameaça aprovada, com rodapé "parecer de —". O discriminante tem de ser campo
que **sempre existe** num formato e **nunca** no outro: `'risco' in c`.

Mais casos em `SKILLS.md` §1.
