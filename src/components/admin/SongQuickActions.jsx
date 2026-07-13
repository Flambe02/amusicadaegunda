// "Ações rápidas" for the selected song in the drawer.
import { Edit2, Mic, ExternalLink, Trash2, CheckCircle2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicSongUrl } from './adminData';

export default function SongQuickActions({ view, onEdit, onKaraoke, onPublish, onManageLinks, onDelete }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Ações rápidas</h3>
      <div className="space-y-2">
        <Button onClick={() => onEdit(view)} className="w-full justify-center gap-2 bg-purple-600 hover:bg-purple-700">
          <Edit2 size={15} /> Editar música
        </Button>

        {view.status === 'draft' && onPublish && (
          <Button onClick={() => onPublish(view)} variant="outline" className="w-full justify-center gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300">
            <CheckCircle2 size={15} /> Publicar agora
          </Button>
        )}

        {view.hasLyrics && (
          <Button onClick={() => onKaraoke(view)} variant="outline" className="w-full justify-center gap-2">
            <Mic size={15} /> Abrir karaokê
          </Button>
        )}

        <Button asChild variant="outline" className="w-full justify-center gap-2">
          <a href={publicSongUrl(view)} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Ver no site
          </a>
        </Button>

        <Button onClick={() => onManageLinks(view)} variant="outline" className="w-full justify-center gap-2">
          <Link2 size={15} /> Gerenciar links
        </Button>

        <Button onClick={() => onDelete(view)} variant="outline" className="w-full justify-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 size={15} /> Excluir música
        </Button>
      </div>
    </div>
  );
}
