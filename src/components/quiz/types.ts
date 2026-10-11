import type { Question } from '../../content/schema'
import type { QuizResponse } from '../../lib/quizCheck'

export type Q<T extends Question['type']> = Extract<Question, { type: T }>

export interface QProps<T extends Question['type']> {
  q: Q<T>
  value: QuizResponse | undefined
  onChange: (v: QuizResponse) => void
  submitted: boolean
}

export const optionClass = (state: 'idle' | 'selected' | 'correct' | 'wrong' | 'missed') =>
  ({
    idle: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
    selected: 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/20 dark:bg-teal-950/50',
    correct: 'border-green-600 bg-green-50 dark:bg-green-950/50',
    wrong: 'border-red-500 bg-red-50 dark:bg-red-950/40',
    missed: 'border-green-600 border-dashed bg-white dark:bg-slate-900',
  })[state]
