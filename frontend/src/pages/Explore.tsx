import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RecipeCard } from '../components/RecipeCard';
import { Loader2, Globe2 } from 'lucide-react';
import type { RecipeResponse } from '../services/api';

interface ExploreEntry {
  id: string;
  response_data: RecipeResponse;
  created_at: string;
  user_id: string;
  image_url: string | null;
  likes_count: number;
  user_liked: boolean;
}

export function Explore() {
  const [recipes, setRecipes] = useState<ExploreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityRecipes();
  }, []);

  const fetchCommunityRecipes = async () => {
    setLoading(true);
    // Fetch recipes marked as public
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Idealmente usaríamos uma View ou RPC no Supabase para agregar likes (N+1 limitador)
    // Para simplificar, vamos buscar recipes_cache e depois contar no frontend ou com join subselect
    
    // Select dinâmico das receitas públicas
    const { data: publicRecipes, error } = await supabase
      .from('recipes_cache')
      .select(`
        id, created_at, response_data, user_id, image_url,
        recipe_likes ( user_id )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && publicRecipes) {
      const formatted = publicRecipes.map((r: any) => {
         const likes = r.recipe_likes || [];
         const userLiked = userId ? likes.some((l: any) => l.user_id === userId) : false;
         
         // Injetar imagem caso já venha solta no DB e nao no JSON
         const responseData = r.response_data as RecipeResponse;
         if (r.image_url) responseData.imageUrl = r.image_url;

         return {
           id: r.id,
           response_data: responseData,
           created_at: r.created_at,
           user_id: r.user_id,
           image_url: r.image_url,
           likes_count: likes.length,
           user_liked: userLiked
         };
      });
      setRecipes(formatted);
    }
    setLoading(false);
  };

  const handleToggleLike = async (recipeId: string, currentlyLiked: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return alert('Por favor, inicie sessão para dar "Like".');
    
    const userId = session.user.id;
    
    // Atualização otimista
    setRecipes(prev => prev.map(r => {
       if (r.id === recipeId) {
          return {
             ...r,
             user_liked: !currentlyLiked,
             likes_count: r.likes_count + (currentlyLiked ? -1 : 1)
          }
       }
       return r;
    }));

    if (currentlyLiked) {
      await supabase.from('recipe_likes').delete().match({ recipe_id: recipeId, user_id: userId });
    } else {
      await supabase.from('recipe_likes').insert({ recipe_id: recipeId, user_id: userId });
    }
  };

  if (loading) {
     return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
  }

  return (
    <div className="w-full max-w-5xl">
       <div className="flex items-center gap-3 mb-8">
           <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-slate-800">Comunidade</h2>
              <p className="text-slate-500">Inspire-se nas criações públicas de outros chefs.</p>
           </div>
       </div>

       {recipes.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <Globe2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-slate-700">O feed está vazio</h3>
             <p className="text-slate-500">Seja o primeiro a publicar uma receita gerada!</p>
          </div>
       ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             {recipes.map(entry => (
                <RecipeCard 
                  key={entry.id}
                  recipe={entry.response_data}
                  isLiked={entry.user_liked}
                  likesCount={entry.likes_count}
                  onToggleLike={() => handleToggleLike(entry.id, entry.user_liked)}
                  isPublic={true}
                  // Não mostramos botão para 'des-publicar' a não ser que o autor seja o user atual. Mas simplificamos a UI de exploracao.
                />
             ))}
          </div>
       )}
    </div>
  );
}
