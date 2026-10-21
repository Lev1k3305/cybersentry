import React from "react";
import {
  Globe,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  X,
  Server,
  Lock,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { useCheckDomain } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export function DomainCheck() {
  const [domain, setDomain] = React.useState("");
  const checkDomain = useCheckDomain();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    checkDomain.mutate({ data: { domain: domain.trim() } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          DOMAIN INTELLIGENCE & OSINT
        </h3>
        <p className="text-xs text-muted-foreground font-sans">
          Анализ домена: DNS-записи, TLS-сертификат, данные RDAP/WHOIS и проверка SPF/DMARC.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="domain-input"
            className="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
          >
            Имя домена (hostname) <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Input
                id="domain-input"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="domain.com"
                className="font-mono text-sm h-11 bg-secondary/30 border-border pr-10 focus-visible:ring-primary"
                disabled={checkDomain.isPending}
                aria-describedby="domain-hint"
                required
              />
              {domain && (
                <button
                  type="button"
                  onClick={() => {
                    setDomain("");
                    checkDomain.reset();
                    document.getElementById("domain-input")?.focus();
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
              disabled={checkDomain.isPending || !domain.trim()}
            >
              {checkDomain.isPending ? "Анализ..." : "Анализировать домен"}
            </Button>
          </div>
        </div>
        <p id="domain-hint" className="text-[11px] text-muted-foreground font-mono">
          🔒 Вводите strictly доменное имя (например, target-domain.org) без префиксов http:// или https://
        </p>
      </form>

      {checkDomain.isError && (
        <Alert
          variant="destructive"
          className="font-mono text-xs bg-destructive/10 border-destructive/30 text-destructive-foreground"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="font-bold">API недоступен</AlertTitle>
          <AlertDescription>
            {(checkDomain.error as any)?.message ||
              "Не удалось выполнить анализ домена. Проверьте правильность введённого имени или повторите запрос позже."}
          </AlertDescription>
        </Alert>
      )}

      {checkDomain.isPending && (
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-6 w-1/3 bg-muted/20" />
            <Skeleton className="h-4 w-2/3 bg-muted/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <Skeleton className="h-24 w-full bg-muted/20" />
              <Skeleton className="h-24 w-full bg-muted/20" />
            </div>
          </CardContent>
        </Card>
      )}

      {checkDomain.data && !checkDomain.isPending && (
        <DomainResultCard result={checkDomain.data} />
      )}
    </div>
  );
}

const DomainResultCard = React.memo(function DomainResultCard({
  result,
}: {
  result: any;
}) {
  const isSafe = result.riskLabel === "safe";
  const isWarning = result.riskLabel === "warning";
  const isDanger = result.riskLabel === "danger";

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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <Badge variant="outline" className="border-safe/40 text-safe bg-safe/10 gap-1 font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> OK
          </Badge>
        );
      case "empty":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground bg-secondary/50 gap-1 font-mono text-[10px]">
            <HelpCircle className="w-3 h-3" /> НЕТ ДАННЫХ
          </Badge>
        );
      case "blocked":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 gap-1 font-mono text-[10px]">
            <XCircle className="w-3 h-3" /> ЗАБЛОКИРОВАНО (SSRF)
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 gap-1 font-mono text-[10px]">
            <AlertCircle className="w-3 h-3" /> ТАЙМАУТ
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 gap-1 font-mono text-[10px]">
            <XCircle className="w-3 h-3" /> ОШИБКА
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Overview Header Card */}
      <Card className={`border ${borderColor} ${bgColor} overflow-hidden`}>
        <CardContent className="p-0">
          <div className={`p-4 border-b ${borderColor} flex items-center justify-between bg-card/60`}>
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h4 className="text-base font-bold text-foreground">
                  {result.domain}
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Сводка безопасности OSINT
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-muted-foreground block">Индекс риска</span>
                <span className={`font-bold ${result.riskScore > 40 ? "text-destructive" : "text-safe"}`}>
                  {result.riskScore} / 100
                </span>
              </div>
              <Badge className={`${badgeStyle} font-mono tracking-wider uppercase text-[10px] px-2.5 py-1 border`}>
                {result.riskLabel === "safe"
                  ? "Безопасно"
                  : result.riskLabel === "warning"
                  ? "Подозрительно"
                  : "Опасность"}
              </Badge>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Уровень угрозы</span>
                <span>{result.riskScore}%</span>
              </div>
              <Progress
                value={result.riskScore}
                className="h-1.5 bg-secondary"
                indicatorClassName={result.riskScore > 40 ? "bg-destructive" : "bg-safe"}
              />
            </div>
            <p className="text-xs font-sans leading-relaxed text-foreground bg-background/50 p-3 rounded border border-border">
              {result.summary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid of OSINT Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DNS Records */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Server className="w-4 h-4 text-primary" />
                <span>DNS ЗАПИСИ</span>
              </div>
              {renderStatusBadge(result.dns?.status)}
            </div>

            <div className="space-y-2 text-xs">
              {result.dns?.data ? (
                <>
                  {result.dns.data.A?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-bold text-[11px]">A Records:</span>
                      <div className="space-y-1 mt-1">
                        {result.dns.data.A.map((rec: any, i: number) => (
                          <div key={i} className="bg-secondary/40 p-2 rounded border border-border flex justify-between">
                            <span className="text-foreground font-mono">{rec.data}</span>
                            <span className="text-muted-foreground text-[10px]">TTL: {rec.TTL}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.dns.data.MX?.length > 0 && (
                    <div className="pt-1">
                      <span className="text-muted-foreground font-bold text-[11px]">MX Records:</span>
                      <div className="space-y-1 mt-1">
                        {result.dns.data.MX.map((rec: any, i: number) => (
                          <div key={i} className="bg-secondary/40 p-2 rounded border border-border font-mono">
                            <span className="text-foreground">{rec.data}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic text-xs">
                  {result.dns?.error || "DNS-записи не обнаружены"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
              Источник: {result.dns?.source} ({result.dns?.timestamp})
            </div>
          </CardContent>
        </Card>

        {/* TLS Certificate */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                <span>TLS / HTTPS СЕРТИФИКАТ</span>
              </div>
              {renderStatusBadge(result.tls?.status)}
            </div>

            <div className="space-y-2 text-xs">
              {result.tls?.data ? (
                <div className="bg-secondary/40 p-2.5 rounded border border-border space-y-1">
                  <div>
                    <span className="text-muted-foreground">Издатель: </span>
                    <span className="text-foreground font-semibold">{result.tls.data.issuer}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Субъект: </span>
                    <span className="text-foreground">{result.tls.data.subject}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP адреса: </span>
                    <span className="text-foreground">{result.tls.data.ip}</span>
                  </div>
                  {result.tls.data.notAfter && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                      <Calendar className="w-3 h-3" /> Истекает: {result.tls.data.notAfter}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">
                  {result.tls?.error || "Сведения о сертификате отсутствуют"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
              Источник: {result.tls?.source} ({result.tls?.timestamp})
            </div>
          </CardContent>
        </Card>

        {/* SPF & DMARC */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>ПОЧТОВАЯ ЗАЩИТА (SPF / DMARC)</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground font-bold">SPF Record:</span>
                  {renderStatusBadge(result.spf?.status)}
                </div>
                {result.spf?.data ? (
                  <div className="bg-secondary/40 p-2 rounded border border-border text-foreground break-all">
                    {result.spf.data.record}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">SPF запись не найдена</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground font-bold">DMARC Policy:</span>
                  {renderStatusBadge(result.dmarc?.status)}
                </div>
                {result.dmarc?.data ? (
                  <div className="bg-secondary/40 p-2 rounded border border-border text-foreground break-all">
                    {result.dmarc.data.record}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">DMARC политика не найдена</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RDAP / WHOIS Info */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                <span>RDAP / РЕГИСТРАЦИЯ</span>
              </div>
              {renderStatusBadge(result.rdap?.status)}
            </div>

            <div className="space-y-2 text-xs">
              {result.rdap?.data ? (
                <div className="bg-secondary/40 p-2.5 rounded border border-border space-y-1">
                  <div>
                    <span className="text-muted-foreground">Регистратор: </span>
                    <span className="text-foreground font-semibold">{result.rdap.data.registrar}</span>
                  </div>
                  {result.rdap.data.registrationDate && (
                    <div>
                      <span className="text-muted-foreground">Регистрация: </span>
                      <span className="text-foreground">{result.rdap.data.registrationDate}</span>
                    </div>
                  )}
                  {result.rdap.data.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Истекает: </span>
                      <span className="text-foreground">{result.rdap.data.expirationDate}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">
                  {result.rdap?.error || "Данные RDAP недоступны"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
              Источник: {result.rdap?.source} ({result.rdap?.timestamp})
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
