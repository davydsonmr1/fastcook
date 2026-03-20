import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RecipeCard } from '../components/RecipeCard';
import { Loader2, BookOpen } from 'lucide-react';
import type { RecipeResponse } from '../services/api';

interface HistoryEntry {
  id: string;
  response_data: RecipeResponse;
  is_favorite: boolean;
  created_at: string;
}

export function History() {
  const [recipes, setRecipes] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('recipes_cache')
        .select('id, response_data, is_favorite, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecipes(data as HistoryEntry[]);
      }
      setIsLoading(false);
    }
    void fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-primary-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">A carregar o seu histórico...</p>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <BookOpen className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">Nenhuma receita no histórico</p>
        <p className="text-sm mt-1">As receitas que gerar enquanto estiver logado aparecerão aqui.</p>
      </div>
    );
  }

  const handleToggleFavorite = async (id: string, currentStatus: boolean) => {
    // Optimistic toggle
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_favorite: !currentStatus } : r))
    );

    const { error } = await supabase
      .from('recipes_cache')
      .update({ is_favorite: !currentStatus })
      .eq('id', id);

    if (error) {
      // Revert mapping
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: currentStatus } : r))
      );
    }
  };

  return (
    <section className="w-full mx-auto mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recipes.map((entry) => (
          <div key={entry.id} className="flex flex-col h-full">
            <p className="text-xs text-slate-400 mb-2 font-medium">
              {new Date(entry.created_at).toLocaleDateString('pt-PT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex-1">
              <RecipeCard 
                recipe={entry.response_data} 
                isFavorite={entry.is_favorite}
                onToggleFavorite={() => void handleToggleFavorite(entry.id, entry.is_favorite)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
