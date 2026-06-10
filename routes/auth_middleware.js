const jwt = require('jsonwebtoken');
const COOKIE_NAME = process.env.COOKIE_NAME || 'crusher_auth';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';

module.exports = function authMiddleware(req, res, next){
  try{
    let token = null;
    if(req.cookies && req.cookies[COOKIE_NAME]) token = req.cookies[COOKIE_NAME];
    if(!token){
      const h = req.get('authorization') || req.get('Authorization') || '';
      if(h.toLowerCase().startsWith('bearer ')) token = h.split(' ')[1];
    }
    if(!token) return res.status(401).json({ error: 'authentication required' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){ return res.status(401).json({ error: 'invalid or expired token' }); }
};
