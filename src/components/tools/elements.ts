// Element data for the periodic table tool. Masses are standard atomic weights (1 d.p.); [n] = most stable isotope.
export type Category =
  | 'alkali' | 'alkaline-earth' | 'transition' | 'post-transition' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble' | 'lanthanide' | 'actinide'

export interface Element { z: number; symbol: string; name: string; bm?: string; mass: string; category: Category; group?: number; period: number; fRow?: 1 | 2 }

const RAW = `H Hydrogen 1.0|He Helium 4.0|Li Lithium 6.9|Be Beryllium 9.0|B Boron 10.8|C Carbon 12.0|N Nitrogen 14.0|O Oxygen 16.0|F Fluorine 19.0|Ne Neon 20.2|
Na Sodium 23.0|Mg Magnesium 24.3|Al Aluminium 27.0|Si Silicon 28.1|P Phosphorus 31.0|S Sulfur 32.1|Cl Chlorine 35.5|Ar Argon 39.9|K Potassium 39.1|Ca Calcium 40.1|
Sc Scandium 45.0|Ti Titanium 47.9|V Vanadium 50.9|Cr Chromium 52.0|Mn Manganese 54.9|Fe Iron 55.8|Co Cobalt 58.9|Ni Nickel 58.7|Cu Copper 63.5|Zn Zinc 65.4|
Ga Gallium 69.7|Ge Germanium 72.6|As Arsenic 74.9|Se Selenium 79.0|Br Bromine 79.9|Kr Krypton 83.8|Rb Rubidium 85.5|Sr Strontium 87.6|Y Yttrium 88.9|Zr Zirconium 91.2|
Nb Niobium 92.9|Mo Molybdenum 96.0|Tc Technetium [98]|Ru Ruthenium 101.1|Rh Rhodium 102.9|Pd Palladium 106.4|Ag Silver 107.9|Cd Cadmium 112.4|In Indium 114.8|Sn Tin 118.7|
Sb Antimony 121.8|Te Tellurium 127.6|I Iodine 126.9|Xe Xenon 131.3|Cs Caesium 132.9|Ba Barium 137.3|La Lanthanum 138.9|Ce Cerium 140.1|Pr Praseodymium 140.9|Nd Neodymium 144.2|
Pm Promethium [145]|Sm Samarium 150.4|Eu Europium 152.0|Gd Gadolinium 157.3|Tb Terbium 158.9|Dy Dysprosium 162.5|Ho Holmium 164.9|Er Erbium 167.3|Tm Thulium 168.9|Yb Ytterbium 173.0|
Lu Lutetium 175.0|Hf Hafnium 178.5|Ta Tantalum 180.9|W Tungsten 183.8|Re Rhenium 186.2|Os Osmium 190.2|Ir Iridium 192.2|Pt Platinum 195.1|Au Gold 197.0|Hg Mercury 200.6|
Tl Thallium 204.4|Pb Lead 207.2|Bi Bismuth 209.0|Po Polonium [209]|At Astatine [210]|Rn Radon [222]|Fr Francium [223]|Ra Radium [226]|Ac Actinium [227]|Th Thorium 232.0|
Pa Protactinium 231.0|U Uranium 238.0|Np Neptunium [237]|Pu Plutonium [244]|Am Americium [243]|Cm Curium [247]|Bk Berkelium [247]|Cf Californium [251]|Es Einsteinium [252]|Fm Fermium [257]|
Md Mendelevium [258]|No Nobelium [259]|Lr Lawrencium [266]|Rf Rutherfordium [267]|Db Dubnium [268]|Sg Seaborgium [269]|Bh Bohrium [270]|Hs Hassium [277]|Mt Meitnerium [278]|Ds Darmstadtium [281]|
Rg Roentgenium [282]|Cn Copernicium [285]|Nh Nihonium [286]|Fl Flerovium [289]|Mc Moscovium [290]|Lv Livermorium [293]|Ts Tennessine [294]|Og Oganesson [294]`

// Malaysian (BM) names where they differ from English.
const BM: Record<string, string> = {
  H: 'Hidrogen', Li: 'Litium', Be: 'Berilium', C: 'Karbon', O: 'Oksigen', F: 'Fluorin', Na: 'Natrium', Si: 'Silikon',
  P: 'Fosforus', Cl: 'Klorin', K: 'Kalium', Ca: 'Kalsium', Sc: 'Skandium', Cr: 'Kromium', Mn: 'Mangan', Fe: 'Ferum (besi)',
  Co: 'Kobalt', Ni: 'Nikel', Cu: 'Kuprum', Zn: 'Zink', Ga: 'Galium', As: 'Arsenik', Br: 'Bromin', Kr: 'Kripton',
  Ag: 'Argentum (perak)', Sn: 'Stanum', I: 'Iodin', Xe: 'Xenon', Cs: 'Sesium', Au: 'Aurum (emas)', Hg: 'Merkuri', Pb: 'Plumbum',
}

const NONMETALS = new Set([1, 6, 7, 8, 15, 16, 34])
const HALOGENS = new Set([9, 17, 35, 53, 85, 117])
const NOBLE = new Set([2, 10, 18, 36, 54, 86, 118])
const METALLOIDS = new Set([5, 14, 32, 33, 51, 52])
const ALKALI = new Set([3, 11, 19, 37, 55, 87])
const ALKALINE = new Set([4, 12, 20, 38, 56, 88])

function position(z: number): { period: number; group?: number; fRow?: 1 | 2 } {
  if (z === 1) return { period: 1, group: 1 }
  if (z === 2) return { period: 1, group: 18 }
  if (z <= 18) {
    const period = z <= 10 ? 2 : 3
    const i = z - (period === 2 ? 2 : 10) // 1..8
    return { period, group: i <= 2 ? i : i + 10 }
  }
  if (z <= 54) {
    const period = z <= 36 ? 4 : 5
    return { period, group: z - (period === 4 ? 18 : 36) }
  }
  const period = z <= 86 ? 6 : 7
  const start = period === 6 ? 54 : 86
  const i = z - start
  if (i <= 2) return { period, group: i }
  if (i <= 17) return { period, fRow: period === 6 ? 1 : 2 } // La–Lu, Ac–Lr
  return { period, group: i - 14 }
}

function category(z: number, group?: number, fRow?: number): Category {
  if (fRow) return fRow === 1 ? 'lanthanide' : 'actinide'
  if (ALKALI.has(z)) return 'alkali'
  if (ALKALINE.has(z)) return 'alkaline-earth'
  if (NOBLE.has(z)) return 'noble'
  if (HALOGENS.has(z)) return 'halogen'
  if (METALLOIDS.has(z)) return 'metalloid'
  if (NONMETALS.has(z)) return 'nonmetal'
  if (group && group >= 3 && group <= 12) return 'transition'
  return 'post-transition'
}

export const ELEMENTS: Element[] = RAW.replace(/\n/g, '').split('|').map((entry, i) => {
  const [symbol, name, mass] = entry.trim().split(' ')
  const z = i + 1
  const pos = position(z)
  return { z, symbol, name, bm: BM[symbol], mass, category: category(z, pos.group, pos.fRow), ...pos }
})

/** 2.8.8 style arrangement — the Form 4 syllabus uses it for Z ≤ 20. */
export function electronArrangement(z: number): string | undefined {
  if (z > 20) return undefined
  const shells = [2, 8, 8, 2]
  const out: number[] = []
  let left = z
  for (const cap of shells) {
    if (left <= 0) break
    const n = Math.min(cap, left)
    out.push(n)
    left -= n
  }
  return out.join('.')
}

export const CATEGORY_INFO: Record<Category, { color: string; en: string; bm: string }> = {
  alkali: { color: '#f87171', en: 'Alkali metal', bm: 'Logam alkali' },
  'alkaline-earth': { color: '#fb923c', en: 'Alkaline earth metal', bm: 'Logam alkali bumi' },
  transition: { color: '#facc15', en: 'Transition element', bm: 'Unsur peralihan' },
  'post-transition': { color: '#94a3b8', en: 'Other metal', bm: 'Logam lain' },
  metalloid: { color: '#2dd4bf', en: 'Metalloid', bm: 'Separuh logam' },
  nonmetal: { color: '#4ade80', en: 'Non-metal', bm: 'Bukan logam' },
  halogen: { color: '#38bdf8', en: 'Halogen', bm: 'Halogen' },
  noble: { color: '#a78bfa', en: 'Noble gas', bm: 'Gas adi' },
  lanthanide: { color: '#f9a8d4', en: 'Lanthanide', bm: 'Lantanida' },
  actinide: { color: '#f0abfc', en: 'Actinide', bm: 'Aktinida' },
}
