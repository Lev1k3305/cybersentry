import React from 'react';
import { Search, AlertTriangle, ShieldCheck, AlertOctagon, PhoneCall, Clock } from 'lucide-react';
import { useCheckPhone } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PhoneCheck() {
  const [phone, setPhone] = React.useState('');
  const checkPhone = useCheckPhone();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    checkPhone.mutate({ data: { phone } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          АНАЛИЗ РЕПУТАЦИИ ТЕЛЕФОНА
        </h3>
        <p className="text-muted-foreground text-sm">
          Проверьте номер по базам спамеров, мошенников и нежелательных звонков.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Введите номер телефона для проверки..."
          className="font-mono text-lg py-6 bg-secondary/30"
          disabled={checkPhone.isPending}
        />
        <Button 
          type="submit" 
          size="lg" 
          className="py-6 px-8 font-mono tracking-wide"
          disabled={checkPhone.isPending || !phone.trim()}
        >
          {checkPhone.isPending ? 'Анализ...' : 'Проверить'}
        </Button>
      </form>

      {checkPhone.isPending && (
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 bg-muted/20" />
            <Skeleton className="h-4 w-2/3 bg-muted/20" />
            <Skeleton className="h-20 w-full bg-muted/20" />
          </CardContent>
        </Card>
      )}

      {checkPhone.data && !checkPhone.isPending && (
        <PhoneResultCard result={checkPhone.data} />
      )}
    </div>
  );
}

function PhoneResultCard({ result }: { result: any }) {
  const isSafe = result.risk === 'safe';
  const isWarning = result.risk === 'warning';
  const isDanger = result.risk === 'danger';

  let borderColor = 'border-safe/30';
  let bgColor = 'bg-safe/5';
  let icon = <ShieldCheck className="w-8 h-8 text-safe" />;
  let badgeColor = 'bg-safe text-safe-foreground';
  
  if (isWarning) {
    borderColor = 'border-warning/30';
    bgColor = 'bg-warning/5';
    icon = <AlertTriangle className="w-8 h-8 text-warning" />;
    badgeColor = 'bg-warning text-warning-foreground';
  } else if (isDanger) {
    borderColor = 'border-destructive/30';
    bgColor = 'bg-destructive/5';
    icon = <AlertOctagon className="w-8 h-8 text-destructive" />;
    badgeColor = 'bg-destructive text-destructive-foreground';
  }

  return (
    <Card className={`border ${borderColor} ${bgColor} overflow-hidden`}>
      <CardContent className="p-0">
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between bg-background/40`}>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h4 className="font-mono text-lg font-bold text-foreground">
                {result.phone}
              </h4>
              <p className="text-sm text-muted-foreground">{result.label}</p>
            </div>
          </div>
          <Badge className={`${badgeColor} font-mono tracking-widest uppercase`}>
            {result.risk === 'safe' ? 'Безопасно' : result.risk === 'warning' ? 'Подозрительно' : 'Опасность'}
          </Badge>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Детали</h5>
              <p className="text-sm leading-relaxed">{result.details}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-md border border-border/50">
              <PhoneCall className="w-5 h-5 text-muted-foreground" />
              <div>
                <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Жалобы</h5>
                <p className="font-mono font-bold">{result.calls} зафиксировано</p>
              </div>
            </div>
            
            {result.lastSeen && (
              <div className="flex items-center gap-3 bg-background/50 p-3 rounded-md border border-border/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Последняя активность</h5>
                  <p className="font-mono font-bold">{result.lastSeen}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
