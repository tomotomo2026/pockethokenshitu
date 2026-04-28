'use client'

import { useReducer, useEffect, useRef } from 'react'
import type { QuizState, QuizPhase, ParentAnswer, ChildType, ChatMessage } from '@/lib/types'
import { parentQuestions } from '@/data/parent-questions'
import { childQuestions } from '@/data/child-questions'
import { results } from '@/data/results'
import { determineParentType, determineChildType, getResultId } from '@/lib/scoring'
import { ChatBubble } from './ChatBubble'
import { SingleChoiceButtons, MultiChoiceButtons } from './ChoiceButtons'

const PARENT_ANSWERS: ParentAnswer[] = ['まったくない', 'あまりない', 'ときどきある', 'よくある']

type Action =
  | { type: 'START_QUIZ' }
  | { type: 'ANSWER_PARENT'; answer: ParentAnswer }
  | { type: 'TOGGLE_CHILD'; id: string }
  | { type: 'CONFIRM_CHILD' }
  | { type: 'ADD_BOT_MESSAGE'; text: string }

function makeId() {
  return Math.random().toString(36).slice(2)
}

function botMsg(text: string): ChatMessage {
  return { id: makeId(), sender: 'bot', text }
}

function userMsg(text: string): ChatMessage {
  return { id: makeId(), sender: 'user', text }
}

const initialChildChecks: Record<ChildType, string[]> = {
  C1: [], C2: [], C3: [], C4: [], C5: [], C6: [], C7: [], C8: [],
}

const initialState: QuizState = {
  phase: 'welcome',
  messages: [
    botMsg('こんにちは！ いいかもさんだよ🦆\nお子さんのことで、今どんなことを感じているか、一緒に整理してみよう。\n準備ができたら「はじめる」を押してね。'),
  ],
  parentQuestionIndex: 0,
  childQuestionIndex: 0,
  parentAnswers: {},
  childChecks: initialChildChecks,
  currentChildSelections: [],
  resultId: null,
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'START_QUIZ': {
      const q = parentQuestions[0]
      return {
        ...state,
        phase: 'parent_questions',
        messages: [
          ...state.messages,
          userMsg('はじめる'),
          botMsg('ありがとう。\nまず、あなた自身のことを少し聞かせてね。\nどれに近いか選んでみて。'),
          botMsg(q.text),
        ],
      }
    }

    case 'ANSWER_PARENT': {
      const idx = state.parentQuestionIndex
      const q = parentQuestions[idx]
      const newAnswers = { ...state.parentAnswers, [q.id]: action.answer }
      const nextIdx = idx + 1

      if (nextIdx < parentQuestions.length) {
        const nextQ = parentQuestions[nextIdx]
        return {
          ...state,
          parentAnswers: newAnswers,
          parentQuestionIndex: nextIdx,
          messages: [
            ...state.messages,
            userMsg(action.answer),
            botMsg(nextQ.text),
          ],
        }
      }

      // Transition to child questions
      const firstChild = childQuestions[0]
      return {
        ...state,
        phase: 'child_questions',
        parentAnswers: newAnswers,
        parentQuestionIndex: nextIdx,
        childQuestionIndex: 0,
        currentChildSelections: [],
        messages: [
          ...state.messages,
          userMsg(action.answer),
          botMsg('ありがとう。\n次は、お子さんのことを教えてね。\nあてはまるものを複数選んでOKだよ。'),
          botMsg(`【${firstChild.title}】\n${firstChild.questionText}`),
        ],
      }
    }

    case 'TOGGLE_CHILD': {
      const sel = state.currentChildSelections
      const newSel = sel.includes(action.id)
        ? sel.filter((x) => x !== action.id)
        : [...sel, action.id]
      return { ...state, currentChildSelections: newSel }
    }

    case 'CONFIRM_CHILD': {
      const idx = state.childQuestionIndex
      const cq = childQuestions[idx]
      const type = cq.id as ChildType
      const sel = state.currentChildSelections

      const selectedLabels = cq.choices
        .filter((c) => sel.includes(c.id))
        .map((c) => c.label)

      const userText =
        selectedLabels.length > 0 ? selectedLabels.join('、') : 'どれもあてはまらない'

      const newChecks: Record<ChildType, string[]> = {
        ...state.childChecks,
        [type]: sel,
      }

      const nextIdx = idx + 1

      if (nextIdx < childQuestions.length) {
        const nextChild = childQuestions[nextIdx]
        return {
          ...state,
          childChecks: newChecks,
          childQuestionIndex: nextIdx,
          currentChildSelections: [],
          messages: [
            ...state.messages,
            userMsg(userText),
            botMsg(`【${nextChild.title}】\n${nextChild.questionText}`),
          ],
        }
      }

      // Calculate result
      const parentType = determineParentType(state.parentAnswers)
      const childType = determineChildType(newChecks)
      const resultId = getResultId(parentType, childType)
      const result = results.find((r) => r.resultId === resultId)

      const resultText = result
        ? `${result.title}\n\n${result.body}`
        : '結果を取得できませんでした。'

      const adviceText = result
        ? `📌 アドバイスA\n${result.adviceA}\n\n📌 アドバイスB\n${result.adviceB}\n\n📌 アドバイスC\n${result.adviceC}`
        : ''

      return {
        ...state,
        phase: 'result',
        childChecks: newChecks,
        childQuestionIndex: nextIdx,
        currentChildSelections: [],
        resultId,
        messages: [
          ...state.messages,
          userMsg(userText),
          botMsg('全部教えてくれてありがとう🦆\n結果をお伝えするね。'),
          botMsg(resultText),
          ...(adviceText ? [botMsg(adviceText)] : []),
        ],
      }
    }

    default:
      return state
  }
}

export function ChatFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages.length])

  const currentChildQ =
    state.phase === 'child_questions' ? childQuestions[state.childQuestionIndex] : null

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Header */}
      <header
        className="flex items-center gap-2 px-4 py-3 border-b shadow-sm"
        style={{ background: '#FFFFFF', borderColor: '#EDE0D4' }}
      >
        <span className="text-2xl">🦆</span>
        <span className="font-bold text-base" style={{ color: 'var(--ecamo-text)' }}>
          いいかもさん
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {state.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-4 border-t" style={{ background: '#FFFAF5', borderColor: '#EDE0D4' }}>
        {state.phase === 'welcome' && (
          <button
            onClick={() => dispatch({ type: 'START_QUIZ' })}
            className="w-full py-3 rounded-2xl font-bold text-white transition-all active:scale-95"
            style={{ background: 'var(--ecamo-primary)' }}
          >
            はじめる
          </button>
        )}

        {state.phase === 'parent_questions' && (
          <SingleChoiceButtons
            choices={PARENT_ANSWERS}
            onSelect={(answer) => dispatch({ type: 'ANSWER_PARENT', answer })}
          />
        )}

        {state.phase === 'child_questions' && currentChildQ && (
          <MultiChoiceButtons
            choices={currentChildQ.choices}
            selected={state.currentChildSelections}
            onToggle={(id) => dispatch({ type: 'TOGGLE_CHILD', id })}
            onConfirm={() => dispatch({ type: 'CONFIRM_CHILD' })}
          />
        )}

        {state.phase === 'result' && (
          <p className="text-center text-sm" style={{ color: 'var(--ecamo-muted)' }}>
            診断が完了しました🦆
          </p>
        )}
      </div>
    </div>
  )
}
