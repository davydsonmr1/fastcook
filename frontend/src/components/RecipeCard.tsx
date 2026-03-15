import { Clock, ChefHat, Flame, X, Share2 } from 'lucide-react';
import type { RecipeResponse } from '../services/api';

interface RecipeCardProps {
  recipe: RecipeResponse;
  onClear?: () => void;
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
    `🍳 *Receita FlashCook*`,
    ``,
    `📌 *${recipe.name}*`,
    `⏱ Tempo: ${recipe.prepTime}`,
    `🔥 Dificuldade: ${diff} (${String(recipe.difficulty)}/5)`,
    ``,
    `*Modo de Preparação:*`,
    stepsText,
    ``,
    `_Gerado por FlashCook — receitas por voz com IA_ 🚀`,
  ].join('\n');

  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function RecipeCard({ recipe, onClear }: RecipeCardProps) {
  const difficulty = difficultyConfig[recipe.difficulty] ?? difficultyConfig[3];

  return (
    <article className="animate-fade-in-up w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white leading-snug">{recipe.name}</h2>
        </div>
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

      {/* Badges */}
      <div className="flex flex-wrap gap-3 px-6 pt-5 pb-2">
        {/* Tempo de Preparo */}
        <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-sky-100 text-sky-700 ring-1 ring-sky-300 rounded-full px-3 py-1">
          <Clock className="w-3.5 h-3.5" />
          {recipe.prepTime}
        </span>

        {/* Dificuldade */}
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ring-1 rounded-full px-3 py-1 ${difficulty.color}`}>
          <DifficultyStars level={recipe.difficulty} />
          {difficulty.label}
        </span>
      </div>

      {/* Passos */}
      <div className="px-6 pt-3 pb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Modo de Preparação
        </h3>
        <ol className="space-y-3">
          {recipe.steps.map((step, index) => (
            <li key={index} className="flex gap-3 items-start">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-bold">
                {index + 1}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-6 py-4 flex gap-3">
        {/* Partilhar no WhatsApp */}
        <button
          onClick={() => shareOnWhatsApp(recipe)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors ${onClear ? 'flex-1' : 'w-full'}`}
        >
          <Share2 className="w-4 h-4" />
          Partilhar
        </button>

        {/* Nova Receita (apenas no ecrã principal) */}
        {onClear && (
          <button
            onClick={onClear}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            <ChefHat className="w-4 h-4" />
            Nova Receita
          </button>
        )}
      </div>
    </article>
  );
}
