import { LogIn, LogOut, History, ChefHat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentView: 'home' | 'history';
  onViewChange: (view: 'home' | 'history') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();

  return (
    <nav className="w-full bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onViewChange('home')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ChefHat className="w-6 h-6 text-primary-500" />
          <span className="font-extrabold text-lg text-slate-900">
            Flash<span className="text-primary-500">Cook</span>
          </span>
        </button>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewChange('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'home'
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Início
          </button>
          {user && (
            <button
              onClick={() => onViewChange('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'history'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico
            </button>
          )}
        </div>

        {/* Auth Button */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt={user.user_metadata?.full_name as string ?? 'Avatar'}
                  className="w-8 h-8 rounded-full ring-2 ring-slate-100"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                title="Terminar sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => void signInWithGoogle()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Entrar com Google</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
