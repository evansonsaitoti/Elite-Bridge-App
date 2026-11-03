import { useCallback,useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View,Text,TouchableOpacity,ActivityIndicator } from 'react-native';
import { operationsApi } from '../lib/api';
export function DailyCoverage(){
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const load=useCallback(async()=>{setLoading(true);try{const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);setData(await operationsApi(`/bookings/employer/daily-overview?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`));setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load coverage');}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const time=(s:string)=>new Date(/Z$|[+-]\d\d:\d\d$/.test(s)?s:s+'Z').toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return <View style={{padding:16,borderRadius:16,backgroundColor:'#FFF',marginBottom:16}}><Text style={{fontSize:21,fontWeight:'800',color:'#075B42'}}>Today's coverage</Text><TouchableOpacity accessibilityRole="button" onPress={()=>void load()} style={{paddingVertical:12}}><Text style={{color:'#075B42'}}>Refresh coverage</Text></TouchableOpacity>{loading?<ActivityIndicator/>:null}{error?<Text accessibilityRole="alert">{error}</Text>:null}
    {!error&&data?.shifts.map((s:any)=><View key={s.id} style={{paddingVertical:12,borderTopWidth:1,borderColor:'#E4ECE7'}}><Text style={{fontWeight:'800'}}>{s.title}</Text><Text>{time(s.start_time)} – {time(s.end_time)} · {s.status}</Text><Text>{s.assigned}/{s.number_of_caregivers} assigned</Text>{!['cancelled','closed'].includes(s.status)&&s.caregivers.map((c:any)=><Text key={c.caregiverId}>{c.name} · {c.state}</Text>)}</View>)}{!error&&data?.shifts.length===0?<Text>No shifts today.</Text>:null}
    {!error&&data?.updates.length>0?<><Text style={{fontWeight:'800',marginTop:16}}>Recent shift changes</Text>{data.updates.slice(0,10).map((u:any)=><Text key={u.id} style={{marginTop:8}}>{u.first_name} {u.last_name} · {u.title} · {u.acknowledged_at?'Acknowledged':'Awaiting acknowledgment'}</Text>)}</>:null}
    {!error&&data?.deliveries.length>0?<><Text style={{fontWeight:'800',marginTop:16}}>Recent push attempts</Text><Text>Provider acceptance does not confirm display on the phone.</Text>{data.deliveries.slice(0,10).map((d:any)=><Text key={d.id} style={{marginTop:8}}>{d.first_name} · {d.type.replace(/_/g,' ')} · {d.status.replace(/_/g,' ')}</Text>)}</>:null}
  </View>;
}
