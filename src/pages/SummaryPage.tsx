import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import { Button } from '../components/ui';
import { Summary } from '../components/play/Summary';

export default function SummaryPage({ sessionId }: { sessionId: string }) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  if (!session)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-xl">Game record not found.</p>
        <Button variant="gold" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );
  return <Summary session={session} />;
}
