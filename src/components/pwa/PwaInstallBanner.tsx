
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile'; 

// Define the event type
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) {
          return; 
      }
      
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
    } else {
      console.log('User dismissed the PWA installation');
    }
    
    setInstallPrompt(null);
    setIsVisible(false);
  };

  const handleDismissClick = () => {
    setIsVisible(false);
  };

  if (!isMobile || !isVisible || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-50 md:left-auto md:max-w-sm">
      <Card className="shadow-lg">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
             <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-sm">Install GroupHub App</p>
            <p className="text-xs text-muted-foreground">For a better experience and offline access.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={handleInstallClick} size="sm" className="h-8">
              Install
            </Button>
            <Button onClick={handleDismissClick} variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
