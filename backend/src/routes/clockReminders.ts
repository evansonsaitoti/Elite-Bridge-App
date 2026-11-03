import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { ensureShiftPostsTable } from './bookings';
import { runClockReminders } from '../services/clock-reminders';
const router=Router();
router.get('/',async(req,res,next)=>{
  const secret=process.env.CRON_SECRET;
  const expected=Buffer.from(secret?`Bearer ${secret}`:'');
  const actual=Buffer.from(req.headers.authorization||'');
  if(!secret || expected.length!==actual.length || !timingSafeEqual(expected,actual)) return res.status(401).json({message:'Unauthorized'});
  res.setHeader('Cache-Control','no-store');
  const ids=(process.env.CLOCK_REMINDER_EMPLOYER_IDS||'').split(',').map(Number).filter(id=>Number.isSafeInteger(id)&&id>0);
  const enabledAt=new Date(process.env.CLOCK_REMINDERS_ENABLED_AT||'');
  if(!ids.length || !Number.isFinite(enabledAt.getTime())) return res.json({enabled:false,attempted:0});
  try {await ensureShiftPostsTable();res.json({enabled:true,...await runClockReminders(ids,enabledAt)});} catch(error){next(error);}
});
export default router;
