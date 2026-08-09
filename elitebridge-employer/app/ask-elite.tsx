import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { askElite, sharedApiConfigured, type AskEliteResponse } from "../lib/shared-api";

const QUICK = [
  "What needs my attention before tomorrow?",
  "Do I have any coverage risks?",
  "Show me overtime and labor-cost risk",
  "How many caregiver applications need review?",
];

const EMPTY: AskEliteResponse = {
  intent: "Operations assistant",
  answer: "Ask Elite can review live coverage, applications, call-outs, workforce availability and scheduled assignments, then prepare the safest next action for your agency.",
  evidence: ["Coverage and call-out queue", "Caregiver applications", "Upcoming assignments", "Workforce availability"],
  confirmation: "Elite prepares recommendations. Authorized agency staff keep control of assignments, applicants, payroll and compliance decisions.",
  generatedAt: new Date(0).toISOString(),
};

export default function AskEliteScreen() {
  const router = useRouter();
  const [command, setCommand] = useState(QUICK[0]);
  const [plan, setPlan] = useState<AskEliteResponse>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (nextCommand = command) => {
    const value = nextCommand.trim();
    if (!value) return Alert.alert("Ask Elite", "Type an operations request first.");
    if (!sharedApiConfigured) {
      setPlan(EMPTY);
      setError("Secure agency sync is unavailable in this local preview.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const result = await askElite(value);
      setPlan(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Elite could not load live agency signals.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (sharedApiConfigured) void run(QUICK[0]);
  }, []);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><View style={styles.badge}><Text style={styles.badgeText}>LIVE OPERATIONS</Text></View></View>
    <Text style={styles.eyebrow}>ASK ELITE</Text>
    <Text style={styles.title}>Ask the agency what needs attention.</Text>
    <Text style={styles.sub}>Elite reads current operational signals, explains the evidence it used, and prepares the next action for human confirmation.</Text>

    <View style={styles.commandCard}>
      <TextInput value={command} onChangeText={setCommand} multiline placeholder="Ask about coverage, applications, overtime or tomorrow's risks…" placeholderTextColor="#98A2B3" style={styles.input} />
      <TouchableOpacity disabled={busy} onPress={() => void run()} style={[styles.run, busy && { opacity: 0.7 }]}>{busy ? <ActivityIndicator color="#102A22" /> : <Text style={styles.runText}>Ask Elite</Text>}</TouchableOpacity>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>{QUICK.map((prompt) => <TouchableOpacity key={prompt} onPress={() => { setCommand(prompt); void run(prompt); }} style={styles.quick}><Text style={styles.quickText}>{prompt}</Text></TouchableOpacity>)}</ScrollView>

    {error ? <View style={styles.error}><Text style={styles.errorTitle}>Live operations unavailable</Text><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => void run()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}

    <View style={styles.result}>
      <View style={styles.resultTop}><Text style={styles.intent}>{plan.intent.toUpperCase()}</Text>{busy ? <ActivityIndicator size="small" color="#0A4A35" /> : null}</View>
      <Text style={styles.answer}>{plan.answer}</Text>
      <Text style={styles.evidenceTitle}>Live signals Elite used</Text>
      {plan.evidence.map((item) => <View key={item} style={styles.evidenceRow}><Text style={styles.dot}>•</Text><Text style={styles.evidence}>{item}</Text></View>)}
      {plan.confirmation ? <View style={styles.guardrail}><Text style={styles.guardrailTitle}>Human-in-the-loop safeguard</Text><Text style={styles.guardrailText}>{plan.confirmation}</Text></View> : null}
      {plan.route && plan.actionLabel ? <TouchableOpacity onPress={() => router.push(plan.route!)} style={styles.action}><Text style={styles.actionText}>{plan.actionLabel}</Text></TouchableOpacity> : null}
    </View>

    <View style={styles.security}><Text style={styles.securityTitle}>Secure by design</Text><Text style={styles.securityText}>Ask Elite uses the authenticated server connection already used by scheduling and coverage. No provider credentials or agency database secrets are stored in the mobile app.</Text></View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:48},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:"#0A4A35",fontWeight:"900",fontSize:15},badge:{backgroundColor:"#EAF4EF",borderRadius:999,paddingHorizontal:10,paddingVertical:6},badgeText:{color:"#0A4A35",fontSize:10,fontWeight:"900",letterSpacing:1},eyebrow:{color:"#C58A24",fontSize:10,fontWeight:"900",letterSpacing:1.5,marginTop:20},title:{color:"#101828",fontSize:30,lineHeight:36,fontWeight:"900",marginTop:8},sub:{color:"#667085",lineHeight:21,marginTop:7,marginBottom:16},
  commandCard:{backgroundColor:"#0A4A35",borderRadius:20,padding:14},input:{minHeight:104,backgroundColor:"white",borderRadius:13,padding:13,color:"#101828",textAlignVertical:"top",lineHeight:20},run:{backgroundColor:"#C58A24",borderRadius:11,padding:13,alignItems:"center",marginTop:10,minHeight:46,justifyContent:"center"},runText:{color:"#102A22",fontWeight:"900"},quickRow:{gap:8,paddingVertical:12},quick:{maxWidth:220,backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:12,padding:10},quickText:{color:"#475467",fontWeight:"700",fontSize:11,lineHeight:16},
  result:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:18,padding:16},resultTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},intent:{color:"#C58A24",fontSize:10,fontWeight:"900",letterSpacing:1.3},answer:{color:"#101828",fontSize:17,lineHeight:24,fontWeight:"800",marginTop:8},evidenceTitle:{color:"#344054",fontWeight:"900",marginTop:16,marginBottom:5},evidenceRow:{flexDirection:"row",gap:8,marginTop:5},dot:{color:"#0A4A35",fontWeight:"900"},evidence:{color:"#667085",flex:1,lineHeight:19},guardrail:{backgroundColor:"#FFF8E7",borderRadius:12,padding:11,marginTop:14},guardrailTitle:{color:"#7A4B00",fontWeight:"900",fontSize:12},guardrailText:{color:"#7A5A20",fontSize:12,lineHeight:18,marginTop:4},action:{backgroundColor:"#0A4A35",borderRadius:11,padding:13,alignItems:"center",marginTop:14},actionText:{color:"white",fontWeight:"900"},
  security:{backgroundColor:"#EAF4EF",borderRadius:15,padding:14,marginTop:14},securityTitle:{color:"#0A4A35",fontWeight:"900"},securityText:{color:"#475467",fontSize:12,lineHeight:18,marginTop:5},error:{backgroundColor:"#FEE4E2",borderRadius:14,padding:13,marginBottom:12},errorTitle:{color:"#B42318",fontWeight:"900"},errorText:{color:"#7A271A",fontSize:12,lineHeight:18,marginTop:4},retry:{alignSelf:"flex-start",backgroundColor:"#B42318",borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginTop:8},retryText:{color:"white",fontWeight:"900",fontSize:11},
});
