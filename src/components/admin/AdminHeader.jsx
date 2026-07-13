// Compact admin header: brand + counts + settings + logout.
import { useNavigate } from 'react-router-dom';
import { Music, Settings, LogOut } from 'lucide-react';

export default function AdminHeader({ published, drafts, onLogout }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-gray-950/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <Music size={20} className="text-purple-400" />
        <span className="font-semibold">Admin — A Música da Segunda</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="hidden sm:inline tabular-nums">{published} publicadas · {drafts} rascunhos</span>
        <button onClick={() => navigate('/admin/configuracoes')} title="Configurações" className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:text-white transition-colors">
          <Settings size={15} /> <span className="hidden md:inline">Configurações</span>
        </button>
        <button onClick={onLogout} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:text-white transition-colors">
          <LogOut size={15} /> Sair
        </button>
      </div>
    </header>
  );
}
