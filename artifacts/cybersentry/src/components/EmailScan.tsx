import React from 'react';
import { Mail, ShieldAlert, Fingerprint, Database, Calendar, AlertCircle, X, AlertCircle as AlertIcon } from 'lucide-react';
import { useScanEmail } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function EmailScan() {
  const [email, setEmail] = React.useState('');
  const scanEmail = useScanEmail();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    scanEmail.mutate({ data: { email } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          СКАНЕР УТЕЧЕК АККАУНТОВ
        </h3>
        <p className="text-muted-foreground text-sm">
          Проверьте email по базам скомпрометированных данных (пароли, личные данные).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email-input" className="text-sm font-medium font-mono text-foreground">
            Адрес электронной почты <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="font-mono text-lg py-6 bg-secondary/30 pr-10"
                disabled={scanEmail.isPending}
                aria-describedby="email-hint"
                required
              />
              {email && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    scanEmail.reset();
                    document.getElementById('email-input')?.focus();
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
              disabled={scanEmail.isPending || !email.trim()}
            >
              {scanEmail.isPending ? 'СКАНИРОВАНИЕ...' : 'Сканировать'}
            </Button>
          </div>
        </div>
        <p id="email-hint" className="text-xs text-muted-foreground font-mono">
          🔒 Ваши данные шифруются и не сохраняются на сервере.
        </p>
      </form>

      {scanEmail.isError && (
        <Alert variant="destructive" className="font-mono bg-destructive/5 border-destructive/20">
          <AlertIcon className="h-4 w-4" />
          <AlertTitle className="font-bold">Ошибка сканирования</AlertTitle>
          <AlertDescription>
            Не удалось выполнить запрос сканирования утечек. Пожалуйста, попробуйте позже.
          </AlertDescription>
        </Alert>
      )}

      {scanEmail.isPending && (
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 bg-muted/20" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-muted/20" />
              <Skeleton className="h-4 w-full bg-muted/20" />
            </div>
            <Skeleton className="h-32 w-full bg-muted/20" />
          </CardContent>
        </Card>
      )}

      {scanEmail.data && !scanEmail.isPending && (
        <EmailResultCard result={scanEmail.data} />
      )}
    </div>
  );
}

function EmailResultCard({ result }: { result: any }) {
  const isCompromised = result.compromised;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className={`border ${isCompromised ? 'border-destructive/40 bg-destructive/5' : 'border-safe/40 bg-safe/5'}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {isCompromised ? (
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                ) : (
                  <Database className="w-8 h-8 text-safe" />
                )}
                <h4 className="font-mono text-xl font-bold text-foreground">
                  Статус: {isCompromised ? 'Скомпрометирован' : 'Чисто'}
                </h4>
              </div>
              <p className="text-muted-foreground font-mono">{result.email}</p>
            </div>
            
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-muted-foreground">Оценка риска</span>
                <span className={result.riskScore > 50 ? 'text-destructive font-bold' : 'text-safe font-bold'}>
                  {result.riskScore} / 100
                </span>
              </div>
              <Progress 
                value={result.riskScore} 
                className="h-2" 
                indicatorClassName={result.riskScore > 50 ? 'bg-destructive' : 'bg-safe'}
              />
            </div>
          </div>
          
          {result.recommendation && (
            <div className="mt-6 p-4 bg-background/50 border border-border/50 rounded-md flex gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm">{result.recommendation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result.breaches && result.breaches.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-mono font-bold text-lg text-foreground uppercase tracking-widest">
            Обнаруженные утечки ({result.breaches.length})
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {result.breaches.map((breach: any, idx: number) => (
              <Card key={idx} className="border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h5 className="font-bold font-mono text-destructive mb-1">{breach.name}</h5>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {breach.date}
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-2">
                    <Badge variant="outline" className={`
                      ${breach.severity === 'critical' ? 'border-destructive text-destructive' : ''}
                      ${breach.severity === 'high' ? 'border-warning text-warning' : ''}
                      ${breach.severity === 'medium' ? 'border-primary text-primary' : ''}
                      ${breach.severity === 'low' ? 'border-muted text-muted-foreground' : ''}
                      uppercase tracking-wider font-mono text-[10px]
                    `}>
                      Угроза: {breach.severity}
                    </Badge>
                    <div className="flex flex-wrap gap-1 md:justify-end">
                      {breach.dataTypes.map((dt: string, i: number) => (
                        <span key={i} className="text-[10px] bg-background px-2 py-0.5 rounded text-muted-foreground border border-border/50">
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
