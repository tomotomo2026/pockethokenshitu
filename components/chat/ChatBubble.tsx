'use client'

import type { ChatMessage } from '@/lib/types'

interface Props {
  message: ChatMessage
}

export function ChatBubble({ message }: Props) {
  const isBot = message.sender === 'bot'

  if (isBot) {
    return (
      <div className="flex items-end gap-2 animate-fade-in">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl shadow-sm"
          style={{ background: 'var(--ecamo-primary-light)' }}
        >
          🦆
        </div>
        <div
          className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
          style={{ background: 'var(--ecamo-bubble-bot)', color: 'var(--ecamo-text)', border: '1px solid #EDE0D4' }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end animate-fade-in">
      <div
        className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
        style={{ background: 'var(--ecamo-bubble-user)', color: '#FFFFFF' }}
      >
        {message.text}
      </div>
    </div>
  )
}
