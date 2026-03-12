import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import { getMyAppointments, type Appointment } from '../services/api';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'مجدول',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  in_progress: 'جاري',
  no_show: 'لم يحضر',
};

const STATUS_BG: Record<string, string> = {
  scheduled: 'rgba(34,211,238,0.1)',
  completed: 'rgba(52,211,153,0.1)',
  cancelled: 'rgba(248,113,113,0.1)',
  in_progress: 'rgba(52,211,153,0.2)',
  no_show: 'rgba(75,88,117,0.2)',
};

type Filter = 'upcoming' | 'completed' | 'all';

export function AppointmentsScreen({ navigation }: { navigation: { navigate: (a: string, b: { id: string }) => void } }) {
  const { patient } = useAuth();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patient?.id) return;
    setError('');
    try {
      const data = await getMyAppointments(patient.id);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setError('حدث خطأ — إعادة المحاولة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patient?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  React.useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const filtered = list.filter((a) => {
    const d = new Date(a.startTime);
    const now = new Date();
    if (filter === 'upcoming') return a.status === 'scheduled' && d >= now;
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  const renderItem = ({ item }: { item: Appointment }) => {
    const d = new Date(item.startTime);
    const day = d.getDate();
    const month = d.toLocaleDateString('ar-SA', { month: 'short' });
    const year = d.getFullYear();
    const isPast = d < new Date();
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.dateCol}>
          <Text style={[styles.dayNum, { fontFamily: fontMono }]}>{day}</Text>
          <Text style={styles.month}>{month}</Text>
          <Text style={styles.year}>{year}</Text>
        </View>
        <View style={styles.centerCol}>
          <Text style={styles.doctorName}>{item.doctor?.nameAr ?? '—'}</Text>
          <Text style={[styles.time, { fontFamily: fontMono }]}>
            {d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          <Text style={styles.muted}>{item.room?.roomNumber ?? '—'} · {item.arrivalType === 'center_transport' ? 'نقل مركز' : 'قادم بمفرده'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] || C.s2 }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.filterRow}>
        {(['upcoming', 'completed', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === 'upcoming' ? 'القادمة' : f === 'completed' ? 'المكتملة' : 'الكل'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
        ListEmptyComponent={<Text style={styles.empty}>لا مواعيد</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.badge, backgroundColor: C.s1 },
  pillActive: { backgroundColor: C.cyan },
  pillText: { color: C.muted, fontSize: 14 },
  pillTextActive: { color: C.bg, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  dateCol: { marginLeft: 12, alignItems: 'center' },
  dayNum: { fontSize: 28, color: C.cyan, fontWeight: '700' },
  month: { fontSize: 12, color: C.muted },
  year: { fontSize: 10, color: C.muted },
  centerCol: { flex: 1, alignItems: 'flex-end' },
  doctorName: { fontSize: 16, fontWeight: '600', color: C.text },
  time: { fontSize: 14, color: C.muted, marginTop: 2 },
  muted: { fontSize: 12, color: C.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.small },
  badgeText: { fontSize: 12, color: C.text },
  empty: { textAlign: 'center', color: C.muted, marginTop: 24 },
  errorCard: { margin: 16, padding: 16, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: radius.card },
  errorText: { color: C.amber, textAlign: 'right' },
  retryBtn: { marginTop: 8 },
  retryText: { color: C.cyan },
});
