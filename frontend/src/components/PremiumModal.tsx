import { X, Crown, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      alert('Precisa de iniciar sessão antes de fazer upgrade.');
      return;
    }
    
    setLoading(true);
    try {
      // Faz fetch do checkout endpoint no fastify
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, userEmail: user.email }),
      });
      const data = await response.json();
      
      if (data?.url) {
         window.location.href = data.url;
      } else {
         alert('Erro ao redirecionar para pagamentos.');
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao conectar com o provedor de pagamentos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 shadow-2xl transition-opacity animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden relative shadow-2xl shadow-amber-900/10 border border-amber-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-500 px-6 pt-8 pb-10 text-center relative overflow-hidden">
           {/* Decorative circles */}
           <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>
           <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>

           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mb-4 shadow-sm border border-white/30 text-white">
              <Crown className="w-8 h-8 fill-amber-100/50" />
           </div>
           <h2 id="premium-modal-title" className="text-2xl font-extrabold text-white mb-2">Desbloqueie o Chef Premium</h2>
           <p className="text-amber-50 font-medium">Eleve as suas receitas a outro patamar e faça inveja na comunidade.</p>
        </div>

        <div className="px-6 py-6 bg-slate-50">
           <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-slate-700">
                 <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></div>
                 <div><strong className="block text-slate-900">Imagens Realistas UI/UX</strong> Veja as suas receitas ganharem vida com fotografias incriveis geradas no momento.</div>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                 <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></div>
                 <div><strong className="block text-slate-900">Llama 3 70B Limitless</strong> Respostas ultra complexas de chef profissional Michelin usando o maior modelo aberto.</div>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                 <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></div>
                 <div><strong className="block text-slate-900">Despensa Inteligente Infinita</strong> Adicione centenas de ingredientes na sua despensa para IA processar (sem limites).</div>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                 <div className="mt-0.5 rounded-full bg-amber-200 p-1 text-amber-700"><Check className="w-3.5 h-3.5" /></div>
                 <div><strong className="block text-slate-900">Sem Rate Limits</strong> Diga adeus ao limite diário e crie dezenas de receitas no mesmo dia.</div>
              </li>
           </ul>

           <button 
             onClick={handleCheckout}
             disabled={loading}
             className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl active:translate-y-0"
           >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assinar por 4,99€ / mês'}
           </button>
           <p className="text-center text-xs text-slate-400 mt-4">Pode cancelar a qualquer altura. Faturação via Stripe Seguro.</p>
        </div>
      </div>
    </div>
  );
}
