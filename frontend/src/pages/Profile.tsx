import { useAuth } from '../contexts/AuthContext';
import { LogOut, ArrowRight, BookOpen } from 'lucide-react';
import { History } from './History';

export function Profile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      {/* Cabeçalho do Perfil */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left mb-8">
        
        {/* Avatar */}
        <div className="shrink-0 relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-primary-50 shadow-inner">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || 'Avatar do utilizador'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes e Ações */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user.user_metadata?.full_name || 'Cozinheiro'}
            </h1>
            <p className="text-slate-500 font-medium">{user.email}</p>
          </div>

          <button
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Terminar Sessão
          </button>
        </div>
      </div>

      {/* Secção: Receitas Guardadas / Histórico */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-500" />
            As Minhas Receitas
          </h2>
          <span className="text-sm text-slate-400 font-medium flex items-center gap-1 cursor-not-allowed">
            Ver todas <ArrowRight className="w-4 h-4" />
          </span>
        </div>
        
        {/* Reaproveitamos o componente History já existente para listar o que este utilizador gerou */}
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
           <History />
        </div>
      </div>
    </div>
  );
}
