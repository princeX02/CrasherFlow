require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const winston = require('winston');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Ensure CORS preflight is handled for all routes (helps prevent 405 on OPTIONS)
app.options('*', cors());

// Setup logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

// Security and rate limiting
app.use(helmet());
app.enable('trust proxy');
const limiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use(limiter);

// Simple request logger for /api
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api')) {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

const db = require('./db/adapter');
const auth = require('./routes/auth_middleware');

app.use(cookieParser());
app.use('/api/auth', authRouter);

// Basic health
app.get('/api/ping', (req,res)=>res.json({ok:true, now: new Date().toISOString()}));

// Vehicles
app.get('/api/vehicles', async (req,res)=>{
  try{ const rows = await db.all('SELECT * FROM vehicles ORDER BY id'); res.json(rows); }catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/vehicles', auth, async (req,res)=>{
  const {num, driver, type, phone} = req.body;
  if(!num||!driver) return res.status(400).json({error:'num and driver required'});
  try{
    // normalize and check duplicates (case-insensitive, trim)
    const existing = await db.get('SELECT id FROM vehicles WHERE LOWER(TRIM(num)) = LOWER(TRIM(?))',[num]);
    if(existing && existing.id){
      return res.status(400).json({error:'Vehicle already registered'});
    }
    const r = await db.run('INSERT INTO vehicles(num,driver,type,phone) VALUES(?,?,?,?)',[num,driver,type||'',phone||'']);
    const id = r.lastID;
    const v = await db.all('SELECT * FROM vehicles WHERE id=?',[id]);
    res.json(v[0]);
  }catch(e){
    const msg = (e && e.message) ? e.message.toLowerCase() : '';
    if(msg.includes('unique') || msg.includes('duplicate') || msg.includes('unique constraint failed')){
      return res.status(400).json({error:'Vehicle already registered'});
    }
    res.status(500).json({error:e.message});
  }
});
app.delete('/api/vehicles/:id', auth, async (req,res)=>{
  try{ await db.run('DELETE FROM trips WHERE vehicleId=?',[req.params.id]); await db.run('DELETE FROM vehicles WHERE id=?',[req.params.id]); res.json({ok:true}); }catch(e){res.status(500).json({error:e.message});}
});

// Trips
app.get('/api/trips', async (req,res)=>{
  try{ const rows = await db.all('SELECT * FROM trips ORDER BY date DESC'); res.json(rows); }catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/trips', auth, async (req,res)=>{
  const t = req.body;
  if(!t.vehicleId||!t.date||!t.material||!t.cft||!t.rate) return res.status(400).json({error:'required fields missing'});
  try{
    let vehicleNum = t.vehicleNum || '';
    let driver = t.driver || '';
    if(!vehicleNum || !driver){
      const vv = await db.get('SELECT num, driver FROM vehicles WHERE id=?',[t.vehicleId]);
      if(vv){
        vehicleNum = vehicleNum || vv.num || '';
        driver = driver || vv.driver || '';
      }
    }
    const r = await db.run(
      `INSERT INTO trips(vehicleId,vehicleNum,driver,date,material,cft,rate,amount,loadTime,dumpTime,source,dest,note)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [t.vehicleId,vehicleNum,driver,t.date,t.material,t.cft,t.rate,Math.round(t.cft*t.rate),t.loadTime||'',t.dumpTime||'',t.source||'',t.dest||'',t.note||'']
    );
    const id = r.lastID;
    const row = await db.all('SELECT * FROM trips WHERE id=?',[id]);
    res.json(row[0]);
  }catch(e){res.status(500).json({error:e.message});}
});
app.delete('/api/trips/:id', auth, async (req,res)=>{
  try{ await db.run('DELETE FROM trips WHERE id=?',[req.params.id]); res.json({ok:true}); }catch(e){res.status(500).json({error:e.message});}
});

// Simple export
const requireRole = require('./routes/require_role');

app.get('/api/export.csv', auth, requireRole('admin'), async (req,res)=>{
  try{
    const rows = await db.all('SELECT * FROM trips ORDER BY date DESC');
    const header = ['#','date','vehicleNum','driver','material','cft','rate','amount','loadTime','dumpTime','source','dest','note'];
    const csv = [header.join(',')].concat(rows.map((r,i)=>[
      i+1,r.date,r.vehicleNum,r.driver,r.material,r.cft,r.rate,r.amount,r.loadTime,r.dumpTime,r.source,r.dest, (r.note||'')
    ].map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','))).join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="crusher_trips.csv"');
    res.send(csv);
  }catch(e){res.status(500).json({error:e.message});}
});

// Serve static frontend optionally
app.use('/', express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

let server;
(async () => {
  try {
    await db.init();
    server = app.listen(PORT, () => logger.info(`CrusherFlow API listening on http://0.0.0.0:${PORT}`));
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Health endpoints
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/ready', (req, res) => res.status(200).send('ready'));

// Graceful shutdown
function shutdown(){
  logger.info('Shutting down...');
  if(server){
    server.close(()=>{
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(()=>{ logger.error('Forcing shutdown'); process.exit(1); }, 10000);
  } else process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
