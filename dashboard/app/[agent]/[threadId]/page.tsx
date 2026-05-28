import { notFound } from 'next/navigation';
import ChatSurface from '@/components/chat/ChatSurface';
import { getThread, listMessages, listThreads } from '@/lib/chat';
import { getCouncilPlaceholder, isCouncilAgent } from '@/lib/council';
import { getModeContext } from '@/lib/mode';
import { readPersona } from '@/lib/personas';

export const dynamic = 'force-dynamic';

type Props = {
  params: {
    agent: string;
    threadId: string;
  };
};

export default async function CouncilThreadPage({ params }: Props) {
  if (!isCouncilAgent(params.agent)) {
    notFound();
  }

  const thread = getThread(Number(params.threadId));
  if (!thread || thread.agent !== params.agent) {
    notFound();
  }

  const [persona, modeContext] = await Promise.all([readPersona(params.agent), getModeContext()]);
  const threadResult = listThreads(params.agent, '', 20, 0);

  return (
    <ChatSurface
      agent={params.agent}
      personaMarkdown={persona.body}
      placeholder={getCouncilPlaceholder(modeContext.mode)}
      initialThreads={threadResult.items}
      initialThreadId={thread.id}
      initialMessages={listMessages(thread.id)}
      initialTotalThreads={threadResult.total}
    />
  );
}
