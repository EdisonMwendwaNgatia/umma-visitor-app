import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
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

export type TabParamList = {
  Dashboard: undefined;
  CheckIn: undefined;
  CheckOut: undefined;
  EditVisitor: undefined;
  Alerts: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'speedometer-outline';
              break;

            case 'CheckIn':
              iconName = 'log-in-outline';
              break;

            case 'CheckOut':
              iconName = 'log-out-outline';
              break;

            case 'EditVisitor':
              iconName = 'pencil-outline';
              break;

            case 'Alerts':
              iconName = 'alert-circle-outline';
              break;

            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: 'Check In' }}
      />
       <Tab.Screen
        name="EditVisitor"
        component={EditVisitorScreen}
        options={{ title: 'Edit Visitor' }}
      />
      <Tab.Screen
        name="CheckOut"
        component={CheckOutScreen}
        options={{ title: 'Check Out' }}
      />
     
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      
    </Tab.Navigator>
  );
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
