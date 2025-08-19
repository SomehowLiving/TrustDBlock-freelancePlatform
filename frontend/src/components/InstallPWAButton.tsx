
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download } from 'lucide-react';

export function InstallPWAButton() {
  const { isInstallable, promptInstall } = useInstallPrompt();

  if (!isInstallable) return null;

  const handleInstall = () => {
    promptInstall();
  };

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className="touch-friendly"
    >
      <Download className="w-4 h-4 mr-2" />
      Install App
    </Button>
  );
}
