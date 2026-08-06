import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const items=[
{title:"Timesheets",detail:"2 pending approvals",action:"Review",route:"/timesheets" as const},
{title:"Coverage",detail:"1 at-risk shift tonight",action:"Rescue",route:"/coverage" as const},
{title:"Compliance",detail:"3 Massachusetts items need attention",action:"Open",route:null},
{title:"Payroll",detail:"$2,840 estimated gross this week",action:"Prepare",route:null},
{title:"Records",detail:"4 visit notes · 1 unread message",action:"View",route:null},
];
export default function OperationsScreen(){const router=useRouter();return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><Text style={s.eye}>ELITE BRIDGE EMPLOYER</Text><Text style={s.title}>Operations</Text><Text style={s.sub}>One inbox for the work that usually gets buried across texts, spreadsheets and payroll tabs.</Text>
<View style={s.ai}><Text style={s.aiEye}>OPERATIONS COPILOT</Text><Text style={s.aiTitle}>Your highest-priority action is coverage.</Text><Text style={s.aiText}>The 7 PM Dracut shift is still unassigned. Resolving it now also avoids a likely late-arrival cascade tomorrow morning.</Text><TouchableOpacity style={s.aiButton} onPress={()=>router.push("/coverage")}><Text style={s.aiButtonText}>Fix it now</Text></TouchableOpacity></View>
{items.map(i=><View key={i.title} style={s.card}><View style={{flex:1}}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.meta}>{i.detail}</Text></View><TouchableOpacity style={s.button} onPress={()=>i.route?router.push(i.route):Alert.alert(i.title,"This workflow is staged for the combined TestFlight build.")}><Text style={s.buttonText}>{i.action}</Text></TouchableOpacity></View>)}
</ScrollView></SafeAreaView>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:90},eye:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#C58A24"},title:{fontSize:30,fontWeight:"900",color:"#101828",marginTop:4},sub:{color:"#667085",marginTop:6,marginBottom:16,lineHeight:20},ai:{backgroundColor:"#0A4A35",borderRadius:18,padding:17,marginBottom:16},aiEye:{color:"#EBCB8B",fontSize:10,fontWeight:"900",letterSpacing:1.3},aiTitle:{color:"white",fontSize:19,fontWeight:"900",marginTop:7},aiText:{color:"#D8E9E2",fontSize:13,lineHeight:19,marginTop:7},aiButton:{alignSelf:"flex-start",marginTop:12,backgroundColor:"white",paddingHorizontal:13,paddingVertical:10,borderRadius:10},aiButtonText:{color:"#0A4A35",fontWeight:"900"},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:15,padding:15,marginBottom:11,flexDirection:"row",alignItems:"center",gap:12},cardTitle:{fontSize:16,fontWeight:"900",color:"#101828"},meta:{fontSize:12,color:"#667085",marginTop:4},button:{backgroundColor:"#ECF6F1",paddingHorizontal:12,paddingVertical:9,borderRadius:9},buttonText:{color:"#0A4A35",fontWeight:"900",fontSize:12}});
