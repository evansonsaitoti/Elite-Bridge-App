(() => {
      const API='https://elite-bridge-shared-api-evans.vercel.app/api/mcp';
      const descriptions={
        'shifts:read':'View shifts and coverage','shifts:write':'Create, assign, or cancel shifts',
        'caregivers:read':'View caregivers connected to your organization','caregivers:write':'Create caregiver invitations',
        'timesheets:read':'View manual timesheets','timesheets:write':'Create missed-clock-in timesheets'
      };
      const query=new URLSearchParams(location.search), request=query.get('request');
      const list=document.getElementById('scopeList'), message=document.getElementById('message');
      let scopes=[];
      try { const payload=JSON.parse(atob(request.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); scopes=payload.scopes||[]; }
      catch { document.getElementById('actions').classList.add('hidden'); message.className='message error'; message.textContent='This authorization request is invalid or expired. Start again from your MCP client.'; return; }
      scopes.forEach(scope=>{const li=document.createElement('li');li.textContent=descriptions[scope]||scope;list.appendChild(li)});
      const stores=[localStorage,sessionStorage];
      const getToken=()=>{for(const store of stores){const token=store.getItem('token');if(token)return token}return null};
      if(!getToken()){document.getElementById('actions').classList.add('hidden');document.getElementById('signIn').classList.remove('hidden')}
      async function finish(path,body,requiresSession=true){
        const token=getToken(); if(requiresSession&&!token){document.getElementById('signIn').classList.remove('hidden');return}
        message.className='message';message.textContent='Completing secure connection…';
        try{const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,appToken:token})});const data=await response.json();if(!response.ok)throw new Error(data.error_description||'Could not complete the connection.');location.assign(data.redirectUrl)}
        catch(error){message.className='message error';message.textContent=error.message}
      }
      document.getElementById('approve').addEventListener('click',()=>finish('/oauth/approve',{authorizationRequest:request}));
      document.getElementById('deny').addEventListener('click',()=>finish('/oauth/deny',{authorizationRequest:request},false));
    })();
