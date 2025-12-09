import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
  View, 
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { auth } from '../config/firebase';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CheckInScreen from '../screens/CheckInScreen';
import CheckOutScreen from '../screens/CheckOutScreen';
import AlertsScreen from '../screens/AlertsScreen';
import EditVisitorScreen from '../screens/EditVisitorScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Create scenes for TabView with proper props
const renderDashboard = () => <DashboardScreen />;
const renderCheckIn = () => <CheckInScreen />;
const renderEditVisitor = () => <EditVisitorScreen />;
const renderCheckOut = () => <CheckOutScreen />;
const renderAlerts = () => <AlertsScreen />;

// Custom Tab Bar Component
const CustomTabBar = ({ navigationState, position, onIndexChange }: any) => {
  const inputRange = navigationState.routes.map((_: any, i: number) => i);
  
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {navigationState.routes.map((route: any, i: number) => {
          const isActive = i === navigationState.index;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => onIndexChange(i)}
              activeOpacity={0.8}
            >
              <View style={styles.tabItemContent}>
                <Ionicons
                  name={isActive ? getActiveIcon(route.icon) : route.icon}
                  size={24}
                  color={isActive ? '#007AFF' : '#8e8e93'}
                />
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel
                ]}>
                  {route.title}
                </Text>
                
                {/* Active indicator */}
                {isActive && (
                  <View style={styles.activeIndicator} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Swipe indicators */}
      <View style={styles.swipeIndicators}>
        {navigationState.routes.map((_: any, i: number) => (
          <View
            key={i}
            style={[
              styles.swipeIndicator,
              navigationState.index === i && styles.activeSwipeIndicator,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// Helper function to get active icon
const getActiveIcon = (iconName: string): keyof typeof Ionicons.glyphMap => {
  switch (iconName) {
    case 'speedometer-outline':
      return 'speedometer';
    case 'log-in-outline':
      return 'log-in';
    case 'log-out-outline':
      return 'log-out';
    case 'pencil-outline':
      return 'pencil';
    case 'alert-circle-outline':
      return 'alert-circle';
    default:
      return iconName.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
  }
};

function SwipeableTabNavigator() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'dashboard', title: 'Dashboard', icon: 'speedometer-outline' },
    { key: 'checkin', title: 'Check In', icon: 'log-in-outline' },
    { key: 'editvisitor', title: 'Edit Visitor', icon: 'pencil-outline' },
    { key: 'checkout', title: 'Check Out', icon: 'log-out-outline' },
    { key: 'alerts', title: 'Alerts', icon: 'alert-circle-outline' },
  ]);

  const renderScene = SceneMap({
    dashboard: renderDashboard,
    checkin: renderCheckIn,
    editvisitor: renderEditVisitor,
    checkout: renderCheckOut,
    alerts: renderAlerts,
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: SCREEN_WIDTH }}
        renderTabBar={(props) => (
          <CustomTabBar 
            {...props} 
            onIndexChange={setIndex}
          />
        )}
        swipeEnabled={true}
        animationEnabled={true}
        lazy={true}
        lazyPreloadDistance={1}
        tabBarPosition="bottom"
        style={styles.tabView}
      />

      {/* Swipe hint overlay */}
      <SwipeHintOverlay currentIndex={index} totalTabs={routes.length} />
    </View>
  );
}

// Swipe hint component
const SwipeHintOverlay = ({ currentIndex, totalTabs }: any) => {
  const [showHints, setShowHints] = useState(true);
  
  // Auto-hide hints after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHints(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (!showHints) return null;

  return (
    <>
      {currentIndex > 0 && (
        <View style={[styles.swipeHint, styles.swipeHintLeft]}>
          <Ionicons name="chevron-back" size={20} color="#007AFF" />
          <Text style={styles.swipeHintText}>Swipe right</Text>
        </View>
      )}
      
      {currentIndex < totalTabs - 1 && (
        <View style={[styles.swipeHint, styles.swipeHintRight]}>
          <Text style={styles.swipeHintText}>Swipe left</Text>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </View>
      )}
    </>
  );
};

function TabNavigator() {
  return <SwipeableTabNavigator />;
}

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabView: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  swipeIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  swipeIndicator: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  activeSwipeIndicator: {
    backgroundColor: '#007AFF',
    width: 20,
  },
  swipeHint: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  swipeHintLeft: {
    left: 20,
  },
  swipeHintRight: {
    right: 20,
  },
  swipeHintText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});