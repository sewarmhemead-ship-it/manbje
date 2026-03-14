import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import { getMyPrescriptions, type Prescription } from '../services/api';

type FilterType = 'all' | 'active' | 'expired';

export function PrescriptionsScreen() {
  const { patient } = useAuth();
  const navigation = useNavigation<{ navigate: (a: string, b?: { id: string }) => void }>();
  const [list, setList] = useState<Prescription[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const data = await getMyPrescriptions(patient.id);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setRefreshing(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered = list.filter((r) => {
    if (filter === 'active') return r.status === 'active';
    if (filter === 'expired') return r.status !== 'active';
    return true;
  });

  const activeCount = list.filter((r) => r.status === 'active').length;

  const renderItem = ({ item }: { item: Prescription }) => {
    const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
    const now = new Date();
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : 0;
    const isExpiringSoon = daysLeft >= 0 && daysLeft < 7;

    return (
      <TouchableOpacity
        style={[styles.card, { borderRightWidth: 2, borderRightColor: C.purple }]}
        onPress={() => navigation.navigate('PrescriptionDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <Text style={[styles.rxNumber, { fontFamily: fontMono }]}>{item.rxNumber}</Text>
        <Text style={styles.muted}>{new Date(item.createdAt).toLocaleDateString('ar-SA')}</Text>
        {item.doctor?.nameAr ? <Text style={styles.doctorName}>د. {item.doctor.nameAr}</Text> : null}
        <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeExpired]}>
          <Text style={styles.badgeText}>{item.status === 'active' ? 'نشطة' : 'منتهية'}</Text>
        </View>
        {(item.items ?? []).slice(0, 3).map((it) => (
          <View key={it.id} style={styles.drugChip}>
            <Text style={styles.drugName}>{it.drug?.nameAr ?? '—'}</Text>
            <Text style={styles.drugDose}> {it.dose} {it.doseUnit}</Text>
          </View>
        ))}
        {item.expiresAt && (
          <Text style={[styles.expiry, isExpiringSoon && styles.expirySoon]}>
            تنتهي: {new Date(item.expiresAt).toLocaleDateString('ar-SA')}
            {isExpiringSoon && daysLeft >= 0 && ` (بعد ${daysLeft} يوم)`}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>وصفاتي الطبية 💊</Text>
        <Text style={styles.sub}>{list.length} وصفة — {activeCount} نشطة</Text>
      </View>
      <View style={styles.filterRow}>
        {(['all', 'active', 'expired'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === 'all' ? 'الكل' : f === 'active' ? 'نشطة' : 'منتهية'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
        ListEmptyComponent={<Text style={styles.empty}>لا وصفات</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.muted, marginTop: 4 },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.badge, backgroundColor: C.s1 },
  pillActive: { backgroundColor: C.cyan },
  pillText: { fontSize: 13, color: C.muted },
  pillTextActive: { color: C.bg, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  rxNumber: { fontSize: 16, color: C.cyan, fontWeight: '600' },
  doctorName: { fontSize: 14, color: C.text, marginTop: 4, textAlign: 'right' },
  muted: { fontSize: 12, color: C.muted, marginTop: 4 },
  badge: { alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.small },
  badgeActive: { backgroundColor: C.green + '22' },
  badgeExpired: { backgroundColor: C.muted + '22' },
  badgeText: { fontSize: 12, color: C.text },
  drugChip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, backgroundColor: C.purple + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.small, marginRight: 6, alignSelf: 'flex-end' },
  drugName: { fontSize: 13, color: C.text },
  drugDose: { fontSize: 12, color: C.muted },
  expiry: { fontSize: 12, color: C.muted, marginTop: 10 },
  expirySoon: { color: C.red },
  empty: { textAlign: 'center', color: C.muted, marginTop: 24 },
});
