import { Shield, CheckCircle, Wifi, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function StatusWidget() {
  return (
    <Card className="border-safe/20 bg-safe/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Shield className="w-48 h-48" />
      </div>
      
      <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
        <div className="bg-safe/10 p-4 rounded-xl border border-safe/20 shadow-[0_0_30px_hsl(var(--safe)/0.2)]">
          <Shield className="w-12 h-12 text-safe" />
        </div>
        
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-safe flex items-center justify-center md:justify-start gap-2">
              <CheckCircle className="w-6 h-6" />
              Статус: Ваша цифровая безопасность под контролем
            </h2>
            <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-wider">
              Система функционирует в штатном режиме. Угроз не обнаружено.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
            <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-full text-xs font-mono font-medium">
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              База спам-номеров: Актуальна
            </div>
            <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-full text-xs font-mono font-medium">
              <Wifi className="w-3 h-3 text-safe" />
              Защита сети: Активна
            </div>
            <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-full text-xs font-mono font-medium">
              <Eye className="w-3 h-3 text-safe" />
              Сенсоры: Онлайн
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
