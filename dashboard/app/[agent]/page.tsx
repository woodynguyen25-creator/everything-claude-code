import { notFound } from 'next/navigation';
import ChatSurface from '@/components/chat/ChatSurface';
import { getLatestThread, listMessages, listThreads } from '@/lib/chat';
import { getCouncilPlaceholder, isCouncilAgent } from '@/lib/council';
import { getModeContext } from '@/lib/mode';
import { readPersona } from '@/lib/personas';

export const dynamic = 'force-dynamic';

type Props = {
  params: {
    agent: string;
  };
};

export default async function CouncilAgentPage({ params }: Props) {
  if (!isCouncilAgent(params.agent)) {
    notFound();
  }

  const [persona, modeContext] = await Promise.all([readPersona(params.agent), getModeContext()]);
  const latestThread = getLatestThread(params.agent);
  const initialMessages = latestThread ? listMessages(latestThread.id) : [];
  const threadResult = listThreads(params.agent, '', 20, 0);

  return (
    <ChatSurface
      agent={params.agent}
      personaMarkdown={persona.body}
      placeholder={getCouncilPlaceholder(modeContext.mode)}
      initialThreads={threadResult.items}
      initialThreadId={latestThread?.id ?? null}
      initialMessages={initialMessages}
      initialTotalThreads={threadResult.total}
    />
  );
}
