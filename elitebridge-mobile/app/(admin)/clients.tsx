import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type ClientStatus = "Active" | "On Hold" | "Discharged";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  schedule: string;
  emergencyContact: string;
  careNotes: string;
  status: ClientStatus;
};

const STORAGE_KEY = "elite_bridge_clients_v1";

const seedClients: Client[] = [
  {
    id: "c1",
    name: "Mary Thompson",
    phone: "(978) 555-0142",
    email: "mary.thompson@example.com",
    address: "18 Riverside St, Lowell, MA",
    service: "Personal Care & Meal Preparation",
    schedule: "Mon–Fri, 8:00 AM–2:00 PM",
    emergencyContact: "David Thompson • (978) 555-0188",
    careNotes: "Fall-risk precautions. Prefers morning shower and light breakfast before activities.",
    status: "Active",
  },
  {
    id: "c2",
    name: "Robert Davis",
    phone: "(978) 555-0196",
    email: "robert.davis@example.com",
    address: "42 Lakeview Ave, Dracut, MA",
    service: "Companionship & Transportation",
    schedule: "Tue/Thu/Sat, 3:00 PM–8:00 PM",
    emergencyContact: "Angela Davis • (603) 555-0114",
    careNotes: "Enjoys walks and card games. Transportation needed for Thursday appointments.",
    status: "Active",
  },
  {
    id: "c3",
    name: "Alice Green",
    phone: "(978) 555-0133",
    email: "alice.green@example.com",
    address: "7 Beacon Rd, Chelmsford, MA",
    service: "Respite Care",
    schedule: "As requested by family",
    emergencyContact: "Monica Green • (978) 555-0177",
    careNotes: "Family requests 48-hour notice for schedule changes.",
    status: "On Hold",
  },
];

const emptyDraft: Omit<Client, "id"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  service: "",
  schedule: "",
  emergencyContact: "",
  careNotes: "",
  status: "Active",
};

export default function ClientsScreen() {
  const colors = useColors();
  const [clients, setClients] = useState<Client[]>(seedClients);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        setClients(JSON.parse(saved) as Client[]);
      } catch {
        // Keep the demo records if saved data cannot be read.
      }
    });
  }, []);

  const persist = (next: Client[]) => {
    setClients(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.address, client.service, client.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [clients, query]);

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(false);
  };

  const saveClient = () => {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.address.trim() || !draft.service.trim()) {
      Alert.alert("Missing information", "Enter the client name, phone, address, and service.");
      return;
    }

    if (editingId) {
      persist(clients.map((client) => (client.id === editingId ? { ...client, ...draft } : client)));
      Alert.alert("Client updated", `${draft.name} was updated successfully.`);
    } else {
      persist([{ id: `c-${Date.now()}`, ...draft }, ...clients]);
      Alert.alert("Client added", `${draft.name} is now in the client directory.`);
    }
    resetForm();
  };

  const editClient = (client: Client) => {
    const { id, ...values } = client;
    setEditingId(id);
    setDraft(values);
    setShowForm(true);
  };

  const removeClient = (client: Client) => {
    Alert.alert("Delete client?", `${client.name}'s record will be removed from this device.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => persist(clients.filter((item) => item.id !== client.id)),
      },
    ]);
  };

  const cycleStatus = (client: Client) => {
    const nextStatus: ClientStatus =
      client.status === "Active" ? "On Hold" : client.status === "On Hold" ? "Discharged" : "Active";
    persist(clients.map((item) => (item.id === client.id ? { ...item, status: nextStatus } : item)));
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.foreground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  } as const;

  const buttonStyle = {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: colors.foreground, fontSize: 30, fontWeight: "900" }}>Clients</Text>
        <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 16 }}>
          Manage service plans, schedules, contacts, and client status.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>{clients.length}</Text>
            <Text style={{ color: colors.muted }}>Total clients</Text>
          </View>
          <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>
              {clients.filter((client) => client.status === "Active").length}
            </Text>
            <Text style={{ color: colors.muted }}>Active clients</Text>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search clients, services, or locations"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />

        <TouchableOpacity
          style={[buttonStyle, { marginBottom: 14, backgroundColor: "#1B5E3F" }]}
          onPress={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
            {showForm ? "Cancel" : "+ Add New Client"}
          </Text>
        </TouchableOpacity>

        {showForm && (
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "900", marginBottom: 12 }}>
              {editingId ? "Edit Client" : "New Client"}
            </Text>
            {([
              ["Full name", "name"],
              ["Phone", "phone"],
              ["Email", "email"],
              ["Home address", "address"],
              ["Service plan", "service"],
              ["Regular schedule", "schedule"],
              ["Emergency contact", "emergencyContact"],
              ["Care notes", "careNotes"],
            ] as const).map(([label, field]) => (
              <View key={field}>
                <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 6 }}>{label}</Text>
                <TextInput
                  value={draft[field]}
                  onChangeText={(value) => setDraft({ ...draft, [field]: value })}
                  placeholder={label}
                  placeholderTextColor={colors.muted}
                  multiline={field === "careNotes"}
                  style={[inputStyle, field === "careNotes" && { minHeight: 88, textAlignVertical: "top" }]}
                />
              </View>
            ))}
            <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 7 }}>Status</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["Active", "On Hold", "Discharged"] as ClientStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setDraft({ ...draft, status })}
                  style={[buttonStyle, { flex: 1, backgroundColor: draft.status === status ? colors.primary : colors.border }]}
                >
                  <Text style={{ color: draft.status === status ? "white" : colors.foreground, fontWeight: "800", fontSize: 12 }}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={buttonStyle} onPress={saveClient}>
              <Text style={{ color: "white", fontWeight: "900" }}>{editingId ? "Save Changes" : "Create Client"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {visibleClients.map((client) => (
          <View key={client.id} style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>{client.name}</Text>
                <Text style={{ color: colors.muted, marginTop: 3 }}>{client.service}</Text>
              </View>
              <TouchableOpacity onPress={() => cycleStatus(client)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: client.status === "Active" ? "#DFF3E6" : client.status === "On Hold" ? "#FFF2CC" : "#FDE2E2" }}>
                <Text style={{ color: client.status === "Active" ? "#1B5E3F" : client.status === "On Hold" ? "#8A6500" : "#A61B1B", fontWeight: "900", fontSize: 11 }}>{client.status}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.foreground, marginTop: 12 }}>{client.phone}{client.email ? ` • ${client.email}` : ""}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{client.address}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{client.schedule}</Text>
            <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 12 }}>Emergency contact</Text>
            <Text style={{ color: colors.muted }}>{client.emergencyContact || "Not provided"}</Text>
            <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 12 }}>Care notes</Text>
            <Text style={{ color: colors.muted, lineHeight: 19 }}>{client.careNotes || "No notes added."}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity style={[buttonStyle, { flex: 1 }]} onPress={() => editClient(client)}>
                <Text style={{ color: "white", fontWeight: "800" }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[buttonStyle, { flex: 1, backgroundColor: "#C62828" }]} onPress={() => removeClient(client)}>
                <Text style={{ color: "white", fontWeight: "800" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {visibleClients.length === 0 && (
          <View style={{ padding: 28, alignItems: "center", borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 17 }}>No clients found</Text>
            <Text style={{ color: colors.muted, marginTop: 5, textAlign: "center" }}>Try another search or create a new client record.</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
