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
  | { type: 'CONFIRM_Q0' }
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
    botMsg('こんにちは♪ 僕はcocoだよ♪\nこれからいくつかの質問をするね。\nこれは診断や評価ではなく、今のあなたとお子さんの状態をやさしく整理するためのものだから安心してね。\n正解・不正解はないから「今の様子に近いもの」を気軽に選んでほしいの。\n（所要時間は約8分です）'),
  ],
  parentQuestionIndex: 0,
  childQuestionIndex: 0,
  parentAnswers: {},
  childChecks: initialChildChecks,
  currentChildSelections: [],
  resultId: null,
  parentSubType: null,
  childSubType: null,
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'START_QUIZ': {
      return {
        ...state,
        phase: 'q0_opening',
        messages: [
          ...state.messages,
          userMsg('はじめる'),
          botMsg('これからする質問は、「親であるあなたご自身について」「お子さんの今の様子について」の2つがあるよ'),
        ],
      }
    }

    case 'CONFIRM_Q0': {
      const q = parentQuestions[0]
      return {
        ...state,
        phase: 'parent_questions',
        messages: [
          ...state.messages,
          userMsg('理解しました'),
          botMsg('まずは、「親（またはサポートしている人）であるあなた」のことについて教えてほしいの♪'),
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
          botMsg('次は、お子さんの今の様子について近いものをいくつでも選んでね♪'),
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
      const parentResult = determineParentType(state.parentAnswers)
      const childResult = determineChildType(newChecks)
      const resultId = getResultId(parentResult.primary, childResult.primary)
      const result = results.find((r) => r.resultId === resultId)

      const currentText = result
        ? `今の現状を整理すると・・・\n\n「ママやパパなど相談者さん」は ${result.parentState}\n「お子さん」は ${result.childState}`
        : ''

      const letterText = result
        ? `【${result.title}】\n\n${result.letter}`
        : '結果を取得できませんでした。'

      const tryText = result
        ? `✨ やってみてもイイかも！\n\n① ${result.advices[0]}\n② ${result.advices[1]}\n③ ${result.advices[2]}`
        : ''

      const consultMsg =
        'もし「もう少し詳しく話してみたい」と感じたら、お試し40分相談（3,000円）を活用してみてね♪\n\n診断結果をもとに、今の親子の状態をいっしょに整理するお手伝いをしています。「誰かに一度聞いてもらいたい」と思ったときが、動き出すタイミングかもしれません。'

      const encourageMsg =
        '最後まで向き合ってくれて、ありがとう♪\n\n答えながら、いろんなことを感じてくれたかもしれないね。正解なんてないのに、真剣に選んでくれたこと、それだけでもう十分すごいことだよ。\n\n焦らなくて大丈夫。cocoはいつでもここにいるよ♪'

      return {
        ...state,
        phase: 'result',
        childChecks: newChecks,
        childQuestionIndex: nextIdx,
        currentChildSelections: [],
        resultId,
        parentSubType: parentResult.secondary,
        childSubType: childResult.secondary,
        messages: [
          ...state.messages,
          userMsg(userText),
          botMsg('最後まで答えてくれてありがとう。'),
          ...(currentText ? [botMsg(currentText)] : []),
          botMsg(letterText),
          ...(tryText ? [botMsg(tryText)] : []),
          botMsg(consultMsg),
          botMsg(encourageMsg),
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
        <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
          <img src="/avatar.png" alt="ぽけっと保健室" className="object-cover w-full h-full" />
        </div>
        <span className="font-bold text-base" style={{ color: 'var(--ecamo-text)' }}>
          ぽけっと保健室
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

        {state.phase === 'q0_opening' && (
          <button
            onClick={() => dispatch({ type: 'CONFIRM_Q0' })}
            className="w-full py-3 rounded-2xl font-bold text-white transition-all active:scale-95"
            style={{ background: 'var(--ecamo-primary)' }}
          >
            理解しました
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

        {state.phase === 'result' && null}
      </div>
    </div>
  )
}
