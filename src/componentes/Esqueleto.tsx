/**
 * Esqueletos — o que aparece enquanto o conteúdo vem do backend, no lugar do "Carregando…".
 *
 * Cada página tem o seu (componentes/esqueletos/…), montado com as peças daqui e espelhando a
 * estrutura real da tela: mesmo cabeçalho, mesmos cartões, mesmas colunas de tabela, nas mesmas
 * alturas. Assim, quando o dado chega, nada pula de lugar — o conteúdo só "preenche" o desenho.
 *
 * O brilho que passa é CSS (`.osso` em globals.css) e para com `prefers-reduced-motion`.
 * Para leitor de tela, o bloco inteiro é um único "Carregando…" (role=status), e os ossos são
 * decorativos (aria-hidden).
 *
 * ⭐ Tela nova: monte o esqueleto dela aqui com estas peças, no lugar de um texto de espera.
 */

type Largura = number | string

/** O osso básico: um bloco com o brilho. */
export function Osso({
  w = '100%',
  h = 12,
  r = 6,
  className = '',
}: {
  w?: Largura
  h?: Largura
  /** Raio da borda; 999 = pílula/círculo. */
  r?: number
  className?: string
}) {
  return <span aria-hidden className={`osso block ${className}`} style={{ width: w, height: h, borderRadius: r }} />
}

/** Um círculo (foto de perfil, ícone redondo). */
export function OssoCirculo({ d = 28 }: { d?: number }) {
  return <Osso w={d} h={d} r={999} className="flex-shrink-0" />
}

/** O invólucro de toda tela em carregamento: anuncia "Carregando…" uma vez só. */
export function Esqueleto({ children, className = 'space-y-4' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  )
}

/** Título da página + linha de descrição (+ um botão à direita, se a tela tiver). */
export function OssoCabecalho({ subtitulo = true, acao = false, titulo = 180 }: { subtitulo?: boolean; acao?: boolean | number; titulo?: Largura }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Osso w={titulo} h={22} r={7} />
        {subtitulo && <Osso w={300} h={11} />}
      </div>
      {acao && <Osso w={typeof acao === 'number' ? acao : 110} h={34} r={8} />}
    </div>
  )
}

/** Um cartão (`.card`), com a faixa de título em cima quando a tela tem título no cartão. */
export function OssoCartao({
  titulo = true,
  tituloW = 140,
  acessorio = false,
  children,
  className = '',
  semCorpo = false,
}: {
  titulo?: boolean
  tituloW?: Largura
  acessorio?: boolean | number
  children?: React.ReactNode
  className?: string
  /** Só a moldura, sem o espaçamento interno (para quem desenha o próprio corpo). */
  semCorpo?: boolean
}) {
  return (
    <section className={`card ${className}`}>
      {titulo && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--linha)] px-4 py-3">
          <Osso w={tituloW} h={12} />
          {acessorio && <Osso w={typeof acessorio === 'number' ? acessorio : 80} h={20} r={999} />}
        </div>
      )}
      {semCorpo ? children : <div className="p-4">{children}</div>}
    </section>
  )
}

/** Linhas de texto de larguras variadas (parágrafo). */
export function OssoTexto({ linhas = 2, larguras }: { linhas?: number; larguras?: Largura[] }) {
  const ws = larguras ?? Array.from({ length: linhas }, (_, i) => (i === linhas - 1 ? '62%' : '100%'))
  return (
    <div className="space-y-2">
      {ws.map((w, i) => (
        <Osso key={i} w={w} h={11} />
      ))}
    </div>
  )
}

/** As abas segmentadas (`.seg`). */
export function OssoAbas({ larguras = [96, 96, 96] }: { larguras?: number[] }) {
  return (
    <div className="seg w-max" aria-hidden>
      {larguras.map((w, i) => (
        <span key={i} className="px-1.5 py-[5px]">
          <Osso w={w} h={14} r={5} />
        </span>
      ))}
    </div>
  )
}

/** Uma fileira de "chips" de filtro (estado, situação…). */
export function OssoChips({ larguras = [64, 82, 74, 90] }: { larguras?: number[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Osso w={48} h={10} />
      {larguras.map((w, i) => (
        <Osso key={i} w={w} h={26} r={8} />
      ))}
    </div>
  )
}

/** Uma fileira de campos de formulário/filtro: rótulo pequeno em cima, caixa embaixo. */
export function OssoCampos({ larguras = [200, 160, 160] }: { larguras?: Largura[] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {larguras.map((w, i) => (
        <div key={i} className="space-y-1.5" style={{ width: w, flexGrow: w === '100%' ? 1 : 0 }}>
          <Osso w={60} h={9} />
          <Osso h={34} r={8} />
        </div>
      ))}
    </div>
  )
}

/** Cartões de indicador (número grande + rótulo + rodapé), como no topo dos painéis. */
export function OssoIndicadores({ n = 4, colunas = 'sm:grid-cols-2 lg:grid-cols-4' }: { n?: number; colunas?: string }) {
  return (
    <div className={`grid gap-3 ${colunas}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <Osso w={110} h={10} />
          <Osso w={72} h={26} r={7} />
          <Osso w="80%" h={10} />
        </div>
      ))}
    </div>
  )
}

/**
 * Uma tabela (`table.tb`): cabeçalho azul de verdade (com as colunas certas) e linhas de ossos.
 * `colunas` = a largura de cada osso, na ordem das colunas da tela.
 */
export function OssoTabela({
  colunas,
  linhas = 8,
  avatar = -1,
  duasLinhas = [],
  minW,
}: {
  colunas: Largura[]
  linhas?: number
  /** Índice da coluna que começa com foto redonda (-1 = nenhuma). */
  avatar?: number
  /** Colunas que mostram duas linhas (ex.: "Há 5 min" + data). */
  duasLinhas?: number[]
  minW?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tb tb-meio" style={minW ? { minWidth: minW } : undefined}>
        <thead>
          <tr>
            {colunas.map((_, i) => (
              <th key={i}>
                <Osso w={i === 0 ? 60 : 48} h={8} className="opacity-60" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: linhas }, (_, l) => (
            <tr key={l}>
              {colunas.map((w, c) => (
                <td key={c}>
                  <span className="flex items-center gap-2.5">
                    {c === avatar && <OssoCirculo d={28} />}
                    <span className="block flex-1 space-y-1.5">
                      <Osso w={typeof w === 'number' ? w - ((l * 7 + c * 5) % 24) : w} h={10} />
                      {duasLinhas.includes(c) && <Osso w={70} h={8} />}
                    </span>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** O rodapé da paginação: "1–10 de N" à esquerda, os botões à direita. */
export function OssoPaginacao() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <Osso w={150} h={26} r={8} />
      <Osso w={230} h={26} r={8} />
    </div>
  )
}

/** Uma lista de cartões empilhados (prazos, ameaças, casos): faixa de título + 2 linhas. */
export function OssoListaCartoes({ n = 5, alto = false }: { n?: number; alto?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card flex items-start gap-3 p-4">
          <Osso w={40} h={40} r={10} className="flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Osso w={`${58 - (i % 3) * 8}%`} h={13} />
            <Osso w={`${82 - (i % 2) * 14}%`} h={10} />
            {alto && <Osso w="40%" h={10} />}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Osso w={86} h={20} r={999} />
            <Osso w={64} h={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Uma grade de cartões (clientes, ativos do portal): título, duas linhas e um rodapé. */
export function OssoGradeCartoes({ n = 6, colunas = 'sm:grid-cols-2 xl:grid-cols-3' }: { n?: number; colunas?: string }) {
  return (
    <div className={`grid gap-3 ${colunas}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex items-center gap-2.5">
            <Osso w={18} h={13} r={2} />
            <Osso w={`${60 - (i % 3) * 9}%`} h={14} />
          </div>
          <Osso w="85%" h={10} />
          <Osso w="55%" h={10} />
          <div className="flex gap-2 border-t border-[var(--linha)] pt-3">
            <Osso w={70} h={20} r={999} />
            <Osso w={56} h={20} r={999} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Uma lista de linhas simples dentro de um cartão (barras "Por matéria", "Por jurisdição"…). */
export function OssoLinhas({ n = 5, barra = false, bandeira = false }: { n?: number; barra?: boolean; bandeira?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-1.5 px-3">
          <div className="flex items-center gap-2.5">
            {bandeira && <Osso w={18} h={13} r={2} />}
            <Osso w={`${46 - (i % 3) * 8}%`} h={11} />
            <span className="ml-auto">
              <Osso w={26} h={12} />
            </span>
          </div>
          {barra && <Osso h={6} r={999} />}
        </div>
      ))}
    </div>
  )
}
