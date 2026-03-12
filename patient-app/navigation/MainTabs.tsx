import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { C } from '../constants/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { AppointmentDetailScreen } from '../screens/AppointmentDetailScreen';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { ProgressScreen } from '../screens/ProgressScreen';

const Tab = createBottomTabNavigator();
const AppointmentsStack = createStackNavigator();

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

export function MainTabs() {
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
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'تقدمي',
          tabBarLabel: 'تقدمي',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📊</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
