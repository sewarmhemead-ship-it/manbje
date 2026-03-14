import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import {
  getMyAppointments,
  getMyExercises,
  getMyNotifications,
  rateAppointment,
  type Appointment,
  type PatientExercise,
  type OutboundNotification,
} from '../services/api';

const RATED_IDS_KEY = 'patient_rated_appointment_ids';

export function HomeScreen() {
  const { patient } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [nextApt, setNextApt] = useState<Appointment | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [todayExercises, setTodayExercises] = useState<PatientExercise[]>([]);
  const [todayDone, setTodayDone] = useState(0);
  const [lastNotif, setLastNotif] = useState<OutboundNotification | null>(null);
  const [error, setError] = useState('');
  const [appointmentToRate, setAppointmentToRate] = useState<Appointment | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!patient?.id) return;
    setError('');
    try {
      const [apts, allApts, exercises, notifs] = await Promise.all([
        getMyAppointments(patient.id, 'scheduled', 1),
        getMyAppointments(patient.id),
        getMyExercises(patient.id),
        getMyNotifications(1),
      ]);
      const scheduled = Array.isArray(apts) ? apts : [];
      setNextApt(scheduled[0] ?? null);
      const all = Array.isArray(allApts) ? allApts : [];
      setCompletedCount(all.filter((a) => a.status === 'completed').length);
      const exList = Array.isArray(exercises) ? exercises : [];
      const today = new Date().toISOString().slice(0, 10);
      const forToday = exList.filter((pe) => {
        const comps = pe.completions || [];
        return comps.some((c) => c.completedAt.startsWith(today));
      });
      setTodayExercises(exList.slice(0, 3));
      setTodayDone(forToday.length);
      setLastNotif(Array.isArray(notifs) && notifs.length ? notifs[0] : null);
      const completed = (Array.isArray(allApts) ? allApts : []).filter((a) => a.status === 'completed');
      const ratedRaw = await AsyncStorage.getItem(RATED_IDS_KEY).catch(() => null);
      const ratedIds = new Set<string>(ratedRaw ? JSON.parse(ratedRaw) : []);
      const unrated = completed.find((a) => !ratedIds.has(a.id) && (a.patientRating == null || a.patientRating === 0));
      setAppointmentToRate(unrated ?? null);
    } catch {
      setError('حدث خطأ — إعادة المحاولة');
    }
  }, [patient?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSubmitRating = useCallback(async () => {
    if (!appointmentToRate || ratingStars < 1) return;
    setRatingSubmitting(true);
    try {
      await rateAppointment(appointmentToRate.id, ratingStars, ratingComment.slice(0, 200) || undefined);
      const ratedRaw = await AsyncStorage.getItem(RATED_IDS_KEY).catch(() => '[]');
      const rated = ratedRaw ? JSON.parse(ratedRaw) : [];
      rated.push(appointmentToRate.id);
      await AsyncStorage.setItem(RATED_IDS_KEY, JSON.stringify(rated));
      setAppointmentToRate(null);
      setRatingStars(0);
      setRatingComment('');
      setToast('شكراً على تقييمك! ⭐');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('فشل إرسال التقييم');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setRatingSubmitting(false);
    }
  }, [appointmentToRate, ratingStars, ratingComment]);

  const todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const recoveryScore = patient?.recoveryScore ?? null;
  const recoveryColor = recoveryScore == null ? C.muted : recoveryScore > 70 ? C.green : recoveryScore >= 40 ? C.amber : C.red;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
      >
        <View style={[styles.header, styles.section]}>
          <Text style={styles.greeting}>مرحباً {patient?.nameAr ?? ''} 👋</Text>
          <Text style={styles.subtitle}>{todayDate}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الموعد القادم</Text>
          {nextApt ? (
            <View style={styles.card}>
              <Text style={[styles.time, { fontFamily: fontMono }]}>
                {new Date(nextApt.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('ص', 'ص').replace('م', 'م')}
              </Text>
              <Text style={styles.doctorName}>{nextApt.doctor?.nameAr ?? '—'}</Text>
              <Text style={styles.muted}>{nextApt.room?.roomNumber ?? '—'}</Text>
              {nextApt.arrivalType === 'center_transport' && nextApt.transportRequest && (
                <View style={styles.transportRow}>
                  <Text style={styles.amber}>🚐 سيارة المركز في طريقها</Text>
                  {nextApt.transportRequest.pickupTime && (
                    <Text style={[styles.muted, { fontFamily: fontMono }]}>
                      {new Date(nextApt.transportRequest.pickupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.muted}>لا مواعيد قادمة</Text>
            </View>
          )}
        </View>

        {appointmentToRate && (
          <View style={[styles.card, styles.ratingCard]}>
            <Text style={styles.ratingTitle}>كيف كانت جلستك مع د. {appointmentToRate.doctor?.nameAr ?? '—'}؟</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRatingStars(s)} style={styles.starBtn}>
                  <Text style={[styles.starText, { color: s <= ratingStars ? C.amber : 'rgba(255,255,255,0.15)' }]}>{s <= ratingStars ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="تعليق (اختياري، 200 حرف)"
              placeholderTextColor={C.muted}
              value={ratingComment}
              onChangeText={(t) => setRatingComment(t.slice(0, 200))}
              style={styles.ratingInput}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.ratingSubmit, ratingSubmitting && styles.ratingSubmitDisabled]}
              onPress={handleSubmitRating}
              disabled={ratingStars < 1 || ratingSubmitting}
            >
              <Text style={styles.ratingSubmitText}>إرسال التقييم</Text>
            </TouchableOpacity>
          </View>
        )}

        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.cyan }, { fontFamily: fontMono }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>إجمالي الجلسات</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: recoveryColor }, { fontFamily: fontMono }]}>
              {recoveryScore != null ? recoveryScore + '%' : '—'}
            </Text>
            <Text style={styles.statLabel}>نسبة التعافي</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.green }, { fontFamily: fontMono }]}>{todayDone}/{todayExercises.length || 0}</Text>
            <Text style={styles.statLabel}>تمارين اليوم</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>تمارين اليوم</Text>
            <TouchableOpacity><Text style={styles.link}>الكل</Text></TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            {todayExercises.length === 0 ? (
              <Text style={styles.muted}>لا تمارين لهذا اليوم</Text>
            ) : (
              todayExercises.map((pe) => {
                const today = new Date().toISOString().slice(0, 10);
                const done = (pe.completions || []).some((c) => c.completedAt.startsWith(today));
                return (
                  <View key={pe.id} style={[styles.chip, done && styles.chipDone]}>
                    <Text style={styles.chipText}>💪 {pe.exercise?.name ?? '—'} {done ? '✓' : '○'}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {lastNotif ? (
          <View style={styles.notifBanner}>
            <Text style={styles.notifIcon}>🔔</Text>
            <Text style={styles.notifMessage} numberOfLines={2}>{lastNotif.messageAr}</Text>
            <Text style={styles.notifTime}>
              {lastNotif.sentAt ? new Date(lastNotif.sentAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  header: { paddingVertical: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'right' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  link: { color: C.cyan, fontSize: 14 },
  card: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  time: { fontSize: 28, color: C.cyan, textAlign: 'right' },
  doctorName: { fontSize: 18, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 4 },
  muted: { fontSize: 14, color: C.muted, textAlign: 'right', marginTop: 2 },
  transportRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amber: { color: C.amber, fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: C.s1,
    borderRadius: radius.badge,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipDone: { borderColor: C.green },
  chipText: { color: C.text, fontSize: 14 },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.s2,
    borderRadius: radius.small,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  notifIcon: { fontSize: 18 },
  notifMessage: { flex: 1, color: C.text, fontSize: 13, textAlign: 'right' },
  notifTime: { fontSize: 11, color: C.muted },
  errorCard: { backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: radius.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.amber },
  errorText: { color: C.amber, textAlign: 'right' },
  retryBtn: { marginTop: 8, alignSelf: 'flex-end' },
  retryText: { color: C.cyan },
  ratingCard: { marginBottom: 16 },
  ratingTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12, textAlign: 'right' },
  starsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 },
  starBtn: { padding: 4 },
  starText: { fontSize: 28 },
  ratingInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: radius.button, padding: 12, color: C.text, textAlign: 'right', minHeight: 60, marginBottom: 12 },
  ratingSubmit: { backgroundColor: C.cyan, borderRadius: radius.button, padding: 14, alignItems: 'center' },
  ratingSubmitDisabled: { opacity: 0.6 },
  ratingSubmitText: { color: C.bg, fontWeight: '700' },
  toast: { backgroundColor: C.green + '22', padding: 12, borderRadius: radius.small, marginBottom: 12, borderWidth: 1, borderColor: C.green },
  toastText: { color: C.green, textAlign: 'right' },
});
