// src/pages/Sandbox.tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  Play,
  Code,
  Settings,
  RefreshCw,
  Copy,
  CheckCircle,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

/* =========================
   Types
   ========================= */
interface ApiResponse {
  status?: string;
  transactionId?: string;
  cvk?: string;
  encryptedData?: string;
  message?: string;
  error?: string;
  debug?: {
    cardMasked?: string;
    processingTime?: string;
  };
  // On ajoute un champ client pour l'affichage
  _httpStatus?: number;
  _rawText?: string;
}

/* =========================
   Helpers
   ========================= */
const FRONT_BASES = [
  // passe par proxy Netlify/Vite (préfixe /kazadi)
  '/kazadi',
  // fallback direct Railway (si besoin)
  'https://kazadi-securepay-api-production.up.railway.app'
];

function buildUrls(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return FRONT_BASES.map((b) => `${b.replace(/\/+$/, '')}${p}`);
}

function maskCard(n: string) {
  const clean = (n || '').replace(/\s+/g, '');
  if (clean.length < 8) return clean.replace(/\d/g, '•');
  const head = clean.slice(0, 6);
  const tail = clean.slice(-4);
  return `${head}${'•'.repeat(Math.max(0, clean.length - 10))}${tail}`;
}

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const txt = await res.text();
  if (!txt) return {};
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(txt);
    } catch {
      /* ignore */
    }
  }
  return { __nonJson: true, raw: txt };
}

function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  } catch {}
  // fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {}
}

/* =========================
   Composant
   ========================= */
export default function Sandbox() {
  // Formulaire
  const [formData, setFormData] = useState({
    deviceId: 'sandbox-device-' + Math.random().toString(36).slice(2, 10),
    cardNumber: '',
    cvv: '',
    amount: '',
    apiKey: '',
    clientSecret: ''
  });

  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showCardSensitive, setShowCardSensitive] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  // 🔒 verrou anti-double envoi
  const sendingRef = useRef(false);

  // Payload calculé (mémo pour l’aperçu)
  const requestPayload = useMemo(() => {
    const amt = parseFloat(formData.amount || '0');
    return {
      timestamp: Math.floor(Date.now() / 1000),
      deviceId: formData.deviceId.trim(),
      cardNumber: formData.cardNumber.trim(),
      cvv: formData.cvv.trim(),
      amount: isNaN(amt) ? 0 : amt,
      nonce: 'test-nonce-' + Date.now()
    };
  }, [formData.deviceId, formData.cardNumber, formData.cvv, formData.amount]);

  // cURL prévisualisation (format demandé)
  const curlPreview = useMemo(() => {
    const TS = requestPayload.timestamp;
    const num = requestPayload.cardNumber || 'xxx';
    const cvv = requestPayload.cvv || 'xxx';
    const amt = (requestPayload.amount || 0) || 'xxx';
    const did = requestPayload.deviceId || 'xxx';
    const apiKey = formData.apiKey || 'xxx';
    const clientSecret = formData.clientSecret || 'xxx';

    return [
      '# Transaction',
      'TS=$(date +%s)',
      '',
      'curl -X POST https://kazadi-securepay-api-production.up.railway.app/api/transaction \\',
      '  -H "Content-Type: application/json" \\',
      `  -H "x-api-key: ${apiKey}" \\`,
      `  -H "x-client-secret: ${clientSecret}" \\`,
      "  -d '{",
      `    "timestamp": ${TS},`,
      `    "deviceId": "${did}",`,
      `    "cardNumber": "${num}",`,
      `    "cvv": "${cvv}",`,
      `    "amount": ${amt},`,
      `    "nonce": "test-nonce-001"`,
      "  }'"
    ].join('\n');
  }, [requestPayload, formData.apiKey, formData.clientSecret]);

  // Cartes de test
  const generateRandomCard = () => {
    const testCards = [
      { number: '4242424242424242', cvv: '123', type: 'Visa' },
      { number: '5555555555554444', cvv: '456', type: 'Mastercard' },
      { number: '378282246310005', cvv: '789', type: 'American Express' },
      { number: '6011111111111117', cvv: '321', type: 'Discover' },
      { number: '4000000000000002', cvv: '111', type: 'Declined' }
    ];
    const randomCard = testCards[Math.floor(Math.random() * testCards.length)];
    setFormData((prev) => ({
      ...prev,
      cardNumber: randomCard.number,
      cvv: randomCard.cvv
    }));
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingRef.current) return;
    sendingRef.current = true;

    setIsLoading(true);
    setShowResponse(false);

    // validations simples
    if (!formData.apiKey.trim() || !formData.clientSecret.trim()) {
      setResponse({
        status: 'error',
        message: 'API Key et Client Secret sont requis.',
        _httpStatus: 0
      });
      setShowResponse(true);
      setIsLoading(false);
      sendingRef.current = false;
      return;
    }
    if (!requestPayload.deviceId || !requestPayload.cardNumber || !requestPayload.cvv || !requestPayload.amount) {
      setResponse({
        status: 'error',
        message: 'Tous les champs transaction (deviceId, cardNumber, cvv, amount) sont requis.',
        _httpStatus: 0
      });
      setShowResponse(true);
      setIsLoading(false);
      sendingRef.current = false;
      return;
    }

    // idempotence
    const idem = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

    // mesure temps
    const t0 = performance.now();

    try {
      let lastErr: any = null;
      // On tente via proxy puis fallback
      for (const url of buildUrls('/api/transaction')) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': formData.apiKey.trim(),
              'x-client-secret': formData.clientSecret.trim(),
              'x-idempotency-key': idem,
              'x-request-id': idem
            },
            body: JSON.stringify(requestPayload)
          });

          const elapsed = performance.now() - t0;
          const body = await safeJson(res);

          if (res.ok) {
            const ok: ApiResponse = {
              ...(body || {}),
              _httpStatus: res.status
            };
            // Ajouter un champ debug si absent
            if (!ok.debug) ok.debug = {};
            if (ok.debug && !ok.debug.processingTime) {
              ok.debug.processingTime = `${Math.round(elapsed)} ms`;
            }
            if (ok.debug && !ok.debug.cardMasked) {
              ok.debug.cardMasked = maskCard(requestPayload.cardNumber);
            }
            setResponse(ok);
            setShowResponse(true);
            setIsLoading(false);
            sendingRef.current = false;
            return;
          } else {
            const err: ApiResponse = {
              status: 'error',
              message: (body as any)?.message || (body as any)?.error || (body as any)?.raw || 'Erreur API',
              _httpStatus: res.status,
              _rawText: (body as any)?.raw
            };
            // on continue sur la prochaine base seulement pour erreurs réseau,
            // mais si 4xx/5xx c'est sans doute côté serveur -> on affiche direct
            setResponse(err);
            setShowResponse(true);
            setIsLoading(false);
            sendingRef.current = false;
            return;
          }
        } catch (e) {
          lastErr = e;
          // essaie la base suivante
        }
      }
      // Si on arrive ici, erreurs réseau sur toutes les bases
      throw lastErr || new Error('Impossible de contacter le serveur');
    } catch (e: any) {
      const elapsed = performance.now() - t0;
      setResponse({
        status: 'error',
        message: e?.message || 'Erreur réseau',
        _httpStatus: 0,
        debug: { processingTime: `${Math.round(elapsed)} ms`, cardMasked: maskCard(requestPayload.cardNumber) }
      });
      setShowResponse(true);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">API Sandbox</h1>
        <p className="text-blue-300">
          Testez l&apos;API KZD SecurePay en temps réel avec des données de test sécurisées
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Request Panel */}
        <div className="space-y-6">
          {/* Carte de test + mode */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Test de Transaction</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={generateRandomCard}
                  type="button"
                  className="flex items-center space-x-2 bg-white/10 text-blue-300 px-3 py-2 rounded-lg hover:bg-white/15 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Carte aléatoire</span>
                </button>
                <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg text-sm">
                  Mode Sandbox
                </div>
              </div>
            </div>

            {/* Identifiants API */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">API Key (x-api-key)</label>
                <div className="relative">
                  <input
                    type={showCreds ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 pr-12"
                    placeholder="kzd-***********************************1234"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreds((v) => !v)}
                    className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                  >
                    {showCreds ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">Client Secret (x-client-secret)</label>
                <div className="relative">
                  <input
                    type={showCreds ? 'text' : 'password'}
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 pr-12"
                    placeholder="Votre secret client"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreds((v) => !v)}
                    className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                  >
                    {showCreds ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Formulaire transaction */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">
                  Device ID (réel recommandé)
                </label>
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                  placeholder="Identifiant unique du device"
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">
                  Numéro de carte
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 pr-12"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCardSensitive((v) => !v)}
                    className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                  >
                    {showCardSensitive ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.cardNumber && (
                  <p className="text-blue-300 text-xs mt-1">
                    Masqué: <code className="text-white">{maskCard(formData.cardNumber)}</code>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-300 text-sm font-medium mb-2">
                    CVV
                  </label>
                  <input
                    type={showCardSensitive ? 'text' : 'password'}
                    value={formData.cvv}
                    onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                    placeholder="123"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-blue-300 text-sm font-medium mb-2">
                    Montant (CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                    placeholder="99.99"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || sendingRef.current}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isLoading || sendingRef.current}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Traitement...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Traiter la transaction</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Request Preview (JSON) */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Payload de la requête</h3>
              <button
                onClick={() => copyText(JSON.stringify(requestPayload, null, 2))}
                className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copier</span>
              </button>
            </div>
            <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
              <code className="text-green-300 text-sm">
                {JSON.stringify(requestPayload, null, 2)}
              </code>
            </pre>
          </div>

          {/* cURL Preview */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">cURL (copier/coller)</h3>
              <button
                onClick={() => copyText(curlPreview)}
                className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copier</span>
              </button>
            </div>
            <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
              <code className="text-green-300 text-sm">
{curlPreview}
              </code>
            </pre>
          </div>
        </div>

        {/* Response Panel */}
        <div className="space-y-6">
          {/* Test Cards Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Cartes de test</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Visa</span>
                  <code className="block text-blue-300 text-sm">4242424242424242</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Mastercard</span>
                  <code className="block text-blue-300 text-sm">5555555555554444</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Amex</span>
                  <code className="block text-blue-300 text-sm">378282246310005</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Test Declined</span>
                  <code className="block text-blue-300 text-sm">4000000000000002</code>
                </div>
                <span className="text-red-400 text-sm">Refusé</span>
              </div>
            </div>
          </div>

          {/* Response */}
          {showResponse && response && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">Réponse de l&apos;API</h3>
                  <div className="flex items-center space-x-2">
                    {response._httpStatus && response._httpStatus >= 200 && response._httpStatus < 300 ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-green-400 text-sm">{response._httpStatus} OK</span>
                      </>
                    ) : (
                      <>
                        <Code className="h-5 w-5 text-red-400" />
                        <span className="text-red-400 text-sm">{response._httpStatus || '—'}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => copyText(JSON.stringify(response, null, 2))}
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">Copier</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Transaction ID</span>
                    </div>
                    <code className="text-white text-sm">{response.transactionId || '—'}</code>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">Temps de traitement</span>
                    </div>
                    <span className="text-white text-sm">{response.debug?.processingTime || '—'}</span>
                  </div>
                </div>

                {/* Full Response */}
                <div>
                  <h4 className="text-white font-medium mb-2">Réponse complète</h4>
                  <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                    <code className="text-green-300 text-sm">
                      {JSON.stringify(response, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!showResponse && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
              <Code className="h-12 w-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Réponse API</h3>
              <p className="text-blue-300">
                La réponse de l&apos;API apparaîtra ici après l&apos;envoi de votre requête
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <Settings className="h-6 w-6 text-blue-400 mt-1" />
          <div>
            <h4 className="text-white font-medium mb-2">À propos du mode Sandbox</h4>
            <p className="text-blue-300 text-sm mb-2">
              Le mode Sandbox utilise des données de test et ne traite aucune transaction réelle.
              Les en-têtes <code className="text-white">x-api-key</code> et <code className="text-white">x-client-secret</code> doivent être
              fournis pour simuler l’authentification côté serveur.
            </p>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Les numéros de carte de test fonctionnent uniquement ici</li>
              <li>• Aucune donnée sensible n&apos;est stockée</li>
              <li>• Les réponses incluent des données de debug (temps de traitement, carte masquée)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
