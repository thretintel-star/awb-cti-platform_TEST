
import React, { useState } from 'react';
import { performDomainCheck } from '../services/geminiService';
import { DomainCheckResult } from '../types';
import { Activity, Search, Shield, Server, Globe, AlertTriangle, CheckCircle, Download, List, AlertOctagon } from 'lucide-react';
import { jsPDF } from "jspdf";

const DomainCheckTab: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setLoading(true);
    setResult(null);
    try {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const data = await performDomainCheck(cleanDomain);
        setResult(data);
    } finally {
        setLoading(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!result) return;

    const doc = new jsPDF();
    let yPos = 20;
    const leftMargin = 20;

    const addText = (text: string, size: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, leftMargin, yPos);
        yPos += (lines.length * 7);
    };

    // Header
    addText("AWB_CTI - Rapport Domain Check", 18, true, [16, 185, 129]);
    yPos += 5;
    addText(`Cible: ${result.domain}`, 12);
    addText(`Date: ${new Date().toLocaleString()}`, 10, false, [100, 100, 100]);
    yPos += 10;
    
    // Score
    const scoreColor: [number, number, number] = result.globalScore > 80 ? [16, 185, 129] : result.globalScore > 50 ? [234, 88, 12] : [220, 38, 38];
    addText(`Score Global de Santé: ${result.globalScore}/100`, 16, true, scoreColor);
    addText(result.details, 10, false, [50, 50, 50]);
    yPos += 10;

    // DNS Audit
    addText("1. Audit DNS (dnsaudit.io)", 14, true);
    addText(`Statut: ${result.dnsAudit.status}`, 10, true, result.dnsAudit.status === 'PASS' ? [0, 100, 0] : [200, 0, 0]);
    result.dnsAudit.issues.forEach(issue => addText(`- ${issue}`, 10));
    yPos += 5;

    // MXToolbox
    addText("2. Mail & Blacklist (MXToolbox)", 14, true);
    addText(`Blacklist: ${result.mxToolbox.blacklistStatus}`, 10, true, result.mxToolbox.blacklistStatus === 'CLEAN' ? [0, 100, 0] : [200, 0, 0]);
    addText(`SPF: ${result.mxToolbox.mailConfig.spf ? "OK" : "Manquant"} | DMARC: ${result.mxToolbox.mailConfig.dmarc ? "OK" : "Manquant"}`, 10);
    yPos += 5;

    // Exposure
    addText("3. Exposition & Services (Shodan/Censys)", 14, true);
    addText(`Ports Ouverts: ${result.exposure.shodanPorts.join(', ') || "Aucun détecté"}`, 10);
    if(result.exposure.vulnerabilities.length > 0) {
        addText("Vulnérabilités Potentielles:", 10, true, [200, 0, 0]);
        result.exposure.vulnerabilities.forEach(v => addText(`- ${v}`, 10, false, [200, 0, 0]));
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Généré par AWB_CTI Dashboard", leftMargin, 280);

    doc.save(`DomainCheck_${result.domain}_${Date.now()}.pdf`);
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-emerald-500';
      if (score >= 50) return 'text-orange-500';
      return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Domain Health Check
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Audit multi-sources (DNSAudit, MXToolbox, Shodan, Censys) pour évaluer la santé et l'exposition d'un domaine.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <form onSubmit={handleScan} className="flex gap-4">
            <input 
                type="text" 
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Ex: google.com, mxtoolbox.com..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button 
                type="submit"
                disabled={loading || !domain}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
            >
                {loading ? 'Audit en cours...' : <><Search className="w-5 h-5" /> Vérifier</>}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
             <span className="font-semibold">Sources simulées / interrogées :</span>
             <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">dnsaudit.io</span>
             <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">mxtoolbox.com</span>
             <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">shodan.io</span>
             <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">search.censys.io</span>
          </div>
      </div>

      {result && (
        <div className="animate-fadeIn space-y-6">
            
            {/* Top Action Bar */}
            <div className="flex justify-end">
                 <button
                    onClick={handleGeneratePdf}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-700 shadow-sm"
                  >
                     <Download className="w-4 h-4 text-emerald-500" /> Télécharger Rapport PDF
                  </button>
            </div>

            {/* Score Card */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="12" fill="none" />
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" 
                            className={`${getScoreColor(result.globalScore)} transition-all duration-1000 ease-out`}
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * result.globalScore) / 100}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-4xl font-bold ${getScoreColor(result.globalScore)}`}>{result.globalScore}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Score Global</span>
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left z-10">
                    <h3 className="text-2xl font-bold text-white mb-2">État de Santé du Domaine</h3>
                    <p className="text-slate-300 text-lg leading-relaxed">{result.details}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                
                {/* DNS Audit Column */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                    <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> DNS Audit
                    </h3>
                    <div className="mb-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                            result.dnsAudit.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' :
                            result.dnsAudit.status === 'WARNING' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                            {result.dnsAudit.status === 'PASS' ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                            {result.dnsAudit.status}
                        </span>
                    </div>
                    {result.dnsAudit.issues.length > 0 ? (
                        <ul className="space-y-2">
                            {result.dnsAudit.issues.map((issue, i) => (
                                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0"></span>
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Aucun problème DNS majeur détecté.</p>
                    )}
                </div>

                {/* MXToolbox Column */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-orange-500/30 transition-all">
                    <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5" /> MX & Email
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                            <span className="text-sm text-slate-400">Blacklist Check</span>
                            <span className={`text-sm font-bold ${result.mxToolbox.blacklistStatus === 'CLEAN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result.mxToolbox.blacklistStatus}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`p-2 rounded text-center border ${result.mxToolbox.mailConfig.spf ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                                <span className="text-xs font-bold block">SPF</span>
                                {result.mxToolbox.mailConfig.spf ? "PRÉSENT" : "ABSENT"}
                            </div>
                            <div className={`p-2 rounded text-center border ${result.mxToolbox.mailConfig.dmarc ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                                <span className="text-xs font-bold block">DMARC</span>
                                {result.mxToolbox.mailConfig.dmarc ? "PRÉSENT" : "ABSENT"}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-mono break-all bg-slate-950 p-2 rounded">
                            {result.mxToolbox.smtpBanner || "Pas de bannière SMTP"}
                        </div>
                    </div>
                </div>

                {/* Shodan/Censys Column */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 transition-all">
                    <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5" /> Exposure (Shodan)
                    </h3>
                    
                    <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ports Ouverts</h4>
                        <div className="flex flex-wrap gap-2">
                            {result.exposure.shodanPorts.length > 0 ? result.exposure.shodanPorts.map(p => (
                                <span key={p} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono font-bold border border-purple-500/30">
                                    {p}
                                </span>
                            )) : <span className="text-sm text-slate-500">Aucun port détecté</span>}
                        </div>
                    </div>

                    <div>
                         <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Services / Vulns</h4>
                         {result.exposure.vulnerabilities.length > 0 ? (
                             <ul className="space-y-1">
                                 {result.exposure.vulnerabilities.map((v, i) => (
                                     <li key={i} className="text-xs text-red-400 flex items-center gap-1">
                                         <AlertOctagon className="w-3 h-3" /> {v}
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <div className="text-xs text-emerald-500 flex items-center gap-1">
                                 <CheckCircle className="w-3 h-3" /> Pas de CVE critique évidente
                             </div>
                         )}
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default DomainCheckTab;
