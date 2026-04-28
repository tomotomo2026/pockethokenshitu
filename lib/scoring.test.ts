import { describe, it, expect } from 'vitest'
import { determineParentType, determineChildType, getResultId } from './scoring'
import type { ParentAnswer, ChildType } from './types'

describe('determineParentType', () => {
  it('returns the type with the highest score', () => {
    const answers: Record<string, ParentAnswer> = {
      Q1: 'よくある',      // P1 +3
      Q2: 'よくある',      // P1 +3
      Q3: 'まったくない',  // P2 +0
      Q4: 'まったくない',  // P2 +0
      Q5: 'まったくない',  // P3 +0
      Q6: 'まったくない',  // P3 +0
      Q7: 'まったくない',  // P4 +0
      Q8: 'まったくない',  // P4 +0
      Q9: 'まったくない',  // P5 +0
      Q10: 'まったくない', // P5 +0
      Q11: 'まったくない', // P6 +0
      Q12: 'まったくない', // P6 +0
    }
    expect(determineParentType(answers)).toBe('P1')
  })

  it('applies tiebreak priority [P6,P5,P3,P1,P2,P4] when scores are equal', () => {
    // P1 and P6 both score 6, P6 wins
    const answers: Record<string, ParentAnswer> = {
      Q1: 'よくある',      // P1 +3
      Q2: 'よくある',      // P1 +3
      Q3: 'まったくない',  // P2 +0
      Q4: 'まったくない',  // P2 +0
      Q5: 'まったくない',  // P3 +0
      Q6: 'まったくない',  // P3 +0
      Q7: 'まったくない',  // P4 +0
      Q8: 'まったくない',  // P4 +0
      Q9: 'まったくない',  // P5 +0
      Q10: 'まったくない', // P5 +0
      Q11: 'よくある',     // P6 +3
      Q12: 'よくある',     // P6 +3
    }
    expect(determineParentType(answers)).toBe('P6')
  })

  it('scores answers correctly: まったくない=0, あまりない=1, ときどきある=2, よくある=3', () => {
    const answers: Record<string, ParentAnswer> = {
      Q1: 'ときどきある',  // P1 +2
      Q2: 'あまりない',    // P1 +1  → P1 total=3
      Q3: 'よくある',      // P2 +3
      Q4: 'まったくない',  // P2 +0  → P2 total=3
      Q5: 'まったくない',  // P3 +0
      Q6: 'まったくない',  // P3 +0  → P3 total=0
      Q7: 'まったくない',  // P4 +0
      Q8: 'まったくない',  // P4 +0
      Q9: 'まったくない',  // P5 +0
      Q10: 'まったくない', // P5 +0
      Q11: 'まったくない', // P6 +0
      Q12: 'まったくない', // P6 +0
    }
    // P1=3, P2=3 tie → P1 wins over P2 in tiebreak
    expect(determineParentType(answers)).toBe('P1')
  })
})

describe('determineChildType', () => {
  it('returns the type with the most checks', () => {
    const checks: Record<ChildType, string[]> = {
      C1: ['C1-1', 'C1-2', 'C1-3', 'C1-4', 'C1-5'], // 5 checks
      C2: [],
      C3: [],
      C4: [],
      C5: [],
      C6: [],
      C7: [],
      C8: [],
    }
    expect(determineChildType(checks)).toBe('C1')
  })

  it('only considers types with ≥3 checks as candidates', () => {
    const checks: Record<ChildType, string[]> = {
      C1: ['C1-1', 'C1-2'], // 2 — not a candidate
      C2: ['C2-1', 'C2-2', 'C2-3'], // 3 — candidate
      C3: [],
      C4: [],
      C5: [],
      C6: [],
      C7: [],
      C8: [],
    }
    expect(determineChildType(checks)).toBe('C2')
  })

  it('applies tiebreak [C3,C1,C7,C2,C5,C6,C4,C8] when counts are equal', () => {
    // C1 and C3 both have 3 checks → C3 wins
    const checks: Record<ChildType, string[]> = {
      C1: ['C1-1', 'C1-2', 'C1-3'],
      C2: [],
      C3: ['C3-1', 'C3-2', 'C3-3'],
      C4: [],
      C5: [],
      C6: [],
      C7: [],
      C8: [],
    }
    expect(determineChildType(checks)).toBe('C3')
  })

  it('falls back to first tiebreak winner when no type reaches 3 checks', () => {
    // No candidate → use tiebreak across all types, C3 first
    const checks: Record<ChildType, string[]> = {
      C1: ['C1-1'],
      C2: ['C2-1'],
      C3: ['C3-1'],
      C4: [],
      C5: [],
      C6: [],
      C7: [],
      C8: [],
    }
    // All have 1 check, no candidate; fall back: max among all = 1, tiebreak C3,C1 → C3
    expect(determineChildType(checks)).toBe('C3')
  })
})

describe('getResultId', () => {
  it('maps P1+C1 → R01', () => {
    expect(getResultId('P1', 'C1')).toBe('R01')
  })

  it('maps P1+C8 → R08', () => {
    expect(getResultId('P1', 'C8')).toBe('R08')
  })

  it('maps P2+C1 → R09', () => {
    expect(getResultId('P2', 'C1')).toBe('R09')
  })

  it('maps P6+C8 → R48', () => {
    expect(getResultId('P6', 'C8')).toBe('R48')
  })
})
