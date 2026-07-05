import { SystemStatus } from '@workspace/api-client-react';

export function Header({ status }: { status?: SystemStatus }) {
  // Derive three indicator statuses from actual backend module names
  const getWorstStatus = (names: string[]) => {
    if (!status?.modules) return undefined;
    const matched = status.modules.filter(m => names.some(n => m.name.includes(n)));
    if (matched.some(m => m.status === 'offline')) return 'offline';
    if (matched.some(m => m.status === 'degraded')) return 'degraded';
    if (matched.length > 0) return 'online';
    return undefined;
  };
  const sysMod = { status: getWorstStatus(['ШИФРАТОР', 'ЖУРНАЛ']) };
  const netMod = { status: getWorstStatus(['СЕТЕВОЙ']) };
  const interceptMod = { status: getWorstStatus(['ПЕРЕХВАТЧИК', 'АНАЛИЗАТОР']) };

  const getDotColor = (s?: string) => {
    if (s === 'online') return 'bg-primary shadow-[0_0_8px_var(--color-primary)]';
    if (s === 'offline') return 'bg-destructive shadow-[0_0_8px_var(--color-destructive)]';
    if (s === 'degraded') return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]';
    return 'bg-primary shadow-[0_0_8px_var(--color-primary)]'; // Default green
  };

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg tracking-wider glow-text">[ ЦКЦ v2.7 ]</span>
        <span className="animate-pulse bg-primary w-2 h-5 inline-block ml-1"></span>
      </div>
      
      <div className="flex items-center gap-6 text-xs tracking-widest">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">СИСТЕМА</span>
          <div className={`w-3 h-3 rounded-full ${getDotColor(sysMod?.status || 'online')}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">СЕТЬ</span>
          <div className={`w-3 h-3 rounded-full ${getDotColor(netMod?.status || 'online')}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">ПЕРЕХВАТ</span>
          <div className={`w-3 h-3 rounded-full ${getDotColor(interceptMod?.status || 'offline')}`} />
        </div>
      </div>
    </header>
  );
}
