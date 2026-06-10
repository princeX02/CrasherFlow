const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/adapter');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';
const COOKIE_NAME = process.env.COOKIE_NAME || 'crusher_auth';

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  try{
    const existing = await db.get('SELECT id FROM users WHERE username = $1', [username]);
    if(existing) return res.status(400).json({ error: 'username taken' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.run('INSERT INTO users(username,password_hash) VALUES($1,$2)', [username, hash]);
    const id = r.lastID || r.rowCount;
    res.json({ ok:true, id });
  }catch(e){ res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  try{
    const user = await db.get('SELECT id, password_hash FROM users WHERE username = $1', [username]);
    if(!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok:true });
});

router.get('/me', (req, res) => {
  try{
    const token = (req.cookies && req.cookies[COOKIE_NAME]) || ((req.get('authorization')||'').split(' ')[1]);
    if(!token) return res.json({ user: null });
    const p = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: p.sub, username: p.username } });
  }catch(e){ res.status(401).json({ error: 'invalid token' }); }
});

module.exports = router;
