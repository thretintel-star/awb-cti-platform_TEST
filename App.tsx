
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
import DomainCheckTab from './components/DomainCheckTab';
import LoginPage from './components/LoginPage';
import { Shield, Newspaper, Lock, Bug, Fish, Menu, X, Search, Crosshair, Radar, Mail, Code, Activity, Plus, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // Gestion de l'état d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('awb_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<Tab>(Tab.NEWS);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('awb_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('awb_auth');
  };

  // Configuration des onglets avec des "badges" simulés pour correspondre au design
  const navItems = [
    { id: Tab.NEWS, label: 'Actualités', icon: Newspaper, count: 5 },
    { id: Tab.VULNERABILITIES, label: 'Vulnérabilités', icon: Bug, count: 8 },
    { id: Tab.DOMAIN_CHECK, label: 'Domain Check', icon: Activity, count: 1 },
    { id: Tab.SSL_MONITOR, label: 'Certificats', icon: Lock, count: 3 },
    { id: Tab.PHISHING_ANALYZER, label: 'Phishing', icon: Fish, count: 2 },
    { id: Tab.OSINT, label: 'OSINT', icon: Search, count: 1 },
    { id: Tab.IOC_SEARCH, label: 'IOC Search', icon: Crosshair, count: 4 },
    { id: Tab.ASM, label: 'ASM', icon: Radar, count: 2 },
    { id: Tab.DMARC, label: 'DMARC', icon: Mail, count: 1 },
    { id: Tab.URL_ANALYSIS, label: 'Analyse Code', icon: Code, count: 1 },
  ];

  // Si l'utilisateur n'est pas connecté, afficher la page de login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation Bar Container */}
      <div className="bg-slate-900 pt-3 px-4 shadow-xl z-50 flex items-end gap-1 overflow-x-auto no-scrollbar border-b border-slate-800">
          
          {/* Scrollable Tabs Area */}
          <div className="flex-1 flex items-end overflow-x-auto no-scrollbar pb-0">
             {navItems.map((item) => {
                 const isActive = activeTab === item.id;
                 return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className="group relative h-10 min-w-[160px] flex items-center justify-center -ml-4 first:ml-0 focus:outline-none"
                        style={{ zIndex: isActive ? 20 : 10 }}
                    >
                        {/* Tab Shape (Trapezoid effect using skew) */}
                        <div 
                            className={`
                                absolute inset-0 transform -skew-x-[20deg] rounded-t-md border-t border-r border-l transition-all duration-200
                                ${isActive 
                                    ? 'bg-slate-950 border-slate-700 border-b-slate-950 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]' 
                                    : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700'
                                }
                            `}
                        ></div>

                        {/* Content (Unskewed) */}
                        <div className="relative z-10 flex items-center gap-2 px-6 transform">
                             <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-300'}`} />
                             <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                 {item.label}
                             </span>
                             {/* Badge */}
                             <span className={`
                                ml-1 text-[10px] px-1.5 rounded-sm font-bold min-w-[18px] text-center
                                ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-900/50 text-slate-500'}
                             `}>
                                 {item.count}
                             </span>
                        </div>
                    </button>
                 );
             })}
          </div>

          {/* Right Side: Profile & Logout */}
          <div className="ml-auto mb-2 px-4 hidden md:flex items-center gap-3">
              <div className="text-xs text-right">
                <div className="font-bold text-white">Admin User</div>
                <div className="text-slate-500">Security Team</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center relative">
                  <img src="/logo.png" alt="Profile" className="w-5 h-5 opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 animate-fadeIn">
            {/* 
               Render all tabs but hide inactive ones to preserve state 
            */}
            <div className={activeTab === Tab.NEWS ? 'block' : 'hidden'}><NewsTab /></div>
            <div className={activeTab === Tab.VULNERABILITIES ? 'block' : 'hidden'}><VulnTab /></div>
            <div className={activeTab === Tab.DOMAIN_CHECK ? 'block' : 'hidden'}><DomainCheckTab /></div>
            <div className={activeTab === Tab.SSL_MONITOR ? 'block' : 'hidden'}><SSLTab /></div>
            <div className={activeTab === Tab.PHISHING_ANALYZER ? 'block' : 'hidden'}><PhishingTab /></div>
            <div className={activeTab === Tab.OSINT ? 'block' : 'hidden'}><OsintTab /></div>
            <div className={activeTab === Tab.IOC_SEARCH ? 'block' : 'hidden'}><IocTab /></div>
            <div className={activeTab === Tab.ASM ? 'block' : 'hidden'}><AsmTab /></div>
            <div className={activeTab === Tab.DMARC ? 'block' : 'hidden'}><DmarcTab /></div>
            <div className={activeTab === Tab.URL_ANALYSIS ? 'block' : 'hidden'}><UrlAnalysisTab /></div>
        </div>
      </main>
    </div>
  );
};

export default App;
