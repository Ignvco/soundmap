import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const SECTIONS = [
  "Diagnóstico acústico completo",
  "Stage Map frontal + planta",
  "Especificaciones del equipo",
  "DCX2496 — 6 presets del sistema",
  "Canal por canal — 13 canales",
  "Backup Gemini + PV215",
  "Troubleshooting completo",
];

const OPTIONS = [
  {
    name: "PDF completo",
    desc: "Para imprimir y distribuir",
    badge: "Pro",
    emoji: "📄",
  },
  {
    name: "Link compartible",
    desc: "Enviá al equipo de sonido",
    badge: "Pro",
    emoji: "🔗",
  },
  {
    name: "Solo checklist",
    desc: "Arranque, apagado y emergencia",
    badge: "Free",
    emoji: "✅",
  },
];

export default function ExportScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: "#111110",
          marginBottom: 4,
        }}
      >
        Manual Export
      </Text>
      <Text style={{ fontSize: 13, color: "#9b9b98", marginBottom: 24 }}>
        Generá el manual completo de tu sistema
      </Text>

      <View
        style={{
          backgroundColor: "#f7f7f5",
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: "#e8e8e4",
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: "#111110",
            marginBottom: 4,
          }}
        >
          Manual de Audio — Iglesia
        </Text>
        <Text style={{ fontSize: 11, color: "#9b9b98", marginBottom: 12 }}>
          SoundMap by LevelPro · Generado automáticamente
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {[
            "RCF ART 912-A",
            "AIR18 ×2",
            "DCX2496",
            "15×10mt",
            "100 personas",
          ].map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: "#fff0f0",
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 0.5,
                borderColor: "#f0b0b0",
              }}
            >
              <Text
                style={{ fontSize: 10, fontWeight: "500", color: "#C00020" }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
        {SECTIONS.map((s) => (
          <View
            key={s}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 4,
              borderBottomWidth: 0.5,
              borderBottomColor: "#e8e8e4",
            }}
          >
            <Text style={{ fontSize: 12, color: "#1a7a3c" }}>✓</Text>
            <Text style={{ fontSize: 12, color: "#6b6b68" }}>{s}</Text>
          </View>
        ))}
      </View>

      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.name}
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
              backgroundColor: "#fff0f0",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>{opt.emoji}</Text>
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
              {opt.name}
            </Text>
            <Text style={{ fontSize: 11, color: "#9b9b98" }}>{opt.desc}</Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 20,
              backgroundColor: opt.badge === "Free" ? "#f0faf4" : "#fffbf0",
              borderWidth: 0.5,
              borderColor: opt.badge === "Free" ? "#b8e8c8" : "#f0e0a0",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: opt.badge === "Free" ? "#1a7a3c" : "#7a5800",
              }}
            >
              {opt.badge}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
