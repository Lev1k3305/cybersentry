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
  AlertCircle,
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
      <div className="space-y-2">
        <h3 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          DOMAIN INTELLIGENCE & OSINT
        </h3>
        <p className="text-muted-foreground text-sm">
          Комплексный анализ домена: DNS-записи, TLS-сертификат, данные RDAP/WHOIS и проверка SPF/DMARC.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="domain-input"
            className="text-sm font-medium font-mono text-foreground"
          >
            Имя домена (hostname) <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="domain-input"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="font-mono text-lg py-6 bg-secondary/30 pr-10"
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
              disabled={checkDomain.isPending || !domain.trim()}
            >
              {checkDomain.isPending ? "АНАЛИЗ..." : "Проверить домен"}
            </Button>
          </div>
        </div>
        <p id="domain-hint" className="text-xs text-muted-foreground font-mono">
          🔒 Вводите строго доменное имя (например, domain.org) без http://, https://, путей и портов.
        </p>
      </form>

      {checkDomain.isError && (
        <Alert
          variant="destructive"
          className="font-mono bg-destructive/5 border-destructive/20"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">Ошибка анализа домена</AlertTitle>
          <AlertDescription>
            {(checkDomain.error as any)?.response?.data?.detail ||
              (checkDomain.error as any)?.response?.data?.error ||
              "Не удалось выполнить анализ домена. Проверьте правильность введённого имени или повторите запрос позже."}
          </AlertDescription>
        </Alert>
      )}

      {checkDomain.isPending && (
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 bg-muted/20" />
            <Skeleton className="h-4 w-2/3 bg-muted/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  let icon = <ShieldCheck className="w-8 h-8 text-safe" />;
  let badgeColor = "bg-safe text-safe-foreground";

  if (isWarning) {
    borderColor = "border-warning/30";
    bgColor = "bg-warning/5";
    icon = <AlertTriangle className="w-8 h-8 text-warning" />;
    badgeColor = "bg-warning text-warning-foreground";
  } else if (isDanger) {
    borderColor = "border-destructive/30";
    bgColor = "bg-destructive/5";
    icon = <AlertOctagon className="w-8 h-8 text-destructive" />;
    badgeColor = "bg-destructive text-destructive-foreground";
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <Badge variant="outline" className="border-safe text-safe gap-1 font-mono text-xs">
            <CheckCircle2 className="w-3 h-3" /> OK
          </Badge>
        );
      case "empty":
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground gap-1 font-mono text-xs">
            <HelpCircle className="w-3 h-3" /> НЕТ ДАННЫХ
          </Badge>
        );
      case "blocked":
        return (
          <Badge variant="outline" className="border-destructive text-destructive gap-1 font-mono text-xs">
            <XCircle className="w-3 h-3" /> ЗАБЛОКИРОВАНО (SSRF)
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="outline" className="border-warning text-warning gap-1 font-mono text-xs">
            <AlertCircle className="w-3 h-3" /> ТАЙМАУТ
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-destructive text-destructive gap-1 font-mono text-xs">
            <XCircle className="w-3 h-3" /> ОШИБКА
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Overview Card */}
      <Card className={`border ${borderColor} ${bgColor} overflow-hidden`}>
        <CardContent className="p-0">
          <div className={`p-4 border-b ${borderColor} flex items-center justify-between bg-background/40`}>
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h4 className="font-mono text-xl font-bold text-foreground">
                  {result.domain}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Сводка безопасности OSINT
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <span className="text-xs text-muted-foreground font-mono block">Риск</span>
                <span className={`font-mono font-bold ${result.riskScore > 40 ? "text-destructive" : "text-safe"}`}>
                  {result.riskScore} / 100
                </span>
              </div>
              <Badge className={`${badgeColor} font-mono tracking-widest uppercase`}>
                {result.riskLabel === "safe"
                  ? "Безопасно"
                  : result.riskLabel === "warning"
                  ? "Подозрительно"
                  : "Опасность"}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>Индикатор совокупного риска</span>
                <span>{result.riskScore}%</span>
              </div>
              <Progress
                value={result.riskScore}
                className="h-2"
                indicatorClassName={result.riskScore > 40 ? "bg-destructive" : "bg-safe"}
              />
            </div>
            <p className="text-sm leading-relaxed text-foreground bg-background/50 p-4 rounded-md border border-border/50">
              {result.summary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid of OSINT Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DNS Records */}
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                <Server className="w-4 h-4 text-primary" />
                DNS ЗАПИСИ
              </div>
              {renderStatusBadge(result.dns?.status)}
            </div>

            <div className="space-y-3 font-mono text-xs">
              {result.dns?.data ? (
                <>
                  {result.dns.data.A?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-bold">A Records:</span>
                      <div className="space-y-1 mt-1">
                        {result.dns.data.A.map((rec: any, i: number) => (
                          <div key={i} className="bg-background/60 p-2 rounded border border-border/40 flex justify-between">
                            <span className="text-foreground">{rec.data}</span>
                            <span className="text-muted-foreground">TTL: {rec.TTL}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.dns.data.MX?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-bold">MX Records:</span>
                      <div className="space-y-1 mt-1">
                        {result.dns.data.MX.map((rec: any, i: number) => (
                          <div key={i} className="bg-background/60 p-2 rounded border border-border/40">
                            <span className="text-foreground">{rec.data}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.dns.data.NS?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-bold">NS Records:</span>
                      <div className="space-y-1 mt-1">
                        {result.dns.data.NS.map((rec: any, i: number) => (
                          <div key={i} className="bg-background/60 p-2 rounded border border-border/40">
                            <span className="text-foreground">{rec.data}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">
                  {result.dns?.error || "DNS-записи не найдены"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/30">
              Источник: {result.dns?.source} ({result.dns?.timestamp})
            </div>
          </CardContent>
        </Card>

        {/* TLS Certificate */}
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                TLS / HTTPS СЕРТИФИКАТ
              </div>
              {renderStatusBadge(result.tls?.status)}
            </div>

            <div className="space-y-2 font-mono text-xs">
              {result.tls?.data ? (
                <div className="space-y-2">
                  <div className="bg-background/60 p-3 rounded border border-border/40 space-y-1">
                    <div>
                      <span className="text-muted-foreground">Издатель (Issuer): </span>
                      <span className="text-foreground font-semibold">{result.tls.data.issuer}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Субъект (Subject): </span>
                      <span className="text-foreground">{result.tls.data.subject}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Целевой IP: </span>
                      <span className="text-foreground">{result.tls.data.ip}</span>
                    </div>
                    {result.tls.data.notAfter && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                        <Calendar className="w-3 h-3" /> Действителен до: {result.tls.data.notAfter}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {result.tls?.error || "Сведения о сертификате отсутствуют"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/30">
              Источник: {result.tls?.source} ({result.tls?.timestamp})
            </div>
          </CardContent>
        </Card>

        {/* Email Security (SPF & DMARC) */}
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                ПОЧТОВАЯ ЗАЩИТА (SPF & DMARC)
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground font-bold">SPF Record:</span>
                  {renderStatusBadge(result.spf?.status)}
                </div>
                {result.spf?.data ? (
                  <div className="bg-background/60 p-2 rounded border border-border/40 text-foreground break-all">
                    {result.spf.data.record}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">SPF запись не найдена в DNS TXT</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground font-bold">DMARC Policy:</span>
                  {renderStatusBadge(result.dmarc?.status)}
                </div>
                {result.dmarc?.data ? (
                  <div className="bg-background/60 p-2 rounded border border-border/40 text-foreground break-all">
                    {result.dmarc.data.record}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">DMARC политика не найдена (_dmarc TXT)</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RDAP / WHOIS Info */}
        <Card className="border-border/50 bg-secondary/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                RDAP / РЕГИСТРАЦИЯ
              </div>
              {renderStatusBadge(result.rdap?.status)}
            </div>

            <div className="space-y-2 font-mono text-xs">
              {result.rdap?.data ? (
                <div className="bg-background/60 p-3 rounded border border-border/40 space-y-1">
                  <div>
                    <span className="text-muted-foreground">Регистратор: </span>
                    <span className="text-foreground font-semibold">{result.rdap.data.registrar}</span>
                  </div>
                  {result.rdap.data.registrationDate && (
                    <div>
                      <span className="text-muted-foreground">Дата регистрации: </span>
                      <span className="text-foreground">{result.rdap.data.registrationDate}</span>
                    </div>
                  )}
                  {result.rdap.data.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Дата истечения: </span>
                      <span className="text-foreground">{result.rdap.data.expirationDate}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {result.rdap?.error || "Данные RDAP недоступны"}
                </p>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/30">
              Источник: {result.rdap?.source} ({result.rdap?.timestamp})
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
