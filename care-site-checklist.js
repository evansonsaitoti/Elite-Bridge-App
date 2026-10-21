(function(){
  "use strict";
  const API="https://elite-bridge-shared-api-evans.vercel.app/api/care-site-checklists";
  const site=document.getElementById("sitecheckSite"),period=document.getElementById("sitecheckPeriod");
  const tasks=document.getElementById("sitecheckTasks"),summary=document.getElementById("sitecheckSummary");
  const history=document.getElementById("sitecheckHistory"),message=document.getElementById("sitecheckMessage");
  const finish=document.getElementById("sitecheckFinish"),note=document.getElementById("sitecheckVisitNote");
  if(!site||!tasks)return;
  const token=()=>{try{return localStorage.getItem("token")||sessionStorage.getItem("token")}catch(_){return null}};
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"2-digit",day:"2-digit",year:"numeric",hour:"numeric",hour12:false}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||"";
  const today=[get("year"),get("month"),get("day")].join("-");
  period.value=Number(get("hour"))<15?"morning":"evening";
  const monday=new Date(today+"T12:00:00Z").getUTCDay()===1;
  let current=null,sites=[],pending=false;
  function show(text,error=false){
    message.textContent=text;
    message.classList.toggle("care-web-error",error);
  }
  const when=s=>{
    const date=new Date(s);
    return Number.isNaN(date.getTime())?"":date.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"});
  };
  async function api(path,init={}){
    const auth=token();
    if(!auth)throw Error("Please sign in again to use the care checklist.");
    const res=await fetch(API+path,{
      ...init,cache:"no-store",
      headers:{Authorization:"Bearer "+auth,...(init.body?{"Content-Type":"application/json"}:{}),...(init.headers||{})}
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.message||data.error||"Request failed. Refresh and try again.");
    return data;
  }
  const path=()=>"/sites/"+encodeURIComponent(site.value);
  const params=()=>"?visitDate="+encodeURIComponent(today)+"&visitPeriod="+encodeURIComponent(period.value);
  async function refresh(){
    if(!Number(site.value)){current=null;tasks.innerHTML='<p class="care-web-placeholder">No shared care sites yet.</p>';return;}
    try{
      const data=await api(path()+params());
      current=data;render();
      show("");
    }catch(e){show(e.message||"Unable to load checklist.",true);}
  }
  function render(){
    if(!current)return;
    const total=current.tasks.length,done=current.tasks.filter(x=>x.status==="done").length;
    const reviewed=current.tasks.filter(x=>x.status!=="pending").length;
    summary.textContent=current.site.clientName+" · "+today+" · "+reviewed+" of "+total+" reviewed · "+done+" completed";
    tasks.innerHTML=current.tasks.map(t=>{
      const mondayDisabled=t.frequency==="monday"&&!monday;
      const done=t.status==="done",notNeeded=t.status==="not_needed";
      let meta=done?"✓ Done by "+escape(t.checkedBy||"Care team")+" · "+escape(when(t.checkedAt)):
        notNeeded?"Not needed · "+escape(t.checkedBy||"Care team")+" · "+escape(when(t.checkedAt)):"";
      const previous=t.lastDoneAt&&!done?
        '<div class="sitecheck-last">Last completed '+escape(when(t.lastDoneAt))+' by '+escape(t.lastDoneBy||"Care team")+'</div>':"";
      const buttons=mondayDisabled?
        '<span class="sitecheck-frequency">Monday only — not due today</span>':
        '<div class="sitecheck-actions">'+
          (!done?'<button type="button" class="secondary-button" data-task="'+t.id+'" data-check="done">✓ Done</button>':"")+
          (!notNeeded?'<button type="button" class="secondary-button" data-task="'+t.id+'" data-check="not_needed">Not needed</button>':"")+
          (done||notNeeded?'<button type="button" class="secondary-button" data-task="'+t.id+'" data-check="pending">Undo</button>':"")+
        '</div>';
      return '<article class="sitecheck-task">'+
        '<div class="sitecheck-task-head"><span class="sitecheck-tick '+(done?"done":notNeeded?"na":"")+'">'+(done?"✓":notNeeded?"—":"○")+'</span>'+
        '<div><strong>'+escape(t.title)+'</strong><p>'+escape(t.instructions)+'</p>'+
        (t.frequency==="monday"&&monday?'<span class="sitecheck-frequency">Monday bin day</span>':"")+
        (meta?'<div class="sitecheck-meta">'+meta+'</div>':"")+previous+'</div></div>'+buttons+'</article>';
    }).join("");
    finish.disabled=reviewed===0;
    history.innerHTML=(current.recentSignoffs||[]).length?
      current.recentSignoffs.map(s=>
        '<div class="sitecheck-signoff"><strong>'+escape(s.caregiver)+'</strong> · '+escape(s.visitPeriod)+' · '+escape(when(s.signedAt))+
        (s.note?'<p>'+escape(s.note)+'</p>':"")+'</div>').join(""):
      '<p class="care-web-placeholder">No visit signoffs yet.</p>';
  }
  async function init(){
    try{
      const data=await api("/sites");
      sites=data.sites||[];
      site.replaceChildren();
      if(!sites.length){
        const o=document.createElement("option");o.textContent="No shared checklists";o.value="";site.append(o);
        tasks.innerHTML='<p class="care-web-placeholder">Your employer has not published a care-site checklist.</p>';
        return;
      }
      for(const x of sites){
        const o=document.createElement("option");o.value=String(x.id);o.textContent=x.clientName+" — "+x.locationName;
        site.append(o);
      }
      await refresh();
    }catch(e){show(e.message||"Unable to load sites.",true);}
  }
  site.addEventListener("change",()=>void refresh());
  period.addEventListener("change",()=>void refresh());
  tasks.addEventListener("click",async event=>{
    const btn=event.target.closest("[data-task][data-check]");
    if(!btn||pending)return;
    const id=Number(btn.dataset.task),status=btn.dataset.check;
    if(!Number.isInteger(id)||!["done","not_needed","pending"].includes(status))return;
    pending=true;btn.disabled=true;
    try{
      await api(path()+"/tasks/"+id+"/check",{method:"POST",body:JSON.stringify({
        visitDate:today,visitPeriod:period.value,status
      })});
      await refresh();
      show("Task status saved. The next caregiver can review this history.");
    }catch(e){show(e.message||"Could not save task.",true);}
    finally{pending=false;btn.disabled=false;}
  });
  finish.addEventListener("click",async()=>{
    if(pending||!current)return;
    pending=true;finish.disabled=true;
    try{
      await api(path()+"/signoff",{method:"POST",body:JSON.stringify({
        visitDate:today,visitPeriod:period.value,note:note.value.trim()
      })});
      note.value="";
      await refresh();
      show("✓ Visit handoff saved. The next caregiver can see these completed chores.");
    }catch(e){show(e.message||"Unable to finish the visit checklist.",true);}
    finally{pending=false;finish.disabled=false;}
  });
  void init();
})();
