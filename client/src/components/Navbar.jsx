import { LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">Queue<span className="text-signal">Less</span></h1>
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{user.name} ({user.role === 'ADMIN' ? 'Staff' : 'Student'})</span>
            <button onClick={logout} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-signal">
              <LogOut size={16} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
