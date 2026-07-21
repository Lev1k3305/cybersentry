import React from 'react';
import { Search, AlertTriangle, ShieldCheck, AlertOctagon, PhoneCall, Clock, X } from 'lucide-react';
import { useCheckPhone } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone-input" className="text-sm font-medium font-mono text-foreground">
            Номер телефона <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="font-mono text-lg py-6 bg-secondary/30 pr-10"
                disabled={checkPhone.isPending}
                aria-describedby="phone-hint"
                required
              />
              {phone && (
                <button
                  type="button"
                  onClick={() => {
                    setPhone('');
                    checkPhone.reset();
                    document.getElementById('phone-input')?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring p-1 rounded-sm"
                  aria-label="Очистить"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              className="py-6 px-8 font-mono tracking-wide"
              disabled={checkPhone.isPending || !phone.trim()}
            >
              {checkPhone.isPending ? 'Анализ...' : 'Проверить'}
            </Button>
          </div>
        </div>
        <p id="phone-hint" className="text-xs text-muted-foreground font-mono">
          🔒 Запросы анонимизированы для обеспечения полной конфиденциальности.
        </p>
      </form>

      {checkPhone.isError && (
        <Alert variant="destructive" className="font-mono bg-destructive/5 border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">Ошибка анализа</AlertTitle>
          <AlertDescription>
            Не удалось выполнить запрос проверки номера. Пожалуйста, попробуйте позже.
          </AlertDescription>
        </Alert>
      )}

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
