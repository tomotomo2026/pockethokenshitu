import type { ParentType, ChildType, ParentAnswer } from './types'
import { parentQuestions } from '@/data/parent-questions'

const ANSWER_SCORES: Record<ParentAnswer, number> = {
  'まったくない': 0,
  'あまりない': 1,
  'ときどきある': 2,
  'よくある': 3,
}

const PARENT_TIEBREAK: ParentType[] = ['P6', 'P5', 'P3', 'P1', 'P2', 'P4']
const CHILD_TIEBREAK: ChildType[] = ['C3', 'C1', 'C7', 'C2', 'C5', 'C6', 'C4', 'C8']

export function determineParentType(answers: Record<string, ParentAnswer>): ParentType {
  const scores: Record<ParentType, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }

  for (const q of parentQuestions) {
    const answer = answers[q.id]
    if (answer) {
      scores[q.type] += ANSWER_SCORES[answer]
    }
  }

  const maxScore = Math.max(...Object.values(scores))
  const tied = PARENT_TIEBREAK.filter((t) => scores[t] === maxScore)
  return tied[0]
}

export function determineChildType(checks: Record<ChildType, string[]>): ChildType {
  const allTypes: ChildType[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']

  const candidates = allTypes.filter((t) => checks[t].length >= 3)
  const pool = candidates.length > 0 ? candidates : allTypes

  const maxCount = Math.max(...pool.map((t) => checks[t].length))
  const tied = CHILD_TIEBREAK.filter((t) => pool.includes(t) && checks[t].length === maxCount)
  return tied[0]
}

export function getResultId(parentType: ParentType, childType: ChildType): string {
  const p = parseInt(parentType.replace('P', ''))
  const c = parseInt(childType.replace('C', ''))
  const num = (p - 1) * 8 + c
  return `R${String(num).padStart(2, '0')}`
}
