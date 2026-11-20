// Data resmi 24 finalis Nyong Noni UNIMA 2026.
// Nomor ganjil = Nyong, genap = Noni. Foto: /finalis/NN.webp, QRIS: /qris/NN.webp (folder public).
export type FinalistGender = 'nyong' | 'noni'

export interface Finalist2026 {
  no: string
  name: string
  gender: FinalistGender
  faculty: string
  nmid: string
  photo: string
  qris: string
}

export const FACULTY_NAMES: Record<string, string> = {
  FIPP: 'Fakultas Ilmu Pendidikan dan Psikologi',
  FEB: 'Fakultas Ekonomi dan Bisnis',
  FBS: 'Fakultas Bahasa dan Seni',
  FMIPAK: 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian',
  FISH: 'Fakultas Ilmu Sosial dan Hukum',
  FATEK: 'Fakultas Teknik',
  FIKKM: 'Fakultas Ilmu Keolahragaan dan Kesehatan',
}

const RAW: [string, string, string, string][] = [
  ['01', 'Coan Sege', 'FIPP', 'ID1026641320696'],
  ['02', 'Quivenit Runtuwene', 'FISH', 'ID1026641321066'],
  ['03', 'Marlon Makmur', 'FEB', 'ID1026641318518'],
  ['04', 'Preisy Wungow', 'FIPP', 'ID1026641318310'],
  ['05', 'Rafael Wongkar', 'FBS', 'ID1026641312248'],
  ['06', 'Syalomitha Giroth', 'FIPP', 'ID1026641311760'],
  ['07', 'Jupiter Dahlan', 'FEB', 'ID1026641310044'],
  ['08', 'Indah Sengkey', 'FIKKM', 'ID1026641310408'],
  ['09', 'Dave Ratag', 'FATEK', 'ID1026641320167'],
  ['10', 'Christin Wuysang', 'FISH', 'ID1026642171353'],
  ['11', 'Reyhan Ngiu', 'FIPP', 'ID1026642171460'],
  ['12', 'Tiatira Tombeg', 'FATEK', 'ID1026642171841'],
  ['13', 'Josh Tinangon', 'FBS', 'ID1026642171486'],
  ['14', 'Aurelia Giyoh', 'FIPP', 'ID1026641308063'],
  ['15', "Linuster Tafona'o", 'FIPP', 'ID1026641307487'],
  ['16', 'Lovenia Senduk', 'FMIPAK', 'ID1026641307768'],
  ['17', 'Pratama Haryanto', 'FIPP', 'ID1026641308998'],
  ['18', 'Faithqueen Momor', 'FBS', 'ID1026641310820'],
  ['19', 'Muhammad Parhan', 'FEB', 'ID1026641312990'],
  ['20', 'Selova Ringkuangan', 'FBS', 'ID1026641317213'],
  ['21', 'Wanly Taula', 'FATEK', 'ID1026641318112'],
  ['22', 'Zallia Farlegi', 'FBS', 'ID1026641317114'],
  ['23', 'Marcel Katupayan', 'FMIPAK', 'ID1026641317221'],
  ['24', 'Kristenia Saragih', 'FISH', 'ID1026641313618'],
]

export const FINALISTS_2026: Finalist2026[] = RAW.map(([no, name, faculty, nmid]) => ({
  no,
  name,
  faculty,
  nmid,
  gender: Number(no) % 2 === 1 ? 'nyong' : 'noni',
  photo: `/finalis/${no}.webp`,
  qris: `/qris/${no}.webp`,
}))

export function getFinalist2026(no: string) {
  return FINALISTS_2026.find((f) => f.no === no)
}

export const GENDER_LABEL: Record<FinalistGender, string> = { nyong: 'Nyong', noni: 'Noni' }
