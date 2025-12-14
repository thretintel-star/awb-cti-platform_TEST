import React, { useEffect, useState } from 'react';
import { fetchCyberNews } from '../services/geminiService';
import { NewsItem } from '../types';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';

const NewsTab: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchCyberNews();
      setNews(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Newspaper className="w-6 h-6" />
            Actualités Cybersécurité
            </h2>
            <p className="text-slate-400 text-sm mt-1">Agrégé via Gemini Search Grounding</p>
        </div>
        <button 
          onClick={loadNews}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && news.length === 0 ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">
            Recherche des menaces récentes...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {news.map((item, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-emerald-500/50 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded">
                  {item.source}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {item.summary}
              </p>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-emerald-500 hover:text-emerald-400"
              >
                Lire la source <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsTab;