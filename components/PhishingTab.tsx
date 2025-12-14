
import React, { useState } from 'react';
import { analyzePhishingAttempt, analyzeEmailHeaders } from '../services/geminiService';
import { PhishingAnalysis, EmailHeaderAnalysis } from '../types';
import { Fish, Search, CheckCircle, AlertOctagon, Download, FileCode, MessageSquare, Shield, Lock, Unlock, Server, Mail, AlertTriangle } from 'lucide-react';

const PhishingTab: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'CONTENT' | 'HEADERS'>('CONTENT');
  const [input, setInput] = useState('');
  const [contentResult, setContentResult] = useState<PhishingAnalysis | null>(null);
  const [headerResult, setHeaderResult] = useState<EmailHeaderAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    
    try {
        if (activeMode === 'CONTENT') {
            const data = await analyzePhishingAttempt(input);
            setContentResult(data);
            setHeaderResult(null);
        } else {
            const data = await analyzeEmailHeaders(input);
            setHeaderResult(data);
            setContentResult(null);
        }
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!contentResult && !headerResult) return;
    const report = {
        timestamp: new Date().toISOString(),
        scanType: activeMode === 'CONTENT' ? "PHISHING_CONTENT" : "PHISHING_HEADERS",
        inputSample: input.substring(0, 100) + "...",
        data: activeMode === 'CONTENT' ? contentResult : headerResult
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phishing-${activeMode.toLowerCase()}-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAuthBadge = (status: string) => {
      const s = status.toUpperCase();
      let color = 'bg-slate-700 text-slate-300';
      if (s === 'PASS') color = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';
      if (s === 'FAIL' || s === 'SOFTFAIL') color = 'bg-red-500/20 text-red-400 border border-red-500/50';
      if (s === 'NONE') color = 'bg-slate-700 text-slate-400 border border-slate-600';

      return (
          <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${color}`}>
              {s}
          </span>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <Fish className="w-6 h-6" />
                Détecteur de Phishing (SOC)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
                Analyse IA de contenu suspect et d'en-têtes techniques (Headers Analysis).
            </p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
                onClick={() => setActiveMode('CONTENT')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${activeMode === 'CONTENT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <MessageSquare className="w-4 h-4" /> Analyse Contenu
            </button>
            <button
                onClick={() => setActiveMode('HEADERS')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${activeMode === 'HEADERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <FileCode className="w-4 h-4" /> Analyse En-têtes
            </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
            <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeMode === 'CONTENT' 
                ? "Collez ici le corps de l'email ou l'URL suspecte..." 
                : "Collez ici les en-têtes bruts (Raw Headers)... \nExemple:\nDelivered-To: user@example.com\nReceived: from mail.evil.com..."}
            className={`w-full bg-slate-900 border ${activeMode === 'HEADERS' ? 'border-indigo-900/50 focus:border-indigo-500' : 'border-slate-700 focus:border-emerald-500'} rounded-xl p-4 text-slate-200 focus:outline-none min-h-[150px] font-mono text-sm`}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
                {(contentResult || headerResult) && (
                    <button
                        onClick={handleSave}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-xs border border-slate-700"
                    >
                        <Download className="w-3 h-3" /> Exporter JSON
                    </button>
                )}
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !input.trim()}
                    className={`${activeMode === 'HEADERS' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg`}
                >
                    {analyzing ? 'Analyse...' : <><Search className="w-4 h-4" /> Lancer l'analyse</>}
                </button>
            </div>
        </div>
      </div>

      {/* RESULTAT MODE CONTENT */}
      {activeMode === 'CONTENT' && contentResult && (
        <div className={`animate-fadeIn rounded-xl p-6 border ${contentResult.isSuspicious ? 'bg-red-950/20 border-red-500/50' : 'bg-emerald-950/20 border-emerald-500/50'} transition-all`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    {contentResult.isSuspicious ? (
                        <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
                            <AlertOctagon className="w-8 h-8 text-red-500" />
                        </div>
                    ) : (
                        <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                    )}
                    <div>
                        <h3 className={`text-xl font-bold ${contentResult.isSuspicious ? 'text-red-400' : 'text-emerald-400'}`}>
                            {contentResult.isSuspicious ? 'CONTENU SUSPECT' : 'SEMBLE LÉGITIME'}
                        </h3>
                        <p className="text-slate-400 text-sm">Score de confiance IA: <span className="text-white font-mono">{contentResult.confidenceScore}%</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-950/50 rounded-lg p-4 mb-6 border border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verdict Synthétique</h4>
                <p className="text-slate-200 font-medium italic">"{contentResult.verdict}"</p>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Indicateurs détectés
                </h4>
                <div className="grid gap-2">
                    {contentResult.reasoning.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded bg-slate-900 border border-slate-800">
                             <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <span className="text-slate-300 text-sm">{reason}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* RESULTAT MODE HEADERS */}
      {activeMode === 'HEADERS' && headerResult && (
          <div className="animate-fadeIn space-y-6">
              {/* Verdict Banner */}
              <div className={`rounded-xl p-6 border flex flex-col md:flex-row items-center justify-between gap-6 ${
                  headerResult.riskLevel === 'CRITICAL' || headerResult.riskLevel === 'HIGH' 
                  ? 'bg-red-950/20 border-red-500/50' 
                  : headerResult.riskLevel === 'MEDIUM' 
                  ? 'bg-orange-950/20 border-orange-500/50' 
                  : 'bg-emerald-950/20 border-emerald-500/50'
              }`}>
                  <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-full border ${
                           headerResult.riskLevel === 'CRITICAL' || headerResult.riskLevel === 'HIGH' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                      }`}>
                          <Shield className="w-8 h-8" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-100">Analyse SOC des En-têtes</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-slate-400">Niveau de risque:</span>
                              <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                                  headerResult.riskLevel === 'CRITICAL' || headerResult.riskLevel === 'HIGH' ? 'bg-red-500 text-white' : 
                                  headerResult.riskLevel === 'MEDIUM' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                              }`}>{headerResult.riskLevel}</span>
                          </div>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-sm text-slate-400 mb-1">Score de Sécurité</div>
                      <div className="text-3xl font-mono font-bold text-white">{headerResult.securityScore}/100</div>
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                  {/* Sender Identity */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                          <Mail className="w-5 h-5" /> Identité de l'Expéditeur
                      </h3>
                      <div className="space-y-4">
                          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                              <span className="text-xs font-mono text-slate-500 uppercase">From</span>
                              <div className="text-sm text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800 break-all">{headerResult.from}</div>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                              <span className="text-xs font-mono text-slate-500 uppercase">Return-Path</span>
                              <div className="text-sm text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800 break-all">{headerResult.returnPath}</div>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                              <span className="text-xs font-mono text-slate-500 uppercase">Sender IP</span>
                              <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded border border-slate-800">
                                  <span className="text-sm text-slate-200 font-mono">{headerResult.senderIp}</span>
                                  <Server className="w-4 h-4 text-slate-500" />
                              </div>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                              <span className="text-xs font-mono text-slate-500 uppercase">Subject</span>
                              <div className="text-sm text-slate-400 italic">{headerResult.subject}</div>
                          </div>
                      </div>
                  </div>

                  {/* Authentication Matrix */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                          <Lock className="w-5 h-5" /> Authentification & Sécurité
                      </h3>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="flex flex-col items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-xs text-slate-500 font-bold mb-2">SPF</span>
                              {getAuthBadge(headerResult.authentication.spf)}
                          </div>
                          <div className="flex flex-col items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-xs text-slate-500 font-bold mb-2">DKIM</span>
                              {getAuthBadge(headerResult.authentication.dkim)}
                          </div>
                          <div className="flex flex-col items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-xs text-slate-500 font-bold mb-2">DMARC</span>
                              {getAuthBadge(headerResult.authentication.dmarc)}
                          </div>
                      </div>
                      
                      <div>
                          <h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Anomalies détectées</h4>
                          {headerResult.anomalies.length > 0 ? (
                              <ul className="space-y-2">
                                  {headerResult.anomalies.map((ano, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-orange-300 bg-orange-900/10 px-2 py-1 rounded">
                                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {ano}
                                      </li>
                                  ))}
                              </ul>
                          ) : (
                              <p className="text-xs text-emerald-500 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Aucune anomalie majeure
                              </p>
                          )}
                      </div>
                  </div>
              </div>

              {/* SOC Verdict */}
              <div className="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-xl">
                  <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                      <FileCode className="w-5 h-5" /> Verdict Analyste SOC
                  </h3>
                  <p className="text-slate-300 leading-relaxed font-medium">
                      {headerResult.socVerdict}
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

export default PhishingTab;
