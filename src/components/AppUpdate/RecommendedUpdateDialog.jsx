// Modal non-bloquant (Radix Dialog, cf. src/components/ui/dialog.jsx) —
// l'app normale reste utilisable derrière ; "Mais tarde" et le bouton retour
// matériel ferment simplement le dialogue (jamais de piège du Back).
import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useToast } from '@/components/ui/use-toast';
import { DEFAULT_RECOMMENDED_TITLE, DEFAULT_RECOMMENDED_MESSAGE, STORE_OPEN_ERROR_MESSAGE } from '@/services/appUpdateService';

export default function RecommendedUpdateDialog() {
  const {
    status, config, recommendedDismissed, openStore, dismissRecommendedUpdate,
  } = useAppUpdate();
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);

  const open = status === 'recommended' && !recommendedDismissed;

  // Bouton retour matériel Android → équivalent de "Mais tarde" (jamais de piège).
  useEffect(() => {
    if (!open) return undefined;
    let removeBackListener = null;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => dismissRecommendedUpdate()))
      .then((handle) => { removeBackListener = () => handle.remove(); })
      .catch(() => { /* web/PWA pur : Escape/clic dehors suffisent */ });
    return () => { if (removeBackListener) removeBackListener(); };
  }, [open, dismissRecommendedUpdate]);

  const handleUpdate = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await openStore();
    } catch {
      toast({ title: STORE_OPEN_ERROR_MESSAGE, variant: 'destructive' });
    } finally {
      setOpening(false);
    }
  };

  // Escape / clic hors du panneau / icône X du Dialog → même geste que "Mais tarde".
  const handleOpenChange = (next) => { if (!next) dismissRecommendedUpdate(); };

  const title = config?.titleRecommended || DEFAULT_RECOMMENDED_TITLE;
  const message = config?.messageRecommended || DEFAULT_RECOMMENDED_MESSAGE;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/10 bg-black text-white sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <RefreshCw className="h-5 w-5 text-[#FDE047]" aria-hidden="true" />
          </div>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/70">{message}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={dismissRecommendedUpdate}
            className="min-h-[44px] flex-1 rounded-full border border-white/12 px-4 text-sm font-medium text-white/82 transition hover:bg-white/8"
          >
            Mais tarde
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={opening}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FDE047] px-4 text-sm font-semibold text-black transition active:scale-[0.99] disabled:opacity-70"
          >
            {opening && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Atualizar agora
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
