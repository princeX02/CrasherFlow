const { Pool } = require('pg');

// Default to Postgres-only adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING });

module.exports = {
  type: 'pg',
  // convert '?' placeholders to $1, $2... for Postgres compatibility
  _convert(sql){ if(!/\?/.test(sql)) return sql; let i = 0; return sql.replace(/\?/g, ()=>`$${++i}`); },
  async run(sql, params=[]){
    sql = this._convert(sql);
    const isInsert = /^\s*INSERT/i.test(sql);
    if(isInsert && !/RETURNING\s+/i.test(sql)) sql = sql + ' RETURNING id';
    const r = await pool.query(sql, params);
    return { lastID: r.rows && r.rows[0] && (r.rows[0].id || r.rows[0].lastid), rowCount: r.rowCount };
  },
  async all(sql, params=[]){ sql = this._convert(sql); const r = await pool.query(sql, params); return r.rows; },
  async get(sql, params=[]){ sql = this._convert(sql); const r = await pool.query(sql, params); return r.rows[0]; },
  async init(){
    await pool.query(`CREATE TABLE IF NOT EXISTS vehicles (id SERIAL PRIMARY KEY, num TEXT UNIQUE, driver TEXT, type TEXT, phone TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS trips (id SERIAL PRIMARY KEY, vehicleId INTEGER, vehicleNum TEXT, driver TEXT, date TEXT, material TEXT, cft INTEGER, rate REAL, amount REAL, loadTime TEXT, dumpTime TEXT, source TEXT, dest TEXT, note TEXT)`);
    const v = await pool.query('SELECT COUNT(*)::int as c FROM vehicles');
    if(v.rows[0].c === 0){
      const seed = [
        ['BA 12 PA 1234','Ram Bahadur','Tipper','9841001234'],
        ['GA 1 JA 5678','Hari Prasad','Truck','9851005678'],
        ['BA 3 CHA 9999','Sita Devi','Mini Tipper','9860009999'],
        ['JA 2 KA 4321','Bikram Thapa','Dumper','9812004321']
      ];
      for(const s of seed) await pool.query('INSERT INTO vehicles(num,driver,type,phone) VALUES($1,$2,$3,$4)', s);
    }
    const t = await pool.query('SELECT COUNT(*)::int as c FROM trips');
    if(t.rows[0].c === 0){
      const mats = ['Sand','Rock','Aggregate','Miscuts'];
      const rates = {Sand:180,Rock:220,Aggregate:200,Miscuts:150};
      const srcs = ['Crusher A','Crusher B','Quarry 1'];
      const dsts = ['Site 1','Site 2','Kathmandu'];
      for(let i=0;i<30;i++){
        const mat = mats[Math.floor(Math.random()*mats.length)];
        const cft = Math.floor(Math.random()*45+25);
        const rate = rates[mat];
        const vnum = ['BA 12 PA 1234','GA 1 JA 5678','BA 3 CHA 9999','JA 2 KA 4321'][Math.floor(Math.random()*4)];
        const drv = vnum==='BA 12 PA 1234' ? 'Ram Bahadur' : vnum==='GA 1 JA 5678' ? 'Hari Prasad' : vnum==='BA 3 CHA 9999' ? 'Sita Devi' : 'Bikram Thapa';
        const d = new Date(); d.setDate(d.getDate()-Math.floor(Math.random()*20));
        await pool.query('INSERT INTO trips(vehicleId,vehicleNum,driver,date,material,cft,rate,amount,loadTime,dumpTime,source,dest,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [1,vnum,drv,d.toISOString().split('T')[0],mat,cft,rate,cft*rate,'07:30','08:30',srcs[Math.floor(Math.random()*srcs.length)],dsts[Math.floor(Math.random()*dsts.length)],'']);
      }
    }
  }
};
