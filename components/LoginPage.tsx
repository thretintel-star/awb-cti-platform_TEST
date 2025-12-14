
import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulation d'une vérification d'authentification
    // Pour la démo : admin / admin
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        onLogin();
      } else {
        setError('Identifiants invalides. Essayez admin / admin');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans text-slate-200">
      
      {/* Background Grid Effect (Same as Dashboard) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] pointer-events-none"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8">
        
        {/* Logo Container */}
        <div className="flex flex-col items-center mb-8 animate-fadeIn">
            <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
                
                <img 
                    src="/auth-logo.png" 
                    alt="Security Shield Logo" 
                    className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,88,12,0.5)]"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                {/* Fallback Icon if image is missing */}
                <ShieldCheck className="w-24 h-24 text-orange-500 hidden" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AWB_CTI</h1>
            <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest font-mono">Cyber Threat Intelligence</p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center animate-pulse">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Identifiant</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-slate-200 placeholder-slate-600 transition-all outline-none"
                            placeholder="Entrez votre identifiant"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mot de passe</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-slate-200 placeholder-slate-600 transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>Accéder à la plateforme <ArrowRight className="w-5 h-5" /></>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">
                    Accès restreint aux personnels autorisés.<br/>
                    <span className="opacity-50">v2.4.0 Secure Gateway</span>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
