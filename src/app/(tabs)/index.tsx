import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const MODULES = [
  {
    id: "room-scan",
    name: "Room Scan",
    desc: "Diagnóstico acústico · RT60 · Problemas",
    badge: "Free",
    color: "#C00020",
  },
  {
    id: "stage-map",
    name: "Stage Map",
    desc: "Vista frontal + planta · Coberturas",
    badge: "Free",
    color: "#1a4fa0",
  },
  {
    id: "config",
    name: "Config Engine",
    desc: "DCX2496 · EQ · Delay · Presets · Backup",
    badge: "Pro",
    color: "#7a5800",
  },
  {
    id: "channels",
    name: "Canal por Canal",
    desc: "Mapa de mixer · EQ por instrumento",
    badge: "Pro",
    color: "#6030a0",
  },
  {
    id: "export",
    name: "Manual Export",
    desc: "PDF · Link compartible · Checklist",
    badge: "Pro",
    color: "#6030a0",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            letterSpacing: -0.5,
            color: "#111110",
          }}
        >
          Sound<Text style={{ color: "#C00020" }}>Map</Text>
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: "#9b9b98",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          by LevelPro
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            height: 3,
            backgroundColor: "#f0f0ec",
            borderRadius: 2,
            marginBottom: 6,
          }}
        >
          <View
            style={{
              width: "60%",
              height: 3,
              backgroundColor: "#C00020",
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={{ fontSize: 11, color: "#9b9b98" }}>
          Configuración al 60%
        </Text>
      </View>

      {MODULES.map((m) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => router.push(`/${m.id}` as any)}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: "#e8e8e4",
            padding: 14,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: m.color + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16 }}>
              {m.id === "room-scan"
                ? "🔍"
                : m.id === "stage-map"
                  ? "🗺"
                  : m.id === "config"
                    ? "⚙️"
                    : m.id === "channels"
                      ? "🎚️"
                      : "📄"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#111110",
                marginBottom: 2,
              }}
            >
              {m.name}
            </Text>
            <Text style={{ fontSize: 11, color: "#9b9b98" }}>{m.desc}</Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 20,
              backgroundColor: m.badge === "Free" ? "#f0faf4" : "#fffbf0",
              borderWidth: 0.5,
              borderColor: m.badge === "Free" ? "#b8e8c8" : "#f0e0a0",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: m.badge === "Free" ? "#1a7a3c" : "#7a5800",
              }}
            >
              {m.badge}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
