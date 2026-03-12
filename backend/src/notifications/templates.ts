export const NOTIFICATION_TEMPLATES: Record<
  string,
  Partial<Record<'whatsapp' | 'sms' | 'app', string>>
> = {
  appointment_reminder_24h: {
    whatsapp:
      'مرحباً {{patientName}} 👋\nتذكير بموعدك غداً {{dayName}}\n🕙 {{time}}\n👨‍⚕️ {{doctorName}}\n🏥 {{roomName}}\n\nللتأكيد أرسل 1 وللإلغاء أرسل 2',
    sms: 'تذكير: موعدك غداً {{dayName}} {{time}} مع {{doctorName}}. للإلغاء اتصل بنا.',
  },
  appointment_reminder_2h: {
    whatsapp:
      'موعدك بعد ساعتين ⏰\n{{time}} مع {{doctorName}}\nنراك قريباً!',
    sms: 'تذكير: موعدك بعد ساعتين {{time}} - مركز العلاج الفيزيائي',
  },
  appointment_confirmed: {
    whatsapp:
      '✅ تم تأكيد موعدك\n📅 {{date}} الساعة {{time}}\n👨‍⚕️ {{doctorName}}\nنراك قريباً 🌟',
  },
  appointment_cancelled: {
    whatsapp: '❌ تم إلغاء موعدك يوم {{date}}\nللحجز في وقت آخر اتصل بنا',
    sms: 'تم إلغاء موعدك يوم {{date}} - مركز العلاج الفيزيائي',
  },
  transport_assigned: {
    whatsapp:
      '🚐 السيارة في طريقها إليك!\nالسائق: {{driverName}}\nرقم السيارة: {{plateNumber}}\nوقت الوصول المتوقع: {{eta}}',
  },
  transport_arrived: {
    whatsapp:
      '📍 السيارة وصلت!\nاللوحة: {{plateNumber}}\nالسائق: {{driverName}} بانتظارك',
  },
  exercise_reminder: {
    whatsapp:
      '💪 لا تنسَ تمارين اليوم!\n{{exerciseList}}\nسجّل إنجازك من التطبيق',
    app: 'حان وقت تمارينك اليوم 💪',
  },
  manual: {
    whatsapp: '{{message}}',
    sms: '{{message}}',
    app: '{{message}}',
  },
};

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  return out.replace(/\{\{[^}]+\}\}/g, '');
}

export function getTemplateVariables(type: string): string[] {
  const templates = NOTIFICATION_TEMPLATES[type];
  if (!templates) return [];
  const text = Object.values(templates).join(' ');
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}
