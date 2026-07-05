import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Terminal } from '@/components/Terminal';
import { useGetSystemStatus, getGetSystemStatusQueryKey } from '@workspace/api-client-react';

export default function ConsolePage() {
  const { data: status } = useGetSystemStatus({
    query: {
      queryKey: getGetSystemStatusQueryKey(),
      refetchInterval: 5000,
    }
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-primary font-mono overflow-hidden crt-overlay selection:bg-primary/30 selection:text-primary">
      <Header status={status} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar status={status} />
        <main className="flex-1 relative overflow-hidden flex flex-col bg-black/40">
          <Terminal />
        </main>
      </div>
    </div>
  );
}
