// A specifikáció (v0.7, 3. fejezet) táblái. Ha a valós séma eltér, itt és a
// lib/tables.ts-ben kell igazítani.

export type Role = 'ADMIN' | 'FELHASZNALO'
export type MovementType = 'BEVET' | 'KIVET' | 'JAVITAS'

export interface Profile {
  id: string
  email: string
  nev: string
  szerepkor: Role
  aktiv: boolean
}

export interface Location {
  id: number
  nev: string
  aktiv: boolean
}

export interface Category {
  id: number
  nev: string
  lot_kotelezo: boolean
  lejarat_kotelezo: boolean
  aktiv: boolean
}

export interface UsagePlace {
  id: number
  nev: string
  aktiv: boolean
}

export interface Product {
  id: number
  nev: string
  cikkszam: string | null
  mertekegyseg: string
  kategoria_id: number
  min_mennyiseg: number | null
  aktiv: boolean
  kategoriak?: Category | null
}

export interface StockRow {
  id?: number
  product_id: number
  location_id: number
  lot: string | null
  lejarat: string | null
  mennyiseg: number
  products?: Pick<Product, 'nev' | 'mertekegyseg' | 'min_mennyiseg' | 'cikkszam'> | null
  locations?: Pick<Location, 'nev'> | null
}

export interface Movement {
  id: number
  tipus: MovementType
  product_id: number
  location_id: number
  lot: string | null
  lejarat: string | null
  mennyiseg: number
  felhasznalo_id: string
  idopont: string
  egysegar: number | null
  megjegyzes: string | null
  javitott_mozgas_id: number | null
  felhasznalasi_hely_id: number | null
  products?: Pick<Product, 'nev' | 'mertekegyseg'> | null
  locations?: Pick<Location, 'nev'> | null
  felhasznalasi_helyek?: Pick<UsagePlace, 'nev'> | null
}

export type NewMovement = Omit<Movement, 'id' | 'products' | 'locations' | 'felhasznalasi_helyek'>
