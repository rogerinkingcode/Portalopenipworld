'use client'

/**
 * Mapa das jurisdições — duas camadas que NUNCA se confundem:
 *
 *   ① onde você tem ativo    — pino cheio, tamanho por quantidade
 *   ② onde nós olhamos       — anel ciano em volta do pino
 *
 * Não podem ser o mesmo pino com cor diferente: o olho lê cor como intensidade,
 * não como ausência. Um país onde há ativo mas não há leitura automática precisa
 * dizer isso — ausência de ameaça ali é ausência de olho, não ausência de risco.
 *
 * O desenho é próprio, em projeção equiretangular (viewBox em graus), sem
 * biblioteca e sem CDN: funciona offline, pesa 4 KB e não tem licença a carregar.
 * As silhuetas são deliberadamente grosseiras — servem de referência de posição,
 * e a precisão que importa está no pino, que usa o centroide real.
 */

import { COORDENADA } from '@/lib/visao'

/** Contornos aproximados, em [longitude, latitude]. Pano de fundo, não cartografia. */
const CONTINENTES: [number, number][][] = [
  // América do Norte
  [
    [-168, 66], [-158, 71], [-128, 70], [-95, 74], [-80, 73], [-62, 60], [-55, 52],
    [-66, 45], [-70, 42], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-105, 20],
    [-92, 15], [-83, 9], [-96, 16], [-110, 24], [-117, 32], [-124, 40], [-125, 49],
    [-133, 55], [-141, 60], [-152, 59], [-165, 62],
  ],
  // América do Sul
  [
    [-81, 8], [-72, 12], [-61, 11], [-52, 5], [-50, -1], [-44, -3], [-35, -5],
    [-38, -13], [-40, -21], [-48, -25], [-53, -34], [-58, -39], [-62, -41], [-65, -45],
    [-68, -53], [-75, -50], [-73, -42], [-71, -33], [-70, -20], [-75, -14], [-81, -5],
    [-80, 2],
  ],
  // Europa
  [
    [-10, 44], [-9, 37], [0, 38], [12, 38], [16, 41], [19, 40], [24, 36], [29, 41],
    [40, 44], [48, 47], [58, 52], [66, 58], [70, 66], [55, 69], [40, 68], [30, 70],
    [20, 70], [12, 65], [5, 59], [-2, 55], [-6, 58], [-8, 51],
  ],
  // África
  [
    [-17, 21], [-16, 13], [-8, 5], [3, 6], [9, 4], [12, -5], [13, -17], [15, -28],
    [20, -35], [30, -31], [33, -26], [40, -16], [41, -5], [51, 2], [51, 11], [43, 12],
    [37, 18], [34, 28], [25, 32], [11, 34], [-2, 36], [-9, 33], [-13, 28],
  ],
  // Ásia
  [
    [26, 40], [35, 37], [44, 40], [50, 30], [57, 25], [61, 25], [68, 24], [73, 20],
    [78, 9], [80, 13], [88, 21], [95, 16], [99, 8], [104, 2], [109, 12], [107, 21],
    [115, 23], [122, 31], [122, 40], [128, 43], [131, 47], [140, 52], [142, 60],
    [160, 62], [170, 66], [178, 69], [160, 71], [140, 73], [110, 76], [80, 76],
    [60, 72], [58, 60], [60, 52], [55, 45],
  ],
  // Austrália
  [
    [113, -22], [114, -28], [115, -34], [123, -34], [129, -32], [135, -35], [140, -38],
    [147, -39], [151, -34], [153, -28], [153, -25], [146, -19], [143, -14], [142, -11],
    [136, -12], [130, -12], [125, -14], [118, -20],
  ],
  // Nova Zelândia — duas ilhas, senão vira um triângulo solto no oceano
  [[173, -35], [175, -37], [178, -38], [177, -40], [174, -41], [172, -38]],
  [[172, -41], [174, -42], [172, -45], [168, -47], [166, -45], [170, -42]],
]

const L = 360
const A = 170 // corta a Antártida: não há ativo lá e ela come 20% da altura

function proj([lon, lat]: [number, number]): [number, number] {
  return [lon + 180, 82 - lat]
}

function paraPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${proj(p).map((n) => n.toFixed(1)).join(' ')}`).join(' ') + ' Z'
}

export type PontoMapa = {
  jurisdicao: string
  rotulo: string
  ativos: number
  vigiada: boolean
  motivo?: string
}

export function Mapa({
  pontos,
  onEscolher,
  selecionada,
}: {
  pontos: PontoMapa[]
  onEscolher?: (j: string) => void
  selecionada?: string | null
}) {
  const posicionados = pontos.filter((p) => COORDENADA[p.jurisdicao])
  const semPosicao = pontos.filter((p) => !COORDENADA[p.jurisdicao])
  const maxAtivos = Math.max(1, ...posicionados.map((p) => p.ativos))

  return (
    <div>
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="w-full"
        style={{ maxHeight: 340 }}
        role="img"
        aria-label="Distribuição dos ativos por jurisdição"
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#00E0F6" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#00E0F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grade: meridianos e paralelos de 30 em 30 graus. Dá a leitura de globo. */}
        <g stroke="currentColor" strokeWidth="0.25" opacity="0.1" className="text-[var(--tx3)]">
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
            <line key={lon} x1={lon + 180} y1={0} x2={lon + 180} y2={A} />
          ))}
          {[60, 30, 0, -30, -60].map((lat) => (
            <line key={lat} x1={0} y1={82 - lat} x2={L} y2={82 - lat} />
          ))}
        </g>
        {/* Equador marcado, um pouco mais forte */}
        <line x1={0} y1={82} x2={L} y2={82} stroke="#00E0F6" strokeWidth="0.3" opacity="0.16" />

        {/* Terra */}
        <g fill="currentColor" className="text-[var(--color-petrol)]" opacity="0.17">
          {CONTINENTES.map((c, i) => (
            <path key={i} d={paraPath(c)} />
          ))}
        </g>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          className="text-[var(--color-petrol-cla)]"
          opacity="0.3"
        >
          {CONTINENTES.map((c, i) => (
            <path key={i} d={paraPath(c)} />
          ))}
        </g>

        {/* Pinos */}
        {posicionados.map((p) => {
          const [x, y] = proj(COORDENADA[p.jurisdicao])
          const r = 2.4 + (p.ativos / maxAtivos) * 4.2
          const sel = selecionada === p.jurisdicao
          return (
            <g
              key={p.jurisdicao}
              onClick={() => onEscolher?.(p.jurisdicao)}
              style={{ cursor: onEscolher ? 'pointer' : 'default' }}
            >
              <title>
                {p.rotulo} · {p.ativos} {p.ativos === 1 ? 'ativo' : 'ativos'} ·{' '}
                {p.vigiada ? 'Vigilância ativa' : `Sem leitura automática${p.motivo ? ` — ${p.motivo}` : ''}`}
              </title>
              {p.vigiada && <circle cx={x} cy={y} r={r * 2.6} fill="url(#halo)" />}
              {/* ② o anel diz "estamos olhando aqui" — forma, não cor */}
              {p.vigiada && (
                <circle cx={x} cy={y} r={r + 2.2} fill="none" stroke="#00E0F6" strokeWidth="0.7" opacity="0.85" />
              )}
              {/* ① o pino diz "você tem ativo aqui" */}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={p.vigiada ? '#00E0F6' : 'var(--color-petrol-cla)'}
                stroke={sel ? '#fff' : 'rgba(255,255,255,.55)'}
                strokeWidth={sel ? 1.1 : 0.5}
              />
              <text
                x={x}
                y={y - r - 2.6}
                textAnchor="middle"
                fontSize="5.4"
                fontWeight="600"
                fill="currentColor"
                className="text-[var(--tx2)]"
                style={{ fontFamily: 'var(--font-titulo)' }}
              >
                {p.jurisdicao}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legenda — o texto é a parte que importa, não o desenho. */}
      <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2 text-[11px] leading-snug text-[var(--tx2)]">
        <span className="flex items-center gap-2">
          <svg width="20" height="14" aria-hidden>
            <circle cx="10" cy="7" r="3.4" fill="#00E0F6" />
            <circle cx="10" cy="7" r="5.6" fill="none" stroke="#00E0F6" strokeWidth="0.9" opacity="0.85" />
          </svg>
          <span>
            <strong className="text-[var(--tx)]">Vigiado</strong> — cruzamos cada publicação nova
            contra os seus ativos aqui
          </span>
        </span>
        <span className="flex items-center gap-2">
          <svg width="20" height="14" aria-hidden>
            <circle cx="10" cy="7" r="3.4" fill="var(--color-petrol-cla)" />
          </svg>
          <span>
            <strong className="text-[var(--tx)]">Não vigiado</strong> — você tem ativo aqui, mas
            ainda não há leitura automática desta base
          </span>
        </span>
      </div>

      {semPosicao.length > 0 && (
        <p className="mt-2 text-[11px] text-[var(--tx3)]">
          Fora do mapa por não ser um país:{' '}
          {semPosicao.map((p) => `${p.rotulo} (${p.ativos})`).join(' · ')}.
        </p>
      )}
    </div>
  )
}
