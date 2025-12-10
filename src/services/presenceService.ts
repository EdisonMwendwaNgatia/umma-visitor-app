import { ref, set, onDisconnect, serverTimestamp, getDatabase, onValue } from 'firebase/database';
import { auth } from '../config/firebase';
import { Platform } from 'react-native'; // Add this import

const database = getDatabase();

export const setupUserPresence = () => {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  
  // User's status in Firebase Realtime Database
  const userStatusRef = ref(database, `status/${userId}`);
  const userInfoRef = ref(database, `users/${userId}`);
  
  // Device info - safely access Platform properties
  const deviceInfo: Record<string, any> = {
    platform: Platform.OS,
    version: Platform.Version,
    isDevice: Platform.OS !== 'web', // Simplified check
    lastSeen: serverTimestamp(),
  };

  // Safely add platform-specific properties
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // Add platform constants safely
    const constants = (Platform as any).constants;
    if (constants) {
      deviceInfo.brand = constants.Brand || 'Unknown';
      deviceInfo.model = constants.Model || 'Unknown';
    }
  } else {
    deviceInfo.brand = 'Web';
    deviceInfo.model = 'Browser';
  }

  // Connection reference
  const connectedRef = ref(database, '.info/connected');
  
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      // When connected, set user status to online
      set(userStatusRef, {
        state: 'online',
        lastChanged: serverTimestamp(),
        platform: Platform.OS,
        deviceInfo: JSON.stringify(deviceInfo),
      });

      set(userInfoRef, {
        email: user.email,
        displayName: user.displayName || '',
        platform: Platform.OS,
        deviceInfo: JSON.stringify(deviceInfo),
        lastActive: serverTimestamp(),
      });

      // When disconnected, set status to offline
      onDisconnect(userStatusRef).set({
        state: 'offline',
        lastChanged: serverTimestamp(),
      });
    }
  });
};

export const updateLastActive = () => {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const userInfoRef = ref(database, `users/${userId}/lastActive`);
  
  set(userInfoRef, serverTimestamp());
};

export const cleanupPresence = () => {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const userStatusRef = ref(database, `status/${userId}`);
  
  set(userStatusRef, {
    state: 'offline',
    lastChanged: serverTimestamp(),
  });
};