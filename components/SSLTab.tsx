
import React, { useState, useRef, useEffect } from 'react';
import { SSLInfo } from '../types';
import { checkSSLStatus, generateDeepAnalysis, processCertificateInventory } from '../services/geminiService';
import { ShieldCheck, ShieldAlert, Plus, Trash2, Globe, Sparkles, FileText, Upload, FileSpreadsheet, Table, X, Database, Download, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

const SSLTab: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  
  // Initialisation avec récupération du LocalStorage (Simulation BDD persistante)
  const [sites, setSites] = useState<SSLInfo[]>(() => {
    const saved = localStorage.getItem('awb_ssl_db');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  // Inventory state
  const [inventoryResult, setInventoryResult] = useState<string | null>(null);
  const [processingInventory, setProcessingInventory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const dbInputRef = useRef<HTMLInputElement>(null);

  // Sauvegarde automatique dans le LocalStorage à chaque changement de 'sites'
  useEffect(() => {
    localStorage.setItem('awb_ssl_db', JSON.stringify(sites));
  }, [sites]);

  const cleanDomain = (input: string) => {
    return input.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setLoading(true);
    try {
      const domain = cleanDomain(urlInput);
      
      // Check if already exists
      if (sites.some(s => s.domain === domain)) {
        alert("Ce domaine est déjà dans la liste.");
        setLoading(false);
        return;
      }

      const info = await checkSSLStatus(domain);
      
      setSites(prev => {
        const newSites = [...prev, info];
        return newSites.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      });
      setUrlInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- EXCEL IMPORT ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const potentialDomains = jsonData.flat()
        .filter(cell => typeof cell === 'string' && cell.includes('.'))
        .map(d => cleanDomain(d));
      
      const uniqueDomains = [...new Set(potentialDomains)];
      const newDomains = uniqueDomains.filter(d => !sites.some(s => s.domain === d));

      if (newDomains.length === 0) {
        alert("Aucun nouveau domaine valide trouvé dans le fichier.");
        setLoading(false);
        return;
      }

      const results = await Promise.all(newDomains.map(d => checkSSLStatus(d)));

      setSites(prev => {
        const updated = [...prev, ...results];
        return updated.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      });

    } catch (error) {
      console.error("Erreur lecture Excel:", error);
      alert("Erreur lors de la lecture du fichier. Vérifiez le format.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- DB IMPORT/EXPORT ---
  const handleExportDB = () => {
    const dataStr = JSON.stringify(sites, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ssl_monitor_db_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importedSites = JSON.parse(text);
        if (Array.isArray(importedSites)) {
            if(window.confirm(`Voulez-vous remplacer la liste actuelle (${sites.length} sites) par la sauvegarde (${importedSites.length} sites) ?`)) {
                setSites(importedSites);
            }
        } else {
            alert("Format de fichier invalide.");
        }
    } catch (err) {
        alert("Erreur lors de l'importation de la base de données.");
    } finally {
        if (dbInputRef.current) dbInputRef.current.value = '';
    }
  };

  const handleInventoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingInventory(true);
    setInventoryResult(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const markdown = await processCertificateInventory(jsonData);
      setInventoryResult(markdown);
    } catch (error) {
        console.error("Inventory Error:", error);
        alert("Erreur analyse inventaire");
    } finally {
        setProcessingInventory(false);
        if (inventoryInputRef.current) inventoryInputRef.current.value = '';
    }
  };

  const handleDeepAnalysis = async () => {
    if(sites.length === 0) return;
    setAnalyzing(true);
    try {
        const text = await generateDeepAnalysis("Audit Certificats SSL/PKI", sites);
        setAnalysis(text);
    } finally {
        setAnalyzing(false);
    }
  };

  const removeSite = (domain: string) => {
    setSites(prev => prev.filter(s => s.domain !== domain));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Moniteur Certificats SSL
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-400 text-sm">Base de données locale ({sites.length} sites)</p>
                {sites.length > 0 && <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1"><Database className="w-3 h-3"/> Persistant</span>}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-start sm:items-center">
            
            {sites.length > 0 && (
                 <button 
                    onClick={handleDeepAnalysis}
                    disabled={analyzing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium disabled:opacity-50 whitespace-nowrap text-sm shadow-lg shadow-indigo-900/20 transition-all"
                >
                    {analyzing ? '...' : <><Sparkles className="w-4 h-4" /> Audit IA</>}
                </button>
            )}

            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
            <input type="file" ref={inventoryInputRef} onChange={handleInventoryUpload} accept=".xlsx, .xls, .csv" className="hidden" />
            <input type="file" ref={dbInputRef} onChange={handleImportDB} accept=".json" className="hidden" />

            {/* Unified Toolbar */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto shadow-sm">
                
                {/* DB Tools */}
                <button
                    onClick={() => handleExportDB()}
                    disabled={sites.length === 0}
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30"
                    title="Sauvegarder la base de données (JSON)"
                >
                    <Save className="w-4 h-4 text-emerald-500" />
                </button>
                <button
                    onClick={() => dbInputRef.current?.click()}
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    title="Restaurer une sauvegarde"
                >
                    <Upload className="w-4 h-4 text-emerald-500" />
                </button>

                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    title="Importer une liste de domaines (Excel/CSV)"
                >
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">Import Excel</span>
                </button>

                <button
                    onClick={() => inventoryInputRef.current?.click()}
                    disabled={processingInventory}
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    title="Structurer un fichier d'inventaire pour la BDD (Markdown)"
                >
                    {processingInventory ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                         <Table className="w-4 h-4 text-indigo-400" />
                    )}
                    <span className="hidden sm:inline">Structurer</span>
                </button>

                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <form onSubmit={handleAddSite} className="flex gap-2 flex-1 sm:flex-initial">
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="ex: google.com"
                        className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 text-sm min-w-[120px] sm:min-w-[150px] placeholder:text-slate-600"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold disabled:opacity-50 whitespace-nowrap transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        {loading ? '...' : <Plus className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
      </div>

       {/* Inventory Markdown Result */}
       {inventoryResult && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden animate-fadeIn shadow-lg">
                <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Table className="w-4 h-4 text-indigo-400" /> Résultat Structuré (Markdown)
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(inventoryResult);
                                alert("Markdown copié !");
                            }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors"
                        >
                            Copier
                        </button>
                        <button onClick={() => setInventoryResult(null)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-slate-950 overflow-auto max-h-[400px]">
                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{inventoryResult}</pre>
                </div>
            </div>
       )}

       {/* AI Analysis Result */}
       {analysis && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl animate-fadeIn">
                <h3 className="text-indigo-300 font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Rapport d'Audit PKI
                </h3>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line">
                    {analysis}
                </div>
            </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Domaine</th>
                <th className="px-6 py-4">Émetteur</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4">Jours Restants</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                        <Database className="w-8 h-8 opacity-20" />
                        <p>Base de données vide.</p>
                        <p className="text-xs text-slate-600">Ajoutez un domaine manuellement ou importez un fichier.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.domain} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        {site.domain}
                    </td>
                    <td className="px-6 py-4">{site.issuer}</td>
                    <td className="px-6 py-4">{new Date(site.expirationDate).toLocaleDateString()}</td>
                    <td className={`px-6 py-4 font-bold ${site.daysRemaining < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {site.daysRemaining} jours
                    </td>
                    <td className="px-6 py-4">
                        {site.isValid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Valide
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                Expiré
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => removeSite(site.domain)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SSLTab;
