import type { ParentType, ChildType, ParentAnswer, TypeScoreResult } from './types'
import { parentQuestions } from '@/data/parent-questions'

const ANSWER_SCORES: Record<ParentAnswer, number> = {
  'まったくない': 0,
  'あまりない': 1,
  'ときどきある': 2,
  'よくある': 3,
}

const PARENT_TIEBREAK: ParentType[] = ['P6', 'P5', 'P3', 'P1', 'P2', 'P4']
const CHILD_TIEBREAK: ChildType[] = ['C3', 'C1', 'C7', 'C2', 'C5', 'C6', 'C4', 'C8']

// 同点・近接スコア時にサブタイプを保持するしきい値
const PARENT_NEAR_THRESHOLD = 1
const CHILD_NEAR_THRESHOLD = 1

export function determineParentType(answers: Record<string, ParentAnswer>): TypeScoreResult<ParentType> {
  const scores: Record<ParentType, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }

  for (const q of parentQuestions) {
    const answer = answers[q.id]
    if (answer) {
      scores[q.type] += ANSWER_SCORES[answer]
    }
  }

  const maxScore = Math.max(...Object.values(scores))
  const tiedPrimary = PARENT_TIEBREAK.filter((t) => scores[t] === maxScore)
  const primary = tiedPrimary[0]

  const secondary =
    PARENT_TIEBREAK.find(
      (t) => t !== primary && scores[t] > 0 && maxScore - scores[t] <= PARENT_NEAR_THRESHOLD
    ) ?? null

  return { primary, secondary }
}

export function determineChildType(checks: Record<ChildType, string[]>): TypeScoreResult<ChildType> {
  const allTypes: ChildType[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']

  const candidates = allTypes.filter((t) => checks[t].length >= 3)
  const pool = candidates.length > 0 ? candidates : allTypes

  const maxCount = Math.max(...pool.map((t) => checks[t].length))
  const tiedPrimary = CHILD_TIEBREAK.filter((t) => pool.includes(t) && checks[t].length === maxCount)
  const primary = tiedPrimary[0]

  const secondary =
    CHILD_TIEBREAK.find(
      (t) =>
        t !== primary &&
        pool.includes(t) &&
        checks[t].length > 0 &&
        maxCount - checks[t].length <= CHILD_NEAR_THRESHOLD
    ) ?? null

  return { primary, secondary }
}

export function getResultId(parentType: ParentType, childType: ChildType): string {
  const p = parseInt(parentType.replace('P', ''))
  const c = parseInt(childType.replace('C', ''))
  const num = (p - 1) * 8 + c
  return `R${String(num).padStart(2, '0')}`
}
