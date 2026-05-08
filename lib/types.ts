export type ParentType = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'
export type ChildType = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'
export type ParentAnswer = 'まったくない' | 'あまりない' | 'ときどきある' | 'よくある'

export interface ParentQuestion {
  id: string
  text: string
  type: ParentType
}

export interface ChildChoice {
  id: string
  label: string
}

export interface ChildQuestion {
  id: ChildType
  title: string
  questionText: string
  choices: ChildChoice[]
}

export interface DiagnosisResult {
  resultId: string
  parentType: ParentType
  childType: ChildType
  title: string
  parentState: string
  childState: string
  letter: string
  advices: [string, string, string]
}

// メインタイプとサブタイプ（同点・近接スコア時）
export interface TypeScoreResult<T> {
  primary: T
  secondary: T | null
}

export interface ChatMessage {
  id: string
  sender: 'bot' | 'user'
  text: string
}

export type QuizPhase =
  | 'welcome'
  | 'q0_opening'
  | 'parent_questions'
  | 'child_questions'
  | 'result'

export interface QuizState {
  phase: QuizPhase
  messages: ChatMessage[]
  parentQuestionIndex: number
  childQuestionIndex: number
  parentAnswers: Record<string, ParentAnswer>
  childChecks: Record<ChildType, string[]>
  currentChildSelections: string[]
  resultId: string | null
  parentSubType: ParentType | null
  childSubType: ChildType | null
}
