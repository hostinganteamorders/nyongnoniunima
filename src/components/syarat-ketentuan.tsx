import { CheckCircle2 } from 'lucide-react'

const SYARAT: string[] = [
  'Mahasiswa aktif Universitas Negeri Manado',
  'Minimal semester 1 dan maksimal semester 7',
  'IPK minimal 3.00 untuk semester 3 ke atas',
  'Batas usia 22 tahun (364 hari) sebelum audisi',
  'Berkepribadian baik',
  'Berwawasan luas',
  'Berpenampilan menarik',
  'Memiliki kemampuan berbahasa asing',
  'Sehat secara jasmani dan rohani',
  'Belum menikah',
  'Tidak bertato',
  'Memiliki tubuh proporsional dengan tinggi badan: Nyong 170 cm, Noni 160 cm',
]

export function SyaratKetentuan() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="bg-white rounded-xxl border border-border shadow-sm p-6 md:p-10">
          <div className="text-center mb-8">
            <span className="text-caption text-primary-blue font-semibold tracking-widest">PERSYARATAN</span>
            <h2 className="text-display-md text-dark-text mt-2">Syarat &amp; Ketentuan</h2>
            <div className="w-16 h-1 bg-accent mx-auto mt-4" />
          </div>
          <ul className="space-y-3">
            {SYARAT.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <span className="text-body text-dark-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
