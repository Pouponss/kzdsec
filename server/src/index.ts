import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import crypto from "crypto";
import { db } from "./firebaseAdmin.js";

const {
  PORT = "8080",
  KAZADI_BASE_URL = "https://kazadi-securepay-api-production.up.railway.app",
  FRONT_ORIGIN = "http://localhost:3000"
} = process.env;

const app = express();
app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));
app.use(express.json());

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

/**
 * GET /api/keys/list?projectId=...
 * -> Liste les clés stockées dans Firestore (hashées, jamais en clair)
 */
app.get("/api/keys/list", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const qs = await db
      .collection("projects")
      .doc(String(projectId))
      .collection("api_keys")
      .orderBy("createdAt", "desc")
      .get();

    const keys = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ keys });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

/**
 * POST /api/keys/create
 * body: { projectId, label?, scopes?, clientSecret }
 * headers: { Authorization: Bearer <JWT Railway> }
 *
 * - Vérifie quota: max 3 clés TEST par mois (UI + serveur)
 * - Crée une clé via KAZADI_BASE_URL /api/generate-key (avec Authorization) 
 * - Stocke hash + last4 dans Firestore + un doc éphémère pour révélation one-shot
 * - Ajoute metadata: type='test', expiresAt = now + 1h
 */
app.post("/api/keys/create", async (req, res) => {
  try {
    const bearer = req.headers.authorization;
    if (!bearer) return res.status(401).json({ error: "Unauthorized" });

    const { projectId, label, scopes, clientSecret } = req.body || {};
    if (!projectId || !clientSecret) {
      return res.status(400).json({ error: "projectId & clientSecret required" });
    }

    // --- Quota 3 clés "test" par mois (serveur) ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const qs = await db
      .collection("projects")
      .doc(projectId)
      .collection("api_keys")
      .where("type", "==", "test") // on stocke ce champ ci-dessous
      .where("createdAt", ">=", startOfMonth)
      .get();

    if (qs.size >= 3) {
      return res.status(429).json({ error: "Monthly test key quota reached (3)." });
    }

    // --- Appel API Railway pour générer la clé ---
    const r = await fetch(`${KAZADI_BASE_URL}/api/generate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": bearer },
      body: JSON.stringify({ clientSecret })
    });

    const txt = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "Kazadi API error", detail: txt });

    let payload: any = {};
    try { payload = JSON.parse(txt); } catch { /* non-json fallback */ }

    const { keyId, apiKey, last4, createdAt } = payload;
    if (!apiKey) return res.status(500).json({ error: "No key returned" });

    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");
    const id = keyId || crypto.randomUUID();

    const createdAtDate = createdAt ? new Date(createdAt) : new Date();
    const expiresAtDate = new Date(Date.now() + 60 * 60 * 1000); // +1h

    // --- Stockage Firestore (hash + meta) ---
    await db.collection("projects").doc(projectId).collection("api_keys").doc(id).set({
      label: label || "",
      hashedKey,
      last4: last4 || apiKey.slice(-4),
      createdAt: createdAtDate,
      scopes: scopes || [],
      type: "test",           // important pour le quota
      expiresAt: expiresAtDate
    }, { merge: true });

    // --- Stockage éphémère pour révélation one-shot ---
    await db.collection("key_reveals").doc(id).set({
      plaintext: apiKey,
      projectId,
      createdAt: new Date()
    });

    res.status(201).json({ keyId: id, last4: last4 || apiKey.slice(-4) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

/**
 * POST /api/keys/reveal
 * body: { keyId }
 * -> renvoie { apiKey } une seule fois (doc supprimé ensuite)
 */
app.post("/api/keys/reveal", async (req, res) => {
  try {
    const { keyId } = req.body || {};
    if (!keyId) return res.status(400).json({ error: "keyId required" });

    const snap = await db.collection("key_reveals").doc(keyId).get();
    if (!snap.exists) return res.status(404).json({ error: "Not found or already revealed" });

    const { plaintext, createdAt } = snap.data() as any;
    await db.collection("key_reveals").doc(keyId).delete();

    const ts = createdAt?.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime();
    if (Date.now() - ts > 15 * 60 * 1000) {
      return res.status(410).json({ error: "Reveal expired" });
    }

    res.json({ apiKey: plaintext });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

// (optionnel) révocation si tu ajoutes l'endpoint côté Railway
// app.post("/api/keys/revoke", async (req, res) => { ... });

app.listen(Number(PORT), () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
