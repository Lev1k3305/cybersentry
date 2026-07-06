import React from 'react';
import { ShieldAlert } from 'lucide-react';
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
        className="sm:max-w-[500px] border-destructive/20 bg-background/95 backdrop-blur-md"
        hideCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <DialogTitle className="text-xl text-center text-foreground uppercase tracking-widest font-mono">
            CyberSentry:<br/> Условия использования<br/>и Конфиденциальность
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-4 text-base leading-relaxed">
            Данное приложение предназначено исключительно для проверки личной безопасности, 
            репутации номеров и анализа данных из открытых источников (OSINT). 
            Разработчик не несет ответственности за любые возможные нелегальные, 
            неправомерные или вредоносные действия пользователей, 
            совершенные с использованием данного ПО.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start space-x-3 mt-6 p-4 border border-border/50 rounded-md bg-secondary/30">
          <Checkbox 
            id="terms" 
            checked={agreed} 
            onCheckedChange={(c) => setAgreed(c as boolean)} 
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm font-medium leading-snug cursor-pointer">
            Я подтверждаю, что буду использовать приложение исключительно в легальных целях
          </Label>
        </div>

        <DialogFooter className="mt-6 sm:justify-center">
          <Button 
            disabled={!agreed} 
            onClick={handleAccept}
            className="w-full font-mono uppercase tracking-wide"
            size="lg"
          >
            Войти в панель CyberSentry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
