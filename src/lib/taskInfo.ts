import { useCallback } from 'react'
import { chapterById, subjectById, subtopicById } from '../content'
import type { SubjectId } from '../content/schema'
import { TOOLS } from '../content/toolIds'
import { useT } from '../i18n/useT'
import type { StudyTask } from '../planner/types'

export const TASK_ICON: Record<StudyTask['type'], string> = {
  intro: '📖', quiz: '❓', flashcards: '🃏', 'formula-drill': '∑', tool: '🧪', review: '🔁', rest: '🌿',
}

export interface TaskInfo { icon: string; title: string; subtitle: string; color: string; href: string }

const NEUTRAL = '#6d28d9'

export function useTaskInfo() {
  const { t, L } = useT()
  return useCallback((task: StudyTask): TaskInfo => {
    const q = `task=${encodeURIComponent(task.id)}`
    const icon = TASK_ICON[task.type]
    const ref = task.refId ?? ''
    const ch = chapterById[ref]
    const st = subtopicById[ref]
    const chLabel = (id: string) => {
      const c = chapterById[id]
      return `${L(subjectById[c.subjectId].name)} · ${c.number}. ${L(c.title)}`
    }
    const color = (id?: string) => (id ? subjectById[id as SubjectId]?.color ?? NEUTRAL : NEUTRAL)

    switch (task.type) {
      case 'intro':
        return { icon, title: t(ch?.written ? 'task.intro' : 'task.preview'), subtitle: ch ? chLabel(ch.id) : ref, color: color(ch?.subjectId), href: `/learn/${ch?.subjectId}/${ref}?${q}` }
      case 'review':
        if (st) return { icon, title: t('task.weak'), subtitle: `${st.code} ${L(st.title)}`, color: color(st.subjectId), href: `/practice/quiz?subtopic=${ref}&${q}` }
        return {
          icon, title: t('task.currentChapter'), subtitle: ch ? chLabel(ch.id) : ref, color: color(ch?.subjectId),
          href: ch?.written ? `/practice/quiz?chapter=${ref}&${q}` : `/learn/${ch?.subjectId}/${ref}?${q}`,
        }
      case 'quiz':
        if (ref === 'bridge') return { icon, title: t('task.bridge'), subtitle: 'Form 3 → Form 4', color: NEUTRAL, href: `/practice/quiz?set=bridge&${q}` }
        if (ref === 'mixed') return { icon, title: t('task.mixed'), subtitle: t('practice.mixed'), color: NEUTRAL, href: `/practice/quiz?mode=mixed&${q}` }
        if (ref.startsWith('subject:')) {
          const sid = ref.slice(8) as SubjectId
          return { icon, title: t('task.subjectQuiz'), subtitle: L(subjectById[sid].name), color: color(sid), href: `/practice/quiz?subject=${sid}&${q}` }
        }
        return { icon, title: t('task.quiz'), subtitle: ch ? chLabel(ch.id) : ref, color: color(ch?.subjectId), href: `/practice/quiz?chapter=${ref}&${q}` }
      case 'flashcards':
        return { icon, title: t('task.flashcards'), subtitle: t('practice.flashcards'), color: NEUTRAL, href: `/practice/flashcards?${q}` }
      case 'formula-drill':
        return { icon, title: t('task.formula-drill'), subtitle: '', color: NEUTRAL, href: `/practice/drill?${q}` }
      case 'tool': {
        const tool = TOOLS.find((x) => x.id === ref)
        return { icon, title: t('task.tool'), subtitle: tool ? L(tool.name) : ref, color: NEUTRAL, href: `/practice/tools/${ref}?${q}` }
      }
      case 'rest':
        return { icon, title: t('task.rest'), subtitle: '', color: '#64748b', href: `/practice/flashcards?${q}` }
    }
  }, [t, L])
}
