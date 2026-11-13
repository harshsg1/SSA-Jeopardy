import { Component, type ReactNode } from 'react';
import { useStore } from './store/store';
import { useRoute, navigate } from './lib/router';
import { ConfirmHost, ToastHost, Button } from './components/ui';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Play from './pages/Play';
import SummaryPage from './pages/SummaryPage';
import Stats from './pages/Stats';
import Rules from './pages/Rules';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="panel max-w-md p-6 text-center">
          <h1 className="font-display text-3xl text-gold-500">Something went wrong</h1>
          <p className="mt-2 text-blue-100">{this.state.error.message}</p>
          <p className="mt-1 text-sm text-blue-200/60">Your saved games are safe.</p>
          <Button
            variant="gold"
            className="mt-4"
            onClick={() => {
              this.setState({ error: null });
              navigate('/');
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }
}

function Routes() {
  const route = useRoute();
  switch (route.name) {
    case 'edit':
      return <Editor key={route.id} gameId={route.id} />;
    case 'play':
      return <Play key={route.id} sessionId={route.id} />;
    case 'summary':
      return <SummaryPage sessionId={route.id} />;
    case 'stats':
      return <Stats />;
    case 'rules':
      return <Rules />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  return (
    <ErrorBoundary>
      {hydrated ? (
        <Routes />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="font-display gold-shimmer text-4xl">Loading…</div>
        </div>
      )}
      <ConfirmHost />
      <ToastHost />
    </ErrorBoundary>
  );
}
