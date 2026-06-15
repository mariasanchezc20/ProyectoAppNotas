import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  primary: '#3b82f6',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  danger: '#ef4444',
  border: '#334155',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText: { color: colors.primary, textAlign: 'center', marginTop: 18 },
  errorText: { color: colors.danger, marginTop: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardCategory: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  cardContent: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
