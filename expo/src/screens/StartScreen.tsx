import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ImageBackground, Pressable } from 'react-native';

import { GameButton, gameColors } from '../components/game-ui';

export default function StartScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/bg.png')}
      style={styles.background}
    >
      <StatusBar style="light" />
      <View style={styles.container}>

        {/* Header: Player Count */}
        <View style={styles.topRight}>
          <Text style={styles.playerCount}>👥 0</Text>
        </View>

        {/* Main Content: Title & Subtitle */}
        <View style={styles.content}>
          <Text style={styles.title}>Muro Taisen</Text>
          <Text style={styles.subtitle}>PUZZLE FIGHTER IS LIVE</Text>
          <Text style={styles.subtext}>DISCOVER A WORLD OF LEGENDARY FIGHTERS</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <GameButton label="ONLINE MATCH" onPress={() => router.replace('/character-select')} />
          <GameButton
            label="OFFLINE CAMPAIGN"
            onPress={() => router.push('/difficulty-select')}
            variant="secondary"
          />
        </View>

        {/* Footer: Icons & Legal */}
        <View style={styles.footer}>
          <View style={styles.footerIcons}>
            <Text style={styles.icon}>⚙️</Text>
            <Text style={styles.icon}>👥</Text>
            <Text style={styles.icon}>🛒</Text>
          </View>
          <Text style={styles.legal}>
            BADHOMBRE 2026
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  container: {
    backgroundColor: '#000000cc',
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  topRight: {
    alignSelf: 'flex-end',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
  },
  playerCount: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    marginTop: 50,
  },
  title: {
    color: '#ff0000',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtext: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  actions: {
    gap: 16,
    marginBottom: 100,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  footerIcons: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
  },
  legal: {
    color: '#8491a8',
    fontSize: 10,
    textAlign: 'center',
  },
});
