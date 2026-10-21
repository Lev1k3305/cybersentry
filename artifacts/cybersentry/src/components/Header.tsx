import React from 'react';
import { Terminal, Shield, Activity, Wifi, Menu, X } from 'lucide-react';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { data: healthData, isError } = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: (query) => (query.state.status === 'error' ? false : 15000),
    }
  });

  const [time, setTime] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = healthData?.status === 'ok' || healthData?.status === 'healthy';

  return (
    <header className="w-full border-b border-border bg-sidebar/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded border border-primary/30 text-primary shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono font-bold text-sm tracking-wider text-foreground">
                CyberSentry
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-2 border border-primary/20">
                INTELLIGENCE PLATFORM
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <div className="hidden md:flex items-center gap-2 bg-card px-2.5 py-1 rounded border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">SYS TIME:</span>
            <span className="text-foreground font-semibold">{time || '00:00:00 UTC'}</span>
          </div>

          <div className="flex items-center gap-2 bg-card px-2.5 py-1 rounded border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:inline">API:</span>
            {isError ? (
              <span className="inline-flex items-center gap-1.5 text-destructive font-semibold" title="API недоступен">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                API НЕДОСТУПЕН
              </span>
            ) : isHealthy ? (
              <span className="inline-flex items-center gap-1.5 text-safe font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
                ONLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-warning font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                CONNECTING
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
