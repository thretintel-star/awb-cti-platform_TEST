
import React, { useState } from 'react';
import { analyzeUrlSource } from '../services/geminiService';
import { UrlAnalysisResult } from '../types';
import { Globe, Code, Lock, FormInput, Link, AlertTriangle, Cpu, Search, Download, ShieldAlert, CheckCircle, HelpCircle, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";

const UrlAnalysisTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<UrlAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
        const data = await analyzeUrlSource(url);
        setResult(data);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveJson = () => {
    if (!result) return;
    const report = {
        timestamp: new Date().toISOString(),
        scanType: "URL_CODE_ANALYSIS",
        data: result
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `url-analysis-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGeneratePdf = () => {
    if (!result) return;

    const doc = new jsPDF();
    let yPos = 20;
    const leftMargin = 20;
    const lineHeight = 7;

    // Helper to add text and increment Y
    const addText = (text: string, x: number, y: number, color: [number, number, number] = [0, 0, 0], size: number = 10, fontStyle: string = 'normal') => {
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", fontStyle);
        const splitText = doc.splitTextToSize(text, 170); // Wrap text
        doc.text(splitText, x, y);
        yPos += (splitText.length * lineHeight);
    };

    // --- HEADER ---
    addText("AWB_CTI - Rapport d'Analyse de Menace Web", leftMargin, yPos, [16, 185, 129], 18, 'bold'); // Emerald color
    yPos += 5;
    addText(`Date du rapport: ${new Date().toLocaleString()}`, leftMargin, yPos, [100, 100, 100], 10);
    addText(`Cible analysée: ${result.url}`, leftMargin, yPos, [50, 50, 50], 10);
    yPos += 10;

    // --- SCORE ---
    const scoreColor: [number, number, number] = result.riskScore > 70 ? [220, 38, 38] : result.riskScore > 30 ? [234, 88, 12] : [16, 185, 129];
    addText(`SCORE DE RISQUE: ${result.riskScore}/100`, leftMargin, yPos, scoreColor, 16, 'bold');
    addText(`Catégorie: ${result.riskCategory}`, leftMargin, yPos, scoreColor, 14, 'bold');
    yPos += 10;

    // Line separator
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos - 5, 190, yPos - 5);

    // --- PHISHING SIGNS (High Priority) ---
    if (result.phishingSigns.detected) {
        addText("ALERTE PHISHING DÉTECTÉE", leftMargin, yPos, [220, 38, 38], 14, 'bold');
        result.phishingSigns.signs.forEach(sign => {
            addText(`- ${sign}`, leftMargin + 5, yPos, [220, 38, 38], 10);
        });
        yPos += 5;
    } else {
        addText("Aucun signe évident de phishing graphique détecté.", leftMargin, yPos, [16, 185, 129], 10);
        yPos += 5;
    }

    // --- DOMAIN & SSL ---
    addText("1. Analyse Infrastructure & Domaine", leftMargin, yPos, [0, 0, 0], 12, 'bold');
    addText(`Statut Domaine: ${result.domainAnalysis.status}`, leftMargin + 5, yPos);
    addText(`Détails: ${result.domainAnalysis.details}`, leftMargin + 5, yPos);
    
    const sslColor: [number, number, number] = result.protocolAnalysis.status === 'SAFE' ? [0, 100, 0] : [200, 0, 0];
    addText(`HTTPS: ${result.protocolAnalysis.isHttps ? "Oui" : "NON SÉCURISÉ"}`, leftMargin + 5, yPos, sslColor, 10, 'bold');
    addText(`Certificat: ${result.protocolAnalysis.certDetails}`, leftMargin + 5, yPos);
    yPos += 5;

    // --- CODE SOURCE ---
    addText("2. Analyse Code Source & Scripts", leftMargin, yPos, [0, 0, 0], 12, 'bold');
    if (result.sourceCodeAnalysis.suspiciousScripts) {
        addText("⚠️ Scripts suspects détectés dans le code source.", leftMargin + 5, yPos, [220, 38, 38], 10);
    }
    if (result.sourceCodeAnalysis.obfuscationDetected) {
        addText("⚠️ Obfuscation de code JS détectée (tentative de masquage).", leftMargin + 5, yPos, [234, 88, 12], 10);
    }
    result.sourceCodeAnalysis.details.forEach(detail => {
        addText(`- ${detail}`, leftMargin + 5, yPos);
    });
    yPos += 5;

    // --- FORMULAIRES ---
    if (result.formAnalysis.hasForms) {
        addText("3. Analyse des Formulaires (Exfiltration de données)", leftMargin, yPos, [0, 0, 0], 12, 'bold');
        const formColor: [number, number, number] = result.formAnalysis.risk === 'HIGH' ? [220, 38, 38] : [0, 0, 0];
        addText(`Destination des données: ${result.formAnalysis.dataDestination}`, leftMargin + 5, yPos, formColor);
        addText(`Niveau de risque: ${result.formAnalysis.risk}`, leftMargin + 5, yPos, formColor);
        yPos += 5;
    }

    // --- RESSOURCES ---
    if (result.resourceAnalysis.suspiciousTrackers.length > 0) {
        addText("4. Ressources Externes & Trackers Suspects", leftMargin, yPos, [0, 0, 0], 12, 'bold');
        result.resourceAnalysis.suspiciousTrackers.forEach(t => {
            addText(`- ${t}`, leftMargin + 5, yPos, [220, 38, 38]);
        });
        yPos += 5;
    }

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Généré par AWB_CTI - Platforme de Cyber Threat Intelligence", leftMargin, 280);

    doc.save(`Rapport_Analyse_${new Date().getTime()}.pdf`);
  };

  const getStatusColor = (status: string) => {
      if (status === 'SAFE') return 'text-emerald-400';
      if (status === 'WARNING') return 'text-orange-400';
      if (status === 'DANGER') return 'text-red-400';
      return 'text-slate-400';
  };

  const getRiskBg = (score: number) => {
      if (score < 30) return 'text-emerald-500';
      if (score < 70) return 'text-orange-500';
      return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Code className="w-6 h-6" />
            Analyse URL & Code Source
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Inspection approfondie : Domaine, HTML/JS, Formulaires, Certificats et Signes de Phishing.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex gap-4">
            <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Entrez l'URL à analyser (ex: http://suspicious-bank-login.com)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button 
                type="submit"
                disabled={loading || !url}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
            >
                {loading ? 'Analyse...' : <><Search className="w-5 h-5" /> Inspecter</>}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
             <AlertTriangle className="w-3 h-3" /> L'analyse est simulée par l'IA via des données publiques (OSINT) et Search Grounding.
          </p>
      </form>

      {result && (
          <div className="animate-fadeIn space-y-6">
              
              {/* Top Section: Score & Summary */}
              <div className="flex flex-col md:flex-row gap-6">
                  {/* Score Card */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center min-w-[200px] relative overflow-hidden">
                       <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="60" stroke="#1e293b" strokeWidth="8" fill="none" />
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" 
                                    className={`${getRiskBg(result.riskScore)} transition-all duration-1000 ease-out`}
                                    strokeDasharray={377}
                                    strokeDashoffset={377 - (377 * result.riskScore) / 100}
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className={`text-3xl font-bold ${getRiskBg(result.riskScore)}`}>{result.riskScore}</span>
                                <span className="text-xs text-slate-400">/ 100</span>
                            </div>
                        </div>
                        <div className={`mt-4 px-3 py-1 rounded text-sm font-bold uppercase ${
                            result.riskCategory === 'DANGEREUX' ? 'bg-red-500/20 text-red-400' :
                            result.riskCategory === 'SUSPECT' || result.riskCategory === 'DOUTEUX' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-emerald-500/20 text-emerald-400'
                        }`}>
                            {result.riskCategory}
                        </div>
                  </div>

                  {/* Phishing & Domain Summary */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phishing Detection */}
                      <div className={`p-5 rounded-xl border ${result.phishingSigns.detected ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900 border-slate-800'}`}>
                          <h3 className="flex items-center gap-2 font-bold text-slate-200 mb-3">
                              <AlertTriangle className={`w-5 h-5 ${result.phishingSigns.detected ? 'text-red-500' : 'text-slate-500'}`} />
                              Détection Phishing
                          </h3>
                          {result.phishingSigns.detected ? (
                              <ul className="space-y-2">
                                  {result.phishingSigns.signs.map((sign, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                          {sign}
                                      </li>
                                  ))}
                              </ul>
                          ) : (
                              <div className="text-emerald-400 text-sm flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" /> Aucun signe évident détecté.
                              </div>
                          )}
                      </div>

                      {/* Domain & Protocol */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                           <div>
                               <h4 className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                   <Globe className="w-3 h-3" /> Analyse Domaine
                               </h4>
                               <p className={`text-sm ${getStatusColor(result.domainAnalysis.status)}`}>
                                   {result.domainAnalysis.details}
                               </p>
                           </div>
                           <div className="pt-2 border-t border-slate-800">
                               <h4 className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                   <Lock className="w-3 h-3" /> Certificat & Protocole
                               </h4>
                               <p className={`text-sm ${getStatusColor(result.protocolAnalysis.status)}`}>
                                    {result.protocolAnalysis.isHttps ? 'HTTPS Valide' : 'Non Sécurisé'} - {result.protocolAnalysis.certDetails}
                               </p>
                           </div>
                      </div>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                  <button
                    onClick={handleSaveJson}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                  >
                     <Code className="w-4 h-4" /> Export JSON
                  </button>
                  <button
                    onClick={handleGeneratePdf}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20"
                  >
                     <Download className="w-4 h-4" /> Générer Rapport PDF
                  </button>
              </div>

              {/* Detailed Grids */}
              <div className="grid md:grid-cols-2 gap-6">
                  {/* Source Code Analysis */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                          <Code className="w-5 h-5 text-blue-400" /> Audit Code Source
                      </h3>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                              <span className="text-sm text-slate-400">Scripts Suspects</span>
                              <span className={`text-sm font-bold ${result.sourceCodeAnalysis.suspiciousScripts ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {result.sourceCodeAnalysis.suspiciousScripts ? 'DÉTECTÉ' : 'Non détecté'}
                              </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                              <span className="text-sm text-slate-400">Obfuscation JS</span>
                              <span className={`text-sm font-bold ${result.sourceCodeAnalysis.obfuscationDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {result.sourceCodeAnalysis.obfuscationDetected ? 'DÉTECTÉ' : 'Non détecté'}
                              </span>
                          </div>
                          {result.sourceCodeAnalysis.details.length > 0 && (
                              <div className="mt-4">
                                  <h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Détails Techniques</h4>
                                  <ul className="text-sm space-y-1 text-slate-300">
                                      {result.sourceCodeAnalysis.details.map((d, i) => <li key={i}>• {d}</li>)}
                                  </ul>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Forms & Resources */}
                  <div className="space-y-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                              <FormInput className="w-5 h-5 text-purple-400" /> Formulaires & Données
                          </h3>
                          <div className="space-y-2">
                              {result.formAnalysis.hasForms ? (
                                  <>
                                    <div className="text-sm text-slate-300">Destination: <span className="font-mono text-white">{result.formAnalysis.dataDestination}</span></div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        Risque: 
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            result.formAnalysis.risk === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                                            result.formAnalysis.risk === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                            {result.formAnalysis.risk}
                                        </span>
                                    </div>
                                  </>
                              ) : (
                                  <div className="text-sm text-slate-500 italic">Aucun formulaire détecté.</div>
                              )}
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                              <Link className="w-5 h-5 text-yellow-400" /> Ressources Externes
                          </h3>
                           {result.resourceAnalysis.suspiciousTrackers.length > 0 ? (
                               <div className="space-y-2">
                                   <div className="text-xs text-red-400 font-bold uppercase">Trackers Suspects</div>
                                   {result.resourceAnalysis.suspiciousTrackers.map((t, i) => (
                                       <div key={i} className="text-sm font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate">
                                           {t}
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <div className="text-sm text-emerald-500 flex items-center gap-2">
                                   <CheckCircle className="w-4 h-4" /> Aucun tracker malveillant connu.
                               </div>
                           )}
                      </div>
                  </div>
              </div>

               {/* Tech Stack */}
               {result.technologies.length > 0 && (
                   <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                       <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                           <Cpu className="w-5 h-5 text-slate-400" /> Stack Technologique
                       </h3>
                       <div className="flex flex-wrap gap-2">
                           {result.technologies.map((tech, i) => (
                               <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300">
                                   {tech}
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

export default UrlAnalysisTab;
