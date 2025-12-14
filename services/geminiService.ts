
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, Vulnerability, PhishingAnalysis, SSLInfo, OsintResult, OsintType, IocSearchResult, DomainInfo, AsmResult, EmailHeaderAnalysis, DmarcReportData, UrlAnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- GENERIC DEEP ANALYSIS ---
export const generateDeepAnalysis = async (context: string, data: any): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Agis comme un expert Senior en Cyber Threat Intelligence (CTI) et CISO.
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

// --- NEWS ---
export const fetchCyberNews = async (): Promise<NewsItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Recherche les dernières actualités importantes en cybersécurité (aujourd'hui et hier). Retourne une liste de 5 articles majeurs. Formatte la réponse strictement en tableau JSON d'objets avec les clés: title, source, summary, url (si disponible via le grounding), date.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
};

// --- VULNERABILITIES ---
export const fetchRecentVulnerabilities = async (): Promise<Vulnerability[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Recherche les vulnérabilités (CVE) récemment exploitées ou critiques de la semaine dernière. Donne-moi une liste de 5 éléments. Formatte la réponse strictement en JSON (Tableau d'objets) avec les clés: cve, title, severity (CRITICAL, HIGH, MEDIUM, LOW), description, date, affectedSystems (tableau de strings).",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
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

// --- SSL MONITOR (Simulation) ---
export const checkSSLStatus = async (domain: string): Promise<SSLInfo> => {
    await new Promise(r => setTimeout(r, 1000));
    const now = new Date();
    const randomDays = (domain.length * 13) % 400; 
    const expirationDate = new Date();
    expirationDate.setDate(now.getDate() + randomDays - 50);

    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    return {
      domain,
      issuer: "Let's Encrypt Authority X3 (Simulé)",
      expirationDate: expirationDate.toISOString(),
      isValid: daysRemaining > 0,
      daysRemaining
    };
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
