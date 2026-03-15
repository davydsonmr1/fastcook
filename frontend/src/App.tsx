import { Mic, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import { useSpeech } from './hooks/useSpeech';
import { generateRecipe, ApiError } from './services/api';
import type { RecipeResponse } from './services/api';

function App() {
  const { isListening, transcript, error: speechError, startListening, stopListening } = useSpeech();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);

  // Debounce timeout ref to automatically submit when user stops speaking for 2 seconds

  // Unified Error Msg based on Speech fallback or API
  const displayError = speechError || apiErrorMsg;

  const handleToggleListen = () => {
    // Limpa estado anterior na nova tentativa
    setApiErrorMsg(null);
    setResult(null);

    if (isListening) {
      // Paragem manual pelo microfone
      stopListening();
      if (transcript.length > 3) {
        void submitRecipe(transcript);
      } else {
        setApiErrorMsg('Por favor, dite os ingredientes em voz alta antes de parar.');
      }
    } else {
      startListening();
    }
  };

  const submitRecipe = async (ingredients: string) => {
    setIsLoading(true);
    setApiErrorMsg(null);
    setResult(null);

    try {
      // Chamada à nossa class wrapper `generateRecipe` que engloba UX Security (HTTP 429/422)
      const recipePayload = await generateRecipe(ingredients);
      setResult(recipePayload);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiErrorMsg(err.message);
      } else {
         setApiErrorMsg('Ocorreu um erro interno na sua conexão.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Decorator */}
      <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary-50 to-transparent -z-10" />

      {/* Header */}
      <header className="text-center mb-16 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
          Flash<span className="text-primary-500">Cook</span>
        </h1>
        <p className="text-slate-500 max-w-sm mx-auto">
          Dite os seus ingredientes e nós fazemos a magia acontecer. Zero desperdício.
        </p>
      </header>

      {/* Main Interaction Area */}
      <section className="flex flex-col items-center w-full max-w-md">
        
        {/* Microphone Button */}
        <button
          onClick={handleToggleListen}
          disabled={isLoading}
          className={`
            relative flex items-center justify-center
            w-32 h-32 rounded-full mb-8 transition-all duration-300 shadow-xl
            ${isListening 
              ? 'bg-primary-500 text-white animate-pulse-fast ring-4 ring-primary-100 scale-105' 
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 ring-1 ring-slate-200'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed scale-95' : ''}
          `}
          aria-label={isListening ? "Parar de ouvir" : "Tocar para ditar ingredientes"}
        >
          <Mic className={`w-12 h-12 ${isListening ? 'animate-bounce' : ''}`} />
          
          {/* Ripple effect when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-4 border-primary-500 opacity-20 animate-ping" />
          )}
        </button>

        {/* Temporary mock input button */}
        {isListening && (
            <button 
              onClick={() => { stopListening(); void submitRecipe('Cebola, alho, dois ovos e bife de atum'); }} 
              className="mb-4 text-xs font-semibold text-primary-600 uppercase tracking-wider"
            >
               Simular API de Voz (Bife de atum)
            </button>
        )}

        {/* Transcript Area */}
        <div className="w-full min-h-24 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center text-center transition-all">
          {isListening ? (
             transcript ? (
                <p className="text-slate-800 font-medium italic">"{transcript}"</p>
             ) : (
                <p className="text-slate-600 animate-pulse">A ouvir os seus ingredientes...</p>
             )
          ) : transcript && !result && isLoading ? (
            <p className="text-slate-800 font-medium">"{transcript}"</p>
          ) : (
             <p className="text-slate-400">Toque no microfone para começar.</p>
          )}
        </div>

        {/* Unified Error State */}
        {displayError && !isLoading && (
          <div className="mt-6 w-full bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
             <Info className="w-5 h-5 shrink-0 mt-0.5" />
             <p className="text-sm font-medium">{displayError}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 flex flex-col items-center text-primary-500 space-y-3">
             <Loader2 className="w-8 h-8 animate-spin" />
             <p className="text-sm font-medium animate-pulse">A cozinhar a receita perfeita...</p>
          </div>
        )}

        {/* Result Area (Raw JSON for Task 5 MVP) */}
        {result && !isLoading && (
          <div className="mt-8 w-full bg-slate-900 rounded-2xl p-4 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
               <span className="text-xs font-mono text-slate-400">Response (MVP JSON)</span>
               <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded text-green-400">200 OK</span>
            </div>
            <pre className="text-emerald-400 text-xs font-mono overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

      </section>
    </main>
  );
}

export default App;
