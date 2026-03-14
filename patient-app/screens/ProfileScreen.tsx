import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, fontMono } from '../constants/theme';
import {
  getPatientProfile,
  getMyAppointments,
  getMyExercises,
  changePassword,
  type Patient,
} from '../services/api';

const THEME_KEY = 'patient_app_theme';
const ARRIVAL_LABELS: Record<string, string> = {
  self_arrival: 'قادم بمفرده',
  center_transport: 'نقل المركز',
};

function maskPhone(phone: string | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+966 ···';
  return `+966 50 ··· ${digits.slice(-4)}`;
}

export function ProfileScreen({ navigation }: { navigation: { navigate: (a: string) => void } }) {
  const { patient, logout } = useAuth();
  const [profile, setProfile] = useState<Patient & { address?: string | null; diagnosis?: string | null } | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [todayExercises, setTodayExercises] = useState(0);
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const load = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const [p, apts, exs] = await Promise.all([
        getPatientProfile(patient.id),
        getMyAppointments(patient.id),
        getMyExercises(patient.id),
      ]);
      setProfile(p ?? null);
      const all = Array.isArray(apts) ? apts : [];
      setCompletedCount(all.filter((a) => a.status === 'completed').length);
      const today = new Date().toISOString().slice(0, 10);
      const exList = Array.isArray(exs) ? exs : [];
      setTodayExercises(exList.filter((pe) => (pe.completions || []).some((c) => c.completedAt.startsWith(today))).length);
    } catch {
      setProfile(null);
    }
  }, [patient?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v: string | null) => {
      if (v === 'light') setDarkMode(false);
    }).catch(() => {});
  }, []);

  const createdAtStr = profile && (profile as { createdAt?: string }).createdAt;
  const joinDate = createdAtStr ? new Date(createdAtStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : '—';

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة والتأكيد غير متطابقتين');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('تم', 'تم تغيير كلمة المرور');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'فشل تغيير كلمة المرور');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل تريد تسجيل الخروج؟',
      [
        { text: 'تراجع', style: 'cancel' },
        { text: 'تسجيل الخروج', style: 'destructive', onPress: async () => {
          await logout();
          // Navigation to login is handled by AppContent when token is cleared
        } },
      ]
    );
  };

  const toggleTheme = (v: boolean) => {
    setDarkMode(v);
    AsyncStorage.setItem(THEME_KEY, v ? 'dark' : 'light').catch(() => {});
  };

  const onNotificationsChange = async (v: boolean) => {
    setNotificationsOn(v);
    if (v && patient?.id) {
      try {
        const { registerForPushNotifications } = await import('../notifications');
        await registerForPushNotifications(patient.id);
      } catch {
        setNotificationsOn(false);
      }
    }
  };

  const recoveryScore = profile?.recoveryScore ?? patient?.recoveryScore ?? null;
  const recoveryColor = recoveryScore == null ? C.muted : recoveryScore > 70 ? C.green : recoveryScore >= 40 ? C.amber : C.red;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <LinearGradient colors={[C.cyan, C.purple]} style={styles.avatarGradient}>
            <Text style={styles.avatarText}>{(profile?.nameAr ?? patient?.nameAr ?? '؟').slice(0, 2)}</Text>
          </LinearGradient>
          <Text style={styles.name}>{profile?.nameAr ?? patient?.nameAr ?? '—'}</Text>
          <Text style={styles.sub}>مريض نشط · منذ {joinDate}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontFamily: fontMono }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>جلسات مكتملة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: recoveryColor }, { fontFamily: fontMono }]}>
              {recoveryScore != null ? recoveryScore + '%' : '—'}
            </Text>
            <Text style={styles.statLabel}>نسبة التعافي</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontFamily: fontMono }]}>{todayExercises}</Text>
            <Text style={styles.statLabel}>تمارين اليوم</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
          <View style={styles.row}><Text style={styles.rowIcon}>📞</Text><Text style={styles.rowText}>{maskPhone(profile?.phone ?? patient?.phone)}</Text></View>
          <View style={styles.row}><Text style={styles.rowIcon}>🏠</Text><Text style={styles.rowText}>{(profile as { address?: string })?.address ?? '—'}</Text></View>
          <View style={styles.row}><Text style={styles.rowIcon}>🩺</Text><Text style={styles.rowText}>{(profile as { diagnosis?: string })?.diagnosis ?? '—'}</Text></View>
          <View style={styles.row}><Text style={styles.rowIcon}>🚐</Text><Text style={styles.rowText}>{profile && (profile as { arrivalPreference?: string }).arrivalPreference ? ARRIVAL_LABELS[(profile as { arrivalPreference?: string }).arrivalPreference as string] ?? (profile as { arrivalPreference?: string }).arrivalPreference : '—'}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإعدادات</Text>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>🔔</Text>
            <Text style={styles.rowText}>الإشعارات</Text>
            <Switch value={notificationsOn} onValueChange={onNotificationsChange} trackColor={{ false: C.muted, true: C.cyan }} thumbColor={C.text} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>🌙</Text>
            <Text style={styles.rowText}>المظهر</Text>
            <Switch value={darkMode} onValueChange={toggleTheme} trackColor={{ false: C.muted, true: C.cyan }} thumbColor={C.text} />
          </View>
          <View style={styles.row}><Text style={styles.rowIcon}>🌐</Text><Text style={styles.rowText}>اللغة: عربي</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب</Text>
          <TouchableOpacity style={styles.row} onPress={() => setPasswordModal(true)}>
            <Text style={styles.rowIcon}>🔑</Text>
            <Text style={styles.rowText}>تغيير كلمة المرور</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={styles.rowIcon}>🚪</Text>
            <Text style={[styles.rowText, { color: C.red }]}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.progressLink} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.progressLinkText}>📊 تقدمي</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>
            <TextInput placeholder="كلمة المرور الحالية" placeholderTextColor={C.muted} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} />
            <TextInput placeholder="كلمة المرور الجديدة" placeholderTextColor={C.muted} secureTextEntry value={newPassword} onChangeText={setNewPassword} style={styles.input} />
            <TextInput placeholder="تأكيد كلمة المرور الجديدة" placeholderTextColor={C.muted} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setPasswordModal(false)}>
                <Text style={styles.modalBtnCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOk} onPress={handleChangePassword}>
                <Text style={styles.modalBtnOkText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatarGradient: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: C.text },
  name: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 12 },
  sub: { fontSize: 13, color: C.muted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.s1, borderRadius: radius.card, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: C.cyan },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 10, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.s1, borderRadius: radius.card, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rowIcon: { fontSize: 18, marginLeft: 10 },
  rowText: { flex: 1, fontSize: 15, color: C.text, textAlign: 'right' },
  progressLink: { marginTop: 16, padding: 16, backgroundColor: C.s1, borderRadius: radius.card, borderWidth: 1, borderColor: C.border },
  progressLinkText: { fontSize: 15, color: C.cyan, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: C.s1, borderRadius: radius.card, padding: 20, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16, textAlign: 'right' },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: radius.button, padding: 12, marginBottom: 12, color: C.text, textAlign: 'right' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalBtnCancelText: { color: C.muted },
  modalBtnOk: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: C.cyan, borderRadius: radius.button },
  modalBtnOkText: { color: C.bg, fontWeight: '600' },
});
