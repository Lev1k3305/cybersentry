import { SystemStatus } from '@workspace/api-client-react';

export function Sidebar({ status }: { status?: SystemStatus }) {
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <aside className="w-[280px] bg-card shrink-0 flex flex-col overflow-y-auto p-4 gap-6 border-r border-border">
      <div className="space-y-4">
        <h2 className="text-accent text-sm tracking-widest border-b border-border pb-1 glow-text-accent">СТАТУС СИСТЕМЫ</h2>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ЦП:</span>
            <span className="glow-text">{status?.cpu?.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="w-full bg-background h-2 rounded-none border border-border">
            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${status?.cpu || 0}%` }}></div>
          </div>
          
          <div className="flex justify-between mt-4">
            <span className="text-muted-foreground">ПАМЯТЬ:</span>
            <span className="glow-text">{status?.memory?.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="w-full bg-background h-2 rounded-none border border-border">
            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${status?.memory || 0}%` }}></div>
          </div>
          
          <div className="flex justify-between mt-4">
            <span className="text-muted-foreground">АПТАЙМ:</span>
            <span className="glow-text">{formatUptime(status?.uptime)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-accent text-sm tracking-widest border-b border-border pb-1 glow-text-accent">МОДУЛИ</h2>
        
        <div className="space-y-3 text-sm">
          {status?.modules?.length ? status.modules.map((m, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-muted-foreground truncate pr-2">{m.name.toUpperCase()}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">{m.latency ? `${m.latency}ms` : '---'}</span>
                <div className={`w-2 h-2 rounded-full ${
                  m.status === 'online' ? 'bg-primary shadow-[0_0_5px_var(--color-primary)]' :
                  m.status === 'degraded' ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]' :
                  'bg-destructive shadow-[0_0_5px_var(--color-destructive)]'
                }`} />
              </div>
            </div>
          )) : (
            <div className="text-muted-foreground animate-pulse">ОЖИДАНИЕ ДАННЫХ...</div>
          )}
        </div>
      </div>
    </aside>
  );
}
