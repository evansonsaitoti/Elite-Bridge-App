import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {fetchMyApplications,fetchTimeCorrections,requestTimeCorrection,type CaregiverApplication,type TimeCorrectionRequest} from '@/lib/shared-api';
import {useColors} from '@/hooks/use-colors';
function localInstant(value:string) {
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new Error('Use YYYY-MM-DD HH:mm, for example 2026-11-04 09:00.');
  const date=new Date(value.replace(' ','T')+':00');
  const parts=[date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes()];
  const expected=value.match(/\d+/g)!.map(Number);
  if(!Number.isFinite(date.getTime())||parts.some((v,i)=>v!==expected[i])) throw new Error('Enter a valid local date and time.');
  return date.toISOString();
}
export function TimeCorrectionForm({shiftId,onSaved}:{shiftId?:string;onSaved:()=>Promise<void>}) {
  const colors=useColors();const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [choices,setChoices]=useState<CaregiverApplication[]>([]),[requests,setRequests]=useState<TimeCorrectionRequest[]>([]);
  const [selected,setSelected]=useState(shiftId||''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState('');
  const load=useCallback(async()=>{try{const [a,r]=await Promise.all([fetchMyApplications(),fetchTimeCorrections()]);setChoices(a.filter(x=>x.status==='approved'&&!['cancelled','closed'].includes(x.shift.status)&&new Date(x.shift.startTime).getTime()<Date.now()));setRequests(r.requests);setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load corrections');}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  async function submit(){if(busy)return;setBusy(true);try{if(!selected)throw new Error('Select the shift you worked.');await requestTimeCorrection({shiftId:Number(selected),clockInAt:localInstant(start),clockOutAt:localInstant(end),reason});setStart('');setEnd('');setReason('');await load();await onSaved();setOpen(false);Alert.alert('Request submitted','Your employer must review and approve the correction. Your recorded hours have not changed.');}catch(e){Alert.alert('Could not submit',e instanceof Error?e.message:'Please try again');}finally{setBusy(false);}}
  return <View style={{padding:16,borderWidth:1,borderColor:colors.border,borderRadius:16,marginBottom:18}}>
    <TouchableOpacity onPress={()=>setOpen(!open)} accessibilityRole="button"><Text style={{color:colors.foreground,fontWeight:'800',fontSize:17}}>Missed a clock-in or clock-out?</Text><Text style={{color:colors.muted,marginTop:6}}>Request a time correction for employer approval.</Text></TouchableOpacity>
    {!!error&&<Text style={{color:'#B42318',marginTop:10}}>{error}</Text>}
    {open&&<View style={{gap:12,marginTop:16}}>
      <Text style={{color:colors.foreground}}>Select the shift you worked</Text>
      {choices.length===0&&<Text style={{color:colors.muted}}>No past assigned shifts found.</Text>}
      {choices.slice(-50).map(a=><TouchableOpacity key={a.shift.id} accessibilityRole="button" onPress={()=>setSelected(String(a.shift.id))} style={{padding:12,borderWidth:1,borderColor:selected===String(a.shift.id)?'#0A4A35':colors.border,borderRadius:8}}><Text style={{color:colors.foreground}}>{selected===String(a.shift.id)?'✓ ':''}{a.shift.title} · {new Date(a.shift.startTime).toLocaleDateString()}</Text></TouchableOpacity>)}
      <Text style={{color:colors.muted}}>Enter the actual times you worked, using your phone's time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Include the end date for overnight visits.</Text>
      {[['Actual start',start,setStart],['Actual end',end,setEnd]] .map(([label,value,setter])=><View key={label as string}><Text style={{color:colors.foreground}}>{label as string}</Text><TextInput accessibilityLabel={label as string} value={value as string} onChangeText={setter as (s:string)=>void} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={colors.muted} style={{borderWidth:1,borderColor:colors.border,padding:12,borderRadius:8,color:colors.foreground}}/></View>)}
      <Text style={{color:colors.foreground}}>Reason for correction</Text><TextInput accessibilityLabel="Reason for correction" value={reason} onChangeText={setReason} multiline maxLength={2000} style={{borderWidth:1,borderColor:colors.border,padding:12,borderRadius:8,color:colors.foreground}}/>
      <TouchableOpacity accessibilityRole="button" disabled={busy||!!error} onPress={submit} style={{backgroundColor:'#0A4A35',padding:14,borderRadius:8,opacity:busy?0.5:1}}><Text style={{color:'white',fontWeight:'700'}}>Submit for approval</Text></TouchableOpacity>
    </View>}
    {requests.slice(0,5).map(r=><View key={r.id} style={{marginTop:14}}><Text style={{color:colors.foreground,fontWeight:'700'}}>{new Date(r.clock_in_at).toLocaleString()} — {new Date(r.clock_out_at).toLocaleString()}</Text><Text style={{color:colors.muted}}>Correction {r.status}{r.review_note?` · ${r.review_note}`:''}</Text></View>)}
  </View>;
}
