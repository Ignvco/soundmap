import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const CHANNELS = [
  { num: "CH 1", name: "Predicador", src: "SM48", phantom: false, type: "voz" },
  {
    num: "CH 2",
    name: "Líder vocal",
    src: "Beta 58A",
    phantom: false,
    type: "voz",
  },
  {
    num: "CH 3–5",
    name: "Coristas × 3",
    src: "SM58",
    phantom: false,
    type: "voz",
  },
  {
    num: "CH 6",
    name: "Corista AT",
    src: "AT Condensador",
    phantom: true,
    type: "voz",
  },
  {
    num: "CH 7–8",
    name: "Guitarras × 2",
    src: "DI Box",
    phantom: false,
    type: "inst",
  },
  { num: "CH 9", name: "Bajo", src: "DI Box", phantom: false, type: "inst" },
  {
    num: "CH 10–11",
    name: "Pianos × 2",
    src: "DI Box",
    phantom: false,
    type: "inst",
  },
  {
    num: "CH 12",
    name: "Secuencia",
    src: "PC / Interfaz",
    phantom: false,
    type: "inst",
  },
  {
    num: "CH 13",
    name: "Click",
    src: "PC / Interfaz",
    phantom: false,
    type: "fx",
  },
];

const TYPE_COLORS: Record<string, string> = {
  voz: "#1a4fa0",
  inst: "#1a7a3c",
  fx: "#7a5800",
};

export default function ChannelsScreen() {
  const [selected, setSelected] = React.useState<number | null>(null);

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
        Canal por Canal
      </Text>
      <Text style={{ fontSize: 13, color: "#9b9b98", marginBottom: 24 }}>
        Mixer SL2442FX · 13 canales activos
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CHANNELS.map((ch, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelected(selected === i ? null : i)}
            style={{
              width: "47%",
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: selected === i ? "#C00020" : "#e8e8e4",
              borderLeftWidth: 2,
              borderLeftColor: TYPE_COLORS[ch.type] ?? "#e8e8e4",
              padding: 12,
              backgroundColor: selected === i ? "#fff0f0" : "#ffffff",
            }}
          >
            <Text style={{ fontSize: 10, color: "#9b9b98", marginBottom: 3 }}>
              {ch.num}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#111110",
                marginBottom: 3,
              }}
            >
              {ch.name}
            </Text>
            <Text style={{ fontSize: 10, color: "#6b6b68" }}>{ch.src}</Text>
            {ch.phantom && (
              <View
                style={{
                  marginTop: 6,
                  backgroundColor: "#fff0f0",
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{ fontSize: 9, fontWeight: "700", color: "#C00020" }}
                >
                  48V
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selected !== null && CHANNELS[selected] && (
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#fff0f0",
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: "#f0b0b0",
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#C00020",
              marginBottom: 10,
            }}
          >
            {CHANNELS[selected]!.num} — {CHANNELS[selected]!.name}
          </Text>
          {[
            { k: "Fuente", v: CHANNELS[selected]!.src },
            {
              k: "Phantom 48V",
              v: CHANNELS[selected]!.phantom ? "SÍ — obligatorio" : "No",
            },
            { k: "LOW 80Hz", v: "−3 dB" },
            { k: "LOW-MID", v: "300Hz: −3 dB" },
            { k: "HIGH-MID", v: "2kHz: +1 dB" },
            { k: "HIGH 12kHz", v: "0 dB" },
          ].map((row) => (
            <View
              key={row.k}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
                borderBottomWidth: 0.5,
                borderBottomColor: "#f0b0b0",
              }}
            >
              <Text style={{ fontSize: 12, color: "#6b6b68" }}>{row.k}</Text>
              <Text
                style={{ fontSize: 12, fontWeight: "500", color: "#111110" }}
              >
                {row.v}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
