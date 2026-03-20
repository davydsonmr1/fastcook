import { LogIn, User as UserIcon, ChefHat, Compass, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type ViewType = 'home' | 'profile' | 'explore';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLoginClick: () => void;
  onPremiumClick: () => void;
}

export function Header({ currentView, onViewChange, onLoginClick, onPremiumClick }: HeaderProps) {
  const { user, isLoading } = useAuth();

  const handleProfileClick = () => {
    if (user) {
      onViewChange('profile');
    } else {
      onLoginClick();
    }
  };

  return (
    <nav className="w-full bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onViewChange('home')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ChefHat className="w-6 h-6 text-primary-500" />
          <span className="font-extrabold text-lg text-slate-900 hidden sm:inline">
            Fast<span className="text-primary-500">Cook</span>
          </span>
        </button>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
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
          
          <button
            onClick={() => onViewChange('explore')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'explore'
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Explorar</span>
          </button>
          
          <button
            onClick={handleProfileClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'profile'
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </button>
        </div>

        {/* Auth / Premium Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onPremiumClick}
            className="flex items-center justify-center p-2 rounded-full min-w-8 min-h-8 bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 hover:from-amber-300 hover:to-amber-500 transition-all shadow-sm shadow-amber-200"
            aria-label="Chef Premium"
          >
             <Crown className="w-4 h-4 fill-amber-700/20" />
          </button>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt={user.user_metadata?.full_name as string ?? 'Avatar'}
                  className="w-8 h-8 rounded-full ring-2 ring-slate-100 cursor-pointer hover:ring-primary-100 transition-all"
                  referrerPolicy="no-referrer"
                  onClick={handleProfileClick}
                />
              ) : (
                <div 
                  onClick={handleProfileClick}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold cursor-pointer hover:ring-2 hover:ring-primary-100 transition-all"
                >
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex flex-1 items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
