import { Clock, ChefHat, Flame, X, Share2, Heart, ThumbsUp, Globe2 } from 'lucide-react';
import type { RecipeResponse } from '../services/api';

interface RecipeCardProps {
  recipe?: RecipeResponse;
  partialText?: string;
  onClear?: () => void;
  isStreaming?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isLiked?: boolean;
  likesCount?: number;
  onToggleLike?: () => void;
  isPublic?: boolean;
  onTogglePublic?: () => void;
}

// Utilitário para extrair campos de um JSON incompleto de forma resiliente
function parsePartialJson(jsonString: string): Partial<RecipeResponse> {
  if (!jsonString) return {};
  try {
    return JSON.parse(jsonString);
  } catch {
    const nameMatch = jsonString.match(/"name"\s*:\s*"([^"]+)/);
    const prepMatch = jsonString.match(/"prepTime"\s*:\s*"([^"]+)/);
    const diffMatch = jsonString.match(/"difficulty"\s*:\s*(\d+)/);
    const imgMatch = jsonString.match(/"imageUrl"\s*:\s*"([^"]+)/);
    
    const steps: string[] = [];
    const stepsBlockMatch = jsonString.match(/"steps"\s*:\s*\[(.*)/s);
    if (stepsBlockMatch) {
       const block = stepsBlockMatch[1];
       const matches = [...block.matchAll(/"([^"]+)"/g)];
       matches.forEach(m => steps.push(m[1]));
    }

    return {
      name: nameMatch ? nameMatch[1] : 'A cozinhar...',
      prepTime: prepMatch ? prepMatch[1] : '...',
      difficulty: diffMatch ? parseInt(diffMatch[1], 10) : 3,
      steps: steps.length > 0 ? steps : [],
      imageUrl: imgMatch ? imgMatch[1] : undefined,
    };
  }
}

const difficultyConfig: Record<number, { label: string; color: string; stars: number }> = {
  1: { label: 'Muito Fácil', color: 'bg-emerald-100 text-emerald-700 ring-emerald-300', stars: 1 },
  2: { label: 'Fácil', color: 'bg-green-100 text-green-700 ring-green-300', stars: 2 },
  3: { label: 'Médio', color: 'bg-amber-100 text-amber-700 ring-amber-300', stars: 3 },
  4: { label: 'Difícil', color: 'bg-orange-100 text-orange-700 ring-orange-300', stars: 4 },
  5: { label: 'Muito Difícil', color: 'bg-red-100 text-red-700 ring-red-300', stars: 5 },
};

function DifficultyStars({ level }: { level: number }) {
  const clamped = Math.max(1, Math.min(5, level));
  return (
    <span className="inline-flex gap-0.5" aria-label={`Dificuldade ${clamped} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Flame
          key={i}
          className={`w-3.5 h-3.5 ${i < clamped ? 'fill-current' : 'opacity-25'}`}
        />
      ))}
    </span>
  );
}

function shareOnWhatsApp(recipe: RecipeResponse) {
  const diff = difficultyConfig[recipe.difficulty]?.label ?? 'Médio';
  const stepsText = recipe.steps.map((s, i) => `${String(i + 1)}. ${s}`).join('\n');

  const text = [
    `🍳 *Receita FastCook*`,
    ``,
    `📌 *${recipe.name}*`,
    `⏱ Tempo: ${recipe.prepTime}`,
    `🔥 Dificuldade: ${diff} (${String(recipe.difficulty)}/5)`,
    ``,
    `*Modo de Preparação:*`,
    stepsText,
    recipe.imageUrl ? `\n📸 ${recipe.imageUrl}` : '',
    ``,
    `_Gerado por FastCook — receitas por voz com IA_ 🚀`,
  ].join('\n');

  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function RecipeCard({ recipe, partialText, onClear, isStreaming, isFavorite, onToggleFavorite, isLiked, likesCount, onToggleLike, isPublic, onTogglePublic }: RecipeCardProps) {
  const displayRecipe = recipe || parsePartialJson(partialText || '');
  const difficulty = difficultyConfig[displayRecipe.difficulty || 3] ?? difficultyConfig[3];

  return (
    <article className={`animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-100/60 w-full bg-white rounded-3xl shadow-lg border-2 ${isStreaming ? 'border-primary-300 shadow-primary-200/50' : 'border-slate-50 hover:border-primary-100'} overflow-hidden transition-all duration-500`}>
      {/* Header */}
      <div className={`px-6 py-6 flex items-start justify-between gap-4 transition-colors duration-500 ${isStreaming ? 'bg-gradient-to-r from-primary-400 to-primary-500 animate-pulse' : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
            <ChefHat className={`w-5 h-5 text-white ${isStreaming ? 'animate-bounce' : ''}`} />
          </div>
          <h2 className="text-xl font-bold text-white leading-snug">
            {displayRecipe.name || 'A pensar na receita...'}
            {isStreaming && <span className="ml-1 animate-pulse">|</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
              aria-label="Fechar receita e iniciar nova"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Imagem Premium */}
      {displayRecipe.imageUrl && (
        <div className="w-full h-48 sm:h-64 flex items-center justify-center overflow-hidden relative bg-slate-100">
           {isStreaming ? (
              <div className="animate-pulse flex items-center text-slate-400"><ChefHat className="animate-bounce" /></div>
           ) : (
             <img 
               src={displayRecipe.imageUrl} 
               alt={displayRecipe.name} 
               className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
               loading="lazy"
             />
           )}
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-3 px-6 pt-5 pb-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-sky-100 text-sky-700 ring-1 ring-sky-300 rounded-full px-3 py-1">
          <Clock className="w-3.5 h-3.5" />
          {displayRecipe.prepTime || '...'}
        </span>

        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ring-1 rounded-full px-3 py-1 ${difficulty.color}`}>
          <DifficultyStars level={displayRecipe.difficulty || 3} />
          {difficulty.label}
        </span>
      </div>

      {/* Passos */}
      <div className="px-6 pt-3 pb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          Modo de Preparação
          {isStreaming && <div className="w-2 h-2 rounded-full bg-primary-400 animate-ping"></div>}
        </h3>
        <ol className="space-y-3">
          {(!displayRecipe.steps || displayRecipe.steps.length === 0) && (
             <p className="text-sm text-slate-400 italic">A aguardar passos...</p>
          )}
          {displayRecipe.steps?.map((step, index) => (
            <li key={index} className="flex gap-3 items-start animate-fade-in-up">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gold-500/10 text-gold-500 ring-1 ring-gold-500/30 text-xs font-bold transition-transform hover:scale-110">
                {index + 1}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap gap-3 items-center">
        
        {onToggleLike && (
          <button
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${isLiked ? 'text-primary-600 bg-primary-50' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            {likesCount || 0}
          </button>
        )}
        
        {onTogglePublic && (
          <button
            onClick={onTogglePublic}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${isPublic ? 'text-sky-600 bg-sky-50 outline outline-1 outline-sky-200' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
          >
            <Globe2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isPublic ? 'Pública' : 'Privada'}</span>
          </button>
        )}

        <button
          onClick={() => displayRecipe.steps && displayRecipe.steps.length > 0 ? shareOnWhatsApp(displayRecipe as RecipeResponse) : null}
          disabled={isStreaming}
          aria-label="Partilhar receita no WhatsApp"
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${!onClear && !onToggleLike ? 'w-full py-2.5' : 'flex-1'} ${isStreaming ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          Partilhar
        </button>

        {onClear && (
          <button
            onClick={onClear}
            aria-label="Começar uma nova receita"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <ChefHat className="w-4 h-4" aria-hidden="true" />
            Nova
          </button>
        )}
      </div>
    </article>
  );
}
