
import React, { useState } from 'react';
import { performAsmScan, generateDeepAnalysis } from '../services/geminiService';
import { AsmResult } from '../types';
import { Radar, Target, Server, AlertCircle, Layers, Globe, Code, Database, Globe2, LayoutTemplate, Sparkles, FileText, Download } from 'lucide-react';

const AsmTab: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<AsmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    try {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const data = await performAsmScan(cleanDomain);
        setResult(data);
    } finally {
        setLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if(!result) return;
    setAnalyzing(true);
    try {
        const text = await generateDeepAnalysis("ASM / Surface d'Attaque", result);
        setAnalysis(text);
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const report = {
        timestamp: new Date().toISOString(),
        scanType: "ASM_SCAN",
        target: domain,
        data: result,
        aiAnalysis: analysis || "Not generated"
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asm-report-${domain.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (level: string) => {
      switch(level) {
          case 'CRITICAL': return 'text-red-500';
          case 'HIGH': return 'text-orange-500';
          case 'MEDIUM': return 'text-yellow-500';
          default: return 'text-emerald-500';
      }
  };

  const getRiskBg = (level: string) => {
      switch(level) {
          case 'CRITICAL': return 'bg-red-500';
          case 'HIGH': return 'bg-orange-500';
          case 'MEDIUM': return 'bg-yellow-500';
          default: return 'bg-emerald-500';
      }
  };

  const getTechIcon = (category: string) => {
      const cat = category.toLowerCase();
      if (cat.includes('server') || cat.includes('cloud')) return <Server className="w-4 h-4 text-blue-400" />;
      if (cat.includes('cms')) return <LayoutTemplate className="w-4 h-4 text-purple-400" />;
      if (cat.includes('framework') || cat.includes('library')) return <Code className="w-4 h-4 text-yellow-400" />;
      if (cat.includes('database')) return <Database className="w-4 h-4 text-emerald-400" />;
      return <Globe2 className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Radar className="w-6 h-6" />
            Gestion de Surface d'Attaque (ASM)
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Cartographie des actifs exposés et détection des versions technologiques.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <form onSubmit={handleScan} className="flex gap-4">
            <input 
                type="text" 
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Entrez l'organisation ou le domaine racine (ex: tesla.com)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button 
                type="submit"
                disabled={loading || !domain}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
            >
                {loading ? <span className="animate-pulse">Mapping...</span> : <><Target className="w-5 h-5" /> Scanner</>}
            </button>
        </form>
      </div>

      {result && (
        <div className="animate-fadeIn space-y-6">
            
            {/* Action Bar */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
                >
                    <Download className="w-4 h-4" /> Sauvegarder (JSON)
                </button>
                <button
                    onClick={handleDeepAnalysis}
                    disabled={analyzing}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/20"
                >
                    {analyzing ? (
                        <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyse IA en cours...</span>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Obtenir une Analyse de Risque (IA)</>
                    )}
                </button>
            </div>

            {/* AI Analysis Result */}
            {analysis && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl animate-fadeIn">
                    <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Rapport d'Analyse CTI
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
                        {analysis}
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                {/* Risk Score Card */}
                <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className={`absolute top-0 w-full h-1 ${getRiskBg(result.riskLevel)}`}></div>
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Score de Risque</h3>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="60" stroke="#1e293b" strokeWidth="8" fill="none" />
                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" 
                                className={`${getRiskColor(result.riskLevel)} transition-all duration-1000 ease-out`}
                                strokeDasharray={377}
                                strokeDashoffset={377 - (377 * result.riskScore) / 100}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className={`text-3xl font-bold ${getRiskColor(result.riskLevel)}`}>{result.riskScore}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 bg-slate-800 ${getRiskColor(result.riskLevel)}`}>{result.riskLevel}</span>
                        </div>
                    </div>
                    <div className="mt-6 w-full">
                        <h4 className="text-xs text-slate-500 font-bold uppercase mb-2">Vulnérabilités Potentielles</h4>
                        <ul className="text-sm space-y-1">
                            {result.potentialVulns.map((v, i) => (
                                <li key={i} className="flex items-start gap-2 text-slate-300">
                                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    {v}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Assets & Tech Stack */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* Tech Stack - DETAILED */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-500" /> Technologies Détectées
                        </h3>
                        
                        {result.technologies && result.technologies.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {result.technologies.map((tech, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-blue-500/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                                {getTechIcon(tech.category)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-200">{tech.name}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">{tech.category}</div>
                                            </div>
                                        </div>
                                        {tech.version ? (
                                            <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                                                v{tech.version}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-600 italic">v?</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded">
                                Aucune technologie spécifique identifiée publiquement.
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">Ports Exposés Probables</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.exposedPorts.map((p, i) => (
                                    <span key={i} className="font-mono text-xs bg-slate-950 px-2 py-1 rounded border border-slate-700 text-slate-300 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Discovered Assets */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-emerald-500" /> Actifs Découverts
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {result.discoveredAssets.length > 0 ? result.discoveredAssets.map((asset, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-emerald-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {asset.type === 'CLOUD_BUCKET' ? <Server className="w-4 h-4 text-orange-400" /> : <Globe className="w-4 h-4 text-emerald-500" />}
                                        <div>
                                            <div className="font-mono text-sm text-slate-200">{asset.name}</div>
                                            <div className="text-xs text-slate-500">{asset.description}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded">
                                        {asset.type}
                                    </span>
                                </div>
                            )) : <div className="text-slate-500 text-center py-4">Aucun asset public majeur détecté.</div>}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AsmTab;
