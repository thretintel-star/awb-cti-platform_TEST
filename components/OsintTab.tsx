
import React, { useState } from 'react';
import { performOsintAnalysis, generateDeepAnalysis } from '../services/geminiService';
import { OsintResult, OsintType } from '../types';
import { Search, Globe, Mail, Network, ShieldAlert, ShieldCheck, HelpCircle, FileText, ExternalLink, Sparkles, Download } from 'lucide-react';

const OsintTab: React.FC = () => {
  const [target, setTarget] = useState('');
  const [type, setType] = useState<OsintType>('DOMAIN');
  const [result, setResult] = useState<OsintResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    try {
        const data = await performOsintAnalysis(type, target);
        setResult(data);
    } finally {
        setLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if(!result) return;
    setAnalyzing(true);
    try {
        const text = await generateDeepAnalysis(`OSINT ${type} Analysis`, result);
        setAnalysis(text);
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const report = {
        timestamp: new Date().toISOString(),
        scanType: "OSINT",
        target: target,
        data: result,
        aiAnalysis: analysis || "Not generated"
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osint-report-${type.toLowerCase()}-${target.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getReputationIcon = (rep: string) => {
      switch(rep) {
          case 'SAFE': return <ShieldCheck className="w-8 h-8 text-emerald-500" />;
          case 'MALICIOUS': return <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />;
          case 'SUSPICIOUS': return <ShieldAlert className="w-8 h-8 text-orange-500" />;
          default: return <HelpCircle className="w-8 h-8 text-slate-500" />;
      }
  };

  const getReputationColor = (rep: string) => {
      switch(rep) {
          case 'SAFE': return 'border-emerald-500/50 bg-emerald-950/20';
          case 'MALICIOUS': return 'border-red-500/50 bg-red-950/20';
          case 'SUSPICIOUS': return 'border-orange-500/50 bg-orange-950/20';
          default: return 'border-slate-700 bg-slate-900';
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Search className="w-6 h-6" />
            Scanner OSINT
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Recherche en sources ouvertes (Open Source Intelligence) pour Domaines, IPs et Emails.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
                <button
                    type="button"
                    onClick={() => setType('DOMAIN')}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${type === 'DOMAIN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Globe className="w-4 h-4" /> Domaine
                </button>
                <button
                    type="button"
                    onClick={() => setType('IP')}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${type === 'IP' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Network className="w-4 h-4" /> IP
                </button>
                <button
                    type="button"
                    onClick={() => setType('MAIL')}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${type === 'MAIL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Mail className="w-4 h-4" /> Email
                </button>
            </div>
            
            <div className="flex-1 flex gap-2">
                <input 
                    type="text" 
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={type === 'DOMAIN' ? 'ex: google.com' : type === 'IP' ? 'ex: 8.8.8.8' : 'ex: user@example.com'}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button 
                    type="submit"
                    disabled={loading || !target}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50"
                >
                    {loading ? 'Scan...' : 'Scanner'}
                </button>
            </div>
        </form>
      </div>

      {result && (
          <div className="animate-fadeIn space-y-4">
              {/* Header Result */}
              <div className={`p-6 rounded-xl border ${getReputationColor(result.reputation)} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                  <div className="flex items-center gap-4">
                      {getReputationIcon(result.reputation)}
                      <div>
                          <h3 className="text-xl font-bold text-slate-100">{result.target}</h3>
                          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{result.type} ANALYSIS</span>
                      </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                          <div className="text-sm text-slate-400 mb-1">Réputation Globale</div>
                          <div className={`text-xl font-bold ${result.reputation === 'MALICIOUS' ? 'text-red-400' : result.reputation === 'SAFE' ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {result.reputation}
                          </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors border border-slate-700"
                        >
                            <Download className="w-3 h-3" /> Sauvegarder
                        </button>
                        <button
                            onClick={handleDeepAnalysis}
                            disabled={analyzing}
                            className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-1.5 rounded transition-colors border border-slate-700"
                        >
                            {analyzing ? '...' : <><Sparkles className="w-3 h-3" /> Interpréter les résultats</>}
                        </button>
                      </div>
                  </div>
              </div>

               {/* AI Analysis Result */}
               {analysis && (
                    <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl animate-fadeIn">
                        <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Analyse CTI Approfondie
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
                            {analysis}
                        </div>
                    </div>
                )}

              {/* Summary */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                  <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Résumé de l'analyse
                  </h4>
                  <p className="text-slate-300 leading-relaxed">{result.summary}</p>
              </div>

              {/* Details Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                  {result.details.map((detail, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${detail.isAlert ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-900 border-slate-800'} transition-all hover:border-emerald-500/30`}>
                          <div className={`text-xs font-bold uppercase mb-1 ${detail.isAlert ? 'text-red-400' : 'text-emerald-500'}`}>
                              {detail.label}
                          </div>
                          <div className="text-slate-200 font-mono text-sm break-words">
                              {Array.isArray(detail.value) ? (
                                  <ul className="list-disc list-inside">
                                      {detail.value.map((v, i) => <li key={i}>{v}</li>)}
                                  </ul>
                              ) : (
                                  detail.value
                              )}
                          </div>
                      </div>
                  ))}
              </div>

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Sources Corroborées</h4>
                      <div className="flex flex-wrap gap-2">
                          {result.sources.map((src, i) => (
                              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline bg-blue-900/20 px-2 py-1 rounded">
                                  <ExternalLink className="w-3 h-3" /> Source {i + 1}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default OsintTab;
