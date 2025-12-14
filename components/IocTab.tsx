
import React, { useState } from 'react';
import { searchIOCs } from '../services/geminiService';
import { IocSearchResult, IocItem } from '../types';
import { Crosshair, Shield, AlertTriangle, FileCode, Globe, Server, Hash, Download } from 'lucide-react';

const IocTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IocSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
        const data = await searchIOCs(query);
        setResult(data);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const report = {
        timestamp: new Date().toISOString(),
        scanType: "IOC_SEARCH",
        query: query,
        data: result
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ioc-report-${query.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getIocIcon = (type: string) => {
      if (type.includes('HASH')) return <Hash className="w-4 h-4 text-purple-400" />;
      if (type === 'IP') return <Server className="w-4 h-4 text-blue-400" />;
      if (type === 'DOMAIN' || type === 'URL') return <Globe className="w-4 h-4 text-emerald-400" />;
      return <FileCode className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Crosshair className="w-6 h-6" />
            Recherche d'IOCs (CTI)
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Trouvez des Hashs, IPs et Domaines liés à des menaces spécifiques (Ransomware, APT, CVE).
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Lockbit 3.0, APT28, CVE-2023-23397..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 pl-4 pr-32 py-4 rounded-xl focus:outline-none focus:border-emerald-500 text-lg placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={loading || !query}
                className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {loading ? 'Scan...' : 'Rechercher'}
              </button>
          </form>
          <div className="mt-3 flex gap-2 text-xs text-slate-500">
              <span>Suggestions:</span>
              <button onClick={() => setQuery('Lockbit 3.0')} className="hover:text-emerald-400 underline">Lockbit</button>
              <button onClick={() => setQuery('Cobalt Strike C2')} className="hover:text-emerald-400 underline">Cobalt Strike</button>
              <button onClick={() => setQuery('Log4Shell IOCs')} className="hover:text-emerald-400 underline">Log4Shell</button>
          </div>
      </div>

      {result && (
          <div className="animate-fadeIn space-y-6">
              <div className="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl">
                  <div className="flex justify-between items-start">
                      <div>
                          <h3 className="text-xl font-bold text-white mb-2">{result.threatActor}</h3>
                          <p className="text-slate-300">{result.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 bg-slate-950 px-3 py-1 rounded border border-slate-800 mb-2">
                            Mis à jour: {result.lastUpdated}
                        </div>
                      </div>
                  </div>
              </div>

              {result.iocs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      Aucun indicateur technique trouvé pour cette requête. Essayez de préciser la menace.
                  </div>
              ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                      <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
                          <span className="font-semibold text-slate-300">Indicateurs Détectés ({result.iocs.length})</span>
                          <div className="flex gap-2">
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors"
                            >
                                <Download className="w-3 h-3" /> SAUVEGARDER
                            </button>
                            <button 
                                onClick={() => {
                                    const text = result.iocs.map(i => `${i.type}: ${i.value}`).join('\n');
                                    navigator.clipboard.writeText(text);
                                    alert('IOCs copiés dans le presse-papier');
                                }}
                                className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                            >
                                COPIER TOUT
                            </button>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase bg-slate-950 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Valeur</th>
                                    <th className="px-6 py-3">Contexte</th>
                                    <th className="px-6 py-3">Confiance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {result.iocs.map((ioc, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/50">
                                        <td className="px-6 py-3 flex items-center gap-2 font-mono text-slate-400">
                                            {getIocIcon(ioc.type)}
                                            {ioc.type.replace('HASH_', '')}
                                        </td>
                                        <td className="px-6 py-3 font-mono text-emerald-400 select-all">
                                            {ioc.value}
                                        </td>
                                        <td className="px-6 py-3 text-slate-300">
                                            {ioc.description}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                ioc.confidence === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                                                ioc.confidence === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' : 
                                                'bg-slate-700 text-slate-300'
                                            }`}>
                                                {ioc.confidence}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default IocTab;
