import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const windows:JSDOM[]=[];
afterEach(()=>windows.splice(0).forEach(d=>d.window.close()));
async function workspace(role='employer') {
  const dom=new JSDOM(readFileSync('../operations.html','utf8'),{url:'https://local.example/operations.html',runScripts:'outside-only'});
  windows.push(dom);
  const w=dom.window;
  w.sessionStorage.setItem('user',JSON.stringify({id:1,role}));
  w.sessionStorage.setItem('token','isolated-token');
  const calls:any[]=[];
  w.fetch=vi.fn(async(url:string,init:any={})=>{
    const path=url.split('/api')[1];calls.push({path,...init});
    const body=path==='/operations/shifts'?{shifts:[{id:1,title:'<img src=x onerror=alert(1)>',start_time:'2026-09-18'}]}
      :path==='/operations/incidents'?init.method==='POST'?{incident:{id:2},employerEmailSent:true}:{incidents:[{id:1,shift_title:'Test shift',description:'<script>bad()</script>',category:'safety',severity:'high',status:'open',occurred_at:'2026-09-18',updates:[]}]}
      :path==='/sms/preferences'?{configured:false,preference:null,deliveries:[]}
      :path==='/payroll/integrations'?{integrations:[{name:'Gusto',message:'Provider setup required'}]}:{};
    return {ok:true,status:200,json:async()=>body};
  }) as any;
  w.eval(readFileSync('../operations.js','utf8'));
  await vi.waitFor(()=>expect(w.document.getElementById('feedback')?.textContent).toBe('Shared records are up to date.'));
  return {w,d:w.document,calls};
}
it('renders reports safely, exposes provider activation honestly and saves employer reviews',async()=>{
  const {w,d,calls}=await workspace();
  expect(d.querySelector('#incidents script')).toBeNull();
  expect(d.querySelector('select img')).toBeNull();
  expect(d.getElementById('incidents')?.textContent).toContain('<script>bad()</script>');
  expect(d.getElementById('smsStatus')?.textContent).toContain('activation is pending');
  expect((d.querySelector('#phoneForm button') as HTMLButtonElement).disabled).toBe(true);
  const form=d.querySelector('[data-review]') as HTMLFormElement;
  (form.elements.namedItem('note') as HTMLTextAreaElement).value='Follow-up completed';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await vi.waitFor(()=>expect(calls.some(c=>c.path==='/operations/incidents/1'&&c.method==='PATCH')).toBe(true));
  expect(JSON.parse(calls.find(c=>c.method==='PATCH').body)).toEqual({status:'investigating',note:'Follow-up completed'});
});
it('keeps employer controls hidden for caregivers and submits a shared incident report',async()=>{
  const {w,d,calls}=await workspace('caregiver');
  expect([...d.querySelectorAll('[data-employer]')].every(e=>(e as HTMLElement).hidden)).toBe(true);
  expect(d.querySelector('[data-review]')).toBeNull();
  const form=d.getElementById('incidentForm') as HTMLFormElement;
  for(const [name,value] of Object.entries({shiftId:'1',description:'A test-only safety report',occurredAt:'2026-09-18T08:00'})) (form.elements.namedItem(name) as HTMLInputElement).value=value;
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await vi.waitFor(()=>expect(calls.some(c=>c.path==='/operations/incidents'&&c.method==='POST')).toBe(true));
  expect(JSON.parse(calls.find(c=>c.method==='POST').body)).toMatchObject({shiftId:1,description:'A test-only safety report'});
});
