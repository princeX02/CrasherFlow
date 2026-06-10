require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db/adapter');

async function run(){
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || null;
  if(!pass){ console.error('ADMIN_PASS is required'); process.exit(2); }
  const hash = await bcrypt.hash(pass, 12);
  try{
    await db.init();
    const existing = await db.get('SELECT id FROM users WHERE username=$1',[user]);
    if(existing){
      console.log('Admin already exists'); process.exit(0);
    }
    await db.run('INSERT INTO users(username,password_hash,role) VALUES($1,$2,$3)', [user,hash,'admin']);
    console.log('Admin user created:', user);
    process.exit(0);
  }catch(e){ console.error('Failed to create admin', e); process.exit(1); }
}
run();
