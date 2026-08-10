import { useRouter } from "expo-router";
import { StatusBar } from ".pnpm/expo-status-bar@3.0.9_react-native@0.81.5_@babel+core@7.29.7_@types+react@19.1.17_react@19.1.0__react@19.1.0/node_modules/expo-status-bar/src/StatusBar";
import { useEffect, useState } from ".pnpm/@types+react@19.1.17/node_modules/@types/react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

const placeholderAsset = require("../../assets/images/react-logo.png");

export default function Index() {
  const router = useRouter();
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    // Keep the first screen visible long enough to make asset loading feel intentional.
    const loadingTimer = setTimeout(() => setAssetsReady(true), 900);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (assetsReady) {
      router.replace("/start");
    }
  }, [assetsReady, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoHalo}>
        <Image
          accessibilityLabel="Loading asset"
          source={placeholderAsset}
          style={styles.logo}
        />
      </View>
      <Text style={styles.title}>MURO TAISEN</Text>
      <Text style={styles.caption}>PREPARING THE ARENA</Text>
      <ActivityIndicator color="#56d8ff" size="small" style={styles.spinner} />
      <Text style={styles.version}>THREE.JS // EXPO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#080b14",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  logoHalo: {
    alignItems: "center",
    backgroundColor: "#101b2a",
    borderColor: "#1f5368",
    borderRadius: 92,
    borderWidth: 1,
    height: 184,
    justifyContent: "center",
    marginBottom: 36,
    shadowColor: "#39d8ff",
    shadowOpacity: 0.25,
    shadowRadius: 32,
    width: 184,
  },
  logo: {
    height: 112,
    width: 112,
  },
  title: {
    color: "#f4f8ff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 6,
  },
  caption: {
    color: "#56d8ff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 14,
  },
  spinner: {
    marginTop: 28,
  },
  version: {
    bottom: 34,
    color: "#526074",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    position: "absolute",
  },
});
