(function () {
  'use strict';
  const serviceNames = ['Companionship & supervision','Meal preparation','Personal care assistance','Mobility & walking assistance','Light housekeeping','Medication reminders only','Non-medical transportation / errands','Appointment / hospital travel assistance'];
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const clean = value => String(value || '').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
  const date = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '________________';
  async function build(data, logoBytes, fontBytes) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    const regular = await doc.embedFont(fontBytes.regular,{subset:true}), bold = await doc.embedFont(fontBytes.bold,{subset:true});
    const logo = await doc.embedPng(logoBytes);
    const green=rgb(.02,.25,.17), gold=rgb(.72,.47,.12), muted=rgb(.36,.43,.4), ink=rgb(.12,.2,.16), pale=rgb(.95,.97,.95), line=rgb(.81,.86,.83);
    const name=clean(data.clientName)||'________________________', recipient=clean(data.careRecipient)||name;
    const rate=data.hourlyRate ? '$'+Number(data.hourlyRate).toFixed(2) : '$________';
    const billing=clean(data.billing)||'Biweekly', due=Number(data.dueDays)||7;
    const services=data.services||[], days=data.days||[];
    function page(number) {
      const p=doc.addPage([612,792]);
      function txt(value,x,top,size=9,font=regular,color=ink) { p.drawText(clean(value),{x,y:792-top-size*.76,font,size,color}); }
      function wrap(value,x,top,width,size=9,font=regular,color=ink,leading=size*1.25) {
        let y=top;
        for(const para of clean(value).split('\n')) {
          let row='';
          for(const word of para.split(/\s+/)) {
            if(font.widthOfTextAtSize(word,size)>width) throw Error('A word is too long to fit. Please shorten the field.');
            const next=row ? row+' '+word : word;
            if(font.widthOfTextAtSize(next,size)>width && row){txt(row,x,y,size,font,color);y+=leading;row=word;}else row=next;
          }
          txt(row,x,y,size,font,color); y+=leading;
        }
        return y;
      }
      function rule(top){p.drawLine({start:{x:42,y:792-top},end:{x:570,y:792-top},thickness:.6,color:line});}
      function rect(x,top,w,h,color=pale,radius=8){
        p.drawRectangle({x:x+radius,y:792-top-h,width:w-2*radius,height:h,color});
        p.drawRectangle({x,y:792-top-h+radius,width:w,height:h-2*radius,color});
        for(const cx of [x+radius,x+w-radius])for(const cy of [792-top-radius,792-top-h+radius])p.drawCircle({x:cx,y:cy,size:radius,color});
      }
      function right(value,end,top,size=9,font=regular,color=ink){txt(value,end-font.widthOfTextAtSize(clean(value),size),top,size,font,color);}
      function rich(heading,body,x,top,width,size=8.2,leading=11){
        let cx=x,y=top;
        const emph=['Elite Bridge Staffing LLC',name,rate+'/hour',billing.toLowerCase(),due+' calendar days',"24 hours' notice",'six months','no automatic conversion fee','911',"14 days' written notice"];
        const runs=[[heading,bold,green]];
        let remaining=body;
        while(remaining){let first=-1,match='';for(const part of emph){const at=remaining.indexOf(part);if(at>=0&&(first<0||at<first)){first=at;match=part;}}if(first<0){runs.push([remaining,regular,ink]);break;}if(first)runs.push([remaining.slice(0,first),regular,ink]);runs.push([match,bold,ink]);remaining=remaining.slice(first+match.length);}
        for(const [value,font,color] of runs){for(const token of value.split(/(\s+)/)){if(!token)continue;const w=font.widthOfTextAtSize(token,size);if(cx+w>x+width&&token.trim()){cx=x;y+=leading;}if(cx===x&&!token.trim())continue;txt(token,cx,y,size,font,color);cx+=w;}}
        return y+leading;
      }
      function bar(label,top,detail=''){rect(43,top,526,26,green,4);txt(label,55,top+10,9,bold,rgb(1,1,1));if(detail)right(detail,557,top+10,7.1,regular,rgb(1,1,1));}
      function check(label,x,top,selected,width=245){
        p.drawRectangle({x,y:792-top-10,width:10,height:10,borderWidth:.8,borderColor:green,color:rgb(1,1,1)});
        if(selected){p.drawLine({start:{x:x+2,y:792-top-5},end:{x:x+4,y:792-top-8},thickness:1.2,color:green});p.drawLine({start:{x:x+4,y:792-top-8},end:{x:x+8,y:792-top-2},thickness:1.2,color:green});}
        wrap(label,x+17,top,width-17,8.3);
      }
      p.drawImage(logo,{x:43,y:712,width:206,height:51.5});
      right('ELITE BRIDGE STAFFING LLC',569,30.4,10,bold,green);
      right('144 Thissell Ave  |  Dracut, MA 01826',569,46.8,7.4,regular,muted);
      right('info@elitebridgestaffing.com',569,60.8,7.4,regular,muted);
      right('(508) 251-9346  |  www.elitebridgestaffing.com',569,74.7,7.2,regular,muted);
      p.drawLine({start:{x:43,y:694},end:{x:569,y:694},thickness:.7,color:gold});
      rule(745);txt('ELITE BRIDGE STAFFING LLC   |   '+(number===1?'SERVICE AGREEMENT':'AGREED CARE PLAN'),43,752.8,7.3,bold,muted);
      right('UNSIGNED - AWAITING BOTH SIGNATURES  |  PAGE '+number+' OF 2',569,752.7,7.1,regular,muted);
      return {p,txt,wrap,rule,rect,bar,check,right,rich};
    }
    const a=page(1);
    a.txt('NON-MEDICAL HOME CARE',43,116.7,19.7,bold,green);a.txt('SERVICE AGREEMENT',43,141.2,13.5,bold);
    a.right('PREPARED '+date(data.preparedDate).toUpperCase()+'  ·  FOR SIGNATURE',569,143.7,7.2,regular,muted);
    a.rect(43,170,254,76);a.rect(309,170,260,76);
    a.txt(data.careRecipient && data.careRecipient!==data.clientName ? 'CLIENT / CARE RECIPIENT' : 'CLIENT & CARE RECIPIENT',56,179.8,7.7,bold,gold);
    let y=a.wrap(name,56,199,228,12.3,bold,green,14);
    if(recipient!==name)y=a.wrap('Care recipient: '+recipient,56,y+2,228,7.5,regular,muted,9);
    if(a.wrap(clean(data.address)||'Address: __________________________',56,y+5,228,8,regular,muted,14)>246)throw Error('Please shorten the client details to fit the summary box.');
    a.txt('SERVICE & BILLING',322,179.8,7.7,bold,gold);
    a.txt('Prior service start',322,197.9,7.8,regular,muted);a.right(date(data.startDate),558,197.9,8,bold,green);
    a.txt('Hourly rate',322,213.9,7.8,regular,muted);a.right(rate,558,213.9,8,bold,green);
    a.txt('Billing / terms',322,229.9,7.8,regular,muted);a.right(billing+' · net '+due,558,229.9,7.9,bold,green);
    a.bar('AGREEMENT TERMS',256,'CLAUSES 01–10');
    const clauses=[
      ['Parties & commencement.',`This Agreement is between Elite Bridge Staffing LLC (Agency) and ${name} (Client${recipient===name?' and care recipient':''}). It is effective when both parties sign; ${data.startDate?'prior services beginning '+date(data.startDate)+' remain separately invoiced.':'any prior services remain separately invoiced.'}`],
      ['Services & care plan.','Non-medical care follows the attached Care Plan: companionship, personal support, meal preparation, mobility assistance, reminders and light housekeeping. No nursing, clinical treatment or medication administration.'],
      ['Schedules & caregivers.','The Care Plan confirms service days and authorized tasks. Visit hours are coordinated directly with the Agency. Agency assigns or substitutes caregivers, informs Client of material changes, and provides replacements as available.'],
      ['Rates, bills & extra charges.',`Authorized care is ${rate}/hour for actual documented hours. Invoices issue ${billing.toLowerCase()}, due within ${due} calendar days. Additional fees, deposits or rate changes require advance written disclosure and consent.`],
      ['Payments through Agency.','Payments for Agency-arranged visits must go to Agency, not a caregiver privately. Client may question charges promptly. Material nonpayment may affect future non-emergency scheduling after reasonable notice.'],
      ['Cancellations.',"Client should give 24 hours' notice of changes or cancellations when practicable, except emergencies. A cancellation fee applies only if separately disclosed and accepted in the Care Plan or written addendum."],
      ['Assigned-staff non-solicitation.','During services and for six months after the last Agency-assigned visit, Client will not directly solicit or knowingly arrange private care with an Agency-introduced, assigned caregiver without written consent. Existing relationships and worker rights remain unaffected; no automatic conversion fee.'],
      ['Safety & emergencies.','Client will provide a safe environment and disclose material hazards. In emergencies, staff may contact 911 and designated contacts. Agency may pause unsafe visits while reasonably coordinating communication and transition.'],
      ['Privacy & property.','Agency will safeguard Client information and entrusted keys and report suspected abuse or neglect appropriately. Client will respect caregiver privacy and notify Agency of service concerns.'],
      ['Termination & governing law.',"Either party may end future service on 14 days' written notice, with reasonable transition assistance; urgent safety threats or serious breach may justify earlier action. Changes must be written; Massachusetts law applies. Statutory rights remain intact."]
    ];
    y=296;
    clauses.forEach(([heading,body],i)=>{
      a.txt(String(i+1).padStart(2,'0'),45,y+.7,8.4,bold,green);
      y=a.rich(heading,' '+body,70,y,499)+2.2;
    });
    if(y>634)throw Error('The client name is too long for the two-page agreement. Please shorten it.');
    const sig=Math.max(633,y+3);a.rule(sig);a.txt('SIGNATURES',43,sig+9,9.4,bold,green);
    a.right('The parties accept these terms by signing below.',569,sig+11,7.5,regular,muted);
    a.txt('CLIENT / CARE RECIPIENT',43,sig+29,7.5,bold,green);a.txt('ELITE BRIDGE REPRESENTATIVE',335,sig+29,7.5,bold,green);
    [43,335].forEach((x,i)=>{a.p.drawLine({start:{x,y:105},end:{x:x+244,y:105},thickness:.6,color:muted});a.txt('Signature',x,692.7,7.1,regular,muted);
      const printed=clean(i?data.agencySigner:data.clientSigner);if(printed)a.wrap('Printed name: '+printed,x,705,240,7,regular,muted,9);
      a.p.drawLine({start:{x,y:69},end:{x:x+100,y:69},thickness:.6,color:muted});a.txt('Date',x,728.7,7.1,regular,muted);});
    const b=page(2);
    b.txt('CARE SCHEDULE & SERVICE PLAN',43,115.2,17.3,bold,green);
    b.txt('Schedule A | Agreed service categories and ongoing scheduling',43,140,8.2,regular,muted);b.right('READY FOR SIGNATURE',569,139.7,7.1,bold,muted);
    b.rect(43,165,526,90);b.txt('CLIENT & CARE RECIPIENT',55,177.8,7.7,bold,gold);b.txt('CLIENT CONTACT',343,178.8,7.5,bold,gold);
    const contactY=b.wrap(recipient,55,198.9,270,12,bold,green,13);
    if(b.wrap(clean(data.address)||'Address: __________________________',55,contactY+6,270,8.4,regular,muted,10)>238.5)throw Error('Please shorten the address to fit the care plan.');
    if(b.wrap(clean(data.email)||'Email: ________________________',343,200.1,214,8.8,bold,green,10)>219)throw Error('Please shorten the email to fit the care plan.');
    b.txt('Agency: (508) 251-9346',343,219.9,8,regular,muted);
    b.txt('Effective on signing; prior visits separately billed.',55,237.8,7.5,regular,muted);
    b.bar('AGREED NON-MEDICAL SERVICES',269,services.length===8?'ALL LISTED SERVICES INCLUDED':'SELECTED SERVICES ONLY');
    serviceNames.forEach((s,i)=>b.check(s,i%2?320:49,315+Math.floor(i/2)*30,services.includes(s)));
    b.rich('Scope:',' Support is non-clinical; no nursing treatment, medication administration or medical diagnosis is included. Services are performed according to Client needs and available trained staff.',50,443.9,510,8.1,12);
    b.rule(477);b.txt('AGREED SERVICE DAYS',43,492.1,8.7,bold,green);b.right(days.length===7?'SEVEN DAYS A WEEK':'SELECTED DAYS',569,491.8,7.5,bold,green);
    dayNames.forEach((d,i)=>b.check(d,50+(i%4)*132,512+Math.floor(i/4)*27,days.includes(d),125));
    b.rich('Scheduling:',' Visits may occur in morning, daytime or evening periods as arranged with Elite Bridge. Specific arrival and departure times are coordinated directly and recorded on each timesheet; they are not fixed by this Agreement.',50,574.9,510,8.1,12);
    b.rule(617);b.txt('AGREED RATE & BILLING',43,631.1,8.7,bold,green);b.rect(43,650,526,44);
    [['HOURLY RATE',rate,56],['BILLING CYCLE',billing,205],['INVOICE DUE',due+' calendar days',368]].forEach(([label,value,x])=>{b.txt(label,x,660.7,7,bold,muted);b.txt(value,x,673.4,9.5,bold,green);});
    b.txt('Charges are based on actual documented hours. No additional fees are agreed unless separately disclosed and accepted in writing.',49,702.8,7.7,regular,ink);
    b.txt('Emergency and contact instructions are maintained in the confidential care record.',49,713,7.7,regular,ink);
    b.rule(731);b.txt('SIGNATURES ON MAIN AGREEMENT APPLY TO THIS SCHEDULE A',43,734.7,7,bold,green);
    return doc.save();
  }
  function init(){
    const form=document.getElementById('contractForm');if(!form)return;
    let bytes=null,url=null,version=0,timer;
    const status=document.getElementById('digitalContractStatus');
    const frame=document.getElementById('digitalContractPreview');
    const asset=async name=>{const r=await fetch('/contract-assets/'+name);if(!r.ok)throw Error('Unable to load agreement design. Please reload.');return new Uint8Array(await r.arrayBuffer());};
    const assets=Promise.all([asset('letterhead.png'),asset('regular.ttf'),asset('bold.ttf')]);
    const renderer=import('/contract-assets/pdf.min.mjs').then(pdf=>{pdf.GlobalWorkerOptions.workerSrc='/contract-assets/pdf.worker.min.mjs';return pdf;});
    let paintVersion=0,activePdf=null,lastWidth=0,resizeTimer;
    async function paint(result){
      const run=++paintVersion;frame.setAttribute('aria-busy','true');
      const pdfjs=await renderer;const pdf=await pdfjs.getDocument({data:result.slice(),isEvalSupported:false}).promise;
      if(run!==paintVersion){pdf.destroy();return;}
      if(activePdf)activePdf.destroy();activePdf=pdf;
      const fragment=document.createDocumentFragment();const zoom=Number(document.getElementById('contractZoom').value);
      const width=frame.clientWidth||600;
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);const viewport=page.getViewport({scale:(width/612)*zoom*Math.min(window.devicePixelRatio||1,2)});
        const figure=document.createElement('figure');figure.style.width=(zoom*100)+'%';
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Agreement page '+i+' of '+pdf.numPages);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        if(run!==paintVersion)return;
        const caption=document.createElement('figcaption');caption.textContent='Page '+i+' of '+pdf.numPages;figure.append(canvas,caption);fragment.append(figure);
      }
      frame.replaceChildren(fragment);frame.setAttribute('aria-busy','false');
    }
    document.getElementById('contractZoom').addEventListener('change',()=>{if(bytes)paint(bytes).catch(e=>{status.textContent='Preview unavailable. Download PDF to review the agreement.';});});
    new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width>0&&Math.abs(width-lastWidth)>2){lastWidth=width;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(bytes)paint(bytes).catch(()=>{});},150);}}).observe(frame);
    const get=id=>document.getElementById(id)?.value.trim()||'';
    const values=()=>({clientName:get('contractClientName'),careRecipient:get('contractCareRecipient'),address:get('contractAddress'),email:get('contractClientEmail'),preparedDate:get('contractPreparedDate'),startDate:get('contractStartDate'),hourlyRate:get('contractDayRate'),billing:get('contractBillingCycle'),dueDays:get('contractDueDays'),clientSigner:get('contractClientSigner'),agencySigner:get('contractAgencySigner'),services:Array.from(form.querySelectorAll('[name="contractServices"]:checked'),e=>e.value),days:Array.from(form.querySelectorAll('[name="contractDays"]:checked'),e=>e.value)});
    async function render(){
      const run=++version;bytes=null;status.textContent='Updating both pages…';
      try{const [logo,regular,bold]=await assets;const result=await build(values(),logo,{regular,bold});if(run!==version)return false;
        bytes=result;const next=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));if(url)URL.revokeObjectURL(url);url=next;
        await paint(result);if(run!==version)return false;status.textContent='Two-page preview updated. Unsigned - for review.';return true;
      }catch(e){if(run===version){status.textContent=e.message;frame.setAttribute('aria-busy','false');}return false;}
    }
    form.addEventListener('input',()=>{bytes=null;clearTimeout(timer);timer=setTimeout(render,300);});
    form.addEventListener('change',()=>{bytes=null;clearTimeout(timer);timer=setTimeout(render,100);});
    form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);render();});
    const download=async()=>{clearTimeout(timer);await render();if(!bytes)return;const a=document.createElement('a');a.href=url;a.download=(get('contractClientName')||'Client').replace(/[^a-zA-Z0-9_-]/g,'_')+'_Service_Agreement.pdf';a.click();};
    ['printContract','printContractTop'].forEach(id=>document.getElementById(id)?.addEventListener('click',download));
    document.getElementById('saveDigitalContract')?.addEventListener('click',async e=>{
      if(!form.reportValidity())return;const button=e.currentTarget;button.disabled=true;
      try{clearTimeout(timer);await render();if(!bytes)return;let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
        const token=localStorage.getItem('token')||sessionStorage.getItem('token');
        const response=await fetch('https://elite-bridge-shared-api-evans.vercel.app/api/contract-documents/employer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({clientName:get('contractClientName'),title:get('contractClientName')+' - Service Agreement',category:'contract',pdfBase64:btoa(binary)})});
        const result=await response.json();if(!response.ok)throw Error(result.message||result.error||'Unable to save draft.');
        status.textContent='Two-page draft saved under Contracts. Nothing has been sent.';document.dispatchEvent(new Event('contract-documents-updated'));
      }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
    });
    const now=new Date();document.getElementById('contractPreparedDate').value=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(now);
    render();
  }
  window.EliteDigitalContract={init,build};
})();
