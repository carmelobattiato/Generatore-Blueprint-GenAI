/* ─────────────────────────────────────────────────────────────
   blueprintTheme.jsx
   Shared light-violet millimeter-grid theme for:
     LoginPage, UsecasePage, UsecasePage2
───────────────────────────────────────────────────────────── */

/* ── colour tokens ── */
export const C = {
  bg:          '#f5f3ff',
  gridMinor:   'rgba(109,40,217,0.07)',
  gridMajor:   'rgba(109,40,217,0.18)',
  cardBg:      'rgba(255,255,255,0.82)',
  cardBorder:  'rgba(109,40,217,0.22)',
  cardShadow:  '0 4px 24px rgba(109,40,217,0.10)',
  textMain:    '#2e1065',
  textDim:     '#7c3aed',
  textMuted:   '#a78bfa',
  accent:      '#7c3aed',
  accentHover: '#6d28d9',
  accentLight: 'rgba(124,58,237,0.10)',
  danger:      '#dc2626',
  success:     '#16a34a',
  logBg:       'rgba(245,243,255,0.9)',
  logBorder:   'rgba(109,40,217,0.14)',
  inputBg:     'rgba(255,255,255,0.5)',
  divider:     'rgba(109,40,217,0.15)',
}

/* ── millimeter-grid CSS background ── */
export const GRID_BG = {
  backgroundColor: C.bg,
  backgroundImage: [
    `linear-gradient(${C.gridMajor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${C.gridMajor} 1px, transparent 1px)`,
    `linear-gradient(${C.gridMinor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${C.gridMinor} 1px, transparent 1px)`,
  ].join(', '),
  backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
  backgroundPosition: '-0.5px -0.5px, -0.5px -0.5px, -0.5px -0.5px, -0.5px -0.5px',
}

/* ─────────────────────────────────────────────────────────────
   SVG Icon components  (pure inline SVG, no extra deps)
───────────────────────────────────────────────────────────── */

/** AWS — cloud + two upload arrows */
export function AwsIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 30C6 30 3 27 3 23C3 19.5 5.5 16.5 9 16C9.5 12 12.5 9 17 9C20.5 9 23.5 11 25 14C28.5 14 32 17 32 21C32 25.5 28.5 30 24 30Z"
        stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="11" y1="44" x2="11" y2="31" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7,36 11,31 15,36" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="22" y1="44" x2="22" y2="31" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="18,36 22,31 26,36" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="35" y1="14" x2="45" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="35" y1="18" x2="45" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="35" y1="22" x2="45" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

/** Azure — faceted diamond "A" shape */
export function AzureIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 42 L18 6 L28 22 L16 42 Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M18 6 L44 42 L28 42 L28 22 Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="18" y1="6" x2="28" y2="22" stroke={color} strokeWidth="1" opacity="0.45"/>
    </svg>
  )
}

/** Robot — antenna, square head, eyes, segmented mouth, ears */
export function RobotIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="24" y1="3" x2="24" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="3" r="2.5" fill={color}/>
      <rect x="8" y="10" width="32" height="28" rx="5" stroke={color} strokeWidth="2"/>
      <circle cx="18" cy="22" r="5" stroke={color} strokeWidth="2"/>
      <circle cx="18" cy="22" r="2" fill={color}/>
      <circle cx="30" cy="22" r="5" stroke={color} strokeWidth="2"/>
      <circle cx="30" cy="22" r="2" fill={color}/>
      <rect x="14" y="32" width="20" height="3.5" rx="1.75" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="19" y1="32" x2="19" y2="35.5" stroke={color} strokeWidth="1"/>
      <line x1="24" y1="32" x2="24" y2="35.5" stroke={color} strokeWidth="1"/>
      <line x1="29" y1="32" x2="29" y2="35.5" stroke={color} strokeWidth="1"/>
      <rect x="3"  y="17" width="5" height="10" rx="2.5" stroke={color} strokeWidth="1.5"/>
      <rect x="40" y="17" width="5" height="10" rx="2.5" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

/** MCP — central hub + 4 peripheral nodes with dashed connections */
export function McpIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="7"  stroke={color} strokeWidth="2"/>
      <circle cx="24" cy="24" r="2.5" fill={color}/>
      <circle cx="24" cy="5"  r="4"  stroke={color} strokeWidth="1.5"/>
      <circle cx="43" cy="24" r="4"  stroke={color} strokeWidth="1.5"/>
      <circle cx="24" cy="43" r="4"  stroke={color} strokeWidth="1.5"/>
      <circle cx="5"  cy="24" r="4"  stroke={color} strokeWidth="1.5"/>
      <line x1="24" y1="9"  x2="24" y2="17" stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5"/>
      <line x1="39" y1="24" x2="31" y2="24" stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5"/>
      <line x1="24" y1="31" x2="24" y2="39" stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5"/>
      <line x1="9"  y1="24" x2="17" y2="24" stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5"/>
    </svg>
  )
}

/** AI Agents — orchestrator + 3 sub-agents with hierarchy */
export function AgentsIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="7"  r="6"   stroke={color} strokeWidth="2"/>
      <circle cx="24" cy="7"  r="2.5" fill={color}/>
      <circle cx="8"  cy="40" r="5"   stroke={color} strokeWidth="1.5"/>
      <circle cx="8"  cy="40" r="2"   fill={color} opacity="0.7"/>
      <circle cx="24" cy="40" r="5"   stroke={color} strokeWidth="1.5"/>
      <circle cx="24" cy="40" r="2"   fill={color} opacity="0.7"/>
      <circle cx="40" cy="40" r="5"   stroke={color} strokeWidth="1.5"/>
      <circle cx="40" cy="40" r="2"   fill={color} opacity="0.7"/>
      <line x1="21" y1="12" x2="11" y2="35" stroke={color} strokeWidth="1.5"/>
      <line x1="24" y1="13" x2="24" y2="35" stroke={color} strokeWidth="1.5"/>
      <line x1="27" y1="12" x2="37" y2="35" stroke={color} strokeWidth="1.5"/>
      <line x1="13" y1="40" x2="19" y2="40" stroke={color} strokeWidth="1" strokeDasharray="2.5 2"/>
      <line x1="29" y1="40" x2="35" y2="40" stroke={color} strokeWidth="1" strokeDasharray="2.5 2"/>
    </svg>
  )
}

/* ── floating background icons (blueprint-annotation style) ── */
export const BG_ICONS = [
  { Ic: AwsIcon,    size: 96, opacity: 0.09, style: { top: '6%',    left: '3%',    transform: 'rotate(-14deg)' } },
  { Ic: AzureIcon,  size: 88, opacity: 0.09, style: { top: '5%',    right: '4%',   transform: 'rotate(10deg)'  } },
  { Ic: RobotIcon,  size: 76, opacity: 0.08, style: { bottom: '9%', left: '3%',    transform: 'rotate(-7deg)'  } },
  { Ic: McpIcon,    size: 80, opacity: 0.08, style: { bottom: '8%', right: '3%',   transform: 'rotate(12deg)'  } },
  { Ic: AgentsIcon, size: 64, opacity: 0.07, style: { top: '44%',   left: '1.5%',  transform: 'rotate(-4deg)'  } },
  { Ic: AzureIcon,  size: 60, opacity: 0.07, style: { top: '42%',   right: '2%',   transform: 'rotate(7deg)'   } },
  { Ic: AwsIcon,    size: 52, opacity: 0.06, style: { top: '78%',   left: '18%',   transform: 'rotate(18deg)'  } },
  { Ic: RobotIcon,  size: 54, opacity: 0.06, style: { top: '15%',   right: '18%',  transform: 'rotate(-9deg)'  } },
]

/* ── tech badge strip data ── */
export const BADGES = [
  { Ic: AwsIcon,    label: 'AWS'       },
  { Ic: AzureIcon,  label: 'Azure'     },
  { Ic: McpIcon,    label: 'MCP'       },
  { Ic: AgentsIcon, label: 'AI Agents' },
  { Ic: RobotIcon,  label: 'Robot AI'  },
]
