import React from 'react';
import { WifiOff, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus, useInstallPrompt } from '@/components/usePWA';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  return (
    <AnimatePresence>
      {(!isOnline || canInstall) && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-1"
        >
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-medium shadow-lg">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Mode hors ligne — traductions depuis le cache uniquement</span>
            </div>
          )}
          {canInstall && (
            <div className="flex items-center justify-between gap-2 bg-indigo-600 text-white px-4 py-2 text-sm shadow-lg">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 shrink-0" />
                <span>Installez l'app pour l'utiliser hors ligne !</span>
              </div>
              <Button
                size="sm"
                onClick={install}
                className="bg-white text-indigo-700 hover:bg-indigo-50 text-xs px-3 h-7 shrink-0"
              >
                Installer
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}