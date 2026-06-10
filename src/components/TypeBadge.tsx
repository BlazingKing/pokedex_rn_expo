import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPE_COLORS } from '../constants/typeColors';

interface Props {
  type: string;
  small?: boolean;
}

export default function TypeBadge({ type, small }: Props) {
  const colors = TYPE_COLORS[type] ?? TYPE_COLORS.normal;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg + '33', borderColor: colors.glow }, small && styles.small]}>
      <Text style={[styles.text, { color: colors.glow }, small && styles.smallText]}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  smallText: {
    fontSize: 9,
  },
});
