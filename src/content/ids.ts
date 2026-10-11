// Stable IDs derived from DSKP numbering, shared by the app and the validation script.

export const SUBJECT_IDS = ['phy', 'chem', 'bio', 'addmath', 'math'] as const

export const chapterId = (subjectId: string, number: number) => `${subjectId}-${String(number).padStart(2, '0')}`

/** '2.1' in 'phy-02' → 'phy-02-01' */
export const subtopicId = (chId: string, code: string) => `${chId}-${code.split('.')[1].padStart(2, '0')}`

export const subjectOf = (id: string) => id.split('-')[0]

/** 'phy-02-01' → 'phy-02' */
export const chapterOfSubtopic = (id: string) => id.split('-').slice(0, 2).join('-')
