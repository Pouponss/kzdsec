// src/pages/ApiKeys.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Key, Plus, Copy, Eye, EyeOff, Trash2, Shield, AlertCircle,
  CheckCircle2, RefreshCw, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  collection, query, orderBy, onSnapshot, Unsubscribe,
  doc, setDoc, addDoc, serverTimestamp, Timestamp, updateDoc
} from 'firebase/firestore';
import { firestore } from '../firebase';

/* =========================
   Types
   ========================= */
interface ApiKey {
  id: string;                // == keyId (pas le docId Firestore)
  name: string;
  key: string;               // en clair juste après création (one-time), sinon masqué
  secret: string;            // saisi par l’utilisateur (one-time)
  type: 'test' | 'production';
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  lastUsed?: string;
  requestCount: number;
  last4?: string;
}

/* =========================
   Réseau / Helpers
   ========================= */
const ENV_BASE = ((import.meta as any)?.env?.VITE_API_BASE as string | undefined)?.trim();

function buildApiBases(): string[] {
  const bases: string[] = [];
  if (ENV_BASE) bases.push(ENV_BASE.replace(/\/+$/, ''));
  bases.push('/kazadi'); // proxy Vite (dev) / Netlify (prod) si configuré avec /kazadi/*
  bases.push('https://kazadi-securepay-api-production.up.railway.app'); // fallback prod direct
  return Array.from(new Set(bases));
}
function joinUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/+$/, '')}${p}`;
}
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 15000) {
  const ctrl = new AbortController(); const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(id); }
}
async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return {};
  if (ct.includes('application/json')) { try { return JSON.parse(text); } catch {} }
  return { __nonJson: true, raw: text };
}
async function multiFetchKazadi(path: string, init?: RequestInit) {
  let lastErr: any = null;
  for (const b of buildApiBases()) {
    const url = joinUrl(b, path);
    try {
      const res = await fetchWithTimeout(url, init);
      return { res, urlTried: url };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Impossible de joindre l'API (${lastErr?.message || 'NetworkError'})`);
}
function toISO(v: any): string {
  if (!v) return new Date().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  const d = new Date(v); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function isExpired(iso: string): boolean { return new Date(iso).getTime() <= Date.now(); }
function randomId() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function toHex(u8: Uint8Array) { return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join(''); }
const maskKazadiKey = (last4?: string) => `kazadi-sk-••••••••••••••••••••••••${last4 ?? ''}`;

/* ====== Génération email alias + mot de passe dérivé ====== */
function rand6(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
  return out;
}
function genAliasEmail(): string { return `${rand6()}@falub.ca`; }
async function aliasPassword(uid: string, aliasEmail: string): Promise<string> {
  const data = new TextEncoder().encode(`kazadi:${uid}:${aliasEmail}:v2`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return `KS-${toHex(hash).slice(0, 32)}`;
}

/* ====== Auth Railway avec alias ====== */
async function railwayRegister(email: string, password: string) {
  return (await multiFetchKazadi('/api/users/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })).res;
}
async function railwayLogin(email: string, password: string) {
  return (await multiFetchKazadi('/api/users/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })).res;
}

/* ====== Révélation one-time: utils fiables ====== */
type RevealData = { key: string; secret: string; createdAt: number };
const REVEAL_PREFIX = 'reveal:';
function loadRevealFromSession(keyId: string): RevealData | null {
  try {
    const raw = sessionStorage.getItem(REVEAL_PREFIX + keyId);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj.key === 'string' && typeof obj.secret === 'string' && typeof obj.createdAt === 'number') {
      if (Date.now() - obj.createdAt > 20000) { // 20s
        sessionStorage.removeItem(REVEAL_PREFIX + keyId);
        return null;
      }
      return obj;
    }
    return null;
  } catch { return null; }
}
function saveRevealToSession(keyId: string, data: RevealData) {
  try { sessionStorage.setItem(REVEAL_PREFIX + keyId, JSON.stringify(data)); } catch {}
}

/* Fallback copie si navigator.clipboard échoue */
async function copyText(text: string) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {}
  // fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {}
}

/* =========================
   Composant
   ========================= */
export default function ApiKeys() {
  const { user } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // visibilités (clé / secret)
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set());
  const [visibleSecretIds, setVisibleSecretIds] = useState<Set<string>>(new Set());

  // révélations one-time (mémoire)
  const revealRef = useRef<Map<string, RevealData>>(new Map());

  // map keyId -> docId (pour MAJ Firestore)
  const docIdByKeyIdRef = useRef<Map<string, string>>(new Map());
  // éviter spam d'updates expiration
  const expiryUpdatedRef = useRef<Set<string>>(new Set());

  const [newKeyData, setNewKeyData] = useState({
    name: '',
    type: 'test' as 'test' | 'production',
    clientSecret: ''
  });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🔒 verrou anti-double appel
  const creatingRef = useRef(false);

  // helper: récupère la révélation fiable (mémoire ou session)
  const getReveal = (keyId: string): RevealData | null => {
    if (revealRef.current.has(keyId)) {
      const data = revealRef.current.get(keyId)!;
      if (Date.now() - data.createdAt > 20000) { // 20s
        revealRef.current.delete(keyId);
        try { sessionStorage.removeItem(REVEAL_PREFIX + keyId); } catch {}
        return null;
      }
      return data;
    }
    const s = loadRevealFromSession(keyId);
    if (s) revealRef.current.set(keyId, s);
    return s;
  };

  // refresh expirations
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick(x => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // LISTE temps réel
  useEffect(() => {
    if (!user?.id) return;
    let off: Unsubscribe | null = null;
    try {
      const qCol = collection(firestore, 'users', user.id, 'apiKeys');
      const q = query(qCol, orderBy('createdAt', 'desc'));
      off = onSnapshot(q, (snap) => {
        const rows: ApiKey[] = snap.docs.map((d) => {
          const x: any = d.data();
          const keyId = x.keyId || d.id;
          docIdByKeyIdRef.current.set(keyId, d.id);

          // charge la révélation si disponible
          const reveal = getReveal(keyId);

          // si révélation dispo → force visible par défaut (sans cliquer)
          if (reveal) {
            setVisibleKeyIds(prev => (prev.has(keyId) ? prev : new Set(prev).add(keyId)));
            setVisibleSecretIds(prev => (prev.has(keyId) ? prev : new Set(prev).add(keyId)));
          }

          const expiresAtISO = toISO(x.expiresAt) || new Date(Date.now() + 3600_000).toISOString();
          const last4 = x.last4 || 'xxxx';

          return {
            id: keyId,
            name: x.label || x.name || 'Clé',
            key: reveal ? reveal.key : `kazadi-sk-************${last4}`,
            secret: reveal ? reveal.secret : '••••••••••••••••••••••••••••••••',
            type: (x.type as 'test' | 'production') || 'test',
            status: x.revokedAt ? 'revoked' : (isExpired(expiresAtISO) ? 'expired' : (x.status || 'active')),
            createdAt: toISO(x.createdAt),
            expiresAt: expiresAtISO,
            lastUsed: x.lastUsed ? toISO(x.lastUsed) : undefined,
            requestCount: x.requestCount || 0,
            last4
          };
        });
        setApiKeys(rows);
      });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur Firestore');
    }
    return () => { if (off) off(); };
  }, [user?.id]);

  // sync expiration -> Firestore
  useEffect(() => {
    (async () => {
      if (!user?.id || apiKeys.length === 0) return;
      for (const k of apiKeys) {
        if (k.status !== 'expired' && isExpired(k.expiresAt)) {
          const docId = docIdByKeyIdRef.current.get(k.id);
          if (!docId || expiryUpdatedRef.current.has(k.id)) continue;
          try {
            expiryUpdatedRef.current.add(k.id);
            await Promise.all([
              updateDoc(doc(firestore, 'users', user.id, 'apiKeys', docId), { status: 'expired' }),
              updateDoc(doc(firestore, 'apikeys', k.id), { status: 'expired' }),
            ]);
          } catch {
            expiryUpdatedRef.current.delete(k.id);
          }
        }
      }
    })();
  }, [apiKeys, user?.id]);

  // Stats
  const monthlyCreated = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return apiKeys.filter(k => new Date(k.createdAt) >= startOfMonth).length;
  }, [apiKeys]);
  const activeCount = useMemo(() => apiKeys.filter(k => k.status === 'active' && !isExpired(k.expiresAt)).length, [apiKeys]);

  // 👁️
  const toggleApiKeyVisibility = (id: string) => {
    const s = new Set(visibleKeyIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setVisibleKeyIds(s);
  };
  const toggleSecretVisibility = (id: string) => {
    const s = new Set(visibleSecretIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setVisibleSecretIds(s);
  };

  // ➕ Création
  const handleCreateKey = async () => {
    // 🔒 empêche tout double appel immédiat (double-clic, re-rendu)
    if (creatingRef.current) return;
    creatingRef.current = true;

    setErrorMsg(null);

    if (!user?.id || !user?.email) { setErrorMsg('Veuillez vous connecter (email requis).'); creatingRef.current = false; return; }
    if (newKeyData.type !== 'test') { setErrorMsg('Ici on ne crée que des clés TEST (validité 1h).'); creatingRef.current = false; return; }
    if (!newKeyData.clientSecret || newKeyData.clientSecret.trim().length < 6) {
      setErrorMsg('Le Client Secret est obligatoire (min 6 caractères).'); creatingRef.current = false; return;
    }
    if (monthlyCreated >= 3) { setErrorMsg('Quota atteint : 3 clés de test / mois.'); creatingRef.current = false; return; }

    try {
      setLoading(true);

      // 1) alias + token frais
      const aliasEmail = genAliasEmail();
      const password = await aliasPassword(user.id, aliasEmail);
      try { await railwayRegister(aliasEmail, password); } catch {}
      const lr = await railwayLogin(aliasEmail, password);
      const lj: any = await safeJson(lr);
      if (!lr.ok || !lj?.token) throw new Error(lj?.error || lj?.raw || `Login Railway a échoué (HTTP ${lr.status})`);
      const token = String(lj.token).trim();

      // 2) générer la clé (avec idempotence)
      const idem = (crypto.randomUUID?.() ?? (`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`));

      const { res } = await multiFetchKazadi('/api/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': aliasEmail,
          'x-idempotency-key': idem,
          'x-request-id': idem
        },
        body: JSON.stringify({
          clientSecret: newKeyData.clientSecret,
          email: aliasEmail
        })
      });
      const j: any = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || j?.raw || `HTTP ${res.status}`);

      const apiKeyPlain: string = j.apiKey || j.key || '';
      if (!apiKeyPlain || !apiKeyPlain.startsWith('kazadi-sk-')) throw new Error('Format de clé inattendu.');
      const keyId = j.keyId || randomId();
      const last4 = apiKeyPlain.slice(-4);

      // 3) Firestore meta
      const createdAtISO = new Date().toISOString();
      const expiresAtDate = new Date(Date.now() + 60 * 60 * 1000); // 1h
      const expiresAtTs = Timestamp.fromDate(expiresAtDate);
      const keyHash = await sha256Hex(apiKeyPlain);

      const payload = {
        keyId,
        label: newKeyData.name || 'Clé',
        type: 'test' as const,
        status: 'active' as const,
        last4,
        keyHash,
        userId: user.id,
        ownerEmail: user.email,
        aliasEmail,
        requestCount: 0,
        provider: 'kazadi-securepay',
        source: 'frontend',
        createdAt: serverTimestamp(),
        expiresAt: expiresAtTs,
        revokedAt: null as Timestamp | null
      };

      const userDocRef = await addDoc(collection(firestore, 'users', user.id, 'apiKeys'), payload);
      await setDoc(doc(firestore, 'apikeys', keyId), payload, { merge: true });
      docIdByKeyIdRef.current.set(keyId, userDocRef.id);

      // 4) one-time reveal — mémoire + session (pour affichage immédiat + copier)
      const revealData: RevealData = { key: apiKeyPlain, secret: newKeyData.clientSecret, createdAt: Date.now() };
      revealRef.current.set(keyId, revealData);
      saveRevealToSession(keyId, revealData);

      // 5) rendre visibles par défaut
      setVisibleKeyIds(prev => new Set(prev).add(keyId));
      setVisibleSecretIds(prev => new Set(prev).add(keyId));

      // 6) MAJ UI immédiate (au cas où le snapshot arrive lentement)
      setApiKeys(prev => [{
        id: keyId,
        name: newKeyData.name || 'Clé',
        key: apiKeyPlain,
        secret: newKeyData.clientSecret,
        type: 'test',
        status: 'active',
        createdAt: createdAtISO,
        expiresAt: expiresAtDate.toISOString(),
        requestCount: 0,
        last4
      }, ...prev]);

      setShowCreateModal(false);
      setNewKeyData({ name: '', type: 'test', clientSecret: '' });

      // Cache la clé après 20s
      setTimeout(() => {
        // Force un re-render pour que getReveal() soit appelé et nettoie la clé expirée
        forceTick(x => x + 1);
      }, 20100); // juste après l'expiration

    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
      creatingRef.current = false; // 🔓 libère le verrou
    }
  };

  // 🔒 Révocation
  const handleRevoke = async (k: ApiKey) => {
    if (!user?.id) { setErrorMsg('Veuillez vous connecter.'); return; }
    const docId = docIdByKeyIdRef.current.get(k.id);
    if (!docId) { setErrorMsg("Impossible de trouver le document Firestore de cette clé."); return; }
    try {
      await Promise.all([
        updateDoc(doc(firestore, 'users', user.id, 'apiKeys', docId), {
          status: 'revoked',
          revokedAt: serverTimestamp(),
        }),
        updateDoc(doc(firestore, 'apikeys', k.id), {
          status: 'revoked',
          revokedAt: serverTimestamp(),
        }),
      ]);
      revealRef.current.delete(k.id);
      try { sessionStorage.removeItem(REVEAL_PREFIX + k.id); } catch {}
      setVisibleKeyIds(prev => { const s = new Set(prev); s.delete(k.id); return s; });
      setVisibleSecretIds(prev => { const s = new Set(prev); s.delete(k.id); return s; });
      setApiKeys(prev => prev.map(it => it.id === k.id ? { ...it, status: 'revoked' } : it));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Révocation impossible');
    }
  };

  // UI utils
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      .format(new Date(iso));
  const getStatusColor = (status: string) =>
    status === 'active' ? 'text-green-400 bg-green-400/20'
      : status === 'expired' ? 'text-yellow-400 bg-yellow-400/20'
      : status === 'revoked' ? 'text-red-400 bg-red-400/20'
      : 'text-gray-400 bg-gray-400/20';
  const getTypeColor = (type: string) =>
    type === 'production' ? 'text-orange-400 bg-orange-400/20' : 'text-blue-400 bg-blue-400/20';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clés API</h1>
          <p className="text-blue-300">Gérez vos clés pour l’API Kazadi SecurePay</p>
          <p className="text-blue-300 text-sm mt-1">
            Test : validité <b>1h</b> • Limite <b>3 / mois</b> (par utilisateur)
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105 disabled:opacity-60"
            disabled={monthlyCreated >= 3}
            title={monthlyCreated >= 3 ? 'Quota mensuel atteint' : 'Créer une clé de test'}
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle clé</span>
          </button>
          <button className="flex items-center space-x-2 bg-white/10 text-blue-300 px-4 py-2 rounded-lg hover:bg-white/15 transition-all">
            <Download className="h-5 w-5" />
            <span>Collection Postman</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center space-x-3 mb-1">
            <Key className="h-6 w-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Clés</h3>
          </div>
          <div className="text-white text-2xl font-bold">
            {activeCount} <span className="text-sm font-normal text-blue-300">actives</span>
          </div>
          <div className="text-blue-300 text-xs mt-1">créées ce mois : <b>{monthlyCreated}</b></div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center space-x-3 mb-3">
            <RefreshCw className="h-6 w-6 text-teal-400" />
            <h3 className="text-lg font-semibold text-white">Requêtes Total</h3>
          </div>
          <span className="text-3xl font-bold text-white">{apiKeys.reduce((acc, k) => acc + k.requestCount, 0)}</span>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="h-6 w-6 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Sécurité</h3>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="text-white">Stockage hashé, révélation unique</span>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-3 mb-6 whitespace-pre-wrap">
          {errorMsg}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-4">
        {apiKeys.map((k) => {
          const reveal = getReveal(k.id);
          const canReveal = !!reveal;                    // vrai juste après création (ou tant que sessionStorage existe)
          const keyVisible = canReveal ? true : visibleKeyIds.has(k.id);        // visible auto si on a la révélation
          const secretVisible = canReveal ? true : visibleSecretIds.has(k.id);  // idem

          const displayKey = keyVisible
            ? (canReveal ? reveal!.key : maskKazadiKey(k.last4))
            : maskKazadiKey(k.last4);

          const displaySecret = secretVisible
            ? (canReveal ? reveal!.secret : '••••••••••••••••••••••••••••••••')
            : '••••••••••••••••••••••••••••••••';

          return (
            <div key={k.id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-teal-600 rounded-lg">
                    <Key className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{k.name}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(k.status)}`}>
                        {isExpired(k.expiresAt) ? 'Expirée' :
                          k.status === 'active' ? 'Active' :
                          k.status === 'revoked' ? 'Révoquée' : '—'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(k.type)}`}>
                        {k.type === 'production' ? 'Production' : 'Test'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRevoke(k)}
                    className="p-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Révoquer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* API KEY */}
                <div>
                  <label className="text-sm text-blue-300 mb-2 block">API Key</label>
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-3">
                    <code className="text-white font-mono text-sm flex-1">{displayKey}</code>
                    <button
                      onClick={() => {
                        if (canReveal) {
                          copyText(reveal!.key);
                        } else if (keyVisible) {
                          // visible mais masquée : on ne copie pas le masque
                        }
                      }}
                      className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                      title={canReveal ? 'Copier' : 'Copie indisponible (clé non révélable)'}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (canReveal) return; // quand révélée, toujours visible
                        const s = new Set(visibleKeyIds);
                        s.has(k.id) ? s.delete(k.id) : s.add(k.id);
                        setVisibleKeyIds(s);
                      }}
                      className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                      title={keyVisible ? 'Cacher la clé' : 'Afficher la clé (si révélable)'}
                    >
                      {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {canReveal && keyVisible && (
                    <p className="text-xs text-yellow-300 mt-1">
                      Copiez votre clé API. Elle ne sera plus visible dans 20 secondes.
                    </p>
                  )}
                </div>

                {/* CLIENT SECRET */}
                <div>
                  <label className="text-sm text-blue-300 mb-2 block">Client Secret</label>
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-3">
                    <code className="text-white font-mono text-sm flex-1">{displaySecret}</code>
                    <button
                      onClick={() => {
                        if (canReveal) {
                          copyText(reveal!.secret);
                        }
                      }}
                      className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                      title={canReveal ? 'Copier le secret' : 'Copie indisponible'}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (canReveal) return; // quand révélée, toujours visible
                        const s = new Set(visibleSecretIds);
                        s.has(k.id) ? s.delete(k.id) : s.add(k.id);
                        setVisibleSecretIds(s);
                      }}
                      className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                      title={secretVisible ? 'Cacher le secret' : 'Afficher le secret (si révélable)'}
                    >
                      {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {canReveal && secretVisible && (
                    <p className="text-xs text-yellow-300 mt-1">
                      Copiez votre Client Secret. Il ne sera plus visible dans 20 secondes.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-300">Créée le</span>
                  <p className="text-white font-medium">{formatDate(k.createdAt)}</p>
                </div>
                <div>
                  <span className="text-blue-300">Expire le</span>
                  <p className="text-white font-medium">{formatDate(k.expiresAt)}</p>
                </div>
                <div>
                  <span className="text-blue-300">Dernière utilisation</span>
                  <p className="text-white font-medium">{k.lastUsed ? formatDate(k.lastUsed) : 'Jamais'}</p>
                </div>
                <div>
                  <span className="text-blue-300">Requêtes</span>
                  <p className="text-white font-medium">{k.requestCount}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty */}
      {apiKeys.length === 0 && (
        <div className="text-center py-12">
          <Key className="h-16 w-16 text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucune clé API</h3>
          <p className="text-blue-300 mb-6">Créez votre première clé API de test (1h)</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105"
            disabled={monthlyCreated >= 3}
          >
            Créer ma première clé
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 w-full max-w-md border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Créer une nouvelle clé API</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">Nom de la clé</label>
                <input
                  type="text"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Ma Clé Test"
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">Type de clé</label>
                <select
                  value={newKeyData.type}
                  onChange={(e) => setNewKeyData({ ...newKeyData, type: e.target.value as 'test' | 'production' })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="test">Test (expire dans 1h)</option>
                  <option value="production" disabled>Production (désactivé ici)</option>
                </select>
              </div>

              <div className="mb-1">
                <label className="block text-blue-300 text-sm font-medium mb-2">Client Secret (obligatoire)</label>
                <input
                  type="password"
                  value={newKeyData.clientSecret}
                  onChange={(e) => setNewKeyData({ ...newKeyData, clientSecret: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                  placeholder="Ex: MonSecretClient456"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <p className="text-yellow-300 text-sm">
                    Clé et secret visibles pour <b>20 secondes</b> après création. Copiez-les immédiatement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleCreateKey}
                className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105 disabled:opacity-60"
                disabled={loading || creatingRef.current}
                aria-busy={loading || creatingRef.current}
              >
                {loading ? 'Création…' : 'Créer la clé'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-white/10 text-blue-300 py-3 rounded-lg hover:bg-white/15 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
