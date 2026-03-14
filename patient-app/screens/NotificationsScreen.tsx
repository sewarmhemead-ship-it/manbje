import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import { getMyNotifications, type OutboundNotification } from '../services/api';

const READ_IDS_KEY = 'patient_notifications_read';
const TYPE_LABELS: Record<string, string> = {
  appointment_reminder: 'مواعيد',
  appointment_cancelled: 'مواعيد',
  transport_assigned: 'نقل',
  exercise_reminder: 'تمارين',
  prescription_ready: 'وصفات',
};

function relativeTime(date: Date): string {
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return 'الآن';
  if (sec < 3600) return `منذ ${Math.floor(sec / 60)} د`;
  if (sec < 86400) return `منذ ${Math.floor(sec / 3600)} س`;
  if (sec < 604800) return `منذ ${Math.floor(sec / 86400)} يوم`;
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

export function NotificationsScreen() {
  const { patient } = useAuth();
  const navigation = useNavigation<{ navigate: (a: string, b?: object) => void }>();
  const [list, setList] = useState<OutboundNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('الكل');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReadIds = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(READ_IDS_KEY);
      if (raw) setReadIds(new Set(JSON.parse(raw)));
    } catch {
      setReadIds(new Set());
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyNotifications(50);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadReadIds();
  }, [load, loadReadIds]);

  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
    loadReadIds();
  }, [load, loadReadIds]);

  const markAllRead = useCallback(async () => {
    const ids = list.map((n) => n.id);
    setReadIds(new Set(ids));
    try {
      await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(ids));
    } catch {}
  }, [list]);

  const markOneRead = useCallback(async (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const onPressNotification = useCallback(
    (n: OutboundNotification) => {
      markOneRead(n.id);
      const type = (n.type || '').toLowerCase();
      if (type.startsWith('appointment_')) navigation.navigate('Appointments');
      else if (type.startsWith('transport_')) navigation.navigate('Home');
      else if (type.startsWith('exercise_')) navigation.navigate('Exercises');
      else if (type.startsWith('prescription_')) (navigation as { navigate: (a: string, b?: object) => void }).navigate('Profile', { screen: 'Prescriptions' });
      else navigation.navigate('Home');
    },
    [markOneRead, navigation],
  );

  const filtered = list.filter((n) => {
    if (filter === 'all') return true;
    const type = (n.type || '').toLowerCase();
    if (filter === 'مواعيد') return type.startsWith('appointment_');
    if (filter === 'نقل') return type.startsWith('transport_');
    if (filter === 'تمارين') return type.startsWith('exercise_');
    if (filter === 'وصفات') return type.startsWith('prescription_');
    return true;
  });

  const unreadCount = list.filter((n) => !readIds.has(n.id)).length;

  const getTypeColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.startsWith('appointment_')) return C.cyan;
    if (t.startsWith('transport_')) return C.amber;
    if (t.startsWith('exercise_')) return C.green;
    if (t.startsWith('prescription_')) return C.purple;
    return C.muted;
  };

  const renderItem = ({ item }: { item: OutboundNotification }) => {
    const isUnread = !readIds.has(item.id);
    const typeColor = getTypeColor(item.type || '');
    const date = item.sentAt ? new Date(item.sentAt) : new Date(item.createdAt);
    const timeStr = relativeTime(date);

    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.itemUnread]}
        onPress={() => onPressNotification(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: typeColor + '22' }]}>
          <Text style={styles.iconText}>
            {item.type?.startsWith('appointment') ? '📅' : item.type?.startsWith('transport') ? '🚐' : item.type?.startsWith('exercise') ? '💪' : '💊'}
          </Text>
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.messageAr || 'إشعار'}</Text>
          <Text style={styles.itemBodyText} numberOfLines={2}>{item.messageAr}</Text>
          <Text style={[styles.itemTime, { fontFamily: fontMono }]}>{timeStr}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الإشعارات 🔔</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>تحديد الكل كمقروء</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsContent}>
        {['الكل', 'مواعيد', 'نقل', 'تمارين', 'وصفات'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && list.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>جاري التحميل...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.muted}>لا إشعارات</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  markAllText: { fontSize: 13, color: C.cyan },
  pillsScroll: { maxHeight: 44 },
  pillsContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.badge, backgroundColor: C.s1, marginLeft: 8 },
  pillActive: { backgroundColor: C.cyan },
  pillText: { fontSize: 13, color: C.muted },
  pillTextActive: { color: C.bg, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  itemUnread: { backgroundColor: 'rgba(34,211,238,0.04)' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  iconText: { fontSize: 20 },
  itemBody: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  itemBodyText: { fontSize: 13, color: C.muted, marginTop: 2 },
  itemTime: { fontSize: 11, color: C.muted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan, marginRight: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  muted: { fontSize: 14, color: C.muted },
});
