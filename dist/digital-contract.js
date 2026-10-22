(function () {
  'use strict';
  const serviceNames = ['Companionship & supervision','Meal preparation','Personal care assistance','Mobility & walking assistance','Light housekeeping','Medication reminders only','Non-medical transportation / errands','Appointment / hospital travel assistance'];
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const clean = value => String(value || '').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7e\n]/g,'');
  const date = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '________________';
  async function build(data, logoBytes) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const logo = await doc.embedPng(logoBytes);
    const green=rgb(.02,.25,.17), gold=rgb(.72,.47,.12), muted=rgb(.36,.43,.4), ink=rgb(.12,.2,.16), pale=rgb(.95,.97,.95), line=rgb(.81,.86,.83);
    const name=clean(data.clientName)||'________________________', recipient=clean(data.careRecipient)||name;
    const rate=data.hourlyRate ? '$'+Number(data.hourlyRate).toFixed(2) : '$________';
    const billing=clean(data.billing)||'Biweekly', due=Number(data.dueDays)||7;
    const services=data.services||[], days=data.days||[];
    function page(number) {
      const p=doc.addPage([612,792]);
      function txt(value,x,top,size=9,font=regular,color=ink) { p.drawText(clean(value),{x,y:792-top-size,font,size,color}); }
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
      function rect(x,top,w,h,color=pale){p.drawRectangle({x,y:792-top-h,width:w,height:h,color});}
      function bar(label,top,detail=''){rect(42,top,528,25,green);txt(label,54,top+7,9,bold,rgb(1,1,1));if(detail)txt(detail,402,top+8,7,regular,rgb(1,1,1));}
      function check(label,x,top,selected,width=245){
        p.drawRectangle({x,y:792-top-10,width:10,height:10,borderWidth:.8,borderColor:green,color:rgb(1,1,1)});
        if(selected){p.drawLine({start:{x:x+2,y:792-top-5},end:{x:x+4,y:792-top-8},thickness:1.2,color:green});p.drawLine({start:{x:x+4,y:792-top-8},end:{x:x+8,y:792-top-2},thickness:1.2,color:green});}
        wrap(label,x+17,top,width-17,8.3);
      }
      p.drawImage(logo,{x:42,y:719,width:197,height:61.5});
      txt('ELITE BRIDGE STAFFING LLC',366,30,10,bold,green);
      txt('144 Thissell Ave | Dracut, MA 01826',394,48,7.2,regular,muted);
      txt('info@elitebridgestaffing.com',419,61,7.2,regular,muted);
      txt('(508) 251-9346 | www.elitebridgestaffing.com',362,74,7.2,regular,muted);
      p.drawLine({start:{x:42,y:694},end:{x:570,y:694},thickness:.7,color:gold});
      rule(754);txt('ELITE BRIDGE STAFFING LLC  |  '+(number===1?'SERVICE AGREEMENT':'AGREED CARE PLAN'),42,762,6.7,bold,muted);
      txt('UNSIGNED - FOR SIGNATURE  |  PAGE '+number+' OF 2',367,762,6.7,regular,muted);
      return {p,txt,wrap,rule,rect,bar,check};
    }
    const a=page(1);
    a.txt('NON-MEDICAL HOME CARE',42,112,20,bold,green);a.txt('SERVICE AGREEMENT',42,139,14,bold);
    a.txt('PREPARED '+date(data.preparedDate).toUpperCase()+' - FOR SIGNATURE',350,147,6.6,regular,muted);
    a.rect(42,170,255,76);a.rect(309,170,261,76);
    a.txt(data.careRecipient && data.careRecipient!==data.clientName ? 'CLIENT / CARE RECIPIENT' : 'CLIENT & CARE RECIPIENT',54,180,7.3,bold,gold);
    let y=a.wrap(name,54,198,230,11,bold,green,12);
    if(recipient!==name)y=a.wrap('Care recipient: '+recipient,54,y+2,230,7.8,regular,muted,9);
    if(a.wrap(clean(data.address)||'Address: __________________________',54,y+4,230,7.5,regular,muted,9)>245)throw Error('Please shorten the client details to fit the summary box.');
    a.txt('SERVICE & BILLING',321,180,7.3,bold,gold);
    a.txt('Prior service start',321,199,8,regular,muted);a.txt(date(data.startDate),464,199,8,bold,green);
    a.txt('Hourly rate',321,214,8,regular,muted);a.txt(rate,493,214,8,bold,green);
    a.txt('Billing / terms',321,229,8,regular,muted);a.txt(billing+' - net '+due,461,229,8,bold,green);
    a.bar('AGREEMENT TERMS',257,'CLAUSES 01-10');
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
    y=294;
    clauses.forEach(([heading,body],i)=>{
      a.txt(String(i+1).padStart(2,'0'),44,y,8,bold,green);
      y=a.wrap(heading+' '+body,69,y,499,8.1,regular,ink,10.15)+3.8;
    });
    if(y>644)throw Error('The client details are too long for the two-page format. Please shorten the name or address.');
    const sig=Math.max(652,y+8);a.rule(sig);a.txt('SIGNATURES',42,sig+8,10,bold,green);
    a.txt('The parties accept these terms by signing below.',332,sig+10,7,regular,muted);
    a.txt('CLIENT / CARE RECIPIENT',42,sig+29,7.5,bold,green);a.txt('ELITE BRIDGE REPRESENTATIVE',335,sig+29,7.5,bold,green);
    [42,335].forEach(x=>{a.p.drawLine({start:{x,y:792-sig-59},end:{x:x+230,y:792-sig-59},thickness:.6,color:muted});a.txt('Signature',x,sig+61,7,regular,muted);});
    a.txt('Printed name: '+clean(data.clientSigner),42,sig+76,7,regular,muted);a.txt('Printed name: '+clean(data.agencySigner),335,sig+76,7,regular,muted);
    a.txt('Date: __________________',42,sig+89,7,regular,muted);a.txt('Date: __________________',335,sig+89,7,regular,muted);
    const b=page(2);
    b.txt('CARE SCHEDULE & SERVICE PLAN',42,112,18,bold,green);
    b.txt('Schedule A | Agreed service categories and ongoing scheduling',42,140,8.5,regular,muted);
    b.rect(42,166,528,90);b.txt('CLIENT & CARE RECIPIENT',54,178,7.5,bold,gold);b.txt('CLIENT CONTACT',342,178,7.5,bold,gold);
    const contactY=b.wrap(recipient,54,198,270,11,bold,green,12);if(b.wrap(clean(data.address)||'Address: __________________________',54,contactY+4,270,8,regular,muted,10)>240)throw Error('Please shorten the care recipient details to fit the care plan.');
    b.wrap(clean(data.email)||'Email: ________________________',342,198,215,9,bold,green,11);
    b.txt('Agency: (508) 251-9346',342,220,8,regular,muted);
    b.txt('Effective on signing; prior visits separately billed.',54,241,7.4,regular,muted);
    b.bar('AGREED NON-MEDICAL SERVICES',271,services.length===8?'ALL LISTED SERVICES INCLUDED':'SELECTED SERVICES ONLY');
    serviceNames.forEach((s,i)=>b.check(s,i%2?320:49,315+Math.floor(i/2)*34,services.includes(s)));
    b.wrap('Scope: Support is non-clinical; no nursing treatment, medication administration or medical diagnosis is included. Services are performed according to Client needs and available trained staff.',49,465,510,8.4,regular,ink,11);
    b.rule(503);b.txt('AGREED SERVICE DAYS',42,516,9,bold,green);b.txt(days.length===7?'SEVEN DAYS A WEEK':'SELECTED DAYS',439,518,7.5,bold,green);
    dayNames.forEach((d,i)=>b.check(d,49+(i%4)*132,540+Math.floor(i/4)*28,days.includes(d),125));
    b.wrap('Scheduling: Visits may occur in morning, daytime or evening periods as arranged with Elite Bridge. Specific arrival and departure times are coordinated directly and recorded on each timesheet; they are not fixed by this Agreement.',49,609,510,8.4,regular,ink,11);
    b.rule(653);b.txt('AGREED RATE & BILLING',42,665,9,bold,green);b.rect(42,686,528,38);
    [['HOURLY RATE',rate],['BILLING CYCLE',billing],['INVOICE DUE',due+' calendar days']].forEach(([label,value],i)=>{b.txt(label,54+i*175,693,7,bold,muted);b.txt(value,54+i*175,706,9,bold,green);});
    b.txt('Charges are based on actual documented hours. No additional fees are agreed unless separately disclosed and accepted in writing.',42,729,6.7,regular,ink);
    b.txt('Emergency and contact instructions are maintained in the confidential care record.',42,738,6.7,regular,ink);
    b.txt('SIGNATURES ON MAIN AGREEMENT APPLY TO THIS SCHEDULE A',42,746,6,bold,green);
    return doc.save();
  }
  function init(){
    const form=document.getElementById('contractForm');if(!form)return;
    let bytes=null,url=null,version=0,timer;
    const status=document.getElementById('digitalContractStatus');
    const frame=document.getElementById('digitalContractPreview');
    const logo=fetch('/logo.png').then(r=>{if(!r.ok)throw Error('Unable to load company letterhead.');return r.arrayBuffer();});
    const get=id=>document.getElementById(id)?.value.trim()||'';
    const values=()=>({clientName:get('contractClientName'),careRecipient:get('contractCareRecipient'),address:get('contractAddress'),email:get('contractClientEmail'),preparedDate:get('contractPreparedDate'),startDate:get('contractStartDate'),hourlyRate:get('contractDayRate'),billing:get('contractBillingCycle'),dueDays:get('contractDueDays'),clientSigner:get('contractClientSigner'),agencySigner:get('contractAgencySigner'),services:Array.from(form.querySelectorAll('[name="contractServices"]:checked'),e=>e.value),days:Array.from(form.querySelectorAll('[name="contractDays"]:checked'),e=>e.value)});
    async function render(){const run=++version;bytes=null;status.textContent='Updating both pages…';try{const result=await build(values(),await logo);if(run!==version)return;bytes=result;const next=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));frame.src=next+'#view=FitH';if(url)URL.revokeObjectURL(url);url=next;status.textContent='Two-page preview updated. Unsigned - for review.';}catch(e){if(run===version)status.textContent=e.message;} }
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
