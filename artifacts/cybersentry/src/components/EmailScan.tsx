import React from "react";
import {
  Mail,
  ShieldAlert,
  Fingerprint,
  Database,
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  Lock
} from "lucide-react";
import { useScanEmail } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function EmailScan() {
  const [email, setEmail] = React.useState("");
  const scanEmail = useScanEmail();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    scanEmail.mutate({ data: { email } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          EMAIL BREACH SCANNER
        </h3>
        <p className="text-xs text-muted-foreground font-sans">
          Сканирование адресов электронной почты по базам утечек паролей и личных данных.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="email-input"
            className="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
          >
            Адрес электронной почты <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@cyber-intelligence.io"
                className="font-mono text-sm h-11 bg-secondary/30 border-border pr-10 focus-visible:ring-primary"
                disabled={scanEmail.isPending}
                aria-describedby="email-hint"
                required
              />
              {email && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail("");
                    scanEmail.reset();
                    document.getElementById("email-input")?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none p-1 rounded-sm"
                  aria-label="Очистить"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-11 px-6 font-mono text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={scanEmail.isPending || !email.trim()}
            >
              {scanEmail.isPending ? "Сканирование..." : "Запустить сканер"}
            </Button>
          </div>
        </div>
        <p id="email-hint" className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Данные не сохраняются в локальных и удаленных журналах.</span>
        </p>
      </form>

      {scanEmail.isError && (
        <Alert
          variant="destructive"
          className="font-mono text-xs bg-destructive/10 border-destructive/30 text-destructive-foreground"
        >
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="font-bold">Ошибка сканирования</AlertTitle>
          <AlertDescription>
            Не удалось выполнить запрос сканирования утечек. Пожалуйста, попробуйте позже.
          </AlertDescription>
        </Alert>
      )}

      {scanEmail.isPending && (
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-6 w-1/3 bg-muted/20" />
            <Skeleton className="h-4 w-full bg-muted/20" />
            <Skeleton className="h-20 w-full bg-muted/20" />
          </CardContent>
        </Card>
      )}

      {scanEmail.data && !scanEmail.isPending && (
        <EmailResultCard result={scanEmail.data} />
      )}
    </div>
  );
}

const EmailResultCard = React.memo(function EmailResultCard({
  result,
}: {
  result: any;
}) {
  const isCompromised = result.compromised;

  return (
    <div className="space-y-4">
      <Card
        className={`border ${isCompromised ? "border-destructive/30 bg-destructive/5" : "border-safe/30 bg-safe/5"} overflow-hidden font-mono text-xs`}
      >
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                {isCompromised ? (
                  <ShieldAlert className="w-6 h-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-safe" />
                )}
                <h4 className="text-base font-bold text-foreground">
                  Статус: {isCompromised ? "Обнаружена компрометация" : "Утечек не найдено"}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{result.email}</p>
            </div>

            <div className="w-full md:w-56 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Индекс риска</span>
                <span
                  className={
                    result.riskScore > 50
                      ? "text-destructive font-bold"
                      : "text-safe font-bold"
                  }
                >
                  {result.riskScore} / 100
                </span>
              </div>
              <Progress
                value={result.riskScore}
                className="h-2 bg-secondary"
                indicatorClassName={
                  result.riskScore > 50 ? "bg-destructive" : "bg-safe"
                }
              />
            </div>
          </div>

          {result.recommendation && (
            <div className="p-3 bg-background/50 border border-border rounded flex items-start gap-2.5 font-sans text-xs leading-relaxed text-foreground">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{result.recommendation}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {result.breaches && result.breaches.length > 0 && (
        <div className="space-y-3 font-mono">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Обнаруженные утечки ({result.breaches.length})
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            {result.breaches.map((breach: any, idx: number) => (
              <Card
                key={idx}
                className="border-border bg-card hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                  <div>
                    <h5 className="font-bold text-destructive text-sm mb-1">
                      {breach.name}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{breach.date}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <Badge
                      variant="outline"
                      className={`
                      ${breach.severity === "critical" ? "border-destructive/40 text-destructive bg-destructive/10" : ""}
                      ${breach.severity === "high" ? "border-warning/40 text-warning bg-warning/10" : ""}
                      ${breach.severity === "medium" ? "border-primary/40 text-primary bg-primary/10" : ""}
                      ${breach.severity === "low" ? "border-border text-muted-foreground" : ""}
                      uppercase tracking-wider font-mono text-[9px] px-2 py-0.5
                    `}
                    >
                      Угроза: {breach.severity}
                    </Badge>
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      {breach.dataTypes.map((dt: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] bg-secondary/60 px-2 py-0.5 rounded text-muted-foreground border border-border"
                        >
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
});
