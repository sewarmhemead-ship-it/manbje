import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <AppointmentsStack.Screen name="AppointmentsList" component={AppointmentsScreen} options={{ title: t('tabs.appointments') }} />
      <AppointmentsStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: t('appointments.title') }} />
    </AppointmentsStack.Navigator>
  );
}

function ProfileStackScreen() {
  const { t } = useTranslation();
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
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: t('tabs.profile') }} />
      <ProfileStack.Screen name="Progress" component={ProgressScreen} options={{ title: t('profile.title') }} />
      <ProfileStack.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: t('tabs.prescriptions') }} />
      <ProfileStack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} options={{ title: t('prescriptions.title') }} />
    </ProfileStack.Navigator>
  );
}

export function MainTabs() {
  const { t } = useTranslation();
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
          title: t('tabs.home'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStackScreen}
        options={{
          title: t('tabs.appointments'),
          tabBarLabel: t('tabs.appointments'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📅</Text>,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          title: t('tabs.exercises'),
          tabBarLabel: t('tabs.exercises'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>💪</Text>,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t('tabs.notifications'),
          tabBarLabel: t('tabs.notifications'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🔔</Text>,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          title: t('tabs.profile'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>👤</Text>,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
