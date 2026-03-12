import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, radius, fontMono } from '../constants/theme';
import { api, type Appointment } from '../services/api';

export function AppointmentDetailScreen({ route }: { route: { params: { id: string } } }) {
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Appointment>(`/appointments/${route.params.id}`).then((r) => {
      setApt(r.data);
    }).catch(() => setApt(null)).finally(() => setLoading(false));
  }, [route.params.id]);

  if (loading || !apt) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>جاري التحميل...</Text>
      </SafeAreaView>
    );
  }

  const start = new Date(apt.startTime);
  const transport = apt.transportRequest;
  const isScheduled = apt.status === 'scheduled';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.doctorName}>{apt.doctor?.nameAr ?? '—'}</Text>
          <Text style={[styles.time, { fontFamily: fontMono }]}>
            {start.toLocaleDateString('ar-SA')} · {start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          <Text style={styles.muted}>الغرفة: {apt.room?.roomNumber ?? '—'}</Text>
          <Text style={styles.muted}>نوع الحضور: {apt.arrivalType === 'center_transport' ? 'نقل المركز 🚐' : 'قادم بمفرده'}</Text>
          <View style={[styles.badge, { backgroundColor: apt.status === 'completed' ? 'rgba(52,211,153,0.1)' : apt.status === 'cancelled' ? 'rgba(248,113,113,0.1)' : 'rgba(34,211,238,0.1)' }]}>
            <Text style={styles.badgeText}>
              {apt.status === 'scheduled' ? 'مجدول' : apt.status === 'completed' ? 'مكتمل' : apt.status === 'cancelled' ? 'ملغى' : apt.status}
            </Text>
          </View>
        </View>

        {transport ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>النقل</Text>
            <Text style={styles.muted}>السائق: {transport.driver?.user?.nameAr ?? '—'}</Text>
            <Text style={styles.muted}>اللوحة: {transport.vehicle?.plateNumber ?? transport.driver?.vehicle?.plateNumber ?? '—'}</Text>
            {transport.pickupTime && (
              <Text style={styles.muted}>وقت الاستلام: {new Date(transport.pickupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
            {transport.status === 'en_route' || transport.status === 'assigned' ? (
              <View style={styles.amberRow}>
                <Text style={styles.amber}>السائق في الطريق 🚐</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {isScheduled && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={() => {}}>
              <Text style={styles.btnText}>تأكيد الحضور</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => Linking.openURL('tel:+966500000000')}>
              <Text style={styles.btnOutlineText}>التواصل مع المركز</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },
  card: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  doctorName: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'right' },
  time: { fontSize: 18, color: C.cyan, textAlign: 'right', marginTop: 8 },
  muted: { fontSize: 14, color: C.muted, textAlign: 'right', marginTop: 4 },
  badge: { alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.small },
  badgeText: { color: C.text, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'right' },
  amberRow: { marginTop: 8 },
  amber: { color: C.amber, fontSize: 14, textAlign: 'right' },
  actions: { gap: 12 },
  btn: { backgroundColor: C.cyan, borderRadius: radius.button, padding: 16, alignItems: 'center' },
  btnText: { color: C.bg, fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: C.cyan, borderRadius: radius.button, padding: 16, alignItems: 'center' },
  btnOutlineText: { color: C.cyan },
});
