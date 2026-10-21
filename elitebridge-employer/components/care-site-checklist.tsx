import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import {
  careSiteToday, checkSiteTask, getCareSites, getSiteChecklist,
  signoffCareVisit, suggestedCarePeriod,
  type CareSite, type SiteChecklist, type SiteTask, type TaskCheckStatus, type VisitPeriod,
} from "../lib/site-checklist";

const BG="#FFFFFF", GREEN="#0A4A35", MUTED="#64776C", GOLD="#AF812C";
const stamp=(value:string|null)=>{
  if(!value)return "";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"":date.toLocaleString("en-US",{
    month:"short",day:"numeric",hour:"numeric",minute:"2-digit",
    timeZone:"America/New_York",
  });
};

export function CareSiteChecklistPanel() {
  const today=careSiteToday();
  const [period,setPeriod]=useState<VisitPeriod>(suggestedCarePeriod());
  const [sites,setSites]=useState<CareSite[]>([]);
  const [siteId,setSiteId]=useState<number|null>(null);
  const [checklist,setChecklist]=useState<SiteChecklist|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<number|null>(null);
  const [signing,setSigning]=useState(false);
  const [note,setNote]=useState("");
  const [error,setError]=useState("");
  const [saved,setSaved]=useState("");
  const load=useCallback(async()=>{
    try {
      const all=await getCareSites();
      setSites(all);
      const current=siteId&&all.some(x=>x.id===siteId)?siteId:all[0]?.id||null;
      setSiteId(current);
      setChecklist(current?await getSiteChecklist(current,today,period):null);
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load the care-site checklist.");}
    finally{setLoading(false);}
  },[siteId,today,period]);

  useFocusEffect(useCallback(()=>{void load();return()=>{};},[load]));

  const chooseSite=async(id:number)=>{
    if(id===siteId)return;
    setSiteId(id);setLoading(true);setSaved("");
    try{setChecklist(await getSiteChecklist(id,today,period));setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to load the selected client.");}
    finally{setLoading(false);}
  };
  const choosePeriod=async(next:VisitPeriod)=>{
    if(next===period)return;
    setPeriod(next);setSaved("");
    if(!siteId)return;
    setLoading(true);
    try{setChecklist(await getSiteChecklist(siteId,today,next));setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to load the selected visit.");}
    finally{setLoading(false);}
  };
  const check=async(task:SiteTask,status:TaskCheckStatus)=>{
    if(!siteId||busy!==null)return;
    setBusy(task.id);setSaved("");
    try{
      await checkSiteTask(siteId,task.id,status,today,period);
      const next=await getSiteChecklist(siteId,today,period);
      setChecklist(next);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not update this chore.");}
    finally{setBusy(null);}
  };
  const finish=async()=>{
    if(!siteId||signing)return;
    setSigning(true);setSaved("");
    try{
      await signoffCareVisit(siteId,today,period,note.trim());
      setChecklist(await getSiteChecklist(siteId,today,period));
      setNote("");setError("");
      setSaved("Handoff recorded. The next caregiver can see the completed tasks and visit history.");
      Alert.alert("Visit checklist saved","Your completed tasks and notes are available to the care team.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to sign off the visit.");}
    finally{setSigning(false);}
  };
  const button=(label:string,action:()=>void,active=false,disabled=false)=>
    <TouchableOpacity disabled={disabled} accessibilityRole="button" onPress={action}
      style={{borderRadius:10,borderWidth:1,borderColor:active?GREEN:"#D8E6DC",
        backgroundColor:active?GREEN:"#FFFFFF",paddingVertical:10,paddingHorizontal:12,
        opacity:disabled?0.5:1,minHeight:42,alignItems:"center",justifyContent:"center"}}>
      <Text style={{fontSize:12,fontWeight:"800",color:active?"#FFFFFF":GREEN}}>{label}</Text>
    </TouchableOpacity>;
  const done=checklist?.tasks.filter(x=>x.status==="done").length||0;
  const recorded=checklist?.tasks.filter(x=>x.status!=="pending").length||0;
  const all=checklist?.tasks.length||0;
  const monday=new Date(today+"T12:00:00Z").getUTCDay()===1;
  return <View style={{marginBottom:20}}>
    <View style={{backgroundColor:"#EAF4EE",borderWidth:1,borderColor:"#CEE4D5",borderRadius:19,padding:16}}>
      <Text style={{fontSize:10,fontWeight:"900",color:GOLD,letterSpacing:1.4}}>SHARED CARE CHECKLIST</Text>
      <Text style={{fontSize:21,fontWeight:"900",color:GREEN,marginTop:6}}>Before you finish your shift</Text>
      <Text style={{fontSize:12,lineHeight:19,color:"#567264",marginTop:6}}>
        Tick completed chores or mark not needed. The next caregiver will see what was done and when.
      </Text>
      {loading?<ActivityIndicator style={{marginTop:17}} color={GREEN}/>:null}
      {error?<Text accessibilityRole="alert" style={{color:"#AD3E35",marginTop:13,fontSize:12}}>{error}</Text>:null}
      {sites.length===0&&!loading?
        <Text style={{marginTop:12,color:MUTED,fontSize:12}}>No shared site checklist is available for this team.</Text>:null}
      {sites.length>1?<View style={{flexDirection:"row",gap:8,flexWrap:"wrap",marginTop:13}}>
        {sites.map(s=><View key={s.id}>{button(s.clientName,()=>void chooseSite(s.id),siteId===s.id)}</View>)}
      </View>:null}
      {checklist?<View>
        <View style={{marginTop:15,padding:13,borderRadius:13,backgroundColor:BG,borderColor:"#D8E6DD",borderWidth:1}}>
          <Text style={{color:GREEN,fontSize:16,fontWeight:"900"}}>{checklist.site.clientName}</Text>
          <Text style={{fontSize:12,color:MUTED,marginTop:5}}>{checklist.site.locationName} · {checklist.site.address}, {checklist.site.city}</Text>
          <Text style={{fontSize:12,color:MUTED,marginTop:7}}>{today} · {recorded} of {all} tasks checked · {done} completed</Text>
        </View>
        <Text style={{fontWeight:"900",color:GREEN,fontSize:12,marginTop:16,marginBottom:8}}>Which visit are you finishing?</Text>
        <View style={{flexDirection:"row",gap:7}}>
          {(["morning","evening","other"] as const).map(p=><View key={p} style={{flex:1}}>
            {button(p==="other"?"Other":p[0].toUpperCase()+p.slice(1),()=>void choosePeriod(p),period===p)}
          </View>)}
        </View>
      </View>:null}
    </View>
    {checklist?<View>
      <Text style={{fontWeight:"900",fontSize:18,color:"#113D29",marginTop:17,marginBottom:10}}>Care-site to-do list</Text>
      {checklist.tasks.map(task=>{
        const mondayOnly=task.frequency==="monday";
        const cannotMarkMonday=mondayOnly&&!monday;
        const pending=task.status==="pending";
        const statusColor=task.status==="done"?"#178044":task.status==="not_needed"?"#7D776A":"#A37627";
        return <View key={task.id} style={{backgroundColor:BG,borderRadius:15,borderColor:"#DEE9E1",borderWidth:1,padding:14,marginBottom:10}}>
          <View style={{flexDirection:"row",gap:10,alignItems:"flex-start"}}>
            <Text style={{fontSize:21,color:statusColor,width:29}}>{task.status==="done"?"☑":task.status==="not_needed"?"–":"☐"}</Text>
            <View style={{flex:1}}>
              <Text style={{fontWeight:"900",fontSize:14,lineHeight:19,color:"#173C29"}}>{task.title}</Text>
              <Text style={{color:MUTED,fontSize:11,lineHeight:17,marginTop:5}}>{task.instructions}</Text>
              {mondayOnly?<Text style={{color:"#926A24",fontSize:11,fontWeight:"800",marginTop:5}}>
                {monday?"Monday task — due today":"Monday task — not due today"}
              </Text>:null}
              {task.status!=="pending"?<Text style={{fontSize:11,color:statusColor,fontWeight:"800",marginTop:8}}>
                {task.status==="done"?"✓ Done":"Not needed"} · {task.checkedBy||"Care team"} · {stamp(task.checkedAt)}
              </Text>:null}
              {task.lastDoneAt && (pending||task.status==="not_needed")?<Text style={{fontSize:11,color:"#647A6A",marginTop:7}}>
                Last done: {stamp(task.lastDoneAt)} by {task.lastDoneBy||"Care team"}
              </Text>:null}
            </View>
          </View>
          {!cannotMarkMonday?<View style={{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12,paddingLeft:38}}>
            {task.status!=="done"&&button("✓ Completed",()=>void check(task,"done"),false,busy!==null)}
            {task.status!=="not_needed"&&button("Not needed",()=>void check(task,"not_needed"),false,busy!==null)}
            {!pending&&button("Undo",()=>void check(task,"pending"),false,busy!==null)}
          </View>:null}
        </View>;
      })}
      <View style={{backgroundColor:"#F7FAF8",borderWidth:1,borderColor:"#DDE9E1",borderRadius:16,padding:16,marginTop:5}}>
        <Text style={{fontSize:16,color:GREEN,fontWeight:"900"}}>Finish & share this handoff</Text>
        <Text style={{fontSize:12,color:MUTED,lineHeight:18,marginTop:7}}>
          Review your checks before leaving. The next person sees this visit's record and earlier completions.
        </Text>
        <TextInput value={note} onChangeText={setNote} multiline maxLength={300}
          placeholder="Optional non-medical note for the next caregiver…"
          placeholderTextColor="#829389"
          accessibilityLabel="Optional handoff note"
          style={{backgroundColor:"#FFF",color:"#173C29",fontSize:13,minHeight:72,padding:13,borderWidth:1,
            borderColor:"#DDE5DD",borderRadius:11,marginTop:13,textAlignVertical:"top"}}/>
        <Text style={{color:MUTED,fontSize:11,lineHeight:16,marginVertical:10}}>
          Do not include diagnoses, eye-drop dosing, medical records or door codes. For clinical concerns, contact your supervisor.
        </Text>
        <TouchableOpacity disabled={signing||busy!==null||recorded<1} onPress={()=>void finish()}
          style={{borderRadius:12,padding:15,backgroundColor:signing||recorded<1?"#B0C8B8":GREEN,alignItems:"center"}}>
          <Text style={{color:"#FFF",fontSize:14,fontWeight:"900"}}>{signing?"Saving…":"✓ Finish visit checklist"}</Text>
        </TouchableOpacity>
        {saved?<Text style={{color:"#107346",fontWeight:"700",fontSize:12,marginTop:11}}>{saved}</Text>:null}
      </View>
      {checklist.recentSignoffs.length>0?<View style={{marginTop:19}}>
        <Text style={{fontSize:17,color:GREEN,fontWeight:"900",marginBottom:10}}>Previous handoffs</Text>
        {checklist.recentSignoffs.slice(0,5).map(row=><View key={row.id}
          style={{backgroundColor:BG,padding:13,borderRadius:12,marginBottom:8,borderWidth:1,borderColor:"#E1EAE2"}}>
          <Text style={{color:"#224631",fontWeight:"800",fontSize:12}}>
            {row.caregiver} · {row.visitPeriod} · {stamp(row.signedAt)}
          </Text>
          {row.note?<Text style={{color:MUTED,fontSize:12,lineHeight:17,marginTop:5}}>{row.note}</Text>:null}
        </View>)}
      </View>:null}
    </View>:null}
  </View>;
}
