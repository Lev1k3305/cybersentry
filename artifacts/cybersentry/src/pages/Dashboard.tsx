import React from 'react';
import { AppShell } from '../components/AppShell';
import { NavTab } from '../components/Sidebar';
import { StatusWidget } from '../components/StatusWidget';
import { PhoneCheck } from '../components/PhoneCheck';
import { EmailScan } from '../components/EmailScan';
import { DomainCheck } from '../components/DomainCheck';
import { SecurityLog } from '../components/SecurityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, Globe, Shield, Activity, Search, Server, AlertCircle, Terminal as TerminalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetSecurityLog, useExecuteCommand } from '@workspace/api-client-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState<NavTab>('overview');

  // Unified Intelligence Search State
  const [searchType, setSearchType] = React.useState<'phone' | 'email' | 'domain'>('phone');

  // Command Center state
  const [commandText, setCommandText] = React.useState('');
  const [commandLogs, setCommandLogs] = React.useState<Array<{ command?: string; output: string; type: string }>>([
    { output: 'CyberSentry Terminal Interface v3.2 Initialized.', type: 'system' },
    { output: 'Type "help" for a list of available system commands.', type: 'info' }
  ]);
  const executeCommandMutation = useExecuteCommand();

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    const cmd = commandText.trim();
    setCommandText('');

    setCommandLogs(prev => [...prev, { command: cmd, output: `> ${cmd}`, type: 'user' }]);

    executeCommandMutation.mutate(
      { data: { command: cmd } },
      {
        onSuccess: (data) => {
          setCommandLogs(prev => [...prev, { output: data.output, type: data.type }]);
        },
        onError: () => {
          setCommandLogs(prev => [...prev, { output: 'ERR: Failed to execute command on gateway', type: 'error' }]);
        }
      }
    );
  };

  const { data: logs } = useGetSecurityLog();
  const logsCount = logs?.length ?? 0;
  const recentAlertsCount = logs?.filter(l => l.level === 'ALERT' || l.level === 'WARN').length ?? 0;

  return (
    <AppShell activeTab={activeTab} onTabSelect={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <StatusWidget />

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Доступные модули
                  </p>
                  <p className="text-xl font-bold text-foreground mt-1">3 OSINT</p>
                  <p className="text-[10px] text-primary mt-1">Phone / Email / Domain</p>
                </div>
                <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-primary">
                  <Server className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Сигналы риска
                  </p>
                  <p className="text-xl font-bold text-warning mt-1">
                    {recentAlertsCount > 0 ? recentAlertsCount : '0'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">в текущем сеансе</p>
                </div>
                <div className="p-2.5 rounded bg-warning/10 border border-warning/20 text-warning">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    События защиты
                  </p>
                  <p className="text-xl font-bold text-foreground mt-1">{logsCount}</p>
                  <p className="text-[10px] text-safe mt-1">поток логов активен</p>
                </div>
                <div className="p-2.5 rounded bg-safe/10 border border-safe/20 text-safe">
                  <Activity className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Источники данных
                  </p>
                  <p className="text-xl font-bold text-accent mt-1">8+ Реестров</p>
                  <p className="text-[10px] text-muted-foreground mt-1">DNS, RDAP, HIBP, Spam DB</p>
                </div>
                <div className="p-2.5 rounded bg-accent/10 border border-accent/20 text-accent">
                  <Globe className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intelligence Search Hub */}
          <Card className="border-border bg-card">
            <CardContent className="p-5 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    INTELLIGENCE SEARCH
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    Выберите категорию целевого объекта и запустите OSINT-анализ
                  </p>
                </div>

                {/* Tab selector */}
                <div className="flex bg-secondary/50 p-1 rounded-md border border-border font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setSearchType('phone')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                      searchType === 'phone'
                        ? 'bg-card text-primary font-bold shadow-2xs border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Телефон
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('email')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                      searchType === 'email'
                        ? 'bg-card text-primary font-bold shadow-2xs border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('domain')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                      searchType === 'domain'
                        ? 'bg-card text-primary font-bold shadow-2xs border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Домен
                  </button>
                </div>
              </div>

              {/* Form Render based on active search type */}
              <div className="pt-2">
                {searchType === 'phone' && <PhoneCheck />}
                {searchType === 'email' && <EmailScan />}
                {searchType === 'domain' && <DomainCheck />}
              </div>
            </CardContent>
          </Card>

          {/* Embedded Security Log Preview */}
          <div className="pt-2">
            <SecurityLog />
          </div>
        </div>
      )}

      {activeTab === 'phone' && <PhoneCheck />}
      {activeTab === 'email' && <EmailScan />}
      {activeTab === 'domain' && <DomainCheck />}

      {activeTab === 'investigations' && (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-foreground uppercase tracking-wider">
              Модуль Расследований (Investigations)
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-sans leading-relaxed">
              Модуль перекрёстного графа связей и комплексных расследований находится в стадии разработки.
              Используйте доступные разделы анализа номеров, почты и доменов.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'log' && <SecurityLog />}

      {activeTab === 'command' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-primary" />
              COMMAND CENTER TERMINAL
            </h3>
          </div>

          <Card className="border-border bg-[#070C14] font-mono text-xs overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="h-[380px] overflow-y-auto space-y-2 p-2 rounded bg-black/40 border border-border/50">
                {commandLogs.map((log, idx) => (
                  <div key={idx} className={`leading-relaxed ${
                    log.type === 'user' ? 'text-primary font-bold' :
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'success' ? 'text-safe' : 'text-foreground/80'
                  }`}>
                    {log.output}
                  </div>
                ))}
              </div>

              <form onSubmit={handleCommandSubmit} className="flex gap-2 pt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">&gt;</span>
                  <Input
                    value={commandText}
                    onChange={(e) => setCommandText(e.target.value)}
                    placeholder="Type command (e.g., status, help, ping)..."
                    className="font-mono text-xs pl-7 py-5 bg-secondary/30 border-border"
                    disabled={executeCommandMutation.isPending}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={executeCommandMutation.isPending || !commandText.trim()}
                  className="font-mono text-xs px-6"
                >
                  {executeCommandMutation.isPending ? 'EXEC...' : 'RUN'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
