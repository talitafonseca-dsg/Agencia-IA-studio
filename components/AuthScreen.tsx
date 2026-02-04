import React, { useState } from 'react';
import { Loader2, Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthScreenProps {
    onLogin: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                if (error.message.includes('Invalid login')) {
                    setError('Email ou senha incorretos');
                } else {
                    setError(error.message);
                }
                return;
            }

            if (data.user) {
                onLogin();
            }
        } catch (err: any) {
            setError('Erro ao fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                        <h1 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">
                            AGÊNCIA IA
                        </h1>
                    </div>
                    <p className="text-white/50 text-sm">
                        Criação profissional inspirada nos melhores padrões Designi.
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                    <h2 className="text-xl font-bold mb-6 text-center">Entrar na Plataforma</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm text-white/60 mb-2">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none text-white placeholder:text-white/30"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm text-white/60 mb-2">Senha</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500/50 focus:outline-none text-white placeholder:text-white/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-xl font-bold flex items-center justify-center gap-3 hover:from-pink-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <LogIn size={20} />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-white/30 text-xs mt-8">
                    © 2026 Talita Emanuela Fonseca. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};
