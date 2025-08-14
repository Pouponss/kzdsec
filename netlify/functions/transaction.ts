// netlify/functions/transaction.ts
import type { Handler } from '@netlify/functions';
import crypto from 'crypto';
import admin from 'firebase-admin';

// --- Initialisation Firebase Admin à partir d'une variable d'env ---
// Dans Netlify, tu vas définir FIREBASE_SERVICE_ACCOUNT_JSON (contenu JSON complet du compte de service)
if (!admin.apps.length) {
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!svcJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON manquant dans les variables Netlify');
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(svcJson)),
  });
}
const db = admin.firestore();

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function toDateAny(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 1) En-têtes
    const h = event.headers || {};
    const apiKey = String(h['x-api-key'] ?? h['X-Api-Key'] ?? '');
    const clientSecret = String(h['x-client-secret'] ?? h['X-Client-Secret'] ?? '');
    const idem = String(h['x-idempotency-key'] ?? h['X-Idempotency-Key'] ?? '');
    const reqId = String(h['x-request-id'] ?? h['X-Request-Id'] ?? '');

    if (!apiKey || !clientSecret) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing x-api-key or x-client-secret' }),
      };
    }

    // 2) Recherche de la clé par hash
    const keyHash = sha256Hex(apiKey);
    const snap = await db.collection('apikeys').where('keyHash', '==', keyHash).limit(1).get();
    if (snap.empty) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid API key' }),
      };
    }
    const doc = snap.docs[0];
    const key: any = doc.data();

    // 3) Validation secret (si stocké – sinon supprime ce bloc)
    if (key.clientSecret && key.clientSecret !== clientSecret) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid client secret' }),
      };
    }

    // 4) Expiration / révocation
    const now = new Date();
    const expiresAt = toDateAny(key.expiresAt);
    if (key.status === 'revoked') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key revoked' }),
      };
    }
    if (key.type === 'test' && expiresAt && expiresAt <= now) {
      // Optionnel : synchro de statut
      await doc.ref.update({ status: 'expired' }).catch(() => {});
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key expired' }),
      };
    }

    // 5) Proxy vers Railway
    const upstream = 'https://kazadi-securepay-api-production.up.railway.app/api/transaction';
    const upstreamRes = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Relais d’identifiants côté serveur si tu veux
        'x-request-id': reqId,
        'x-idempotency-key': idem,
      },
      body: event.body || '{}',
    });

    const text = await upstreamRes.text();
    const ct = upstreamRes.headers.get('content-type') || 'application/json';

    // 6) Tracking usage (non bloquant)
    await doc.ref.update({
      requestCount: admin.firestore.FieldValue.increment(1),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    return {
      statusCode: upstreamRes.status,
      headers: { 'Content-Type': ct },
      body: text,
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e?.message || 'Internal error' }),
    };
  }
};
