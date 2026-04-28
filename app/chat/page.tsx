import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ChatFlow } from '@/components/chat/ChatFlow'

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <ChatFlow />
}
