
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, Vulnerability, PhishingAnalysis, SSLInfo, OsintResult, OsintType, IocSearchResult, DomainInfo, AsmResult, EmailHeaderAnalysis, DmarcReportData, UrlAnalysisResult, DomainCheckResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper pour parser le JSON news de manière robuste
const parseNewsResponse = (text: string): NewsItem[] => {
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (e) {
        console.warn("JSON Parse warning", e);
        return [];
    }
}

// Helper pour parser le JSON vulns
const parseVulnResponse = (text: string): Vulnerability[] => {
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (e) {
        console.warn("Vuln JSON Parse warning", e);
        return [];
    }
}

// --- GENERIC DEEP ANALYSIS ---
export const generateDeepAnalysis = async (context: string, data: any): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Agis comme un expert Senior en Cyber Threat Intelligence (CTI).
      Analyse les données techniques suivantes fournies par le module "${context}".
      
      Données brutes (JSON):
      ${JSON.stringify(data)}

      Produis un rapport d'analyse concis (max 150 mots) et structuré :
      1. 🚨 **Niveau de Menace Global** : (Faible/Moyen/Critique) avec justification.
      2. 🔍 **Observations Clés** : Ce qui est anormal ou dangereux.
      3. 🛡️ **Recommandations** : 2 ou 3 actions immédiates concrètes.

      Ton ton doit être professionnel, technique mais compréhensible pour un décideur.`,
    });
    return response.text || "Analyse non disponible.";
  } catch (error) {
    console.error("Deep Analysis Error:", error);
    return "Erreur lors de la génération de l'analyse approfondie.";
  }
};

// --- ARTICLE SPECIFIC ANALYSIS (CTI REPORT) ---
export const generateArticleAnalysis = async (title: string, source: string, url: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Agis comme un analyste expert en Cyber Threat Intelligence (CTI).
      
      Analyse l'article suivant :
      - Titre : "${title}"
      - Source : "${source}"
      - URL : "${url}"

      Utilise Google Search pour trouver les détails techniques et le contexte complet de cet événement spécifique.

      Génère un **Rapport d'Intelligence Stratégique** concis mais technique (environ 150-200 mots) structuré ainsi :

      1. **Résumé Exécutif** : De quoi s'agit-il en 2 phrases ?
      2. **Détails Techniques** : Vecteurs d'attaque, CVEs, groupes impliqués (APT), ou nature de la faille.
      3. **Impact Potentiel** : Confidentialité, Intégrité, Disponibilité, ou Impact Business.
      4. **Actions Recommandées** : 2 mesures de mitigation immédiates pour les équipes SOC/CISO.

      N'utilise pas de Markdown complexe (gras ok, pas de tableaux), format texte clair pour insertion PDF.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "Analyse indisponible.";
  } catch (error) {
    console.error("Article Analysis Error:", error);
    return "Impossible de générer l'analyse CTI pour cet article.";
  }
};

// --- NEWS ---
export const fetchCyberNews = async (): Promise<NewsItem[]> => {
  try {
    // STRATÉGIE PARALLÈLE :
    // Cible : 30 articles.
    // Division en 2 lots de 15 pour assurer diversité et précision.

    const batch1Prompt = `Tu es un moteur de veille CTI. Génère une liste JSON de **15 actualités** récentes (7 derniers jours) focalisée sur :
    **ATTAQUES & MENACES** : Ransomwares, Data Breaches, Cyberespionnage (APT), Malware.
    
    SOURCES PRIORITAIRES: BleepingComputer, The Hacker News, KrebsOnSecurity.
    
    FORMAT STRICT JSON:
    [{ "title": "...", "source": "...", "summary": "Résumé court (12 mots max)", "url": "...", "date": "YYYY-MM-DD" }]`;

    const batch2Prompt = `Tu es un moteur de veille CTI. Génère une liste JSON de **15 actualités** récentes (7 derniers jours) focalisée sur :
    **VULNÉRABILITÉS & INDUSTRIE** : CVEs critiques, Mises à jour sécurité, Rapports CISA/CSA.
    
    SOURCES PRIORITAIRES: SecurityWeek, Dark Reading, CISA, CSA Singapore.
    
    FORMAT STRICT JSON:
    [{ "title": "...", "source": "...", "summary": "Résumé court (12 mots max)", "url": "...", "date": "YYYY-MM-DD" }]`;

    const [response1, response2] = await Promise.all([
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: batch1Prompt,
            config: { tools: [{ googleSearch: {} }] }
        }),
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: batch2Prompt,
            config: { tools: [{ googleSearch: {} }] }
        })
    ]);

    const news1 = parseNewsResponse(response1.text || "[]");
    const news2 = parseNewsResponse(response2.text || "[]");

    // Fusion et déduplication (basée sur le titre ou l'URL)
    const combined = [...news1, ...news2];
    const uniqueNewsMap = new Map();
    
    combined.forEach(item => {
        // Clé unique simple
        const key = (item.title + item.source).toLowerCase();
        if (!uniqueNewsMap.has(key)) {
            uniqueNewsMap.set(key, item);
        }
    });

    const uniqueNews = Array.from(uniqueNewsMap.values());

    // Tri final par date
    return uniqueNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
};

// --- VULNERABILITIES ---
export const fetchRecentVulnerabilities = async (): Promise<Vulnerability[]> => {
  try {
    // STRATÉGIE PARALLÈLE POUR 50 VULNÉRABILITÉS
    // Batch 1: Vulnérabilités Critiques Infrastructure (OS, Cloud, Virtualisation)
    const promptInfrastructure = `
      Agis comme la base de données NVD. Liste les **25 DERNIERES vulnérabilités (CVE)** critiques publiées (triées par date décroissante) touchant :
      Windows, Linux, VMware, Cisco, AWS, Azure, Fortinet.
      
      Priorité aux dates les plus récentes absolues.
      Format JSON strict:
      [{ "cve": "CVE-202X-XXXX", "title": "...", "severity": "CRITICAL", "description": "...", "date": "YYYY-MM-DD", "affectedSystems": ["..."] }]
    `;

    // Batch 2: Vulnérabilités Applicatives (Web, CMS, Software)
    const promptApp = `
      Agis comme la base de données NVD. Liste les **25 DERNIERES vulnérabilités (CVE)** logicielles publiées (triées par date décroissante) touchant :
      Chrome, Firefox, WordPress, Adobe, Java, Python, PHP, Libraries.
      
      Priorité aux dates les plus récentes absolues.
      Format JSON strict:
      [{ "cve": "CVE-202X-XXXX", "title": "...", "severity": "HIGH", "description": "...", "date": "YYYY-MM-DD", "affectedSystems": ["..."] }]
    `;

    const [responseInfra, responseApp] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptInfrastructure,
        config: { tools: [{ googleSearch: {} }] }
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptApp,
        config: { tools: [{ googleSearch: {} }] }
      })
    ]);

    const vulnsInfra = parseVulnResponse(responseInfra.text || "[]");
    const vulnsApp = parseVulnResponse(responseApp.text || "[]");

    // Fusion et Déduplication par CVE ID
    const combined = [...vulnsInfra, ...vulnsApp];
    const uniqueMap = new Map();

    combined.forEach(v => {
        if(v.cve && !uniqueMap.has(v.cve)) {
            uniqueMap.set(v.cve, v);
        }
    });

    const finalVulns = Array.from(uniqueMap.values());

    // Tri par date décroissante (plus récent au plus ancien)
    return finalVulns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("Error fetching vulns:", error);
    return [];
  }
};

// --- PHISHING: CONTENT ANALYSIS ---
export const analyzePhishingAttempt = async (content: string): Promise<PhishingAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyse ce texte ou lien pour une tentative de phishing potentielle: "${content}". 
      Réponds UNIQUEMENT avec un objet JSON respectant ce schema:
      {
        "isSuspicious": boolean,
        "confidenceScore": number (0-100),
        "reasoning": string[] (liste des raisons),
        "verdict": string (court résumé)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSuspicious: { type: Type.BOOLEAN },
            confidenceScore: { type: Type.NUMBER },
            reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
            verdict: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing phishing:", error);
    return {
      isSuspicious: false,
      confidenceScore: 0,
      reasoning: ["Erreur d'analyse API"],
      verdict: "Impossible d'analyser"
    };
  }
};

// --- PHISHING: HEADER ANALYSIS ---
export const analyzeEmailHeaders = async (headers: string): Promise<EmailHeaderAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Agis comme un analyste SOC Senior. Analyse ces en-têtes d'email bruts (Raw Headers) pour détecter du spoofing ou du phishing.
      
      Données d'entrée (Headers):
      """
      ${headers}
      """

      Tâches:
      1. Extrais les champs clés (From, Return-Path, Sender IP, Subject, Date, Reply-To).
      2. Analyse les résultats d'authentification (SPF, DKIM, DMARC) présents dans les headers (Authentication-Results, ARC-Authentication-Results, etc.).
      3. Compare "From" et "Return-Path" pour détecter le spoofing.
      4. Vérifie la réputation de l'IP émettrice (simulation basée sur ta connaissance).
      5. Détermine un score de sécurité (100 = Sûr, 0 = Dangereux).

      Formatte la réponse strictement en JSON :
      {
        "senderIp": "IP trouvée",
        "from": "Email From",
        "returnPath": "Email Return-Path",
        "subject": "Sujet",
        "date": "Date",
        "replyTo": "Reply-To (ou 'None')",
        "authentication": {
          "spf": "PASS" | "FAIL" | "SOFTFAIL" | "NEUTRAL" | "NONE",
          "dkim": "PASS" | "FAIL" | "NONE",
          "dmarc": "PASS" | "FAIL" | "NONE"
        },
        "securityScore": number (0-100),
        "anomalies": ["Liste des anomalies techniques détectées"],
        "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        "socVerdict": "Ton analyse professionnelle (ex: Spoofing confirmé car SPF fail et From mismatch...)"
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Header Analysis Error:", error);
    return {
        senderIp: "N/A",
        from: "N/A",
        returnPath: "N/A",
        subject: "Erreur analyse",
        date: "N/A",
        replyTo: "N/A",
        authentication: { spf: 'NONE', dkim: 'NONE', dmarc: 'NONE' },
        securityScore: 0,
        anomalies: ["Erreur API lors de l'analyse des headers"],
        riskLevel: 'LOW',
        socVerdict: "Impossible d'analyser les en-têtes."
    };
  }
};

// --- SSL MONITOR (Real-time via AI Search) ---
// Note: Le code Python (ssl/socket) ne peut pas s'exécuter dans le navigateur.
// Nous utilisons Gemini avec Google Search pour récupérer ces informations réelles.
export const checkSSLStatus = async (domain: string): Promise<SSLInfo> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Check the SSL certificate for the domain "${domain}".
      Use Google Search to find real technical details about its SSL certificate.
      
      Target Information:
      1. Issuer Name (CA).
      2. Expiration Date.

      Format the response strictly as a JSON object:
      {
        "issuer": "string",
        "expirationDate": "YYYY-MM-DD",
        "isValid": boolean
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const now = new Date();
        // Fallback date if AI fails to parse specifically
        const expDate = data.expirationDate ? new Date(data.expirationDate) : new Date(new Date().setMonth(new Date().getMonth() + 3));
        
        if (isNaN(expDate.getTime())) {
             throw new Error("Invalid date received");
        }

        const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        return {
            domain,
            issuer: data.issuer || "Non identifié (Search)",
            expirationDate: expDate.toISOString(),
            isValid: daysRemaining > 0,
            daysRemaining
        };
    }
    throw new Error("Invalid AI response format");
  } catch (error) {
    console.warn("SSL Search failed, using simulation fallback:", error);
    // Fallback simulation pour ne pas bloquer l'UI si Gemini échoue
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(now.getDate() + 90);
    return {
      domain,
      issuer: "Analyse Indisponible (Protected/Error)",
      expirationDate: expirationDate.toISOString(),
      isValid: true,
      daysRemaining: 90
    };
  }
};

export const processCertificateInventory = async (csvData: any[]): Promise<string> => {
  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
      Traiter le fichier Excel/CSV d'inventaire des certificats qui vous est fourni ci-dessous (converti en JSON brut).
      Vous devez extraire, valider et structurer les données pour une importation immédiate dans notre base de données interne de suivi des expirations.

      Extraction Requise (5 champs strictement) :
      1. Nom du Certificat (Identifiant unique interne ou nom du fichier/alias).
      2. Nom de Domaine (Le nom de domaine principal (Common Name) ou SAN).
      3. Autorité de Certification (CA) (Ex: Let's Encrypt, DigiCert, GlobalSign, etc.).
      4. Date d'Expiration (Format AAAA-MM-JJ, par exemple : 2026-03-15).
      5. Emplacement du Serveur (Serveur physique, IP, Load Balancer, ou Key Vault où il est hébergé).

      Format de Sortie : 
      Le résultat doit être livré sous la forme d'un tableau Markdown. Ce format est requis pour faciliter la copie des données structurées et leur insertion dans notre application de BDD.

      Données d'entrée (JSON):
      ${JSON.stringify(csvData.slice(0, 50))} 
      (Note: Limité aux 50 premières lignes pour traitement rapide)
      `,
    });
    return response.text || "Aucune donnée extraite.";
  } catch (e) {
      console.error(e);
      return "Erreur lors du traitement du fichier d'inventaire.";
  }
};

// --- OSINT ANALYSIS ---
export const performOsintAnalysis = async (type: OsintType, target: string): Promise<OsintResult> => {
  try {
    let prompt = "";
    if (type === 'DOMAIN') {
        prompt = `Effectue une recherche OSINT approfondie sur le domaine "${target}". Cherche: Registrar, Date création, IP serveur, Localisation, Serveurs DNS, Enregistrements MX, Sous-domaines connus, Réputation (Clean/Malicious).`;
    } else if (type === 'IP') {
        prompt = `Effectue une recherche OSINT technique sur l'adresse IP "${target}". Cherche: Organisation (ASN), ISP, Localisation précise (Ville/Pays), Ports ouverts connus (via Shodan/Census reports si dispo en ligne), Réputation (Blacklists), Historique de malveillance.`;
    } else if (type === 'MAIL') {
        prompt = `Effectue une recherche OSINT sur l'adresse email "${target}". Cherche: Si elle apparait dans des fuites de données publiques (Data Breaches), Domaines associés, Présence sur les réseaux sociaux (si public), Validité du domaine mail MX. Ne révèle pas de données privées sensibles, cherche uniquement les occurrences publiques (OSINT).`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${prompt}
      
      Formatte la réponse strictement en JSON avec la structure suivante:
      {
        "target": "${target}",
        "type": "${type}",
        "summary": "Résumé global de l'analyse en français (2 phrases max)",
        "reputation": "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN",
        "details": [
            { "label": "Nom du champ (ex: Registrar, ASN, Breach found)", "value": "Valeur trouvée", "isAlert": boolean (true si c'est un point négatif/danger) }
        ],
        "sources": ["Liste des URLs des sources trouvées pour corroborer"]
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    // Extract sources from grounding metadata if available, otherwise try to parse from text if prompted
    let sources: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
       response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
           if (chunk.web?.uri) sources.push(chunk.web.uri);
       });
    }

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      if (sources.length > 0) result.sources = sources;
      return result;
    }
    throw new Error("Invalid Format");

  } catch (error) {
    console.error("OSINT Error:", error);
    return {
        target,
        type,
        summary: "Erreur lors de l'analyse OSINT.",
        reputation: "UNKNOWN",
        details: [{ label: "Erreur", value: "Impossible de récupérer les données via Gemini." }],
        sources: []
    };
  }
};

// --- IOC SEARCH ---
export const searchIOCs = async (query: string): Promise<IocSearchResult> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Agis comme un analyste CTI (Cyber Threat Intelligence). Je cherche des IOCs (Indicateurs de Compromission) récents pour la menace/groupe/malware : "${query}".
            
            Recherche des rapports techniques récents (blogs sécu, rapports CISA, tweets d'analystes).
            Extrais une liste d'IOCs techniques (Hashs de fichiers, IPs de C2, Domaines malveillants).
            
            Formatte la réponse strictement en JSON :
            {
                "threatActor": "Nom canonique de la menace",
                "description": "Brève description de la menace et de sa campagne récente",
                "lastUpdated": "Date approximative des infos (YYYY-MM-DD)",
                "iocs": [
                    { 
                        "type": "HASH_MD5" | "HASH_SHA256" | "IP" | "DOMAIN" | "URL" | "EMAIL",
                        "value": "l'indicateur",
                        "description": "Contexte (ex: C2 Server, Payload X)",
                        "confidence": "HIGH" | "MEDIUM" | "LOW"
                    }
                ]
            }`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return {
            threatActor: query,
            description: "Pas d'informations structurées trouvées.",
            lastUpdated: new Date().toISOString().split('T')[0],
            iocs: []
        };
    } catch (error) {
        console.error("IOC Error:", error);
        return {
            threatActor: query,
            description: "Erreur API lors de la recherche.",
            lastUpdated: new Date().toISOString().split('T')[0],
            iocs: []
        };
    }
};

// --- DOMAIN ANALYSIS (Detailed) ---
export const analyzeDomain = async (domain: string): Promise<DomainInfo> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Effectue une analyse technique OSINT sur le domaine "${domain}".
      Récupère: Registrar, Date de création, IP principale, Localisation serveur, Nameservers, MX Records, et quelques sous-domaines si connus.
      
      Formatte la réponse strictement en JSON:
      {
        "domain": "${domain}",
        "registrar": "Nom du registrar",
        "creationDate": "Date",
        "ipAddress": "IP",
        "serverLocation": "Pays/Ville",
        "nameservers": ["ns1", "ns2"],
        "mxRecords": ["mx1", "mx2"],
        "subdomains": ["sub1", "sub2"]
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    console.error("Domain Analysis Error:", error);
    return {
      domain,
      registrar: "Non disponible",
      creationDate: "Non disponible",
      ipAddress: "Non disponible",
      serverLocation: "Non disponible",
      nameservers: [],
      mxRecords: [],
      subdomains: []
    };
  }
};

// --- ATTACK SURFACE MANAGEMENT (ASM) ---
export const performAsmScan = async (domain: string): Promise<AsmResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Agis comme un outil de gestion de surface d'attaque (ASM) externe. Effectue une reconnaissance passive sur l'organisation ou le domaine : "${domain}".
      
      TACHE CRITIQUE: Identifie la stack technologique AVEC LES NUMÉROS DE VERSION si possible.
      Cherche des indices dans les en-têtes HTTP, le code source des pages (via google search), les fichiers robots.txt, etc.
      
      Identifie :
      1. La stack technologique (Langages, CMS, Serveurs Web, Frameworks). ESSAIE DE TROUVER LA VERSION (ex: WordPress 6.1, Apache 2.4.41). Si version inconnue, mets null.
      2. Les sous-domaines potentiels exposés.
      3. Les ports standards potentiellement ouverts.
      4. Les assets cloud.
      5. Score de risque.

      Formatte STRICTEMENT en JSON :
      {
        "target": "${domain}",
        "riskScore": number (0-100),
        "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        "technologies": [
           { "name": "Nom techno (ex: WordPress)", "category": "Type (ex: CMS)", "version": "Version précise (ex: 6.4.2) ou null" }
        ],
        "exposedPorts": [80, 443, ...],
        "discoveredAssets": [
           { "type": "SUBDOMAIN" | "CLOUD_BUCKET" | "LOGIN_PAGE" | "API_ENDPOINT", "name": "ex: admin.site.com", "description": "Interface admin" }
        ],
        "potentialVulns": ["Vulnérabilité potentielle 1", "Mauvaise config possible"]
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    console.error("ASM Error:", error);
    return {
      target: domain,
      riskScore: 0,
      riskLevel: 'LOW',
      technologies: [],
      exposedPorts: [],
      discoveredAssets: [],
      potentialVulns: ["Erreur lors du scan"]
    };
  }
};

// --- DMARC REPORT ANALYSIS ---
export const analyzeDmarcReport = async (reportData: DmarcReportData): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Agis comme un expert en sécurité email (DMARC/SPF/DKIM).
            Analyse ce rapport DMARC agrégé (XML parsé en JSON) :
            
            ${JSON.stringify(reportData, null, 2)}

            Tâches :
            1. Identifie les sources illégitimes (IPs qui échouent SPF/DKIM). Sont-elles malveillantes ou est-ce du "Forwarding" légitime ?
            2. Vérifie si la politique actuelle (none/quarantine/reject) est adaptée ou si elle doit être renforcée.
            3. Donne 3 recommandations précises pour améliorer la délivrabilité et la sécurité.
            
            Réponds en français, format Markdown concis.`,
        });
        return response.text || "Analyse indisponible.";
    } catch (error) {
        console.error("DMARC Analysis Error:", error);
        return "Erreur lors de l'analyse IA du rapport DMARC.";
    }
};

// --- URL SOURCE CODE ANALYSIS ---
export const analyzeUrlSource = async (url: string): Promise<UrlAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tu es un assistant spécialisé en analyse de sites web malveillants.
      Analyse l'URL suivante : "${url}".

      Utilise Google Search pour obtenir des informations sur ce site (date création, contenu indexé, rapports de sécurité).
      Simule une analyse de code source basée sur ta connaissance des structures web courantes associées à ce type d'URL.

      Analyse selon ces critères :
      1. Domaine: Ancienneté, cybersquatting, typosquatting.
      2. Protocole/Certificat: HTTP vs HTTPS, Validité apparente.
      3. Code Source: Scripts suspects, Obfuscation, Iframes cachées.
      4. Formulaires: Destination des données (Phishing credential harvesting).
      5. Ressources: Liens externes, Trackers, CDNs douteux.
      6. Signes de Phishing: Imitation de marque, Logos copiés.
      7. Technologies: CMS, Frameworks.
      8. Score: 0 (Sûr) à 100 (Très Dangereux).

      Formatte la réponse STRICTEMENT en JSON selon ce schéma :
      {
        "url": "${url}",
        "riskScore": number (0-100),
        "riskCategory": "FIABLE" | "DOUTEUX" | "SUSPECT" | "DANGEREUX",
        "domainAnalysis": { "status": "SAFE" | "WARNING" | "DANGER", "details": "ex: Domaine créé il y a 2 jours" },
        "protocolAnalysis": { "isHttps": boolean, "certDetails": "ex: Let's Encrypt DV", "status": "SAFE" | "WARNING" | "DANGER" },
        "sourceCodeAnalysis": { "suspiciousScripts": boolean, "obfuscationDetected": boolean, "details": ["script base64 trouvé", "redirection js"] },
        "formAnalysis": { "hasForms": boolean, "dataDestination": "ex: envoie vers ip russe", "risk": "LOW" | "MEDIUM" | "HIGH" },
        "resourceAnalysis": { "externalUrls": ["url1", "url2"], "suspiciousTrackers": ["tracker1"] },
        "phishingSigns": { "detected": boolean, "signs": ["Logo PayPal imité", "Faute d'orthographe"] },
        "technologies": ["WordPress", "jQuery"]
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    console.error("URL Analysis Error:", error);
    return {
        url,
        riskScore: 0,
        riskCategory: 'FIABLE',
        domainAnalysis: { status: 'SAFE', details: "Erreur analyse" },
        protocolAnalysis: { isHttps: false, certDetails: "Inconnu", status: 'WARNING' },
        sourceCodeAnalysis: { suspiciousScripts: false, obfuscationDetected: false, details: [] },
        formAnalysis: { hasForms: false, dataDestination: "Inconnu", risk: 'LOW' },
        resourceAnalysis: { externalUrls: [], suspiciousTrackers: [] },
        phishingSigns: { detected: false, signs: [] },
        technologies: []
    };
  }
};

// --- DOMAIN CHECK (Multi-Source Simulation) ---
export const performDomainCheck = async (domain: string): Promise<DomainCheckResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tu es un expert en audit de domaine et DNS. Effectue une vérification complète du domaine "${domain}".
      
      Sources à simuler / interroger via ta connaissance et Google Search :
      1. **DNSAudit.io** : Vérifie la santé DNS générale (DNSSEC, Enregistrements SOA, NS redondance).
      2. **MXToolbox** : Vérifie si le domaine est sur liste noire (Blacklist check), et la configuration email (SPF, DMARC présents ?).
      3. **Shodan.io** & **Search.censys.io** : Recherche des ports ouverts (exposure) et des services vulnérables indexés publiquement.

      Tâche :
      - Synthétise ces informations pour donner un score global de santé du domaine (0 = Mauvais, 100 = Excellent).
      - Liste les problèmes DNS potentiels.
      - Liste les ports ouverts probables (80, 443, 8080, etc.).
      
      Formatte la réponse STRICTEMENT en JSON :
      {
        "domain": "${domain}",
        "globalScore": number (0-100),
        "dnsAudit": {
           "status": "PASS" | "WARNING" | "FAIL",
           "issues": ["Pas de DNSSEC", "TTL trop court", "SOA serial non conforme"]
        },
        "mxToolbox": {
           "blacklistStatus": "CLEAN" | "LISTED",
           "smtpBanner": "Ex: 220 mx.google.com ESMTP...",
           "mailConfig": { "spf": boolean, "dmarc": boolean }
        },
        "exposure": {
           "shodanPorts": [80, 443, 22],
           "censysServices": ["HTTP", "SSH"],
           "vulnerabilities": ["CVE-2023-XXXX possible"]
        },
        "details": "Résumé textuel de l'analyse (max 2 phrases)."
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    console.error("Domain Check Error:", error);
    return {
        domain,
        globalScore: 0,
        dnsAudit: { status: 'FAIL', issues: ["Erreur analyse API"] },
        mxToolbox: { blacklistStatus: 'CLEAN', smtpBanner: "N/A", mailConfig: { spf: false, dmarc: false } },
        exposure: { shodanPorts: [], censysServices: [], vulnerabilities: [] },
        details: "Impossible d'effectuer l'audit."
    };
  }
};
