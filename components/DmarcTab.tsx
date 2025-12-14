
import React, { useState, useRef } from 'react';
import { Mail, Upload, FileCode, CheckCircle, AlertOctagon, Download, Sparkles, FileText, Server } from 'lucide-react';
import { DmarcReportData, DmarcRecord } from '../types';
import { analyzeDmarcReport } from '../services/geminiService';

const DmarcTab: React.FC = () => {
  const [report, setReport] = useState<DmarcReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseXmlReport = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Basic Meta Data
    const orgName = xmlDoc.querySelector("report_metadata > org_name")?.textContent || "Unknown Org";
    const reportId = xmlDoc.querySelector("report_metadata > report_id")?.textContent || "Unknown ID";
    const begin = xmlDoc.querySelector("report_metadata > date_range > begin")?.textContent || "";
    const end = xmlDoc.querySelector("report_metadata > date_range > end")?.textContent || "";

    // Records
    const records: DmarcRecord[] = [];
    const recordNodes = xmlDoc.querySelectorAll("record");
    
    let totalEmails = 0;
    let fullyAligned = 0;
    let failed = 0;

    recordNodes.forEach(node => {
        const sourceIp = node.querySelector("row > source_ip")?.textContent || "Unknown IP";
        const count = parseInt(node.querySelector("row > count")?.textContent || "0");
        const disposition = (node.querySelector("policy_evaluated > disposition")?.textContent || "none") as 'none' | 'quarantine' | 'reject';
        const dkimResult = (node.querySelector("auth_results > dkim > result")?.textContent || "none") as 'pass' | 'fail' | 'none';
        const spfResult = (node.querySelector("auth_results > spf > result")?.textContent || "none") as 'pass' | 'fail' | 'none' | 'softfail' | 'neutral';
        const headerFrom = node.querySelector("identifiers > header_from")?.textContent || "";

        records.push({
            sourceIp,
            count,
            disposition,
            dkimResult,
            spfResult,
            headerFrom
        });

        totalEmails += count;
        if (dkimResult === 'pass' && spfResult === 'pass') {
            fullyAligned += count;
        } else if (disposition !== 'none' || (dkimResult !== 'pass' && spfResult !== 'pass')) {
            failed += count;
        }
    });

    setReport({
        orgName,
        reportId,
        dateRange: {
            begin: new Date(parseInt(begin) * 1000).toLocaleDateString(),
            end: new Date(parseInt(end) * 1000).toLocaleDateString()
        },
        totalEmails,
        fullyAligned,
        failed,
        records
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
        const text = await file.text();
        parseXmlReport(text);
        setAiAnalysis(null);
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier XML.");
    } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAiAnalysis = async () => {
    if (!report) return;
    setAnalyzing(true);
    try {
        const result = await analyzeDmarcReport(report);
        setAiAnalysis(result);
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!report) return;
    const exportData = {
        timestamp: new Date().toISOString(),
        scanType: "DMARC_REPORT",
        data: report,
        analysis: aiAnalysis
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmarc-report-${report.reportId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Analyse de Rapports DMARC
        </h2>
        <p className="text-slate-400 text-sm mt-1">
            Importez vos fichiers XML (Google, Microsoft, etc.) pour visualiser l'alignement SPF/DKIM et détecter le spoofing.
        </p>
      </div>

      {/* Upload Section */}
      {!report && (
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-900 transition-colors">
              <FileCode className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Glissez votre rapport XML ici</h3>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                  Accepte les fichiers .xml standards envoyés par les fournisseurs de messagerie (rua reports).
              </p>
              <input 
                type="file" 
                accept=".xml" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95"
              >
                  {loading ? 'Traitement...' : <><Upload className="w-5 h-5" /> Importer un Fichier</>}
              </button>
          </div>
      )}

      {/* Dashboard Section */}
      {report && (
          <div className="animate-fadeIn space-y-6">
              
              {/* Header Actions */}
              <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div>
                      <h3 className="font-bold text-white text-lg">{report.orgName}</h3>
                      <div className="text-sm text-slate-400 font-mono">ID: {report.reportId} | {report.dateRange.begin} - {report.dateRange.end}</div>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleSave}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 flex items-center gap-2"
                      >
                          <Download className="w-4 h-4" /> JSON
                      </button>
                      <button
                        onClick={handleAiAnalysis}
                        disabled={analyzing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg"
                      >
                          {analyzing ? '...' : <><Sparkles className="w-4 h-4" /> Analyser les Menaces (IA)</>}
                      </button>
                      <button 
                        onClick={() => { setReport(null); setAiAnalysis(null); }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700"
                      >
                          Fermer
                      </button>
                  </div>
              </div>

              {/* AI Analysis Result */}
              {aiAnalysis && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl animate-fadeIn">
                    <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Analyse de Conformité DMARC
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
                        {aiAnalysis}
                    </div>
                </div>
               )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Emails</div>
                      <div className="text-3xl font-bold text-white">{report.totalEmails}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                      <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">Conformes (Aligned)</div>
                      <div className="text-3xl font-bold text-emerald-400">{report.fullyAligned}</div>
                      <div className="text-xs text-slate-500 mt-1">{((report.fullyAligned / report.totalEmails) * 100).toFixed(1)}% du trafic</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                      <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-2">Échecs / Bloqués</div>
                      <div className="text-3xl font-bold text-red-400">{report.failed}</div>
                      <div className="text-xs text-slate-500 mt-1">{((report.failed / report.totalEmails) * 100).toFixed(1)}% du trafic</div>
                  </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                      <h3 className="font-bold text-slate-300 flex items-center gap-2">
                          <Server className="w-4 h-4" /> Sources & Authentification
                      </h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                              <tr>
                                  <th className="px-6 py-3">IP Source</th>
                                  <th className="px-6 py-3">Volume</th>
                                  <th className="px-6 py-3">SPF</th>
                                  <th className="px-6 py-3">DKIM</th>
                                  <th className="px-6 py-3">Action (Disposition)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {report.records.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-800/50">
                                      <td className="px-6 py-3 font-mono text-slate-300">{row.sourceIp}</td>
                                      <td className="px-6 py-3 font-bold text-white">{row.count}</td>
                                      <td className="px-6 py-3">
                                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                              row.spfResult === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                          }`}>
                                              {row.spfResult}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3">
                                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                              row.dkimResult === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                          }`}>
                                              {row.dkimResult}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3">
                                          {row.disposition === 'none' ? (
                                              <span className="flex items-center gap-1 text-slate-400">
                                                  <CheckCircle className="w-3 h-3" /> Aucune
                                              </span>
                                          ) : (
                                              <span className="flex items-center gap-1 text-red-400 font-bold">
                                                  <AlertOctagon className="w-3 h-3" /> {row.disposition.toUpperCase()}
                                              </span>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DmarcTab;
