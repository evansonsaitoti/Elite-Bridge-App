import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  acknowledgeTeamMessages, getTeamContacts, getTeamConversation,
  sendTeamMessage, type TeamContact, type TeamMessage,
} from "@/lib/team-communication";

function shortTime(value:string) {
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

export default function StaffChat() {
  const colors=useColors();
  const [contacts,setContacts]=useState<TeamContact[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [messages,setMessages]=useState<TeamMessage[]>([]);
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");

  const load = useCallback(async (showLoader=false) => {
    if(showLoader)setRefreshing(true);
    try {
      const team=await getTeamContacts();
      setContacts(team);
      const next=selectedId && team.some(x=>x.id===selectedId)?selectedId:team[0]?.id||null;
      if(next !== selectedId)setSelectedId(next);
      if(next){
        const conversation=await getTeamConversation(next);
        setMessages(conversation);
        await acknowledgeTeamMessages(next).catch(()=>{});
      }else setMessages([]);
      setError("");
    } catch(e) {
      setError(e instanceof Error ? e.message : "Could not load team messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },[selectedId]);

  useFocusEffect(useCallback(()=>{
    let active=true;
    if(active)void load();
    const interval=setInterval(()=>{if(active)void load();},12000);
    return ()=>{active=false;clearInterval(interval);};
  },[load]));

  const send=async()=>{
    const body=draft.trim();
    if(!body||!selectedId||sending)return;
    setSending(true);
    try {
      const saved=await sendTeamMessage(selectedId,body);
      setDraft("");
      setMessages(current=>[...current,saved]);
      setError("");
    }catch(e){
      setError(e instanceof Error?e.message:"Could not send message. Please try again.");
    }finally{setSending(false);}
  };
  const current=contacts.find(x=>x.id===selectedId);
  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} keyboardVerticalOffset={80} style={{flex:1}}>
        <ScrollView
          style={{flex:1,backgroundColor:colors.background}}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{padding:18,paddingBottom:100}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} />}
        >
          <Text style={{fontSize:11,fontWeight:"900",letterSpacing:1.5,color:"#AD7B2C"}}>ELITE CARE · SECURE TEAM CHAT</Text>
          <Text style={{fontSize:29,fontWeight:"900",color:colors.foreground,marginTop:5}}>Messages</Text>
          <Text style={{color:colors.muted,fontSize:13,lineHeight:19,marginTop:6,marginBottom:18}}>
            Talk directly to your care agency. Messages are saved and synchronized across the Elite Bridge system.
          </Text>

          {contacts.length>1?
            <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {contacts.map(person=><TouchableOpacity key={person.id} onPress={()=>setSelectedId(person.id)}
                style={{borderWidth:1,borderColor:person.id===selectedId?"#0A4A35":"#D6E4DD",backgroundColor:person.id===selectedId?"#0A4A35":"#FFFFFF",padding:11,borderRadius:12}}>
                <Text style={{fontSize:12,fontWeight:"800",color:person.id===selectedId?"#FFFFFF":"#0A4A35"}}>{person.name}</Text>
              </TouchableOpacity>)}
            </View>:null}
          {current?<View style={{padding:14,borderRadius:17,backgroundColor:"#0A4A35",marginBottom:15}}>
              <Text style={{color:"#F2CB7D",fontSize:10,fontWeight:"900",letterSpacing:1.2}}>CONNECTED AGENCY</Text>
              <Text style={{color:"#FFFFFF",fontSize:17,fontWeight:"900",marginTop:5}}>{current.name}</Text>
              <Text style={{color:"#D2E8DC",fontSize:11,marginTop:6}}>Private conversation · Agency and assigned caregiver only</Text>
            </View>:null}
          {loading?<ActivityIndicator size="large" color="#0A4A35" style={{marginTop:24}}/>:null}
          {error?<Text accessibilityRole="alert" style={{color:"#A43B33",backgroundColor:"#FFF3F1",padding:12,borderRadius:10,marginBottom:12}}>{error}</Text>:null}
          {!loading&&!contacts.length?<View style={{padding:22,borderRadius:15,backgroundColor:colors.surface}}>
              <Text style={{fontSize:15,fontWeight:"800",color:colors.foreground}}>No connected agency yet</Text>
              <Text style={{color:colors.muted,marginTop:8,lineHeight:20}}>Accept an invitation from your employer to start secure agency messaging.</Text>
            </View>:null}
          {!loading&&current&&!messages.length?<Text style={{textAlign:"center",marginVertical:22,color:colors.muted,fontSize:13}}>
              No messages yet. Start a conversation with your agency.
            </Text>:null}
          <View style={{gap:10}}>
            {messages.map(m=>{
              const mine=m.senderId!==selectedId;
              return <View key={m.id} style={{alignSelf:mine?"flex-end":"flex-start",maxWidth:"89%",borderRadius:17,
                backgroundColor:mine?"#0A4A35":colors.surface,padding:14,
                borderWidth:mine?0:1,borderColor:colors.border}}>
                <Text style={{fontSize:13,color:mine?"#FFFFFF":colors.foreground,lineHeight:19}}>{m.content}</Text>
                <Text style={{fontSize:10,color:mine?"#BDE2D1":colors.muted,marginTop:8}}>{shortTime(m.createdAt)}{mine?(m.isRead?" · Read":" · Sent"):""}</Text>
              </View>;
            })}
          </View>
          {current?<View style={{marginTop:22,backgroundColor:colors.surface,borderRadius:17,padding:12,borderWidth:1,borderColor:colors.border}}>
              <TextInput value={draft} onChangeText={setDraft} multiline maxLength={2000}
                placeholder="Type your message to your agency…"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Caregiver message"
                style={{minHeight:64,color:colors.foreground,fontSize:14,lineHeight:20,textAlignVertical:"top"}}/>
              <TouchableOpacity disabled={sending||!draft.trim()} onPress={()=>void send()}
                style={{alignSelf:"flex-end",paddingHorizontal:21,paddingVertical:12,borderRadius:12,
                  backgroundColor:sending||!draft.trim()?"#B6C9BD":"#0A4A35"}}>
                <Text style={{fontSize:13,color:"#FFF",fontWeight:"900"}}>{sending?"Sending…":"Send message"}</Text>
              </TouchableOpacity>
            </View>:null}
          <Text style={{fontSize:11,color:colors.muted,lineHeight:17,marginTop:18}}>
            Messages may trigger a private push alert. For an emergency, call 911 first.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
