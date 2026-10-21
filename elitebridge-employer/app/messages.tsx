import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  acknowledgeTeamMessages, getTeamContacts, getTeamConversation, sendTeamMessage,
  type TeamContact, type TeamMessage,
} from "../lib/team-communication";
import { colors } from "../lib/theme";

function stamp(value:string){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"":d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

export default function EmployerTeamMessages(){
  const params=useLocalSearchParams<{caregiver?:string}>();
  const chosenId=Number(params.caregiver);
  const [contacts,setContacts]=useState<TeamContact[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [messages,setMessages]=useState<TeamMessage[]>([]);
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");

  const refresh=useCallback(async(manual=false)=>{
    if(manual)setRefreshing(true);
    try {
      const people=await getTeamContacts();
      setContacts(people);
      const next=selectedId&&people.some(p=>p.id===selectedId)?selectedId:
        Number.isInteger(chosenId)&&people.some(p=>p.id===chosenId)?chosenId:people[0]?.id||null;
      if(next!==selectedId)setSelectedId(next);
      if(next){
        setMessages(await getTeamConversation(next));
        await acknowledgeTeamMessages(next).catch(()=>{});
      }else setMessages([]);
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load agency messages.");}
    finally{setLoading(false);setRefreshing(false);}
  },[chosenId,selectedId]);

  useFocusEffect(useCallback(()=>{
    void refresh();
    const timer=setInterval(()=>{void refresh();},12000);
    return ()=>clearInterval(timer);
  },[refresh]));

  const change=async(id:number)=>{
    setSelectedId(id);
    try {setMessages(await getTeamConversation(id));await acknowledgeTeamMessages(id).catch(()=>{});setError("");}
    catch(e){setError(e instanceof Error?e.message:"Could not load this caregiver conversation.");}
  };
  const send=async()=>{
    const message=draft.trim();
    if(!message||!selectedId||sending)return;
    setSending(true);
    try {
      const saved=await sendTeamMessage(selectedId,message);
      setDraft("");
      setMessages(current=>[...current,saved]);
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to send message.");}
    finally{setSending(false);}
  };
  const contact=contacts.find(c=>c.id===selectedId);
  return <SafeAreaView edges={["bottom"]} style={{flex:1,backgroundColor:colors.background}}>
    <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} keyboardVerticalOffset={85} style={{flex:1}}>
      <ScrollView contentContainerStyle={{padding:18,paddingBottom:90}}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh(true)} tintColor={colors.green}/>}>
        <Text style={{fontSize:11,fontWeight:"900",letterSpacing:1.5,color:"#A27A30"}}>ELITE WORK · TEAM COMMUNICATION</Text>
        <Text style={{fontSize:29,color:colors.green,fontWeight:"900",marginTop:5}}>Caregiver messages</Text>
        <Text style={{fontSize:13,color:colors.muted,lineHeight:20,marginTop:8,marginBottom:16}}>
          Send private shift updates to caregivers using the same accounts they use in Elite Care.
        </Text>
        {contacts.length>0?<ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap:8,paddingBottom:12}}>
          {contacts.map(c=><TouchableOpacity key={c.id} onPress={()=>void change(c.id)}
            style={{minWidth:120,borderRadius:12,padding:13,backgroundColor:selectedId===c.id?colors.green:"#FFFFFF",
              borderWidth:1,borderColor:selectedId===c.id?colors.green:colors.border}}>
            <Text style={{fontSize:13,fontWeight:"900",color:selectedId===c.id?"#FFFFFF":colors.green}}>{c.name}</Text>
          </TouchableOpacity>)}
        </ScrollView>:null}
        {contact?<View style={{padding:15,borderRadius:15,backgroundColor:colors.green,marginBottom:15}}>
          <Text style={{color:"#E8C57F",fontWeight:"900",fontSize:10,letterSpacing:1.2}}>ACTIVE CAREGIVER</Text>
          <Text style={{color:"#FFF",fontSize:18,fontWeight:"900",marginTop:6}}>{contact.name}</Text>
          <Text style={{color:"#D9E9E0",fontSize:11,marginTop:6}}>Private messages are delivered to the caregiver's Elite Care account.</Text>
        </View>:null}
        {loading?<ActivityIndicator color={colors.green} size="large" style={{marginVertical:22}}/>:null}
        {error?<Text accessibilityRole="alert" style={{padding:13,backgroundColor:"#FFF2EF",color:"#AD423A",borderRadius:11,marginBottom:14}}>{error}</Text>:null}
        {!loading&&!contacts.length?<Text style={{padding:20,backgroundColor:colors.card,color:colors.muted,borderRadius:14}}>
          No active caregiver links yet. Invite a caregiver or approve an assignment to start messaging.
        </Text>:null}
        {!loading&&contact&&!messages.length?<Text style={{color:colors.muted,marginVertical:20,textAlign:"center"}}>
          No messages yet. Send the first team update below.
        </Text>:null}
        <View style={{gap:10}}>
          {messages.map(m=>{
            const mine=m.senderId!==selectedId;
            return <View key={m.id} style={{backgroundColor:mine?colors.green:colors.card,
              padding:14,borderRadius:16,borderColor:colors.border,borderWidth:mine?0:1,
              maxWidth:"88%",alignSelf:mine?"flex-end":"flex-start"}}>
              <Text style={{fontSize:13,lineHeight:20,color:mine?"#FFF":colors.ink}}>{m.content}</Text>
              <Text style={{fontSize:10,color:mine?"#CBE6D8":colors.muted,marginTop:7}}>{stamp(m.createdAt)}{mine?(m.isRead?" · Read":" · Sent"):""}</Text>
            </View>;
          })}
        </View>
        {contact?<View style={{marginTop:20,backgroundColor:colors.card,padding:13,borderColor:colors.border,borderWidth:1,borderRadius:16}}>
          <TextInput value={draft} onChangeText={setDraft} multiline maxLength={2000}
            accessibilityLabel="Message to caregiver"
            placeholder="Type a message for the caregiver…" placeholderTextColor={colors.muted}
            style={{minHeight:77,color:colors.ink,fontSize:14,textAlignVertical:"top"}}/>
          <TouchableOpacity disabled={!draft.trim()||sending} onPress={()=>void send()}
            style={{alignSelf:"flex-end",borderRadius:10,paddingVertical:12,paddingHorizontal:19,
              backgroundColor:draft.trim()&&!sending?colors.green:"#B4C9BD"}}>
            <Text style={{color:"#FFFFFF",fontSize:13,fontWeight:"900"}}>{sending?"Sending…":"Send to Elite Care"}</Text>
          </TouchableOpacity>
        </View>:null}
        <Text style={{marginTop:18,fontSize:11,lineHeight:17,color:colors.muted}}>
          Push previews contain no private client details. For immediate danger, call emergency services.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
