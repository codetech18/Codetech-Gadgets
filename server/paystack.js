import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const publicKey = () => process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_88fd7308a30545a02677b8c78565e00957d6c2b1';
export function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  const mode = publicKey().startsWith('pk_test_') ? 'test' : 'live';
  if (!key?.startsWith(`sk_${mode}_`)) throw new Error('Payment configuration is incomplete.');
  return key;
}

export function adminApp() {
  const existing = getApps().find(app => app.name === 'payments');
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey || (process.env.VITE_FIREBASE_PROJECT_ID && projectId !== process.env.VITE_FIREBASE_PROJECT_ID)) throw new Error('Order storage is not configured.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, 'payments');
}
export const database = () => getFirestore(adminApp());
export function checkoutReady() {
  try { secretKey(); adminApp(); return true; }
  catch { return false; }
}
export const receiptHash = token => createHash('sha256').update(token).digest('hex');
export function validReceipt(token, expected) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) || typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  return timingSafeEqual(Buffer.from(receiptHash(token), 'hex'), Buffer.from(expected, 'hex'));
}
export function validSignature(raw, signature, key) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const hash = createHmac('sha512', key).update(raw).digest();
  return timingSafeEqual(hash, Buffer.from(signature, 'hex'));
}
export async function paystack(path, body) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.status !== true || !result.data) throw new Error('Paystack is temporarily unavailable.');
  return result.data;
}
export async function requireAdmin(request) {
  const bearer = request.headers.authorization;
  if (!bearer?.startsWith('Bearer ')) throw Object.assign(new Error('Sign in to manage orders.'), { status: 401 });
  const user = await getAuth(adminApp()).verifyIdToken(bearer.slice(7), true);
  if (user.email !== 'codetech1807@gmail.com' || user.email_verified !== true) throw Object.assign(new Error('Admin access required.'), { status: 403 });
  return user;
}
export function json(response, status, body) {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex');
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
export async function readBody(request, maxBytes = 32768) {
  // Vercel restores buffered bytes through data/end listeners, not readable events.
  // Avoid its parsed body getter: webhook HMAC must cover the original bytes.
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, settled = false;
    request.on('data', chunk => {
      if (settled) return;
      const buffer = Buffer.from(chunk); size += buffer.length;
      if (size > maxBytes) { settled = true; chunks.length = 0; reject(Object.assign(new Error('Request too large.'), { status: 413 })); }
      else chunks.push(buffer);
    });
    request.on('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks)); } });
    const fail = () => { if (!settled) { settled = true; reject(Object.assign(new Error('Incomplete request.'), { status: 400 })); } };
    request.on('error', fail); request.on('aborted', fail);
  });
}

export async function limitCheckout(db, ip, now = Date.now()) {
  const window = Math.floor(now / 600000);
  const id = createHmac('sha256', secretKey()).update(`${ip}:${window}`).digest('hex');
  const ref = db.collection('paymentRateLimits').doc(id);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref), count = snapshot.exists ? snapshot.data().count : 0;
    if (count >= 20) throw Object.assign(new Error('Too many checkout attempts. Wait a few minutes or contact CodeTech.'), { status: 429 });
    transaction.set(ref, { count: count + 1, expiresAt: new Date(now + 86400000) });
  });
}
