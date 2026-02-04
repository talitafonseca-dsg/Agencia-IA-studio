import React, { useState } from 'react';
import { Key, ExternalLink, Check, AlertCircle, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onSave: (key: string) => void;
    onClose?: () => void;
    isMandatory?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, isMandatory = false }) => {
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = () => {
        if (key.length < 30) {
            setError('A chave API parece inválida (muito curta).');
            return;
        }
        // Simple basic check (starts with AIza usually for Google keys, but not strictly guaranteed)
        onSave(key);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Configurar Chave</h3>
                            <p className="text-[10px] text-white/40 font-medium">Google Gemini API (BYOK)</p>
                        </div>
                    </div>
                    {!isMandatory && onClose && (
                        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">Sua Chave API (Google AI Studio)</label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => { setKey(e.target.value); setError(null); }}
                            placeholder="Cole sua chave aqui (AIza...)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-white/20"
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold">
                                <AlertCircle size={12} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 min-w-[20px] text-indigo-400">
                                <AlertCircle size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-indigo-100">Não tem uma chave?</p>
                                <p className="text-[10px] text-indigo-200/60 leading-relaxed">
                                    A chave API é gratuita. Clique no botão abaixo para criar a sua no Google AI Studio.
                                </p>
                            </div>
                        </div>

                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-indigo-300 text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                            Criar Chave Gratuita <ExternalLink size={12} />
                        </a>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                    <button
                        onClick={handleSave}
                        disabled={!key}
                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${key ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                    >
                        <Check size={16} />
                        Salvar e Continuar
                    </button>
                </div>

            </div>
        </div>
    );
};
