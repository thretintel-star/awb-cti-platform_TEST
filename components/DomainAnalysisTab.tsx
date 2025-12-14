import React, { useState } from 'react';
import { DomainInfo } from '../types';
import { analyzeDomain } from '../services/geminiService';
import { Globe, Search, Server, Mail, Calendar, MapPin, Database } from 'lucide-react';

const DomainAnalysisTab: React.FC = () => {
  const [domainInput, setDomainInput] = useState('');
  const [data, setData] = useState<DomainInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput) return;

    setLoading(true);
    setData(null);
    try {
      const cleanDomain = domainInput.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const result = await analyzeDomain(cleanDomain);
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Analyse de Domaine (OSINT)
        </h2>
        <p className="text-slate-400 text-sm mt-1">Récupération des données WHOIS, DNS et infrastructure via recherche active.</p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          type="text"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="Entrez un domaine (ex: google.com)"
          className="bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 w-full font-mono"
        />
        <button 
          type="submit" 
          disabled={loading || !domainInput}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20"
        >
          {loading ? (
             <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyse...</span>
          ) : (
             <><Search className="w-5 h-5" /> Analyser</>
          )}
        </button>
      </form>

      {data && (
        <div className="animate-fadeIn grid gap-6 md:grid-cols-2">
          
          {/* WHOIS Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              Information WHOIS
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500 text-sm">Registrar</span>
                <span className="text-slate-200 font-medium text-right">{data.registrar}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500 text-sm flex items-center gap-1"><Calendar className="w-3 h-3" /> Création</span>
                <span className="text-slate-200 font-medium text-right">{data.creationDate}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 text-sm">Domaine</span>
                <span className="text-emerald-400 font-mono text-right">{data.domain}</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Infrastructure
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500 text-sm">Adresse IP</span>
                <span className="text-slate-200 font-mono text-right">{data.ipAddress}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> Localisation</span>
                <span className="text-slate-200 font-medium text-right">{data.serverLocation}</span>
              </div>
            </div>
          </div>

          {/* DNS Records */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 transition-all">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              Enregistrements DNS
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2 tracking-wider">Nameservers (NS)</h4>
                <ul className="space-y-1">
                  {data.nameservers.map((ns, i) => (
                    <li key={i} className="text-slate-300 bg-slate-950/50 px-3 py-2 rounded border border-slate-800 font-mono text-sm">
                      {ns}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Mail Exchange (MX)
                </h4>
                <ul className="space-y-1">
                  {data.mxRecords.length > 0 ? data.mxRecords.map((mx, i) => (
                    <li key={i} className="text-slate-300 bg-slate-950/50 px-3 py-2 rounded border border-slate-800 font-mono text-sm break-all">
                      {mx}
                    </li>
                  )) : (
                    <li className="text-slate-500 italic text-sm">Aucun enregistrement MX trouvé</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {data.subdomains.length > 0 && (
             <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Sous-domaines détectés</h3>
                <div className="flex flex-wrap gap-2">
                    {data.subdomains.map((sub, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm font-mono border border-slate-700">
                            {sub}.{data.domain}
                        </span>
                    ))}
                </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
};

export default DomainAnalysisTab;
