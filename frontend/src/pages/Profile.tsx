import { useAuth } from '../contexts/AuthContext';
import { LogOut, BookOpen, Package, X, Plus, Loader2 } from 'lucide-react';
import { History } from './History';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Profile() {
  const { user, signOut } = useAuth();
  const [pantry, setPantry] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function loadPantry() {
      const { data, error } = await supabase
        .from('user_pantry')
        .select('ingredients')
        .eq('user_id', user!.id)
        .single();
      
      if (data && !error) {
        setPantry(data.ingredients || []);
      }
      setIsLoading(false);
    }
    void loadPantry();
  }, [user]);

  const savePantry = async (newPantry: string[]) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_pantry')
      .upsert({ user_id: user.id, ingredients: newPantry }, { onConflict: 'user_id' });
    if (error) {
      console.error('Erro ao guardar despensa:', error);
    }
  };

  const addIngredient = () => {
    const val = inputValue.trim();
    if (val && !pantry.includes(val.toLowerCase())) {
      const newPantry = [...pantry, val.toLowerCase()];
      setPantry(newPantry);
      setInputValue('');
      void savePantry(newPantry);
    }
  };

  const removeIngredient = (ingredient: string) => {
    const newPantry = pantry.filter(i => i !== ingredient);
    setPantry(newPantry);
    void savePantry(newPantry);
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: A Minha Despensa */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Package className="w-6 h-6 text-primary-500" />
              A Minha Despensa
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Adicione ingredientes que tem sempre em casa (ex: sal, azeite, alho). O FastCook usará esta lista automaticamente nas suas receitas.
            </p>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                placeholder="Ex: Pimenta preta..."
                className="flex-1 rounded-xl py-3 px-4 border border-slate-200 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition-all text-sm shadow-sm"
              />
              <button 
                onClick={addIngredient}
                className="p-3 bg-primary-100 text-primary-600 hover:bg-primary-200 rounded-xl transition-colors shadow-sm"
                aria-label="Adicionar ingrediente"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-4 text-primary-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pantry.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Nenhum ingrediente na despensa.</p>
                )}
                {pantry.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg ring-1 ring-slate-200 shadow-sm transition-all hover:bg-white hover:ring-primary-200">
                    {item}
                    <button onClick={() => removeIngredient(item)} className="text-slate-400 hover:text-red-500 transition-colors ml-1" aria-label={`Remover ${item}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Histórico e Favoritos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-500" />
              As Minhas Receitas e Favoritos
            </h2>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
             <History />
          </div>
        </div>
      </div>
    </div>
  );
}
