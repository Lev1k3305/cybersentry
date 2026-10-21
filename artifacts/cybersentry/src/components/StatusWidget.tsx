import React from 'react';
import { Shield, Activity, Wifi, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';

export function StatusWidget() {
  const { data: health, isLoading, isError } = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 15000,
    }
  });

  const isOnline = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <Card className="border-border bg-card relative overflow-hidden">
      <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <div className={`p-3.5 rounded-lg border ${
          isOnline
            ? 'bg-safe/10 border-safe/30 text-safe'
            : isError
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : 'bg-primary/10 border-primary/30 text-primary'
        }`}>
          <Shield className="w-8 h-8" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base md:text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
              Состояние OSINT Подсистем
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
              isOnline
                ? 'bg-safe/10 border-safe/30 text-safe'
                : isError
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}>
              {isLoading ? 'Проверка...' : isOnline ? 'Все службы активны' : 'Ограниченная связь'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            Мониторинг базы данных спама, скомпрометированных учётных записей и публичных DNS/RDAP реестров.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 bg-secondary/50 border border-border px-2.5 py-1 rounded text-muted-foreground">
              <Database className="w-3 h-3 text-primary" />
              <span>База утечек: <strong className="text-foreground">Синхронизирована</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/50 border border-border px-2.5 py-1 rounded text-muted-foreground">
              <Wifi className="w-3 h-3 text-accent" />
              <span>Сеть OSINT: <strong className="text-foreground">Готова к запросам</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/50 border border-border px-2.5 py-1 rounded text-muted-foreground">
              <Activity className="w-3 h-3 text-safe" />
              <span>Журнал событий: <strong className="text-foreground">В эфире</strong></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
