import { ScrollView, Text, View } from "react-native";

export default function ConfigScreen() {
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
        Config Engine
      </Text>
      <Text style={{ fontSize: 13, color: "#9b9b98", marginBottom: 24 }}>
        Configuración automática del sistema
      </Text>
      {[
        { label: "Crossover", value: "80 Hz LR24", color: "#C00020" },
        { label: "TOPs RCF", value: "0 dB", color: "#1a7a3c" },
        { label: "SUBs AIR18", value: "−3 dB", color: "#7a5800" },
        { label: "Delay", value: "~0 ms", color: "#1a4fa0" },
        { label: "Limitador", value: "+18 dBu", color: "#C00020" },
      ].map((item) => (
        <View
          key={item.label}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: "#e8e8e4",
            padding: 14,
            marginBottom: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, color: "#6b6b68" }}>{item.label}</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: item.color }}>
            {item.value}
          </Text>
        </View>
      ))}
      <View
        style={{
          backgroundColor: "#fffbf0",
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: "#f0e0a0",
          padding: 14,
          marginTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: "#7a5800",
            marginBottom: 4,
          }}
        >
          PRO
        </Text>
        <Text style={{ fontSize: 13, color: "#6b6b68" }}>
          Config Engine completo disponible en Fase 3
        </Text>
      </View>
    </ScrollView>
  );
}
