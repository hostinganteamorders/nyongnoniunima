// Codes are internal identifiers, not abbreviations inferred from display names.
// Legacy SQLite faculty IDs also determine IDs for newly seeded programs.
export const ACADEMIC_CATALOG: readonly {
  id: string
  code: string
  legacyCode?: string
  name: string
  programs: readonly (readonly [code: string, name: string, active?: false])[]
}[] = [
  {
    id: 'fok', code: 'FIKKM', legacyCode: 'FOK',
    name: 'Fakultas Ilmu Keolahragaan dan Kesehatan',
    programs: [
      ['IK', 'Ilmu Keolahragaan'],
      ['PKO', 'Pendidikan Kepelatihan Olahraga'],
      ['PJKR', 'Pendidikan Jasmani, Kesehatan dan Rekreasi'],
      ['IKM', 'Ilmu Kesehatan Masyarakat'],
    ],
  },
  {
    id: 'fip', code: 'FIPP', legacyCode: 'FIP',
    name: 'Fakultas Ilmu Pendidikan dan Psikologi',
    programs: [
      ['PGSD', 'Pendidikan Guru Sekolah Dasar'],
      ['PSI', 'Psikologi'],
      ['PGPAUD', 'Pendidikan Anak Usia Dini'],
      ['BK', 'Bimbingan Konseling'],
      ['PLB', 'Pendidikan Khusus'],
    ],
  },
  {
    id: 'fish', code: 'FISH', name: 'Fakultas Ilmu Sosial dan Hukum',
    programs: [
      ['PG', 'Pendidikan Geografi'],
      ['GEO', 'Geografi'],
      ['IAN', 'Ilmu Administrasi Negara'],
      ['SOS', 'Sosiologi'],
      ['IH', 'Ilmu Hukum'],
      ['PIPS', 'Pendidikan IPS'],
      ['PS', 'Pendidikan Sejarah'],
      ['PPKN', 'PPKn'],
      ['IS', 'Ilmu Sosial', false],
    ],
  },
  {
    id: 'fmipa', code: 'FMIPAK', legacyCode: 'FMIPA',
    name: 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian',
    programs: [
      ['PKim', 'Pendidikan Kimia'],
      ['Kim', 'Kimia'],
      ['PBio', 'Pendidikan Biologi'],
      ['Bio', 'Biologi'],
      ['PFis', 'Pendidikan Fisika'],
      ['Fis', 'Fisika'],
      ['PGF', 'Pendidikan Geofisika'],
      ['IL', 'Ilmu Lingkungan'],
      ['PMat', 'Pendidikan Matematika'],
      ['PIPA', 'Pendidikan IPA'],
    ],
  },
  {
    id: 'fe', code: 'FEB', legacyCode: 'FE', name: 'Fakultas Ekonomi dan Bisnis',
    programs: [
      ['Akun', 'Akuntansi'],
      ['Man', 'Manajemen'],
      ['IE', 'Ilmu Ekonomi'],
      ['PE', 'Pendidikan Ekonomi'],
      ['D3MP', 'D3 Manajemen Perusahaan'],
    ],
  },
  {
    id: 'fbs', code: 'FBS', name: 'Fakultas Bahasa dan Seni',
    programs: [
      ['BSI', 'Bahasa dan Sastra Inggris'],
      ['PBInd', 'Pendidikan Bahasa dan Sastra Indonesia'],
      ['PBI', 'Pendidikan Bahasa Inggris'],
      ['PBJ', 'Pendidikan Bahasa Jepang'],
      ['PBJER', 'Pendidikan Bahasa Jerman'],
      ['PBP', 'Pendidikan Bahasa Prancis'],
      ['PBSM', 'Pendidikan Bahasa dan Sastra Mandarin'],
      ['PSR', 'Pendidikan Seni Rupa'],
      ['Sendratasik', 'Pendidikan Seni Drama, Tari dan Musik', false],
    ],
  },
  {
    id: 'ft', code: 'FT', name: 'Fakultas Teknik',
    programs: [
      ['PKK', 'Pendidikan Kesejahteraan Keluarga'],
      ['TS', 'Teknik Sipil'],
      ['PTE', 'Pendidikan Teknik Elektro'],
      ['TM', 'Teknik Mesin'],
      ['PTM', 'Pendidikan Teknik Mesin'],
      ['TI', 'Teknik Informatika'],
      ['PTIK', 'Pendidikan Teknik Informatika dan Komunikasi'],
      ['PTB', 'Pendidikan Teknik Bangunan', false],
    ],
  },
  {
    id: 'fk', code: 'FK', name: 'Fakultas Kedokteran',
    programs: [['Ked', 'Kedokteran'], ['PPD', 'Pendidikan Profesi Dokter']],
  },
]
