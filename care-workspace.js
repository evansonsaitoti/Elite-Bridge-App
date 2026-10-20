(function () {
  'use strict';
  const API = 'https://elite-bridge-shared-api-evans.vercel.app/api/care-workspace';
  const intakeForm = document.getElementById('careIntakeForm');
  const intakeList = document.getElementById('careIntakeList');
  const trainingList = document.getElementById('careTrainingList');
  if (!intakeForm && !trainingList) return;

  const SERVICE_LABELS = {
    companionship:'Companionship', meal_preparation:'Meal preparation',
    personal_care:'Personal care assistance', mobility_support:'Mobility support',
    light_housekeeping:'Light housekeeping', transportation:'Transportation / errands',
    respite:'Respite support', daily_reminders:'Daily reminders'
  };
  let intakes = [];
  let modules = [];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }
  function token() {
    try { return localStorage.getItem('token') || sessionStorage.getItem('token'); }
    catch (_) { return null; }
  }
  async function request(path, options = {}) {
    const jwt = token();
    if (!jwt) throw new Error('Sign in again to view your care workspace.');
    const response = await fetch(API + path, {
      ...options, cache:'no-store', credentials:'omit',
      headers: {
        Authorization:'Bearer '+jwt,
        ...(options.body ? {'Content-Type':'application/json'} : {}),
        ...(options.headers||{})
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
      throw new Error(result.message || result.error || 'The care workspace could not complete this request.');
    }
    return result;
  }
  function feedback(message, error = false) {
    const el = document.getElementById('careIntakeFeedback');
    if (!el) return;
    el.hidden = false; el.textContent = message;
    el.classList.toggle('is-error', error);
  }
  function displayDate(value) {
    if (!value) return 'Not scheduled';
    const raw=String(value).slice(0,10);
    const date=new Date(raw+'T12:00:00');
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }
  function readChecks(form, name) {
    return Array.from(form.querySelectorAll('input[name="'+name+'"]:checked')).map(el => el.value);
  }
  function setChecks(form, name, list) {
    const values=new Set(Array.isArray(list)?list:[]);
    form.querySelectorAll('input[name="'+name+'"]').forEach(el => {el.checked=values.has(el.value);});
  }
  function clearForm() {
    if (!intakeForm) return;
    intakeForm.reset();
    intakeForm.elements.intakeId.value='';
    document.getElementById('careIntakeFormTitle').textContent='New client intake';
    const cancel=document.getElementById('careIntakeCancel');
    if(cancel)cancel.hidden=true;
    const message=document.getElementById('careIntakeFeedback');
    if(message)message.hidden=true;
  }
  function renderIntakes(failed = false) {
    if (!intakeList) return;
    const count=document.getElementById('careIntakeCount');
    if(count)count.textContent=intakes.length+' record'+(intakes.length===1?'':'s');
    if (failed) {
      intakeList.innerHTML='<p class="care-error">Unable to load saved intake records. Refresh to retry. No record has been saved locally.</p>';
      return;
    }
    if (!intakes.length) {
      intakeList.innerHTML='<div class="care-empty"><strong>No intakes recorded yet</strong><p>Save a new client intake on the left to start a non-medical service plan.</p></div>';
      return;
    }
    intakeList.innerHTML=intakes.map(row => {
      const tasks=Array.isArray(row.serviceTasks)?row.serviceTasks:[];
      const days=Array.isArray(row.preferredDays)?row.preferredDays:[];
      const state=row.intakeStatus==='ready'?'Ready for scheduling':'Draft';
      return '<article class="care-intake-card" data-searchable>' +
        '<div class="care-intake-top"><div><h3>'+escapeHtml(row.clientName)+'</h3>' +
        '<small>Updated '+escapeHtml(displayDate(row.updatedAt))+'</small></div>' +
        '<span class="care-stage '+(row.intakeStatus==='ready'?'care-stage-ready':'')+'">'+state+'</span></div>' +
        '<div class="care-intake-meta"><span>'+escapeHtml(tasks.length+' requested service'+(tasks.length===1?'':'s'))+'</span>' +
        '<span>'+escapeHtml(days.length+' preferred day'+(days.length===1?'':'s'))+'</span></div>' +
        '<details class="care-intake-details"><summary>View care plan</summary>' +
          '<p><strong>Services:</strong> '+(tasks.length?tasks.map(t=>escapeHtml(SERVICE_LABELS[t]||t)).join(', '):'Not selected')+'</p>' +
          '<p><strong>Preferred days:</strong> '+(days.length?days.map(escapeHtml).join(', '):'Not selected')+'</p>' +
          '<p><strong>Preferred time:</strong> '+escapeHtml(row.preferredWindow||'Flexible')+'</p>' +
          '<p><strong>Planned start:</strong> '+escapeHtml(displayDate(row.plannedStartDate))+'</p>' +
          '<p><strong>Service address:</strong> '+escapeHtml(row.serviceAddress||'Not recorded')+'</p>' +
          (row.coordinationNotes?'<p><strong>Preferences:</strong> '+escapeHtml(row.coordinationNotes)+'</p>':'') +
        '</details>' +
        '<button type="button" class="secondary-button care-edit-button" data-care-intake-edit="'+escapeHtml(row.id)+'">Edit intake</button></article>';
    }).join('');
  }
  async function loadIntakes() {
    if (!intakeList) return;
    try {
      const result=await request('/employer/intakes');
      intakes=Array.isArray(result.intakes)?result.intakes:[];
      renderIntakes();
    } catch(error) {renderIntakes(true);feedback(error.message,true);}
  }
  async function loadSuggestions() {
    const datalist=document.getElementById('careIntakeNames');
    if (!datalist) return;
    try {
      // Read existing private client and invoice names; do not duplicate or
      // persist any invoice information in browser storage.
      const [clients,invoices]=await Promise.allSettled([
        fetch('https://elite-bridge-shared-api-evans.vercel.app/api/clients/employer',{headers:{Authorization:'Bearer '+token()},cache:'no-store'}).then(r=>r.ok?r.json():{clients:[]}),
        fetch('https://elite-bridge-shared-api-evans.vercel.app/api/client-invoices/employer',{headers:{Authorization:'Bearer '+token()},cache:'no-store'}).then(r=>r.ok?r.json():{invoices:[]})
      ]);
      const names=new Set();
      if(clients.status==='fulfilled')(clients.value.clients||[]).forEach(c=>{if(c.clientName)names.add(c.clientName);});
      if(invoices.status==='fulfilled')(invoices.value.invoices||[]).forEach(c=>{if(c.client_name)names.add(c.client_name);});
      datalist.replaceChildren(...Array.from(names).slice(0,100).map(name=>{
        const option=document.createElement('option');option.value=name;return option;
      }));
    } catch(_){ /* name suggestions are optional */ }
  }
  function editIntake(id) {
    const row=intakes.find(x=>String(x.id)===String(id));
    if (!row || !intakeForm) return;
    clearForm();
    const fields=['clientName','clientEmail','contactName','contactPhone','serviceAddress',
      'preferredWindow','plannedStartDate','intakeStatus','coordinationNotes'];
    for(const name of fields) {
      const el=intakeForm.elements[name];
      if(el)el.value=row[name]|| (name==='preferredWindow'?'flexible':name==='intakeStatus'?'draft':'');
    }
    intakeForm.elements.intakeId.value=row.id;
    setChecks(intakeForm,'preferredDays',row.preferredDays);
    setChecks(intakeForm,'serviceTasks',row.serviceTasks);
    document.getElementById('careIntakeFormTitle').textContent='Edit client intake';
    document.getElementById('careIntakeCancel').hidden=false;
    intakeForm.scrollIntoView({behavior:'smooth',block:'start'});
    intakeForm.elements.clientName.focus();
  }

  intakeForm?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=document.getElementById('careIntakeSave');
    if(button.disabled)return;
    const f=intakeForm;
    const payload={
      clientName:f.elements.clientName.value.trim(),
      clientEmail:f.elements.clientEmail.value.trim(),
      contactName:f.elements.contactName.value.trim(),
      contactPhone:f.elements.contactPhone.value.trim(),
      serviceAddress:f.elements.serviceAddress.value.trim(),
      preferredDays:readChecks(f,'preferredDays'),
      serviceTasks:readChecks(f,'serviceTasks'),
      preferredWindow:f.elements.preferredWindow.value,
      plannedStartDate:f.elements.plannedStartDate.value,
      intakeStatus:f.elements.intakeStatus.value,
      coordinationNotes:f.elements.coordinationNotes.value.trim()
    };
    if(payload.intakeStatus==='ready'&&(!payload.serviceTasks.length||!payload.preferredDays.length)) {
      feedback('Select service tasks and at least one day before marking ready.',true);return;
    }
    const id=f.elements.intakeId.value;
    button.disabled=true;button.textContent=id?'Updating…':'Saving…';
    try {
      const result=await request(id?'/employer/intakes/'+encodeURIComponent(id):'/employer/intakes',{
        method:id?'PUT':'POST',body:JSON.stringify(payload)
      });
      intakes=id?intakes.map(x=>String(x.id)===String(id)?result.intake:x):[result.intake,...intakes];
      intakes.sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
      renderIntakes();
      clearForm();
      feedback('Client intake saved securely. No email was sent.');
    } catch(error) {feedback(error.message,true);}
    finally {button.disabled=false;button.textContent='Save intake & care plan';}
  });
  document.getElementById('careIntakeCancel')?.addEventListener('click',clearForm);
  intakeList?.addEventListener('click',event=>{
    const button=event.target.closest('[data-care-intake-edit]');
    if(button)editIntake(button.dataset.careIntakeEdit);
  });

  function renderTraining(failed = false) {
    if(!trainingList)return;
    const progress=document.getElementById('careTrainingProgress');
    const done=modules.filter(m=>Boolean(m.reviewedAt)).length;
    if(progress)progress.textContent=failed?'Learning progress unavailable':done+' of '+modules.length+' modules reviewed';
    if(failed){trainingList.innerHTML='<p class="care-error">Training modules could not be loaded. Try refreshing your session.</p>';return;}
    if(!modules.length){trainingList.innerHTML='<p class="care-error">No learning modules available.</p>';return;}
    trainingList.innerHTML=modules.map(module=>{
      const completed=Boolean(module.reviewedAt);
      return '<article class="care-module" data-searchable><div class="care-module-top">' +
        '<div><small>'+escapeHtml(module.minutes)+' MIN · INTERNAL GUIDE</small><h3>'+escapeHtml(module.title)+'</h3>' +
        '<p>'+escapeHtml(module.summary)+'</p></div>' +
        '<span class="care-module-state '+(completed?'done':'')+'">'+(completed?'Reviewed':'To review')+'</span></div>' +
        '<details class="care-module-details"><summary>Read learning guide</summary><ol>' +
        (Array.isArray(module.topics)?module.topics:[]).map(point=>'<li>'+escapeHtml(point)+'</li>').join('') +
        '</ol>'+ (completed?
          '<p class="care-reviewed">Reviewed '+escapeHtml(displayDate(module.reviewedAt))+'.</p>' :
          '<label class="care-module-check"><input type="checkbox" data-training-confirm="'+escapeHtml(module.key)+'"> I have reviewed the guidance above.</label>' +
          '<button type="button" class="primary-button" data-training-mark="'+escapeHtml(module.key)+'" disabled>Mark as reviewed</button>') +
        '</details></article>';
    }).join('');
  }
  async function loadTraining() {
    if(!trainingList)return;
    try{
      const result=await request('/training');
      modules=Array.isArray(result.modules)?result.modules:[];
      renderTraining();
    }catch(error){renderTraining(true);}
  }
  trainingList?.addEventListener('change',event=>{
    const check=event.target.closest('[data-training-confirm]');
    if(!check)return;
    const card=check.closest('.care-module');
    const button=card?.querySelector('[data-training-mark]');
    if(button)button.disabled=!check.checked;
  });
  trainingList?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-training-mark]');
    if(!button||button.disabled)return;
    const m=modules.find(x=>x.key===button.dataset.trainingMark);
    if(!m||m.reviewedAt)return;
    button.disabled=true;button.textContent='Saving review…';
    try {
      const result=await request('/training/review',{method:'POST',
        body:JSON.stringify({moduleKey:m.key,moduleVersion:m.version,acknowledged:true})});
      m.reviewedAt=result.reviewedAt;
      renderTraining();
    }catch(error){
      button.disabled=false;
      button.textContent='Mark as reviewed';
      const message=document.createElement('p');
      message.className='care-error';message.textContent=error.message;
      button.after(message);
    }
  });

  loadIntakes();
  loadSuggestions();
  loadTraining();
})();
