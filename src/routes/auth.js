const crypto = require('crypto');
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COOKIE = 'weft_session';
const SECRET = process.env.AUTH_SECRET || 'development-only-change-this-secret-before-deploying';
function hash(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({ id: String(user._id), email: user.email, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function safeUser(user) { return { name: user.name, email: user.email }; }
function setCookie(res, token) { res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
function readToken(req) {
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!raw) return null;
  const token = raw.slice(COOKIE.length + 1), parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(parts[0]).digest();
  let actual; try { actual = Buffer.from(parts[1], 'base64url'); } catch (_) { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try { const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch (_) { return null; }
}
router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter your name (2–80 characters).' });
    if (!EMAIL_RE.test(email) || email.length > 120) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const user = await User.create({ name, email, passwordSalt: salt, passwordHash: hash(password, salt) });
    setCookie(res, tokenFor(user)); res.status(201).json({ user: safeUser(user) });
  } catch (err) { if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' }); next(err); }
});
router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email });
    const candidate = user ? hash(password, user.passwordSalt) : hash(password || 'invalid-password', 'fixed-invalid-salt');
    if (!user || !crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    setCookie(res, tokenFor(user)); res.json({ user: safeUser(user) });
  } catch (err) { next(err); }
});
router.get('/me', async (req, res, next) => {
  try { const token = readToken(req); if (!token) return res.json({ user: null }); const user = await User.findById(token.id).select('name email'); res.json({ user: user ? safeUser(user) : null }); }
  catch (err) { next(err); }
});
router.post('/logout', (req, res) => { res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); res.json({ ok: true }); });
module.exports = router;
