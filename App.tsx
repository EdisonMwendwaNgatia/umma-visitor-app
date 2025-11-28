import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { TailwindProvider } from 'tailwindcss-react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <TailwindProvider>
      <View style={styles.container}>
        <AppNavigator />
        <StatusBar style="auto" />
      </View>
    </TailwindProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});