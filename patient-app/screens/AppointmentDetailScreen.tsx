import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { C, radius, fontMono } from '../constants/theme';
import { api, cancelAppointment, type Appointment } from '../services/api';

export function AppointmentDetailScreen() {
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? '';
  const navigation = useNavigation();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<Appointment>(`/appointments/${id}`).then((r) => {
      setApt(r.data);
    }).catch(() => setApt(null)).finally(() => setLoading(false));
  }, [id]);

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
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const canCancel = isScheduled && start > twoHoursFromNow;

  const handleCancelConfirm = async () => {
    if (!apt) return;
    setCancelling(true);
    try {
      await cancelAppointment(apt.id);
      setToast('تم إلغاء موعدك');
      setCancelModal(false);
      setTimeout(() => (navigation as { goBack: () => void }).goBack(), 500);
    } catch {
      setToast('فشل الإلغاء');
    } finally {
      setCancelling(false);
    }
  };

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

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelModal(true)}>
            <Text style={styles.cancelBtnText}>إلغاء الموعد</Text>
          </TouchableOpacity>
        )}

        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      </ScrollView>

      <Modal visible={cancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>هل أنت متأكد من إلغاء الموعد؟</Text>
            <Text style={styles.modalSub}>سيتم إبلاغ المركز تلقائياً</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCancelModal(false)} disabled={cancelling}>
                <Text style={styles.modalBtnCancelText}>تراجع</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={handleCancelConfirm} disabled={cancelling}>
                <Text style={styles.modalBtnDangerText}>إلغاء الموعد</Text>
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
  cancelBtn: { marginTop: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.red, borderRadius: radius.button },
  cancelBtnText: { color: C.red },
  toast: { marginTop: 12, padding: 12, backgroundColor: C.green + '22', borderRadius: radius.small },
  toastText: { color: C.green, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 0 },
  modalBox: { backgroundColor: C.s1, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: 24, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'right' },
  modalSub: { fontSize: 14, color: C.muted, marginBottom: 20, textAlign: 'right' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.s2, borderRadius: radius.button },
  modalBtnCancelText: { color: C.muted },
  modalBtnDanger: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.red + '22', borderRadius: radius.button },
  modalBtnDangerText: { color: C.red, fontWeight: '600' },
});
