(function(){
  "use strict";
  const BASE="https://elite-bridge-shared-api-evans.vercel.app/api";
  const peer=document.getElementById("careWebChatPeer");
  const thread=document.getElementById("careWebChatThread");
  const chatForm=document.getElementById("careWebChatForm");
  const client=document.getElementById("careWebHandoffClient");
  const list=document.getElementById("careWebHandoffList");
  const handoffForm=document.getElementById("careWebHandoffForm");
  if(!peer&&!client)return;
  const getToken=()=>{
    try {return localStorage.getItem("token")||sessionStorage.getItem("token");}
    catch(_){return null;}
  };
  async function api(path,init={}){
    const token=getToken();
    if(!token)throw new Error("Session expired. Please sign in again.");
    const response=await fetch(BASE+path,{
      ...init,cache:"no-store",
      headers:{"Authorization":"Bearer "+token,...(init.body?{"Content-Type":"application/json"}:{}),...(init.headers||{})}
    });
    if(response.status===204)return {};
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||"Request unsuccessful. Please try again.");
    return data;
  }
  const html=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=(value)=>{
    if(!value)return "";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?"":d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  };
  const status=(id,value,isError=false)=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.textContent=value;
    el.classList.toggle("care-web-error",Boolean(isError));
  };
  let contacts=[];
  let clients=[];
  let items=[];
  let busy=false;
  const selectedPeer=()=>Number(peer?.value)||null;
  const selectedClient=()=>Number(client?.value)||null;

  function renderThread(messages) {
    if(!thread)return;
    const pid=selectedPeer();
    thread.innerHTML=!messages.length?'<p class="care-web-placeholder">No messages yet. Start a conversation below.</p>':
      messages.map(m=>{
        const sent=m.senderId!==pid;
        return '<div class="care-web-bubble '+(sent?'mine':'theirs')+'">' +
          '<p>'+html(m.content)+'</p><small>'+html(date(m.createdAt))+(sent?(m.isRead?' · Read':' · Sent'):'')+'</small></div>';
      }).join('');
    thread.scrollTop=thread.scrollHeight;
  }
  async function loadThread(){
    const id=selectedPeer();
    if(!id){renderThread([]);return;}
    try{
      const data=await api("/team-messages/"+id);
      renderThread(data.messages||[]);
      await api("/team-messages/"+id+"/read",{method:"POST"}).catch(()=>{});
      status("careWebChatStatus","");
    }catch(e){status("careWebChatStatus",e.message||"Could not load chat.",true);}
  }
  async function loadContacts(){
    if(!peer)return;
    try{
      const data=await api("/team-messages/contacts");
      contacts=data.contacts||[];
      const previous=peer.value;
      peer.replaceChildren();
      if(!contacts.length){
        const opt=document.createElement("option");opt.value="";opt.textContent="No connected care-team contacts";peer.append(opt);
        renderThread([]);return;
      }
      for(const c of contacts){
        const opt=document.createElement("option");opt.value=c.id;opt.textContent=c.name;peer.append(opt);
      }
      if(previous&&contacts.some(x=>String(x.id)===previous))peer.value=previous;
      await loadThread();
    }catch(e){status("careWebChatStatus",e.message||"Could not load contacts.",true);}
  }
  peer?.addEventListener("change",()=>void loadThread());
  chatForm?.addEventListener("submit",async(e)=>{
    e.preventDefault();
    if(busy)return;
    const id=selectedPeer();
    const input=document.getElementById("careWebChatText");
    const text=input?.value.trim();
    if(!id||!text){status("careWebChatStatus","Choose a contact and write a message.",true);return;}
    const button=chatForm.querySelector('button[type="submit"]');
    busy=true;button.disabled=true;
    try{
      await api("/team-messages/"+id,{method:"POST",body:JSON.stringify({content:text})});
      input.value="";
      await loadThread();
      status("careWebChatStatus","Message saved and a push alert was attempted.");
    }catch(err){status("careWebChatStatus",err.message||"Unable to send.",true);}
    finally{busy=false;button.disabled=false;}
  });

  function itemMarkup(item,allowComplete){
    return '<article class="care-web-handoff-item">' +
      '<p>'+html(item.content)+'</p>' +
      '<small>'+html(item.authorName||"Care team")+' · '+html(date(item.createdAt))+'</small>'+
      (item.status==="done"?'<span class="care-web-completed">✓ Completed</span>':'')+
      (allowComplete?'<button class="secondary-button" type="button" data-complete-handoff="'+html(item.id)+'">Mark completed</button>':'')+
      '</article>';
  }
  function renderItems(){
    if(!list)return;
    const todo=items.filter(x=>x.kind==="task"&&x.status==="open");
    const notes=items.filter(x=>x.kind==="note");
    const completed=items.filter(x=>x.kind==="task"&&x.status==="done");
    list.innerHTML='<h3>Open to-do list ('+todo.length+')</h3>'+
      (todo.length?todo.map(x=>itemMarkup(x,true)).join(""):'<p class="care-web-placeholder">No outstanding tasks.</p>')+
      '<h3>Handoff notes</h3>'+
      (notes.length?notes.map(x=>itemMarkup(x,false)).join(""):'<p class="care-web-placeholder">No handoff notes yet.</p>')+
      (completed.length?'<h3>Recently completed</h3>'+completed.map(x=>itemMarkup(x,false)).join(""):'');
  }
  async function loadItems(){
    const shift=selectedClient();
    if(!shift){items=[];renderItems();return;}
    try {
      const data=await api("/care-handoffs/shifts/"+shift+"/items");
      items=data.items||[];
      renderItems();
      status("careWebHandoffStatus","");
    }catch(e){status("careWebHandoffStatus",e.message||"Could not load handoffs.",true);}
  }
  async function loadClients(){
    if(!client)return;
    try{
      const data=await api("/care-handoffs/shifts");
      clients=data.clients||[];
      const previous=client.value;
      client.replaceChildren();
      if(!clients.length){
        const opt=document.createElement("option");opt.value="";opt.textContent="No assigned clients available";client.append(opt);
      }else{
        for(const c of clients){
          const opt=document.createElement("option");opt.value=c.shiftId;
          opt.textContent=c.clientName+" · "+c.location;
          client.append(opt);
        }
        if(previous&&clients.some(c=>String(c.shiftId)===previous))client.value=previous;
      }
      await loadItems();
    }catch(e){status("careWebHandoffStatus",e.message||"Could not load client list.",true);}
  }
  client?.addEventListener("change",()=>void loadItems());
  list?.addEventListener("click",async e=>{
    const button=e.target.closest("[data-complete-handoff]");
    if(!button||busy)return;
    const id=Number(button.dataset.completeHandoff),shift=selectedClient();
    if(!id||!shift)return;
    busy=true;button.disabled=true;
    try{
      await api("/care-handoffs/shifts/"+shift+"/items/"+id+"/complete",{method:"PATCH"});
      await loadItems();
      status("careWebHandoffStatus","Task marked completed.");
    }catch(err){status("careWebHandoffStatus",err.message||"Could not update task.",true);}
    finally{busy=false;button.disabled=false;}
  });
  handoffForm?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(busy)return;
    const shift=selectedClient();
    const kind=document.getElementById("careWebHandoffKind")?.value;
    const input=document.getElementById("careWebHandoffContent");
    const content=input?.value.trim();
    if(!shift||!content||content.length<4){status("careWebHandoffStatus","Choose a client and provide a short task or note.",true);return;}
    const button=handoffForm.querySelector('button[type="submit"]');
    busy=true;button.disabled=true;
    try{
      await api("/care-handoffs/shifts/"+shift+"/items",{method:"POST",body:JSON.stringify({kind,content})});
      input.value="";
      await loadItems();
      status("careWebHandoffStatus","Handoff saved for the assigned care team.");
    }catch(err){status("careWebHandoffStatus",err.message||"Could not save handoff.",true);}
    finally{busy=false;button.disabled=false;}
  });
  void loadContacts();
  void loadClients();
})();
