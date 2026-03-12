import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import { getMyExercises, completeExercise, type PatientExercise } from '../services/api';

const DAY_LABELS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

export function ExercisesScreen() {
  const { patient } = useAuth();
  const [list, setList] = useState<PatientExercise[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date();
    return d.getDay();
  });

  const load = useCallback(async () => {
    if (!patient?.id) return;
    setError('');
    try {
      const data = await getMyExercises(patient.id);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setError('حدث خطأ — إعادة المحاولة');
    } finally {
      setRefreshing(false);
    }
  }, [patient?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  React.useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const completedToday = list.filter((pe) => (pe.completions || []).some((c) => c.completedAt.startsWith(today)));
  const totalToday = list.length;
  const allDone = totalToday > 0 && completedToday.length >= totalToday;

  const toggleComplete = async (pe: PatientExercise) => {
    const done = (pe.completions || []).some((c) => c.completedAt.startsWith(today));
    if (done) return;
    try {
      await completeExercise(pe.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await load();
    } catch {
      // ignore
    }
  };

  const todayIdx = new Date().getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => (todayIdx - 3 + i + 7) % 7);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>تمارين اليوم 💪</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('ar-SA')}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalToday ? (completedToday.length / totalToday) * 100 : 0}%` }]} />
        </View>
        <Text style={[styles.progressLabel, { fontFamily: fontMono }]}>
          {completedToday.length} من {totalToday} مكتملة
        </Text>
      </View>

      <View style={styles.weekStrip}>
        {weekDays.map((dayIdx) => {
          const isToday = dayIdx === todayIdx;
          const hasIncomplete = false;
          return (
            <TouchableOpacity
              key={dayIdx}
              style={[styles.dayCircle, isToday && styles.dayCircleToday]}
              onPress={() => setSelectedDay(dayIdx)}
            >
              <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
      >
        {allDone ? (
          <View style={styles.celebration}>
            <Text style={styles.celebrationText}>أحسنت! أكملت جميع تمارين اليوم 🎉</Text>
          </View>
        ) : null}
        {list.map((pe) => {
          const done = (pe.completions || []).some((c) => c.completedAt.startsWith(today));
          const icon = '💪';
          return (
            <View key={pe.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.exerciseIcon}>{icon}</Text>
                <Text style={styles.exerciseName}>{pe.exercise?.name ?? '—'}</Text>
                <TouchableOpacity
                  style={[styles.checkCircle, done && styles.checkCircleDone]}
                  onPress={() => toggleComplete(pe)}
                >
                  <Text style={styles.checkMark}>{done ? '✓' : '○'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.details}>
                {pe.frequency ?? '—'} · {pe.exercise?.targetMuscles ?? ''}
              </Text>
            </View>
          );
        })}
        {list.length === 0 && !error ? (
          <Text style={styles.empty}>لا تمارين معينة لهذا اليوم</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'right', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: C.border, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.green, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'right' },
  weekStrip: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 12 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { borderWidth: 2, borderColor: C.cyan },
  dayLabel: { color: C.text, fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  exerciseIcon: { fontSize: 24, marginLeft: 12 },
  exerciseName: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'right' },
  checkCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border,
  },
  checkCircleDone: { borderColor: C.green, backgroundColor: 'rgba(52,211,153,0.2)' },
  checkMark: { color: C.text, fontSize: 18 },
  details: { fontSize: 13, color: C.muted, marginTop: 8, textAlign: 'right' },
  celebration: {
    backgroundColor: C.green,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  celebrationText: { color: C.bg, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  empty: { textAlign: 'center', color: C.muted, marginTop: 24 },
  errorCard: { margin: 16, padding: 16, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: radius.card },
  errorText: { color: C.amber, textAlign: 'right' },
  retryBtn: { marginTop: 8 },
  retryText: { color: C.cyan },
});
