import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#1B1D22',
  sub: '#6B7280',
  line: '#E5E7EB',
  primary: '#2F6FEB',
  primarySoft: '#E8F0FE',
  good: '#14804A',
  warn: '#B45309',
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 6 },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  sub: { fontSize: 13, color: colors.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
});
