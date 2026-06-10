module.exports = function requireRole(role){
  return function(req,res,next){
    try{
      if(!req.user) return res.status(401).json({ error: 'authentication required' });
      if(req.user.role && req.user.role === role) return next();
      // jwt payload may not include role; fetch from DB would be safer — but we support role in token
      return res.status(403).json({ error: 'insufficient privileges' });
    }catch(e){ return res.status(500).json({ error: 'server error' }); }
  }
}
