
export enum Tab {
  DASHBOARD = 'DASHBOARD',
  NEWS = 'NEWS',
  SSL_MONITOR = 'SSL_MONITOR',
  VULNERABILITIES = 'VULNERABILITIES',
  PHISHING_ANALYZER = 'PHISHING_ANALYZER',
  OSINT = 'OSINT',
  IOC_SEARCH = 'IOC_SEARCH',
  ASM = 'ASM',
  DMARC = 'DMARC',
  URL_ANALYSIS = 'URL_ANALYSIS'
}

export interface NewsItem {
  title: string;
  source: string;
  summary: string;
  url: string;
  date: string;
}

export interface SSLInfo {
  domain: string;
  issuer: string;
  expirationDate: string; // ISO Date string
  isValid: boolean;
  daysRemaining: number;
}

export interface Vulnerability {
  cve: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  date: string;
  affectedSystems: string[];
}

export interface PhishingAnalysis {
  isSuspicious: boolean;
  confidenceScore: number; // 0-100
  reasoning: string[];
  verdict: string;
}

export interface EmailHeaderAnalysis {
  senderIp: string;
  from: string;
  returnPath: string; // Mail From
  subject: string;
  date: string;
  replyTo: string;
  authentication: {
    spf: 'PASS' | 'FAIL' | 'SOFTFAIL' | 'NEUTRAL' | 'NONE' | 'ERROR';
    dkim: 'PASS' | 'FAIL' | 'NONE' | 'ERROR';
    dmarc: 'PASS' | 'FAIL' | 'NONE' | 'ERROR';
  };
  securityScore: number; // 0-100 (100 = Safe)
  anomalies: string[];
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  socVerdict: string;
}

export type OsintType = 'IP' | 'DOMAIN' | 'MAIL';

export interface OsintResult {
  target: string;
  type: OsintType;
  summary: string;
  details: {
    label: string;
    value: string | string[];
    isAlert?: boolean;
  }[];
  reputation: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN';
  sources: string[];
}

export interface IocItem {
  type: 'HASH_MD5' | 'HASH_SHA256' | 'IP' | 'DOMAIN' | 'URL' | 'EMAIL';
  value: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IocSearchResult {
  threatActor: string; // Le nom de la menace (APT, Ransomware...)
  description: string;
  lastUpdated: string;
  iocs: IocItem[];
}

export interface DomainInfo {
  domain: string;
  registrar: string;
  creationDate: string;
  ipAddress: string;
  serverLocation: string;
  nameservers: string[];
  mxRecords: string[];
  subdomains: string[];
}

export interface DetailedTech {
  name: string;
  category: string;
  version?: string;
}

export interface AsmResult {
  target: string;
  riskScore: number; // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  technologies: DetailedTech[];
  exposedPorts: number[];
  discoveredAssets: {
    type: 'SUBDOMAIN' | 'CLOUD_BUCKET' | 'LOGIN_PAGE' | 'API_ENDPOINT';
    name: string;
    description: string;
  }[];
  potentialVulns: string[];
}

// --- DMARC Types ---
export interface DmarcRecord {
  sourceIp: string;
  count: number;
  disposition: 'none' | 'quarantine' | 'reject';
  dkimResult: 'pass' | 'fail' | 'none';
  spfResult: 'pass' | 'fail' | 'none' | 'softfail' | 'neutral';
  headerFrom: string;
}

export interface DmarcReportData {
  orgName: string;
  reportId: string;
  dateRange: {
    begin: string;
    end: string;
  };
  totalEmails: number;
  fullyAligned: number; // SPF & DKIM Pass
  failed: number; // Blocked or Failed
  records: DmarcRecord[];
}

// --- URL Code Analysis Types ---
export interface UrlAnalysisResult {
  url: string;
  riskScore: number; // 0-100
  riskCategory: 'FIABLE' | 'DOUTEUX' | 'SUSPECT' | 'DANGEREUX';
  
  // 1. Analyse du domaine
  domainAnalysis: {
    status: 'SAFE' | 'WARNING' | 'DANGER';
    details: string;
  };
  
  // 2. Protocole & Certificat
  protocolAnalysis: {
    isHttps: boolean;
    certDetails: string;
    status: 'SAFE' | 'WARNING' | 'DANGER';
  };

  // 3. Code Source (Scripts/Obfuscation)
  sourceCodeAnalysis: {
    suspiciousScripts: boolean;
    obfuscationDetected: boolean;
    details: string[];
  };

  // 4. Formulaires
  formAnalysis: {
    hasForms: boolean;
    dataDestination: string; // ex: "Même domaine", "IP externe"
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  // 5. Ressources externes
  resourceAnalysis: {
    externalUrls: string[];
    suspiciousTrackers: string[];
  };

  // 6. Phishing Signs
  phishingSigns: {
    detected: boolean;
    signs: string[];
  };

  // 7. Technologies
  technologies: string[];
}
