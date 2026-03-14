import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { C } from '../constants/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { AppointmentDetailScreen } from '../screens/AppointmentDetailScreen';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { PrescriptionsScreen } from '../screens/PrescriptionsScreen';
import { PrescriptionDetailScreen } from '../screens/PrescriptionDetailScreen';
import { getMyNotifications } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();
const AppointmentsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const READ_IDS_KEY = 'patient_notifications_read';

function AppointmentsStackScreen() {
  return (
    <AppointmentsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerTitleStyle: { fontFamily: 'Cairo', fontSize: 18 },
        cardStyle: { backgroundColor: C.bg },
        gestureDirection: 'horizontal-inverted',
      }}
    >
      <AppointmentsStack.Screen name="AppointmentsList" component={AppointmentsScreen} options={{ title: 'مواعيدي' }} />
      <AppointmentsStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: 'تفاصيل الموعد' }} />
    </AppointmentsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerTitleStyle: { fontFamily: 'Cairo', fontSize: 18 },
        cardStyle: { backgroundColor: C.bg },
        gestureDirection: 'horizontal-inverted',
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'ملفي' }} />
      <ProfileStack.Screen name="Progress" component={ProgressScreen} options={{ title: 'تقدمي' }} />
      <ProfileStack.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: 'وصفاتي الطبية' }} />
      <ProfileStack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} options={{ title: 'تفاصيل الوصفة' }} />
    </ProfileStack.Navigator>
  );
}

export function MainTabs() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, raw] = await Promise.all([
          getMyNotifications(50),
          AsyncStorage.getItem(READ_IDS_KEY),
        ]);
        if (cancelled) return;
        const readIds = new Set<string>(raw ? JSON.parse(raw) : []);
        const count = (Array.isArray(list) ? list : []).filter((n) => !readIds.has(n.id)).length;
        setUnreadCount(count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: C.s1, borderTopColor: C.border, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 12 },
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerTitleStyle: { fontFamily: 'Cairo' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'الرئيسية',
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStackScreen}
        options={{
          title: 'مواعيدي',
          tabBarLabel: 'مواعيدي',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📅</Text>,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          title: 'تماريني',
          tabBarLabel: 'تماريني',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>💪</Text>,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'الإشعارات',
          tabBarLabel: 'إشعارات',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🔔</Text>,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          title: 'ملفي',
          tabBarLabel: 'ملفي',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>👤</Text>,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
