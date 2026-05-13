import { ScrollView, Text, View } from "react-native";

export default function StageMapScreen() {
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
        Stage Map
      </Text>
      <Text style={{ fontSize: 13, color: "#9b9b98", marginBottom: 24 }}>
        Distribución visual del PA
      </Text>
      <View
        style={{
          backgroundColor: "#f7f7f5",
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: "#e8e8e4",
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          height: 200,
        }}
      >
        <Text style={{ fontSize: 13, color: "#9b9b98" }}>
          Mapa SVG — Fase 2
        </Text>
      </View>
    </ScrollView>
  );
}
