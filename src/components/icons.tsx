// Egyszerű, saját kezűleg rajzolt ikonkészlet a navigációhoz — nincs mögötte külső
// ikonkönyvtár, minden alak 20×20-as rácson, egységes vonalvastagsággal (1.6) készült,
// hogy a nav bar ikonjai egy stílust kövessenek.
import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconStock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7.2 10 3l7 4.2-7 4.2-7-4.2Z" />
      <path d="M3 7.2v6.1L10 17.5l7-4.2V7.2" />
      <path d="M10 11.4v6.1" />
    </svg>
  )
}

export function IconIn(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3v8.5" />
      <path d="M6.2 8.2 10 12l3.8-3.8" />
      <path d="M4 15.5h12" />
    </svg>
  )
}

export function IconOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 17V8.5" />
      <path d="M6.2 11.8 10 8l3.8 3.8" />
      <path d="M4 4.5h12" />
    </svg>
  )
}

export function IconLog(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="12" height="13.2" rx="1.6" />
      <path d="M7.4 4c0-.9.7-1.6 1.6-1.6h2c.9 0 1.6.7 1.6 1.6" />
      <path d="M7 9.4h6M7 12.2h6M7 15h3.2" />
    </svg>
  )
}

export function IconReport(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.2 16.5h13.6" />
      <path d="M5.4 16.5v-5.3" />
      <path d="M10 16.5V6" />
      <path d="M14.6 16.5v-7.8" />
    </svg>
  )
}

export function IconMaster(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h2.2M8.4 6H17" />
      <circle cx="6.7" cy="6" r="1.7" />
      <path d="M3 10h6M11.6 10H17" />
      <circle cx="10" cy="10" r="1.7" />
      <path d="M3 14h4.4M9.8 14H17" />
      <circle cx="12.6" cy="14" r="1.7" />
    </svg>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.4 3.5H5.2A1.2 1.2 0 0 0 4 4.7v10.6a1.2 1.2 0 0 0 1.2 1.2h3.2" />
      <path d="M8 10h8.5" />
      <path d="M13.2 6.5 16.5 10l-3.3 3.5" />
    </svg>
  )
}

export function IconHospital(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 17V5.2A1.2 1.2 0 0 1 5.2 4h9.6A1.2 1.2 0 0 1 16 5.2V17" />
      <path d="M2.5 17h15" />
      <path d="M10 7v4.4M7.8 9.2h4.4" />
      <path d="M7 17v-2.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1V17" />
    </svg>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  )
}
