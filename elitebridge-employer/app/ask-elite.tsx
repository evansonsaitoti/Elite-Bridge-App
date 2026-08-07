import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type Plan = {
  intent: string;
  answer: string;
  evidence: string[];
  actionLabel?: string;
  route?: "/coverage" | "/compliance" | "/schedule" | "/workforce" | "/timesheets";
  confirmation?: string;
};

const QUICK = [
  "Who can cover Mary tomorrow without overtime?",
  "Which credentials expire soon?",
  "Show me payroll risks this week",
  "What needs my attention before tomorrow?",
];

function planCommand(command: string): Plan {
  const q = command.toLowerCase();
  if (q.includes("cover") || q.includes("fill") || q.includes("mary")) {
    return {
      intent: "Coverage request",
      answer: "Sarah Johnson is the strongest current match for Mary’s shift. Coverage Copilot ranks her first because she is available, has prior continuity with the client, is nearby, and does not trigger the demo overtime threshold.",
      evidence: ["Availability: clear", "Travel estimate: 14 min", "Continuity: 4 prior visits", "Projected weekly hours: 36"],
      actionLabel: "Open ranked matches",
      route: "/coverage",
      confirmation: "Elite will never assign a worker automatically without an authorized scheduler confirming the action.",
    };
  }
  if (q.includes("credential") || q.includes("expire") || q.includes("compliance")) {
    return {
      intent: "Compliance review",
      answer: "One credential is within the review window and the Massachusetts compliance inbox has additional agency-specific signals.",
      evidence: ["Sarah Johnson: CPR/First Aid expires in 8 days", "1 onboarding acknowledgment incomplete", "Agency profile: Massachusetts"],
      actionLabel: "Open Compliance Copilot",
      route: "/compliance",
    };
  }
  if (q.includes("payroll") || q.includes("overtime") || q.includes("hours")) {
    return {
      intent: "Labor-cost review",
      answer: "The demo week has two workers approaching your overtime warning threshold and two timesheets awaiting approval. No automatic payroll changes have been made.",
      evidence: ["2 pending timesheets", "1 worker projected at 39.5 hours", "1 worker projected at 38 hours"],
      actionLabel: "Review timesheets",
      route: "/timesheets",
    };
  }
  if (q.includes("tomorrow") || q.includes("attention") || q.includes("risk")) {
    return {
      intent: "Operations briefing",
      answer: "Before tomorrow: resolve one at-risk evening shift, review one expiring credential, approve two timesheets, and confirm one open respite shift.",
      evidence: ["7 PM Personal Care shift: at risk", "CPR/First Aid: 8 days to expiry", "2 timesheets pending", "1 respite shift open"],
      actionLabel: "Open schedule",
      route: "/schedule",
    };
  }
  return {
    intent: "Agency question",
    answer: "I can turn natural-language requests into staffing, scheduling, compliance and timesheet actions. This TestFlight foundation currently recognizes coverage, credentials, overtime/payroll and operations-risk requests.",
    evidence: ["Try: Who can cover Mary tomorrow?", "Try: Which credentials expire soon?", "Try: Show payroll risks this week"],
  };
}

export default function AskEliteScreen() {
  const router = useRouter();
  const [command, setCommand] = useState(QUICK[0]);
  const [submitted, setSubmitted] = useState(QUICK[0]);
  const plan = useMemo(() => planCommand(submitted), [submitted]);

  const run = () => {
    if (!command.trim()) return Alert.alert("Ask Elite", "Type a request first.");
    setSubmitted(command.trim());
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><View style={styles.badge}><Text style={styles.badgeText}>AI ACTION LAYER</Text></View></View>
    <Text style={styles.eyebrow}>ASK ELITE AI</Text>
    <Text style={styles.title}>Tell the agency what you need done.</Text>
    <Text style={styles.sub}>Elite interprets an operations request, shows the evidence it used, and prepares the next action for human confirmation.</Text>

    <View style={styles.commandCard}>
      <TextInput value={command} onChangeText={setCommand} multiline placeholder="Ask about coverage, overtime, credentials or tomorrow’s risks…" placeholderTextColor="#98A2B3" style={styles.input} />
      <TouchableOpacity onPress={run} style={styles.run}><Text style={styles.runText}>Run Elite</Text></TouchableOpacity>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>{QUICK.map((prompt) => <TouchableOpacity key={prompt} onPress={() => { setCommand(prompt); setSubmitted(prompt); }} style={styles.quick}><Text style={styles.quickText}>{prompt}</Text></TouchableOpacity>)}</ScrollView>

    <View style={styles.result}>
      <Text style={styles.intent}>{plan.intent.toUpperCase()}</Text>
      <Text style={styles.answer}>{plan.answer}</Text>
      <Text style={styles.evidenceTitle}>What Elite used</Text>
      {plan.evidence.map((item) => <View key={item} style={styles.evidenceRow}><Text style={styles.dot}>•</Text><Text style={styles.evidence}>{item}</Text></View>)}
      {plan.confirmation && <View style={styles.guardrail}><Text style={styles.guardrailTitle}>Human-in-the-loop safeguard</Text><Text style={styles.guardrailText}>{plan.confirmation}</Text></View>}
      {plan.route && plan.actionLabel && <TouchableOpacity onPress={() => router.push(plan.route!)} style={styles.action}><Text style={styles.actionText}>{plan.actionLabel}</Text></TouchableOpacity>}
    </View>

    <View style={styles.future}><Text style={styles.futureTitle}>Where this is going</Text><Text style={styles.futureText}>The production AI layer will use live agency data through a secure server so Elite can prepare schedule changes, messages, compliance drafts and reports without exposing provider keys in the mobile app.</Text></View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:48},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:"#0A4A35",fontWeight:"900",fontSize:15},badge:{backgroundColor:"#EAF4EF",borderRadius:999,paddingHorizontal:10,paddingVertical:6},badgeText:{color:"#0A4A35",fontSize:10,fontWeight:"900",letterSpacing:1},eyebrow:{color:"#C58A24",fontSize:10,fontWeight:"900",letterSpacing:1.5,marginTop:20},title:{color:"#101828",fontSize:30,lineHeight:36,fontWeight:"900",marginTop:8},sub:{color:"#667085",lineHeight:21,marginTop:7,marginBottom:16},
  commandCard:{backgroundColor:"#0A4A35",borderRadius:20,padding:14},input:{minHeight:104,backgroundColor:"white",borderRadius:13,padding:13,color:"#101828",textAlignVertical:"top",lineHeight:20},run:{backgroundColor:"#C58A24",borderRadius:11,padding:13,alignItems:"center",marginTop:10},runText:{color:"#102A22",fontWeight:"900"},quickRow:{gap:8,paddingVertical:12},quick:{maxWidth:220,backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:12,padding:10},quickText:{color:"#475467",fontWeight:"700",fontSize:11,lineHeight:16},
  result:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:18,padding:16},intent:{color:"#C58A24",fontSize:10,fontWeight:"900",letterSpacing:1.3},answer:{color:"#101828",fontSize:17,lineHeight:24,fontWeight:"800",marginTop:8},evidenceTitle:{color:"#344054",fontWeight:"900",marginTop:16,marginBottom:5},evidenceRow:{flexDirection:"row",gap:8,marginTop:5},dot:{color:"#0A4A35",fontWeight:"900"},evidence:{color:"#667085",flex:1,lineHeight:19},guardrail:{backgroundColor:"#FFF8E7",borderRadius:12,padding:11,marginTop:14},guardrailTitle:{color:"#7A4B00",fontWeight:"900",fontSize:12},guardrailText:{color:"#7A5A20",fontSize:12,lineHeight:18,marginTop:4},action:{backgroundColor:"#0A4A35",borderRadius:11,padding:13,alignItems:"center",marginTop:14},actionText:{color:"white",fontWeight:"900"},
  future:{backgroundColor:"#EAECF0",borderRadius:15,padding:14,marginTop:14},futureTitle:{color:"#344054",fontWeight:"900"},futureText:{color:"#667085",fontSize:12,lineHeight:18,marginTop:5},
});
