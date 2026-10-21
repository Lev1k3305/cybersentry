import React from "react";
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  AlertOctagon,
  PhoneCall,
  Clock,
  X,
  ShieldAlert,
  Database
} from "lucide-react";
import { useCheckPhone } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function PhoneCheck() {
  const [phone, setPhone] = React.useState("");
  const checkPhone = useCheckPhone();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    checkPhone.mutate({ data: { phone } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          PHONE INTELLIGENCE & REPUTATION
        </h3>
        <p className="text-xs text-muted-foreground font-sans">
          Проверка номера телефона по реестрам нежелательных вызовов, фишинга и спам-активности.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="phone-input"
            className="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
          >
            Целевой номер телефона <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="font-mono text-sm h-11 bg-secondary/30 border-border pr-10 focus-visible:ring-primary"
                disabled={checkPhone.isPending}
                aria-describedby="phone-hint"
                required
              />
              {phone && (
                <button
                  type="button"
                  onClick={() => {
                    setPhone("");
                    checkPhone.reset();
                    document.getElementById("phone-input")?.focus();
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
              disabled={checkPhone.isPending || !phone.trim()}
            >
              {checkPhone.isPending ? "Анализ..." : "Проверить номер"}
            </Button>
          </div>
        </div>
        <p id="phone-hint" className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Все запросы шифруются и не передаются третьим лицам.</span>
        </p>
      </form>

      {checkPhone.isError && (
        <Alert
          variant="destructive"
          className="font-mono text-xs bg-destructive/10 border-destructive/30 text-destructive-foreground"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="font-bold">Ошибка анализа</AlertTitle>
          <AlertDescription>
            Не удалось выполнить запрос проверки номера. Пожалуйста, попробуйте позже.
          </AlertDescription>
        </Alert>
      )}

      {checkPhone.isPending && (
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-6 w-1/3 bg-muted/20" />
            <Skeleton className="h-4 w-2/3 bg-muted/20" />
            <Skeleton className="h-16 w-full bg-muted/20" />
          </CardContent>
        </Card>
      )}

      {checkPhone.data && !checkPhone.isPending && (
        <PhoneResultCard result={checkPhone.data} />
      )}
    </div>
  );
}

const PhoneResultCard = React.memo(function PhoneResultCard({
  result,
}: {
  result: any;
}) {
  const isSafe = result.risk === "safe";
  const isWarning = result.risk === "warning";
  const isDanger = result.risk === "danger";

  let borderColor = "border-safe/30";
  let bgColor = "bg-safe/5";
  let icon = <ShieldCheck className="w-6 h-6 text-safe" />;
  let badgeStyle = "border-safe/40 text-safe bg-safe/10";

  if (isWarning) {
    borderColor = "border-warning/30";
    bgColor = "bg-warning/5";
    icon = <AlertTriangle className="w-6 h-6 text-warning" />;
    badgeStyle = "border-warning/40 text-warning bg-warning/10";
  } else if (isDanger) {
    borderColor = "border-destructive/30";
    bgColor = "bg-destructive/5";
    icon = <AlertOctagon className="w-6 h-6 text-destructive" />;
    badgeStyle = "border-destructive/40 text-destructive bg-destructive/10";
  }

  return (
    <Card className={`border ${borderColor} ${bgColor} overflow-hidden font-mono text-xs`}>
      <CardContent className="p-0">
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between bg-card/60`}>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h4 className="text-base font-bold text-foreground">
                {result.phone}
              </h4>
              <p className="text-xs text-muted-foreground font-sans">{result.label}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${badgeStyle} font-mono tracking-wider uppercase text-[10px] px-2.5 py-1 border`}
          >
            {result.risk === "safe"
              ? "Низкий риск"
              : result.risk === "warning"
                ? "Подозрительный"
                : "Критический риск"}
          </Badge>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Детализация отчета
            </h5>
            <p className="text-xs text-foreground font-sans leading-relaxed bg-background/50 p-3 rounded border border-border">
              {result.details}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded border border-border">
              <PhoneCall className="w-4 h-4 text-primary shrink-0" />
              <div>
                <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Зафиксировано обращений / жалоб
                </h5>
                <p className="font-bold text-foreground mt-0.5">
                  {result.calls} инцидентов
                </p>
              </div>
            </div>

            {result.lastSeen && (
              <div className="flex items-center gap-3 bg-background/50 p-3 rounded border border-border">
                <Clock className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Последняя активность в реестрах
                  </h5>
                  <p className="font-bold text-foreground mt-0.5">{result.lastSeen}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
