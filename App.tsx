
import React, { useState, useEffect } from 'react';
import { Tab } from './types';
import NewsTab from './components/NewsTab';
import SSLTab from './components/SSLTab';
import VulnTab from './components/VulnTab';
import PhishingTab from './components/PhishingTab';
import OsintTab from './components/OsintTab';
import IocTab from './components/IocTab';
import AsmTab from './components/AsmTab';
import DmarcTab from './components/DmarcTab';
import UrlAnalysisTab from './components/UrlAnalysisTab';
import { Shield, Newspaper, Lock, Bug, Fish, Menu, X, Search, Crosshair, Radar, Mail, Code, LogOut, User, Key, ChevronRight, Fingerprint } from 'lucide-react';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<Tab>(Tab.NEWS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check session on mount
  useEffect(() => {
    const session = localStorage.getItem('awb_cti_session');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.id || !loginForm.password) return;

    setAuthLoading(true);
    // Simulation d'une vérification serveur sécurisée
    setTimeout(() => {
      localStorage.setItem('awb_cti_session', 'true');
      setIsAuthenticated(true);
      setAuthLoading(false);
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('awb_cti_session');
    setIsAuthenticated(false);
    setLoginForm({ id: '', password: '' });
    setActiveTab(Tab.NEWS);
  };

  const navItems = [
    { id: Tab.NEWS, label: 'Actualités', icon: Newspaper },
    { id: Tab.SSL_MONITOR, label: 'Certificats SSL', icon: Lock },
    { id: Tab.VULNERABILITIES, label: 'Vulnérabilités', icon: Bug },
    { id: Tab.PHISHING_ANALYZER, label: 'Analyse Phishing', icon: Fish },
    { id: Tab.OSINT, label: 'OSINT (IP/Mail/Dom)', icon: Search },
    { id: Tab.IOC_SEARCH, label: 'Recherche IOCs', icon: Crosshair },
    { id: Tab.ASM, label: 'Surface d\'Attaque', icon: Radar },
    { id: Tab.DMARC, label: 'Rapports DMARC', icon: Mail },
    { id: Tab.URL_ANALYSIS, label: 'Analyse URL / Code', icon: Code },
  ];

  // --- LOGIN SCREEN RENDER ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        
        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl animate-fadeIn">
          
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-24 h-24 mb-4 group">
               <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
               <img 
                  src="/logo.png" 
                  alt="AWB_CTI Logo" 
                  className="relative w-full h-full object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                  }}
                />
                <Shield className="fallback-icon w-full h-full text-emerald-500 hidden" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wider">AWB_CTI</h1>
            <p className="text-slate-400 text-sm uppercase tracking-widest mt-1">Platforme d'Intelligence</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Identifiant</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={loginForm.id}
                  onChange={(e) => setLoginForm({...loginForm, id: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700"
                  placeholder="admin@awb-cti.local"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mot de passe</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input 
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authentification...
                </>
              ) : (
                <>
                  Connexion Sécurisée <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
             <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
               <Fingerprint className="w-3 h-3" /> Accès réservé au personnel autorisé
             </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 text-emerald-500 font-bold text-lg">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }} 
            />
            {/* Fallback Icon if image fails */}
            <Shield className="w-8 h-8 hidden" />
            <span>AWB_CTI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300">
            {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky md:top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 text-emerald-500 font-bold text-2xl tracking-tight">
            <div className="relative group">
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src="/logo.png" 
                alt="AWB_CTI Logo" 
                className="relative w-10 h-10 object-contain" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.nextElementSibling?.classList.remove('hidden');
                }}
              />
            </div>
            {/* Fallback Icon if image fails to load */}
            <Shield className="w-10 h-10 hidden" />
            
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
              AWB_CTI
            </span>
        </div>

        <nav className="flex-1 px-4 py-4 md:py-0 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                        activeTab === item.id 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
            {/* System Status */}
            <div className="bg-slate-950 rounded-lg p-4 text-xs text-slate-500">
                <p className="font-semibold text-slate-400 mb-1">Status du système</p>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>API Gemini: Connecté</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>v2.1 ASM Engine</span>
                </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* 
               IMPORTANT: Instead of switching components (which unmounts them and loses state),
               we render ALL of them but hide the ones that are not active.
               This persists the data (scans, inputs) when switching tabs.
            */}
            <div className={activeTab === Tab.NEWS ? 'block' : 'hidden'}><NewsTab /></div>
            <div className={activeTab === Tab.SSL_MONITOR ? 'block' : 'hidden'}><SSLTab /></div>
            <div className={activeTab === Tab.VULNERABILITIES ? 'block' : 'hidden'}><VulnTab /></div>
            <div className={activeTab === Tab.PHISHING_ANALYZER ? 'block' : 'hidden'}><PhishingTab /></div>
            <div className={activeTab === Tab.OSINT ? 'block' : 'hidden'}><OsintTab /></div>
            <div className={activeTab === Tab.IOC_SEARCH ? 'block' : 'hidden'}><IocTab /></div>
            <div className={activeTab === Tab.ASM ? 'block' : 'hidden'}><AsmTab /></div>
            <div className={activeTab === Tab.DMARC ? 'block' : 'hidden'}><DmarcTab /></div>
            <div className={activeTab === Tab.URL_ANALYSIS ? 'block' : 'hidden'}><UrlAnalysisTab /></div>
        </div>
      </main>
      
      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
