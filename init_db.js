
const db = require('./db/adapter');

(async ()=>{
  try{
    await db.init();
    console.log('Database initialized via adapter.');
  }catch(e){
    console.error('DB init error:', e);
    process.exit(1);
  }
})();
