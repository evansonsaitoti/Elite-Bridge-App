import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CareSiteChecklistPanel } from "@/components/care-site-checklist";
import {
  completeHandoffTask, getHandoffClients, getHandoffItems, postHandoff,
  type HandoffClient, type HandoffItem,
} from "@/lib/team-communication";

function stamp(value:string) {
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"":d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

export default function HandoffsScreen() {
  const [clients,setClients]=useState<HandoffClient[]>([]);
  const [selected,setSelected]=useState<number|null>(null);
  const [items,setItems]=useState<HandoffItem[]>([]);
  const [kind,setKind]=useState<"note"|"task">("task");
  const [content,setContent]=useState("");
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [busyId,setBusyId]=useState<number|null>(null);
  const [error,setError]=useState("");

  const refresh=useCallback(async(userRefresh=false)=>{
    if(userRefresh)setRefreshing(true);
    try {
      const list=await getHandoffClients();
      setClients(list);
      const current=selected&&list.some(c=>c.shiftId===selected)?selected:list[0]?.shiftId||null;
      if(current!==selected)setSelected(current);
      setItems(current?await getHandoffItems(current):[]);
      setError("");
    }catch(e) {
      setError(e instanceof Error?e.message:"Could not load handoff notes.");
    }finally{setLoading(false);setRefreshing(false);}
  },[selected]);

  useFocusEffect(useCallback(()=>{
    void refresh();
    return ()=>{};
  },[refresh]));

  const changeClient=async(id:number)=>{
    setSelected(id);
    setLoading(true);
    try {setItems(await getHandoffItems(id));setError("");}
    catch(e){setError(e instanceof Error?e.message:"Could not load this care plan.");}
    finally{setLoading(false);}
  };
  const save=async()=>{
    const message=content.trim();
    if(!selected||message.length<4||saving)return;
    setSaving(true);
    try{
      await postHandoff(selected,kind,message);
      setContent("");
      setItems(await getHandoffItems(selected));
      setError("");
      Alert.alert("Handoff saved","Your note is stored for the next assigned caregiver.");
    }catch(e){setError(e instanceof Error?e.message:"Could not save your handoff.");}
    finally{setSaving(false);}
  };
  const complete=async(item:HandoffItem)=>{
    if(!selected||busyId!==null)return;
    setBusyId(item.id);
    try{
      await completeHandoffTask(selected,item.id);
      setItems(await getHandoffItems(selected));
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not complete the task.");}
    finally{setBusyId(null);}
  };

  const current=clients.find(c=>c.shiftId===selected);
  const pending=items.filter(x=>x.kind==="task"&&x.status==="open");
  const notes=items.filter(x=>x.kind==="note");
  const completed=items.filter(x=>x.kind==="task"&&x.status==="done");
  const card=(item:HandoffItem,showComplete=false)=><View key={item.id} style={{
    backgroundColor:"#FFFFFF",borderColor:"#E0E9E3",borderWidth:1,borderRadius:15,padding:14,marginBottom:10
  }}>
    <Text style={{fontSize:14,lineHeight:21,color:"#173D2B",fontWeight:"700"}}>{item.content}</Text>
    <Text style={{fontSize:11,color:"#6B8073",marginTop:9}}>{item.authorName} · {stamp(item.createdAt)}</Text>
    {item.status==="done"?<Text style={{color:"#24774B",fontSize:11,fontWeight:"800",marginTop:7}}>✓ Completed</Text>:null}
    {showComplete?<TouchableOpacity disabled={busyId!==null} onPress={()=>void complete(item)}
      accessibilityLabel={"Mark task complete: "+item.content}
      style={{marginTop:12,borderRadius:10,borderColor:"#BCD9C7",borderWidth:1,alignSelf:"flex-start",paddingVertical:10,paddingHorizontal:13}}>
      <Text style={{color:"#0B5536",fontWeight:"900",fontSize:12}}>{busyId===item.id?"Saving…":"✓ Mark completed"}</Text>
    </TouchableOpacity>:null}
  </View>;
  return <SafeAreaView edges={["bottom"]} style={{flex:1,backgroundColor:"#F5F8F5"}}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{padding:18,paddingBottom:70}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh(true)}/>}>
      <Text style={{color:"#A57C34",fontWeight:"900",fontSize:11,letterSpacing:1.3}}>ELITE BRIDGE · CARE TEAM</Text>
      <Text style={{fontSize:27,fontWeight:"900",color:"#093F29",marginTop:5}}>Caregiver handoff</Text>
      <Text style={{fontSize:13,lineHeight:20,color:"#60756A",marginTop:8,marginBottom:18}}>
        Share what needs doing next. Notes and checklists stay with the client for the next assigned caregiver.
      </Text>

      <CareSiteChecklistPanel />
      {error?<Text accessibilityRole="alert" style={{color:"#A23831",backgroundColor:"#FFF0EC",padding:13,borderRadius:10,marginBottom:14}}>{error}</Text>:null}
      {loading?<ActivityIndicator color="#0B5536" size="large" style={{marginVertical:25}}/>:null}
      {!loading&&!clients.length?<View style={{backgroundColor:"#FFF",padding:24,borderRadius:16,borderColor:"#E2EAE4",borderWidth:1}}>
        <Text style={{fontWeight:"900",fontSize:16,color:"#0B5536"}}>No assigned client shifts</Text>
        <Text style={{fontSize:13,color:"#667669",lineHeight:20,marginTop:8}}>
          Handoffs become available once your employer approves a shift assignment.
        </Text>
      </View>:null}
      {clients.length>0?<View>
        <Text style={{fontSize:12,color:"#345645",fontWeight:"900",marginBottom:10}}>Choose a client</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9,paddingBottom:7}}>
          {clients.map(c=><TouchableOpacity key={c.shiftId} onPress={()=>void changeClient(c.shiftId)}
            style={{backgroundColor:selected===c.shiftId?"#0A4A35":"#FFF",borderColor:selected===c.shiftId?"#0A4A35":"#D8E5DD",
              borderWidth:1,padding:13,borderRadius:13,minWidth:128}}>
            <Text style={{color:selected===c.shiftId?"#FFF":"#164630",fontWeight:"900",fontSize:13}}>{c.clientName}</Text>
            <Text style={{color:selected===c.shiftId?"#D2E8D9":"#6C8072",fontSize:11,marginTop:3}}>{c.location}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {current?<View style={{backgroundColor:"#0A4A35",borderRadius:17,padding:17,marginVertical:16}}>
          <Text style={{color:"#DBBC6D",fontSize:10,fontWeight:"900",letterSpacing:1.3}}>HANDOFF FOR</Text>
          <Text style={{color:"#FFF",fontSize:20,fontWeight:"900",marginTop:5}}>{current.clientName}</Text>
          <Text style={{color:"#D5E7DD",fontSize:12,marginTop:6}}>{current.agency} · {current.location}</Text>
        </View>:null}
        <View style={{backgroundColor:"#FFF",borderRadius:18,padding:16,borderWidth:1,borderColor:"#DFEAE2",marginBottom:20}}>
          <Text style={{fontSize:16,fontWeight:"900",color:"#0B482F"}}>Leave something for the next caregiver</Text>
          <View style={{flexDirection:"row",gap:9,marginTop:14}}>
            {(["task","note"] as const).map(v=><TouchableOpacity key={v} onPress={()=>setKind(v)}
              style={{flex:1,alignItems:"center",borderRadius:11,padding:12,borderWidth:1,
                borderColor:kind===v?"#0A4A35":"#DFE7E1",backgroundColor:kind===v?"#E5F4EB":"#FFF"}}>
              <Text style={{fontWeight:"900",fontSize:13,color:"#0A4A35"}}>{v==="task"?"☐ To-do task":"✎ Handoff note"}</Text>
            </TouchableOpacity>)}
          </View>
          <TextInput value={content} onChangeText={setContent} maxLength={700} multiline
            accessibilityLabel={kind==="task"?"Task for next caregiver":"Handoff note"}
            placeholder={kind==="task"?"Example: Prepare breakfast supplies for next visit":"Example: Laundry is in the dryer; please check at next visit"}
            placeholderTextColor="#8C9E93"
            style={{minHeight:100,borderRadius:12,marginTop:12,padding:13,
              borderWidth:1,borderColor:"#D9E7DD",backgroundColor:"#FDFEFD",fontSize:14,color:"#153D29",textAlignVertical:"top"}}/>
          <Text style={{fontSize:11,color:"#697C70",lineHeight:17,marginTop:8}}>
            Operational reminders only. Do not record diagnoses, medication details, financial information or door codes here. Use the incident workflow for urgent concerns.
          </Text>
          <TouchableOpacity disabled={!selected||content.trim().length<4||saving} onPress={()=>void save()}
            style={{backgroundColor:!selected||content.trim().length<4||saving?"#A5C3B1":"#0A4A35",
              borderRadius:12,padding:15,marginTop:13,alignItems:"center"}}>
            <Text style={{color:"#FFF",fontSize:14,fontWeight:"900"}}>{saving?"Saving…":kind==="task"?"Add to next caregiver's checklist":"Save handoff note"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{color:"#0B482F",fontSize:18,fontWeight:"900",marginBottom:10}}>Next-shift checklist ({pending.length})</Text>
        {pending.length?pending.map(x=>card(x,true)):<Text style={{color:"#6B7F71",fontSize:12,marginBottom:17}}>No outstanding tasks for this client.</Text>}
        <Text style={{color:"#0B482F",fontSize:18,fontWeight:"900",marginTop:9,marginBottom:10}}>Care notes</Text>
        {notes.length?notes.map(x=>card(x)):<Text style={{color:"#6B7F71",fontSize:12,marginBottom:17}}>No handoff notes yet.</Text>}
        {completed.length?<View style={{marginTop:8}}>
          <Text style={{color:"#0B482F",fontSize:16,fontWeight:"900",marginBottom:10}}>Completed tasks</Text>
          {completed.map(x=>card(x))}
        </View>:null}
      </View>:null}
    </ScrollView>
  </SafeAreaView>;
}
