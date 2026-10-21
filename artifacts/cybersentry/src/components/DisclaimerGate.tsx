import React from 'react';
import { ShieldAlert, Terminal, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function DisclaimerGate() {
  const [open, setOpen] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    const consent = localStorage.getItem('cybersentry_consent');
    if (consent !== 'true') {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cybersentry_consent', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-[520px] border-border bg-card text-card-foreground shadow-2xl"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className="mx-auto bg-primary/10 border border-primary/30 p-3 rounded-lg w-fit text-primary">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <DialogTitle className="text-lg text-center text-foreground font-mono uppercase tracking-widest">
            CyberSentry Platform<br/>
            <span className="text-primary text-sm font-normal">Условия доступа и авторизация</span>
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2 text-xs leading-relaxed font-sans">
            Платформа предназначена исключительно для проведения проверок личной безопасности,
            анализа открытых источников (OSINT) и мониторинга угрожающих сигналов.
            Пользователь несет ответственность за правомерность использования полученных данных.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start space-x-3 mt-4 p-3 border border-border rounded bg-secondary/30">
          <Checkbox 
            id="terms" 
            checked={agreed} 
            onCheckedChange={(c) => setAgreed(c as boolean)} 
            className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="terms" className="text-xs font-mono leading-relaxed cursor-pointer text-muted-foreground select-none">
            Подтверждаю использование платформы исключительно в законных целях и для проверки собственной безопасности.
          </Label>
        </div>

        <DialogFooter className="mt-4 sm:justify-center">
          <Button 
            disabled={!agreed} 
            onClick={handleAccept}
            className="w-full font-mono uppercase tracking-wider text-xs py-5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            size="lg"
          >
            <Lock className="w-4 h-4 mr-2" /> Авторизовать доступ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
