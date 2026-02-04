import React, { useState } from 'react';
import { Loader2, Check, Sparkles, Shield, Clock, Zap, ArrowRight, CreditCard } from 'lucide-react';

interface CheckoutPageProps {
    onBack?: () => void;
}

interface PlanType {
    id: string;
    name: string;
    price: number;
    period: string;
    pricePerMonth: number;
    popular: boolean;
    savings?: string;
}

const PLANS: Record<string, PlanType> = {
    semestral: {
        id: 'semestral',
        name: 'Semestral',
        price: 157,
        period: '6 meses',
        pricePerMonth: 26.17,
        popular: false,
    },
    anual: {
        id: 'anual',
        name: 'Anual',
        price: 197,
        period: '12 meses',
        pricePerMonth: 16.42,
        popular: true,
        savings: '37%',
    },
};

const BENEFITS = [
    { icon: Sparkles, text: 'Geração ilimitada de artes com IA' },
    { icon: Zap, text: 'Editor profissional com camadas' },
    { icon: Shield, text: 'Uso comercial liberado' },
    { icon: Clock, text: 'Atualizações incluídas' },
];

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack }) => {
    const [selectedPlan, setSelectedPlan] = useState<'semestral' | 'anual'>('anual');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (!email) {
            setError('Por favor, insira seu email');
            return;
        }

        if (!email.includes('@')) {
            setError('Por favor, insira um email válido');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Chamar Edge Function para criar preferência
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-function`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        plan: selectedPlan,
                        payer_email: email,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao processar pagamento');
            }

            const data = await response.json();

            // Redirecionar para o Mercado Pago
            window.location.href = data.init_point;
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Erro ao processar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[128px]" />
            </div>

            <div className="w-full max-w-4xl relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-14 h-14 object-contain drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                        />
                        <h1 className="text-4xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                            AGÊNCIA IA STUDIO
                        </h1>
                    </div>
                    <p className="text-white/60 text-lg max-w-xl mx-auto">
                        Crie artes profissionais com inteligência artificial.
                        <br />
                        <span className="text-white/80 font-medium">Traga sua própria chave Gemini e tenha acesso ilimitado.</span>
                    </p>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {Object.values(PLANS).map((plan) => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id as 'semestral' | 'anual')}
                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${selectedPlan === plan.id
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-full text-xs font-bold">
                                    MAIS POPULAR
                                </div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{plan.name}</h3>
                                    <p className="text-white/50 text-sm">{plan.period} de acesso</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id
                                    ? 'border-indigo-500 bg-indigo-500'
                                    : 'border-white/30'
                                    }`}>
                                    {selectedPlan === plan.id && <Check size={14} />}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black">R$ {plan.price}</span>
                                {plan.savings && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-lg">
                                        -{plan.savings}
                                    </span>
                                )}
                            </div>

                            <p className="text-white/40 text-sm">
                                Equivale a R$ {plan.pricePerMonth.toFixed(2)}/mês
                            </p>
                        </button>
                    ))}
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {BENEFITS.map((benefit, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/5"
                        >
                            <benefit.icon size={24} className="text-indigo-400 mb-2" />
                            <span className="text-white/70 text-sm">{benefit.text}</span>
                        </div>
                    ))}
                </div>

                {/* Checkout Form */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <CreditCard size={24} className="text-pink-500" />
                        Finalizar Compra
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/60 mb-2">
                                Seu melhor email (você receberá o acesso por aqui)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full px-4 py-4 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none text-white placeholder:text-white/30 text-lg"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <div>
                                <p className="font-medium">Plano {PLANS[selectedPlan].name}</p>
                                <p className="text-white/50 text-sm">{PLANS[selectedPlan].period} de acesso</p>
                            </div>
                            <p className="text-2xl font-black text-indigo-400">
                                R$ {PLANS[selectedPlan].price}
                            </p>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-pink-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-[0_10px_40px_rgba(236,72,153,0.3)]"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    <span>Pagar com Mercado Pago</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <p className="text-center text-white/40 text-xs">
                            🔒 Pagamento 100% seguro via Mercado Pago
                            <br />
                            Após a confirmação, você receberá o acesso por email.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/30 text-xs mt-8">
                    © 2026 Talita Emanuela Fonseca. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default CheckoutPage;
