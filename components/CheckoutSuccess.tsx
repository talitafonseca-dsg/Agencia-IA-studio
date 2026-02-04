import React from 'react';
import { CheckCircle, Mail, ArrowRight, Sparkles } from 'lucide-react';

interface CheckoutSuccessProps {
    onGoToLogin: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({ onGoToLogin }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-600/20 rounded-full blur-[150px]" />
            </div>

            <div className="w-full max-w-md relative z-10 text-center">
                {/* Success Icon */}
                <div className="relative inline-flex mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.5)]">
                        <CheckCircle size={48} className="text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                        <Sparkles size={28} className="text-yellow-400 animate-pulse" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Pagamento Confirmado!
                </h1>

                <p className="text-white/60 text-lg mb-8">
                    Seu acesso foi liberado com sucesso.
                </p>

                {/* Info Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-8 text-left">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                            <Mail size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold">Verifique seu email</h3>
                            <p className="text-white/50 text-sm">Enviamos suas credenciais de acesso</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-white/5 rounded-xl">
                            <span className="text-white/50">Senha padrão:</span>
                            <span className="ml-2 font-mono font-bold text-indigo-400">agia123456</span>
                        </div>
                        <p className="text-white/40 text-xs">
                            💡 Recomendamos alterar sua senha após o primeiro acesso.
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={onGoToLogin}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-pink-500 hover:to-indigo-500 transition-all shadow-[0_10px_40px_rgba(236,72,153,0.3)]"
                >
                    <span>Acessar a Plataforma</span>
                    <ArrowRight size={20} />
                </button>

                {/* Footer */}
                <p className="text-white/30 text-xs mt-8">
                    Não recebeu o email? Verifique sua caixa de spam ou entre em contato.
                </p>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
