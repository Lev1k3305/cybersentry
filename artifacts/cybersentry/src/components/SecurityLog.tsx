import React from 'react';
import { Terminal } from 'lucide-react';
import { useGetSecurityLog, getGetSecurityLogQueryKey } from '@workspace/api-client-react';

export function SecurityLog() {
  const { data: logs, isLoading, error } = useGetSecurityLog({
    query: { queryKey: getGetSecurityLogQueryKey(), refetchInterval: 10000 }
  });
  
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (isLoading && !logs) {
    return (
      <div className="h-[500px] border border-border/50 bg-[#0a0a0a] rounded-md p-4 flex items-center justify-center">
        <span className="text-muted-foreground font-mono animate-pulse">INIT_LOG_STREAM...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] border border-destructive/50 bg-[#0a0a0a] rounded-md p-4 flex items-center justify-center">
        <span className="text-destructive font-mono">ERR_CONNECTING_TO_LOG_STREAM</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-mono text-foreground flex items-center gap-2 uppercase tracking-widest">
          <Terminal className="w-5 h-5 text-primary" />
          Журнал событий
        </h3>
        <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          Прямой эфир (10s)
        </span>
      </div>

      <div 
        ref={scrollRef}
        className="h-[500px] border border-border/50 bg-[#0a0a0a] rounded-md p-4 overflow-y-auto font-mono text-sm"
        style={{
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      >
        <div className="space-y-2">
          {logs?.map((entry) => (
            <LogLine key={entry.id} entry={entry} />
          ))}
          {logs?.length === 0 && (
            <div className="text-muted-foreground opacity-50"># Журнал пуст</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: any }) {
  let levelColor = 'text-muted-foreground';
  
  if (entry.level === 'INFO') levelColor = 'text-primary';
  if (entry.level === 'WARN') levelColor = 'text-warning';
  if (entry.level === 'ALERT') levelColor = 'text-destructive';
  if (entry.level === 'OK') levelColor = 'text-safe';

  return (
    <div className="flex gap-4 hover:bg-white/5 px-2 py-1 rounded transition-colors group">
      <span className="text-muted-foreground opacity-50 shrink-0 w-24">
        {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })}
      </span>
      <span className={`${levelColor} shrink-0 w-14 font-bold`}>
        [{entry.level}]
      </span>
      <span className="text-foreground/80 group-hover:text-foreground break-all">
        {entry.message}
      </span>
    </div>
  );
}
