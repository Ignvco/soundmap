import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.levelproaudio.soundmap",
  appName: "SoundMap",
  webDir: "dist",
  backgroundColor: "#08090A",
  plugins: {
    SystemBars: { style: "DARK", insetsHandling: "css" },
  },
};

export default config;
