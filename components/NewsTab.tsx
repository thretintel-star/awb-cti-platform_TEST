
import React, { useEffect, useState } from 'react';
import { fetchCyberNews, generateArticleAnalysis } from '../services/geminiService';
import { NewsItem } from '../types';
import { Newspaper, ExternalLink, RefreshCw, Radio, SortDesc, Sparkles, Download, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";

const NewsTab: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<{[key: number]: string}>({});

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchCyberNews();
      setNews(data);
      setAnalyses({}); // Reset analyses on reload
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeArticle = async (index: number, item: NewsItem) => {
    setAnalyzingId(index);
    try {
        const analysis = await generateArticleAnalysis(item.title, item.source, item.url);
        setAnalyses(prev => ({...prev, [index]: analysis}));
    } finally {
        setAnalyzingId(null);
    }
  };

  const handleDownloadPdf = (item: NewsItem, analysis: string) => {
    const doc = new jsPDF();
    const leftMargin = 20;
    let yPos = 20;

    // Helper for text
    const addText = (text: string, size: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, leftMargin, yPos);
        yPos += (lines.length * 7);
    };

    // Header
    addText("AWB_CTI - Rapport d'Intelligence Stratégique", 16, true, [16, 185, 129]);
    yPos += 5;
    addText(`Sujet: ${item.title}`, 12, true);
    addText(`Source: ${item.source} | Date: ${item.date}`, 10, false, [100, 100, 100]);
    addText(`Lien d'origine: ${item.url}`, 8, false, [59, 130, 246]);
    yPos += 10;
    
    // Separator
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos - 5, 190, yPos - 5);

    // Analysis Content
    addText("Analyse Expert CTI:", 14, true, [50, 50, 50]);
    yPos += 5;
    
    // The analysis text is likely structured with numbers or newlines.
    // Clean it a bit for PDF
    const cleanAnalysis = analysis.replace(/\*\*/g, ''); // Remove markdown bold asterisks
    addText(cleanAnalysis, 11, false, [0, 0, 0]);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Généré par AWB_CTI Dashboard - Confidentiel", leftMargin, 280);

    doc.save(`CTI_Report_${item.title.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Newspaper className="w-6 h-6" />
            Actualités Cybersécurité
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-slate-400 text-sm mr-1">Sources surveillées (Top 30+ / 7 jours):</p>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">CSA Singapore</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">The Hacker News</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">BleepingComputer</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">CybersecurityNews</span>
                <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">CISA</span>
                <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">Dark Reading</span>
                <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">KrebsOnSecurity</span>
                <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">SecurityWeek</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {news.length > 0 && (
                <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <SortDesc className="w-3 h-3" />
                    {news.length} articles triés par date
                </div>
            )}
            <button 
                onClick={loadNews}
                disabled={loading}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
            >
                <RefreshCw className={`w-5 h-5 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {loading && news.length === 0 ? (
        <div className="text-center py-20 text-slate-500 animate-pulse flex flex-col items-center gap-3">
             <Radio className="w-8 h-8 animate-ping" />
            Agrégation multi-sources en parallèle (Objectif: 30 articles)...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {news.length > 0 ? (
             news.map((item, index) => (
                <div key={index} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-emerald-500/50 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 truncate max-w-[120px]">
                      {item.source}
                    </span>
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap ml-2">
                      {item.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                    {item.summary}
                  </p>
                  
                  {/* Analysis Result Display */}
                  {analyses[index] && (
                      <div className="mb-4 bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-lg animate-fadeIn">
                          <h4 className="text-indigo-300 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                              <FileText className="w-3 h-3" /> Rapport CTI
                          </h4>
                          <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
                              {analyses[index]}
                          </div>
                      </div>
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-800">
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                      >
                        Source <ExternalLink className="w-3 h-3 ml-1" />
                      </a>

                      <div className="flex gap-2">
                          {analyses[index] ? (
                              <button
                                onClick={() => handleDownloadPdf(item, analyses[index])}
                                className="inline-flex items-center text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
                              >
                                  <Download className="w-3 h-3 mr-1" /> PDF
                              </button>
                          ) : (
                              <button
                                onClick={() => handleAnalyzeArticle(index, item)}
                                disabled={analyzingId !== null}
                                className="inline-flex items-center text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                              >
                                  {analyzingId === index ? (
                                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white animate-ping"></div> Analyse...</span>
                                  ) : (
                                      <><Sparkles className="w-3 h-3 mr-1" /> Analyse IA</>
                                  )}
                              </button>
                          )}
                      </div>
                  </div>
                </div>
              ))
          ) : (
              <div className="col-span-full text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Aucune actualité trouvée pour le moment sur ces sources.
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsTab;
