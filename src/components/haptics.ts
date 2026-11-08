import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ok = Platform.OS === 'ios' || Platform.OS === 'android';
export const tap = () => ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const select = () => ok && Haptics.selectionAsync().catch(() => {});
export const success = () => ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
