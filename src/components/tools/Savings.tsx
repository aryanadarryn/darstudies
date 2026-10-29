// Savings and credit (Form 3 Mathematics): simple interest, compound interest and a flat-rate loan.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Field, Note, Tabs, num, useTr } from './toolUi'

const rm = (x: number) => `RM${x.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const PERIODS = [
  { n: 1, en: 'yearly', bm: 'tahunan' }, { n: 2, en: 'half-yearly', bm: 'setengah tahun' },
  { n: 4, en: 'quarterly', bm: 'suku tahun' }, { n: 12, en: 'monthly', bm: 'bulanan' },
]

export default function Savings() {
  const { t } = useTr()
  const [mode, setMode] = useState<'simple' | 'compound' | 'loan'>('compound')
  const [P, setP] = useState('5000')
  const [r, setR] = useState('4')
  const [years, setYears] = useState('5')
  const [n, setN] = useState(12)

  const p = num(P), rate = num(r), tt = num(years)
  const ready = p !== undefined && p > 0 && rate !== undefined && rate >= 0 && tt !== undefined && tt > 0
  const R = (rate ?? 0) / 100
  const simple = ready ? p! * R * tt! : 0
  const mv = ready ? p! * (1 + R / n) ** (n * tt!) : 0
  const loanTotal = ready ? p! + p! * R * tt! : 0

  const yearsList = ready ? Array.from({ length: Math.min(Math.ceil(tt!), 30) }, (_, i) => i + 1) : []

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[
        { k: 'simple', label: t('Simple interest', 'Faedah mudah') }, { k: 'compound', label: t('Compound interest', 'Faedah kompaun') }, { k: 'loan', label: t('Loan', 'Pinjaman') },
      ]} />
      <Field sym="P" label={mode === 'loan' ? t('Loan amount', 'Jumlah pinjaman') : t('Principal', 'Prinsipal')} unit="RM" value={P} onChange={setP} />
      <Field sym="r" label={mode === 'loan' ? t('Flat interest rate a year', 'Kadar faedah sama rata setahun') : t('Interest rate a year', 'Kadar faedah setahun')} unit="%" value={r} onChange={setR} />
      <Field sym="t" label={t('Time', 'Masa')} unit={t('years', 'tahun')} value={years} onChange={setYears} />
      {mode === 'compound' && (
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((x) => (
            <button key={x.n} onClick={() => setN(x.n)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${n === x.n ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {t('Compounded', 'Dikompaun')} {t(x.en, x.bm)} (n = {x.n})
            </button>
          ))}
        </div>
      )}
      {!ready ? <Note tone="warn">{t('Enter a positive amount, rate and time.', 'Masukkan jumlah, kadar dan masa yang positif.')}</Note> : mode === 'simple' ? (
        <>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60"><Katex tex={`I = Prt = ${p} \\times ${R} \\times ${tt}`} /></div>
          <Note tone="ok">{t('Interest', 'Faedah')} = <strong>{rm(simple)}</strong> · {t('Total', 'Jumlah')} = <strong>{rm(p! + simple)}</strong></Note>
        </>
      ) : mode === 'compound' ? (
        <>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60">
            <Katex tex={`MV = P\\left(1 + \\frac{r}{n}\\right)^{nt} = ${p}\\left(1 + \\frac{${R}}{${n}}\\right)^{${n} \\times ${tt}}`} />
          </div>
          <Note tone="ok">
            {t('Matured value', 'Nilai matang')} = <strong>{rm(mv)}</strong> · {t('interest earned', 'faedah diperoleh')} = {rm(mv - p!)}<br />
            {t('Simple interest would give', 'Faedah mudah akan memberi')} {rm(p! + simple)} — {t('compounding adds', 'pengkompaunan menambah')} {rm(mv - p! - simple)}
          </Note>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs muted dark:border-slate-700"><th className="py-1">{t('Year', 'Tahun')}</th><th className="py-1 text-right">{t('Compound', 'Kompaun')}</th><th className="py-1 text-right">{t('Simple', 'Mudah')}</th></tr></thead>
            <tbody>
              {yearsList.map((y) => {
                const yy = Math.min(y, tt!)
                return (
                  <tr key={y} className="border-b border-slate-100 tabular-nums dark:border-slate-800">
                    <td className="py-1">{yy}</td><td className="py-1 text-right">{rm(p! * (1 + R / n) ** (n * yy))}</td><td className="py-1 text-right">{rm(p! * (1 + R * yy))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60"><Katex tex={`A = P + Prt = ${p} + ${p} \\times ${R} \\times ${tt}`} /></div>
          <Note tone="ok">
            {t('Total repayment', 'Jumlah bayaran balik')} = <strong>{rm(loanTotal)}</strong> ({t('interest', 'faedah')} {rm(loanTotal - p!)})<br />
            {t('Monthly instalment', 'Ansuran bulanan')} = {rm(loanTotal)} ÷ {Math.round(tt! * 12)} = <strong>{rm(loanTotal / (tt! * 12))}</strong>
          </Note>
          <p className="text-xs muted">{t('Personal and car loans often use a flat rate: interest is charged on the whole original loan for the whole period.', 'Pinjaman peribadi dan kereta biasanya menggunakan kadar sama rata: faedah dikenakan ke atas pinjaman asal sepanjang tempoh.')}</p>
        </>
      )}
    </div>
  )
}
