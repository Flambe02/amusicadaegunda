// Confirmed, focus-trapped destructive delete dialog.
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export default function DeleteSongDialog({ song, deleting, onCancel, onConfirm }) {
  return (
    <AlertDialog open={Boolean(song)} onOpenChange={(open) => { if (!open && !deleting) onCancel(); }}>
      <AlertDialogContent className="border-white/10 bg-gray-900 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{song?.title}”?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="border-white/15 bg-transparent hover:bg-white/10">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="gap-1 bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 size={14} /> {deleting ? 'Excluindo…' : 'Excluir música'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
