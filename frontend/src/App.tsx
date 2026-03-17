import { Mic, Loader2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSpeech } from './hooks/useSpeech';
import { generateRecipe, ApiError } from './services/api';
import type { RecipeResponse } from './services/api';
import { RecipeCard } from './components/RecipeCard';
import { Header } from './components/Header';
import { History } from './pages/History';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'history'>('home');
  const { isListening, transcript, error: speechError, startListening, stopListening, resetTranscript } = useSpeech();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [partialRecipeText, setPartialRecipeText] = useState<string>('');
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);

  // Redireciona para Home se o utilizador fizer logout estando no Histórico
  useEffect(() => {
    if (!user && currentView === 'history') {
      setCurrentView('home');
    }
  }, [user, currentView]);

  // Unified Error Msg based on Speech fallback or API
  const displayError = speechError || apiErrorMsg;

  const handleClear = () => {
    setResult(null);
    setPartialRecipeText('');
    setApiErrorMsg(null);
    resetTranscript();
  };

  const handleToggleListen = () => {
    // Limpa estado anterior na nova tentativa
    setApiErrorMsg(null);
    setResult(null);
    setPartialRecipeText('');

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
    setPartialRecipeText('');

    try {
      // Chamada à nossa class wrapper `generateRecipe` com callback de stream incluído
      const recipePayload = await generateRecipe(ingredients, (text) => {
        setPartialRecipeText(text);
      });
      setResult(recipePayload);
      setPartialRecipeText('');
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
    <>
      <Header currentView={currentView} onViewChange={setCurrentView} />

      {currentView === 'history' && user ? (
        <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary-50 to-transparent -z-10" />
          <History />
        </main>
      ) : (
        <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          
          {/* Background Decorator */}
          <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary-50 to-transparent -z-10" />

          {/* Tagline */}
          <header className="text-center mb-16 mt-8">
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
              aria-label={isListening ? "Parar de ouvir e enviar ingredientes" : "Pressione para falar os ingredientes"}
              aria-pressed={isListening}
            >
              <Mic className={`w-12 h-12 ${isListening ? 'animate-bounce' : ''}`} aria-hidden="true" />
              
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
                  aria-label="Simular uso da API enviando bife de atum"
                >
                   Simular API de Voz (Bife de atum)
                </button>
            )}

            {/* Transcript Area */}
            <div 
              className="w-full min-h-24 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center text-center transition-all"
              aria-live="polite"
              aria-atomic="true"
            >
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

            {/* Loading / Streaming State or Final Result */}
            {(isLoading || result) && (
              <div className="mt-8 w-full">
                {(!partialRecipeText && !result && isLoading) && (
                  <div className="flex flex-col items-center text-primary-500 space-y-3 mb-8">
                     <Loader2 className="w-8 h-8 animate-spin" />
                     <p className="text-sm font-medium animate-pulse">A preparar os ingredientes...</p>
                  </div>
                )}
                
                {(partialRecipeText || result) && (
                  <RecipeCard 
                    recipe={result ?? undefined} 
                    partialText={partialRecipeText} 
                    onClear={!isLoading ? handleClear : undefined} 
                    isStreaming={isLoading}
                  />
                )}
              </div>
            )}

          </section>
        </main>
      )}
    </>
  );
}

export default App;
