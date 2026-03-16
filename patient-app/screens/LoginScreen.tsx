import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, radius } from '../constants/theme';
import { setLanguage, SUPPORTED_LANGUAGES } from '../lib/i18n';

type Props = { login: (phone: string, password: string) => Promise<void>; onSuccess: () => void };

export function LoginScreen({ login, onSuccess }: Props) {
  const { t, i18n } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!phone.trim() || !password) {
      setError(t('login.errorRequired'));
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('login.errorFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.langRow}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <TouchableOpacity
              key={lng}
              onPress={() => setLanguage(lng)}
              style={[styles.langBtn, currentLang === lng && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, currentLang === lng && styles.langBtnTextActive]}>
                {lng === 'ar' ? 'ع' : 'EN'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.header}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.title}>{t('login.title')}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            placeholder={t('login.phone')}
            placeholderTextColor={C.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            placeholder={t('login.password')}
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text style={styles.btnText}>{t('login.submit')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {}}
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  langBtn: { marginLeft: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.s1 },
  langBtnActive: { backgroundColor: C.cyan },
  langBtnText: { color: C.muted, fontWeight: '600' },
  langBtnTextActive: { color: C.bg },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'right' },
  form: { width: '100%' },
  input: {
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.small,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
    marginBottom: 12,
    textAlign: 'right',
  },
  error: { color: C.red, fontSize: 14, marginBottom: 8, textAlign: 'right' },
  btn: {
    backgroundColor: C.cyan,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: C.bg, fontSize: 18, fontWeight: '700' },
  forgot: { marginTop: 16, alignItems: 'center' },
  forgotText: { color: C.muted, fontSize: 14 },
});
