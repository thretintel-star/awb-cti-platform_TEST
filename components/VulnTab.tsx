
import React, { useEffect, useState } from 'react';
import { fetchRecentVulnerabilities, generateDeepAnalysis } from '../services/geminiService';
import { Vulnerability } from '../types';
import { AlertTriangle, Server, Calendar, Sparkles, FileText, SortDesc } from 'lucide-react';

const VulnTab: React.FC = () => {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchRecentVulnerabilities();
      setVulns(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleDeepAnalysis = async () => {
    if(vulns.length === 0) return;
    setAnalyzing(true);
    try {
        // On n'envoie que les 20 premières pour l'analyse IA globale pour éviter de saturer le prompt
        const text = await generateDeepAnalysis("Vulnérabilités / CVE Récentes (Top 20)", vulns.slice(0, 20));
        setAnalysis(text);
    } finally {
        setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      default: return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Vulnérabilités
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-400 text-sm">Dernières 50 CVEs publiées (Tri chronologique)</p>
                {vulns.length > 0 && (
                     <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                        <SortDesc className="w-3 h-3"/>
                        {vulns.length} CVEs
                     </span>
                )}
            </div>
        </div>
        
        {vulns.length > 0 && !loading && (
            <button
                onClick={handleDeepAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
                {analyzing ? (
                    <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyse IA...</span>
                ) : (
                    <><Sparkles className="w-4 h-4" /> Analyser l'impact sur l'organisation</>
                )}
            </button>
        )}
      </div>

      {/* AI Analysis Result */}
      {analysis && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl animate-fadeIn mb-6">
                <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Rapport d'Impact
                </h3>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
                    {analysis}
                </div>
            </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800"></div>
            ))}
             <div className="col-span-full text-center text-slate-500 py-4 animate-pulse">
                Récupération des 50 dernières CVEs en cours...
             </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
            {vulns.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Aucune vulnérabilité trouvée pour le moment.
                </div>
            ) : (
                vulns.map((vuln, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-red-500/30 transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(vuln.severity)}`}>
                                 {vuln.severity}
                             </span>
                            <div className="flex items-center text-slate-500 text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(vuln.date).toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div className="mb-3">
                             <div className="font-mono text-emerald-500 text-sm font-bold mb-1">
                                {vuln.cve}
                            </div>
                            <h3 className="text-base font-semibold text-slate-200 line-clamp-2" title={vuln.title}>
                                {vuln.title}
                            </h3>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">
                            {vuln.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/50">
                            {vuln.affectedSystems && vuln.affectedSystems.map((sys, idx) => (
                                <span key={idx} className="flex items-center text-[10px] text-slate-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
                                    <Server className="w-3 h-3 mr-1 text-slate-500" />
                                    {sys}
                                </span>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};

export default VulnTab;
