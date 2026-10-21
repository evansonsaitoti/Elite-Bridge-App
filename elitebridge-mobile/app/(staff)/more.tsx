import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
const options = [
  { title:"My Profile",route:"/(staff)/profile",icon:"person.crop.circle" },
  { title:"Notifications",route:"/(staff)/notifications",icon:"bell" },
  { title:"Timesheets",route:"/(staff)/timesheets",icon:"doc.text" },
  { title:"Available Shifts & Call-outs",route:"/(staff)/opportunities",icon:"calendar.badge.plus" },
  { title:"Shift Preferences",route:"/(staff)/match",icon:"slider.horizontal.3" },
  { title:"Swap Shifts",route:"/(staff)/swap-shifts",icon:"arrow.left.arrow.right" },
  { title:"Caregiver Handoffs",route:"/(staff)/handoff",icon:"checklist" },
  { title:"Incident Reports & SMS",route:"/(staff)/operations",icon:"exclamationmark.shield" },
] as const;
export default function More() {
  const router=useRouter();
  return <ScrollView style={{flex:1,backgroundColor:"#F5F9F6"}} contentContainerStyle={{padding:18,paddingBottom:30}}>
    <Text style={{color:"#075B42",fontSize:28,fontWeight:"900",marginBottom:8}}>More</Text>
    <Text style={{color:"#66796E",marginBottom:18}}>Your profile, notifications, and care tools.</Text>
    {options.map(item => <TouchableOpacity key={item.title} accessibilityRole="button" onPress={() => router.push(item.route)}
      style={{backgroundColor:"#FFF",borderColor:"#DFE9E1",borderWidth:1,borderRadius:18,minHeight:70,marginBottom:10,padding:16,flexDirection:"row",alignItems:"center",gap:14}}>
      <View style={{width:45,height:45,backgroundColor:"#E8F5EC",borderRadius:15,alignItems:"center",justifyContent:"center"}}>
        <IconSymbol name={item.icon} color="#075B42" size={25}/>
      </View><Text style={{color:"#182F24",fontSize:15,fontWeight:"800",flex:1}}>{item.title}</Text><IconSymbol name="chevron.right" color="#718A7C" size={18}/>
    </TouchableOpacity>)}
  </ScrollView>;
}
