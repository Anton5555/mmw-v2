'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export function OscarSuccessDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the submitted param is present
    if (searchParams.get('submitted') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    // Remove the search param to clean the URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('submitted');
    const newSearch = params.toString();
    router.replace(newSearch ? `/oscars?${newSearch}` : '/oscars');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent 
        className="bg-zinc-950 border-zinc-800 text-white max-w-md"
        onPointerDownOutside={(e) => {
          // Prevent closing on outside click
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on ESC key
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            ¡Los Oscalos enviados exitosamente!
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center mt-4">
            Tu prode te va a llegar al mail para que no te olvidés que elegiste, aparte podés descargarlo en imagen desde acá. Si hubo un error con la carga o algo por el estilo, avisá al equipo de Haití, pero no nos hacemos responsables si elegiste algo mal por error propio, no seas gil/a
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            onClick={handleClose}
            className="w-full bg-yellow-500 text-black hover:bg-yellow-400 rounded-full"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
