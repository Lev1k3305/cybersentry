import React from 'react';
import { Terminal, Activity } from 'lucide-react';
import { useGetSecurityLog, getGetSecurityLogQueryKey } from '@workspace/api-client-react';

export function SecurityLog() {
  const { data: logs, isLoading, error } = useGetSecurityLog({
    query: {
      queryKey: getGetSecurityLogQueryKey(),
      refetchInterval: (query) => (query.state.status === 'error' ? false : 15000),
    }
  });
  
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (isLoading && !logs) {
    return (
      <div className="h-[420px] border border-border bg-[#070C14] rounded p-4 flex items-center justify-center">
        <span className="text-muted-foreground font-mono text-xs animate-pulse">INIT_LOG_STREAM...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[420px] border border-destructive/30 bg-[#070C14] rounded p-4 flex items-center justify-center">
        <span className="text-destructive font-mono text-xs">API недоступен</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2 uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-primary" />
          Журнал событий защиты (Security Log)
        </h3>
        <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          Прямой эфир (15s)
        </span>
      </div>

      <div 
        ref={scrollRef}
        className="h-[420px] border border-border bg-[#070C14] rounded p-3.5 overflow-y-auto font-mono text-xs"
        style={{
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6)'
        }}
      >
        <div className="space-y-1.5">
          {logs?.map((entry) => (
            <LogLine key={entry.id} entry={entry} />
          ))}
          {logs?.length === 0 && (
            <div className="text-muted-foreground opacity-50 italic"># Журнал пуст</div>
          )}
        </div>
      </div>
    </div>
  );
}

const LogLine = React.memo(function LogLine({ entry }: { entry: any }) {
  let levelColor = 'text-muted-foreground';
  
  if (entry.level === 'INFO') levelColor = 'text-primary';
  if (entry.level === 'WARN') levelColor = 'text-warning';
  if (entry.level === 'ALERT') levelColor = 'text-destructive font-bold';
  if (entry.level === 'OK') levelColor = 'text-safe';

  return (
    <div className="flex gap-3 hover:bg-secondary/40 px-2 py-1 rounded transition-colors group">
      <span className="text-muted-foreground opacity-60 shrink-0 w-20">
        {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })}
      </span>
      <span className={`${levelColor} shrink-0 w-12 font-semibold`}>
        [{entry.level}]
      </span>
      <span className="text-foreground/90 group-hover:text-foreground break-all">
        {entry.message}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.entry.id === nextProps.entry.id;
});
