// Stable IDs derived from DSKP numbering, shared by the app and the validation script.

export const F4_SUBJECT_IDS = ['phy', 'chem', 'bio', 'addmath', 'math', 'sej', 'pi', 'bm', 'bi'] as const
// Form 2, 3 and 5 subjects are prefixed ("f2", "f3", "f5") so their chapter IDs never clash with Form 4 (f3math-01 vs math-01).
export const F3_SUBJECT_IDS = ['f3bm', 'f3bi', 'f3math', 'f3sci', 'f3sej', 'f3geo', 'f3pi', 'f3rbt', 'f3ask', 'f3psv', 'f3muzik', 'f3pjk'] as const
export const F2_SUBJECT_IDS = ['f2bm', 'f2bi', 'f2math', 'f2sci', 'f2sej', 'f2geo', 'f2pi', 'f2rbt', 'f2ask', 'f2psv', 'f2muzik', 'f2pjk'] as const
export const F5_SUBJECT_IDS = ['f5phy', 'f5chem', 'f5bio', 'f5addmath', 'f5math', 'f5sej', 'f5pi', 'f5bm', 'f5bi'] as const
export const SUBJECT_IDS = [...F4_SUBJECT_IDS, ...F3_SUBJECT_IDS, ...F2_SUBJECT_IDS, ...F5_SUBJECT_IDS] as const

export type Form = 2 | 3 | 4 | 5
export const FORMS: readonly Form[] = [2, 3, 4, 5]
/** Folder under content/ for each form. */
export const formDir = (form: Form) => `form${form}`
/** Works for subject, chapter and subtopic IDs ('f3math', 'f3math-02', 'f3math-02-01' → 3). */
export const formOf = (id: string): Form => (id.startsWith('f2') ? 2 : id.startsWith('f3') ? 3 : id.startsWith('f5') ? 5 : 4)
export const subjectsOfForm = (form: Form): readonly string[] => (form === 2 ? F2_SUBJECT_IDS : form === 3 ? F3_SUBJECT_IDS : form === 5 ? F5_SUBJECT_IDS : F4_SUBJECT_IDS)

export const chapterId = (subjectId: string, number: number) => `${subjectId}-${String(number).padStart(2, '0')}`

/** '2.1' in 'phy-02' → 'phy-02-01' */
export const subtopicId = (chId: string, code: string) => `${chId}-${code.split('.')[1].padStart(2, '0')}`

export const subjectOf = (id: string) => id.split('-')[0]

/** 'phy-02-01' → 'phy-02' */
export const chapterOfSubtopic = (id: string) => id.split('-').slice(0, 2).join('-')
