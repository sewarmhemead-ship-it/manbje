import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { C, radius, fontMono } from '../constants/theme';
import { api } from '../services/api';

interface PrescriptionDetail {
  id: string;
  rxNumber: string;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  instructions?: string | null;
  doctor?: { nameAr?: string | null };
  items?: {
    id: string;
    dose: number;
    doseUnit: string;
    frequency: string;
    durationDays: number;
    timing?: string | null;
    drug?: { nameAr?: string };
  }[];
}

export function PrescriptionDetailScreen() {
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? '';
  const [rx, setRx] = useState<PrescriptionDetail | null>(null);
  const [reminderOn, setReminderOn] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<PrescriptionDetail>(`/prescriptions/${id}`).then((r) => setRx(r.data)).catch(() => setRx(null));
  }, [id]);

  const toggleReminder = async () => {
    if (!rx?.items?.length) return;
    if (reminderOn) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setReminderOn(false);
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const drugName = rx.items[0]?.drug?.nameAr ?? 'الدواء';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'تذكير بالدواء',
        body: `تذكير: دواء ${drugName}`,
        data: {},
      },
      trigger: { hour: 8, minute: 0, repeats: true } as any,
    });
    setReminderOn(true);
  };

  if (!rx) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>جاري التحميل...</Text>
      </SafeAreaView>
    );
  }

  const expiresAt = rx.expiresAt ? new Date(rx.expiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.rxNumber, { fontFamily: fontMono }]}>{rx.rxNumber}</Text>
        <Text style={styles.muted}>{new Date(rx.createdAt).toLocaleDateString('ar-SA')}</Text>
        <Text style={styles.doctorName}>د. {rx.doctor?.nameAr ?? '—'}</Text>

        {(rx.items ?? []).map((it) => (
          <View key={it.id} style={styles.drugBlock}>
            <Text style={styles.drugName}>{it.drug?.nameAr ?? '—'}</Text>
            <Text style={styles.muted}>الجرعة: {it.dose} {it.doseUnit}</Text>
            <Text style={styles.muted}>التكرار: {it.frequency}</Text>
            <Text style={styles.muted}>المدة: {it.durationDays} يوم</Text>
            {it.timing ? <Text style={styles.muted}>التوقيت: {it.timing}</Text> : null}
          </View>
        ))}

        {rx.instructions ? <Text style={styles.instructions}>{rx.instructions}</Text> : null}

        <View style={styles.expiryRow}>
          <Text style={styles.expiryLabel}>تنتهي بعد</Text>
          <Text style={[styles.expiryValue, { fontFamily: fontMono }]}>{daysLeft} يوم</Text>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>تذكير بالدواء</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, reminderOn && styles.toggleBtnOn]}
            onPress={toggleReminder}
          >
            <Text style={styles.toggleText}>{reminderOn ? 'تشغيل' : 'إيقاف'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },
  rxNumber: { fontSize: 18, color: C.cyan, fontWeight: '700' },
  muted: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: 'right' },
  doctorName: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 8, textAlign: 'right' },
  drugBlock: { marginTop: 16, padding: 12, backgroundColor: C.s1, borderRadius: radius.card, borderWidth: 1, borderColor: C.border },
  drugName: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'right' },
  instructions: { marginTop: 16, fontSize: 14, color: C.text, textAlign: 'right' },
  expiryRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16, gap: 8 },
  expiryLabel: { fontSize: 14, color: C.muted },
  expiryValue: { fontSize: 18, color: C.amber },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingVertical: 12 },
  toggleLabel: { fontSize: 15, color: C.text },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.button, backgroundColor: C.s1, borderWidth: 1, borderColor: C.border },
  toggleBtnOn: { backgroundColor: C.cyan + '22', borderColor: C.cyan },
  toggleText: { color: C.cyan },
});
