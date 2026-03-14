import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
// Axis labels rendered via View/Text below
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import { getMyProgress, getClinicalSessions, getMyPrescriptions, getMyVitals, getMyAppointments, type ProgressPoint, type ClinicalSession, type Prescription } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - 32;
const CHART_H = 160;
const PAD = { left: 40, right: 16, top: 20, bottom: 28 };

export function ProgressScreen() {
  const { patient } = useAuth();
  const [points, setPoints] = useState<ProgressPoint[]>([]);
  const [session, setSession] = useState<ClinicalSession | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [vitals, setVitals] = useState<{ painLevel?: number | null; recordedAt: string }[]>([]);
  const [nextApt, setNextApt] = useState<{ startTime: string; doctor?: { nameAr?: string | null } } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patient?.id) return;
    setError('');
    try {
      const [progressData, sessionsData, rxData, vitalsData, aptsData] = await Promise.all([
        getMyProgress(patient.id),
        getClinicalSessions(patient.id, 2),
        getMyPrescriptions(patient.id),
        getMyVitals(5).catch(() => []),
        getMyAppointments(patient.id, 'scheduled', 1).catch(() => []),
      ]);
      setPoints(Array.isArray(progressData) ? progressData : []);
      setSession(Array.isArray(sessionsData) && sessionsData.length ? sessionsData[0] : null);
      setPrescriptions(Array.isArray(rxData) ? rxData : []);
      setVitals(Array.isArray(vitalsData) ? vitalsData : []);
      const scheduled = Array.isArray(aptsData) && aptsData.length ? aptsData[0] : null;
      setNextApt(scheduled ?? null);
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

  const score = patient?.recoveryScore ?? (points.length ? points[points.length - 1]?.recoveryScore : null);
  const scoreColor = score == null ? C.muted : score > 70 ? C.green : score >= 40 ? C.amber : C.red;

  const chartW = CHART_W - PAD.left - PAD.right;
  const chartH = CHART_H - PAD.top - PAD.bottom;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const minScore = Math.min(0, ...sorted.map((p) => p.recoveryScore));
  const maxScore = Math.max(100, ...sorted.map((p) => p.recoveryScore));
  const range = maxScore - minScore || 1;
  const getX = (i: number) => PAD.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * chartW : 0);
  const getY = (s: number) => PAD.top + chartH - ((s - minScore) / range) * chartH;

  let pathD = '';
  let areaD = '';
  if (sorted.length) {
    pathD = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.recoveryScore)}`).join(' ');
    areaD = `${pathD} L ${getX(sorted.length - 1)} ${PAD.top + chartH} L ${getX(0)} ${PAD.top + chartH} Z`;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
      >
        <View style={styles.hero}>
          <Text style={[styles.score, { color: scoreColor }, { fontFamily: fontMono }]}>
            {score != null ? score : '—'}
          </Text>
          <Text style={styles.scoreLabel}>مستوى التعافي</Text>
          <View style={styles.changePill}>
            <Text style={styles.changeText}>← لا تغيير</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.chartCard}>
          <Svg width={CHART_W} height={CHART_H}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={scoreColor} stopOpacity="0.08" />
                <Stop offset="1" stopColor={scoreColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={CHART_H - PAD.bottom} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1={PAD.left} y1={CHART_H - PAD.bottom} x2={CHART_W - PAD.right} y2={CHART_H - PAD.bottom} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {areaD ? <Path d={areaD} fill="url(#areaFill)" /> : null}
            {pathD ? <Path d={pathD} fill="none" stroke={scoreColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : null}
            {sorted.map((p, i) => (
              <Circle key={p.date} cx={getX(i)} cy={getY(p.recoveryScore)} r={i === sorted.length - 1 ? 5 : 3} fill={scoreColor} />
            ))}
            {[0, 50, 100].map((v) => (
              <SvgText key={v} x={PAD.left - 4} y={getY(v)} fill={C.muted} fontSize="9" fontFamily={fontMono} textAnchor="end">
                {v}
              </SvgText>
            ))}
          </Svg>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آخر جلسة</Text>
          {session ? (
            <View style={styles.card}>
              <Text style={styles.muted}>
                {session.appointment?.startTime ? new Date(session.appointment.startTime).toLocaleDateString('ar-SA') : '—'}
              </Text>
              <Text style={styles.doctorName}>د. {session.appointment?.doctor?.nameAr ?? '—'}</Text>
              {session.subjective ? (
                <Text style={styles.muted}>S (شكوى المريض): {(session.subjective as string).slice(0, 100)}{(session.subjective as string).length > 100 ? '...' : ''}</Text>
              ) : null}
              {session.recoveryScore != null && points.length >= 2 && (
                <Text style={[styles.scoreSmall, { fontFamily: fontMono }]}>
                  نسبة التعافي: {points[points.length - 2]?.recoveryScore ?? '—'}% → {session.recoveryScore}%
                </Text>
              )}
              {session.recoveryScore != null && (!points.length || points.length < 2) && (
                <Text style={[styles.scoreSmall, { fontFamily: fontMono }]}>نسبة التعافي: {session.recoveryScore}%</Text>
              )}
            </View>
          ) : (
            <Text style={styles.muted}>لا توجد جلسات</Text>
          )}
        </View>

        {vitals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>آخر قياس ألم</Text>
            <View style={styles.card}>
              <View style={styles.painBars}>
                {vitals.slice(0, 5).reverse().map((v, i) => {
                  const p = v.painLevel ?? 0;
                  const color = p >= 7 ? C.red : p >= 4 ? C.amber : C.green;
                  return (
                    <View key={v.recordedAt + i} style={styles.painBarRow}>
                      <Text style={[styles.muted, { fontSize: 10 }]}>{new Date(v.recordedAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</Text>
                      <View style={styles.painBarBg}>
                        <View style={[styles.painBarFill, { width: `${(p / 10) * 100}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.painBarValue, { fontFamily: fontMono, color }]}>{p}/10</Text>
                    </View>
                  );
                })}
              </View>
              {(() => {
                const p = vitals[0]?.painLevel ?? 0;
                const color = p >= 7 ? C.red : p >= 4 ? C.amber : C.green;
                return <Text style={[styles.muted, { marginTop: 8, color }]}>آخر قياس ألم: {p}/10</Text>;
              })()}
            </View>
          </View>
        )}

        {nextApt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>موعدك القادم</Text>
            <View style={styles.card}>
              <Text style={styles.doctorName}>د. {nextApt.doctor?.nameAr ?? '—'}</Text>
              <Text style={styles.muted}>
                {new Date(nextApt.startTime).toLocaleDateString('ar-SA')} · {new Date(nextApt.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {(() => {
                const days = Math.ceil((new Date(nextApt.startTime).getTime() - Date.now()) / 86400000);
                return <Text style={[styles.scoreSmall, { fontFamily: fontMono }]}>موعدك القادم بعد {days} يوم</Text>;
              })()}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الوصفات الطبية</Text>
          {prescriptions.filter((r) => r.status === 'active').length === 0 ? (
            <Text style={styles.muted}>لا توجد وصفات نشطة</Text>
          ) : (
            prescriptions
              .filter((r) => r.status === 'active')
              .map((rx) => (
                <View key={rx.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.doctorName, { marginTop: 0 }]}>{rx.rxNumber}</Text>
                    <View style={{ backgroundColor: C.cyan + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.badge }}>
                      <Text style={{ fontSize: 11, color: C.cyan }}>نشطة</Text>
                    </View>
                  </View>
                  {(rx.items ?? []).map((it) => (
                    <Text key={it.id} style={styles.muted}>
                      {it.drug?.nameAr ?? '—'} — {it.dose} {it.doseUnit}، {it.frequency}، {it.durationDays} يوم
                    </Text>
                  ))}
                  {rx.expiresAt ? (
                    <Text style={[styles.muted, { marginTop: 6 }]}>تنتهي: {new Date(rx.expiresAt).toLocaleDateString('ar-SA')}</Text>
                  ) : null}
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 24 },
  score: { fontSize: 56, fontWeight: '700' },
  scoreLabel: { fontSize: 16, color: C.muted, marginTop: 4 },
  changePill: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.s2, borderRadius: radius.badge },
  changeText: { color: C.muted, fontSize: 13 },
  chartCard: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 8,
    marginBottom: 24,
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'right' },
  card: {
    backgroundColor: C.s1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  doctorName: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 4 },
  muted: { fontSize: 14, color: C.muted, textAlign: 'right', marginTop: 2 },
  scoreSmall: { fontSize: 14, color: C.cyan, textAlign: 'right', marginTop: 4 },
  errorCard: { marginBottom: 16, padding: 16, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: radius.card },
  errorText: { color: C.amber, textAlign: 'right' },
  retryBtn: { marginTop: 8 },
  retryText: { color: C.cyan },
  axisLabels: { position: 'absolute', left: 8, top: PAD.top, height: CHART_H - PAD.top - PAD.bottom, justifyContent: 'space-between' },
  axisText: { fontSize: 9, color: C.muted },
  painBars: { gap: 6 },
  painBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  painBarBg: { flex: 1, height: 6, backgroundColor: C.s2, borderRadius: 3, overflow: 'hidden' },
  painBarFill: { height: '100%', borderRadius: 3 },
  painBarValue: { fontSize: 11, width: 28 },
});
