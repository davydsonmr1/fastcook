import { Mic, Loader2, Info, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSpeech } from './hooks/useSpeech';
import { generateRecipe, ApiError } from './services/api';
import type { RecipeResponse } from './services/api';
import { RecipeCard } from './components/RecipeCard';
import { Header } from './components/Header';
import { Profile } from './pages/Profile';
import { Explore } from './pages/Explore';
import { useAuth } from './contexts/AuthContext';
import { LoginModal } from './components/LoginModal';
import { PremiumModal } from './components/PremiumModal';
import type { ViewType } from './components/Header';

function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isPremiumModalOpen, setPremiumModalOpen] = useState(false);
  const { isListening, transcript, error: speechError, startListening, stopListening, resetTranscript } = useSpeech(() => setShouldSubmit(true));
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [partialRecipeText, setPartialRecipeText] = useState<string>('');
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [coldStartMsg, setColdStartMsg] = useState<string | null>(null);
  const [dietaryRestriction, setDietaryRestriction] = useState('');

  // Redireciona para Home se o utilizador fizer logout estando no Perfil
  useEffect(() => {
    if (!user && currentView === 'profile') {
      setCurrentView('home');
    }
  }, [user, currentView]);

  // Unified Error Msg based on Speech fallback or API
  const displayError = speechError || apiErrorMsg;

  const handleClear = () => {
    setResult(null);
    setPartialRecipeText('');
    setApiErrorMsg(null);
    setTextInput('');
    setColdStartMsg(null);
    resetTranscript();
  };

  // Novo estado para indicar quando devemos submeter automaticamente
  const [shouldSubmit, setShouldSubmit] = useState(false);

  const handleToggleListen = () => {
    // Limpa estado anterior na nova tentativa
    setApiErrorMsg(null);
    setResult(null);
    setPartialRecipeText('');
    setShouldSubmit(false);
    setTextInput(''); // Limpa o texto se o usar a voz

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

  // Efeito responsavel pela submissão natural quando a Web Speech API decide parar
  useEffect(() => {
    if (!isListening && transcript.length > 3 && shouldSubmit) {
      void submitRecipe(transcript);
      setShouldSubmit(false);
    }
  }, [isListening, transcript, shouldSubmit]);

  const handleManualSubmit = () => {
    if (textInput.length >= 3) {
      void submitRecipe(textInput);
    }
  };

  const submitRecipe = async (ingredients: string) => {
    setIsLoading(true);
    setApiErrorMsg(null);
    setResult(null);
    setPartialRecipeText('');

    try {
      // Chamada à nossa class wrapper `generateRecipe` com callback de stream incluído
      const recipePayload = await generateRecipe(
        ingredients,
        (text) => { setPartialRecipeText(text); },
        (status) => { setColdStartMsg(status || null); },
        dietaryRestriction || undefined
      );
      setResult(recipePayload);
      setPartialRecipeText('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.includes('Rate limit')) {
           setPremiumModalOpen(true);
        }
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
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
      
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLoginClick={() => setLoginModalOpen(true)}
        onPremiumClick={() => setPremiumModalOpen(true)}
      />

      {currentView === 'profile' && user ? (
        <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary-50 to-transparent -z-10" />
          <Profile />
        </main>
      ) : currentView === 'explore' ? (
        <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-50/50">
          <Explore />
        </main>
      ) : (
        <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          
          {/* Background Decorator */}
          <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary-50 to-transparent -z-10" />

          {/* Tagline */}
          <header className="text-center mb-16 mt-8 animate-fade-in-up">
            <p className="text-slate-500 max-w-sm mx-auto font-medium">
              Dite os seus ingredientes ou escreva-os, e nós fazemos a magia. Sem desperdícios.
            </p>
          </header>

          {/* Main Interaction Area */}
          <section className="flex flex-col items-center w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            
            {/* Microphone Button */}
            <div className={`relative ${isListening ? 'animate-float' : ''}`}>
              <button
                onClick={handleToggleListen}
                disabled={isLoading}
                className={`
                  relative flex items-center justify-center z-10
                  w-32 h-32 rounded-full mb-6 transition-all duration-500
                  ${isListening 
                    ? 'bg-primary-500 text-white animate-glow scale-105' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 shadow-xl ring-1 ring-slate-100 hover:ring-primary-100 hover:text-primary-600'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed scale-95 shadow-none' : ''}
                `}
                aria-label={isListening ? "Parar de ouvir e enviar ingredientes" : "Pressione para falar os ingredientes"}
                aria-pressed={isListening}
              >
                <Mic className={`w-12 h-12 transition-transform duration-300 ${isListening ? 'scale-110 opacity-100' : 'opacity-80'}`} aria-hidden="true" />
                
                {/* Ripple effect when listening */}
                {isListening && (
                  <span className="absolute -inset-2 rounded-full border-2 border-primary-300 opacity-50 animate-ping pointer-events-none" />
                )}
              </button>
            </div>

            {/* Temporary mock input button */}
            {isListening && (
                <button 
                  onClick={() => { stopListening(); void submitRecipe('Cebola, alho, dois ovos e bife de atum'); }} 
                  className="mb-4 text-[10px] font-bold text-primary-400 uppercase tracking-widest hover:text-primary-600 transition-colors"
                  aria-label="Simular uso da API enviando bife de atum"
                >
                   Testar API Mock (Bife atum)
                </button>
            )}

            {/* Hybrid Text Input */}
            <div className="w-full relative mb-8 group">
              <input 
                type="text" 
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  if (isListening) stopListening();
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Ou digite aqui (ex: frango, batata)..."
                className="w-full rounded-2xl py-4 flex pl-5 pr-14 border-2 border-slate-100 focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition-all shadow-sm text-slate-800 font-medium placeholder-slate-400 bg-white/80 backdrop-blur-sm group-hover:border-primary-100"
                disabled={isLoading}
              />
              <button 
                onClick={handleManualSubmit}
                disabled={isLoading || textInput.trim().length < 3}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-primary-500 hover:bg-primary-50 hover:text-primary-600 transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                aria-label="Enviar ingredientes digitados"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Filtro Restrições Alimentares */}
            <div className="w-full max-w-[200px] mb-8 relative group z-20">
              <select 
                value={dietaryRestriction} 
                onChange={(e) => setDietaryRestriction(e.target.value)}
                className="w-full rounded-full py-2.5 px-5 border-2 border-slate-100 text-slate-500 font-medium focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition-all shadow-sm bg-white/80 backdrop-blur-sm cursor-pointer hover:border-primary-100 hover:text-primary-600 appearance-none text-center"
                disabled={isLoading}
              >
                <option value="">Sem Restrições</option>
                <option value="Vegetariano">🥗 Vegetariano</option>
                <option value="Vegano">🌱 Vegano</option>
                <option value="Sem Glúten">🌾 Sem Glúten</option>
                <option value="Sem Lactose">🥛 Sem Lactose</option>
              </select>
            </div>

            {/* Transcript Area */}
            {(isListening || transcript) && (
              <div 
                className="w-full mb-6 bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/50 flex items-center justify-center text-center transition-all animate-fade-in-up"
                aria-live="polite"
                aria-atomic="true"
              >
                {isListening ? (
                   transcript ? (
                      <p className="text-slate-800 font-medium italic text-lg text-balance">"{transcript}"</p>
                   ) : (
                      <p className="text-primary-600 font-medium animate-pulse">A escutar os ingredientes...</p>
                   )
                ) : transcript && !result && isLoading ? (
                  <p className="text-slate-800 font-medium text-lg text-balance">"{transcript}"</p>
                ) : (
                   <p className="text-slate-400">Toque no microfone para começar.</p>
                )}
              </div>
            )}

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
                     <p className="text-sm font-medium animate-pulse">
                       {coldStartMsg || 'A preparar os ingredientes...'}
                     </p>
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
