import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { STAT_COLORS } from '../constants/typeColors';
import { formatStatName } from '../utils/pokemon';

interface Props {
  name: string;
  value: number;
  max?: number;
}

export default function StatBar({ name, value, max = 255 }: Props) {
  const width = useRef(new Animated.Value(0)).current;
  const color = STAT_COLORS[name] ?? '#60A5FA';
  const pct = Math.min((value / max) * 100, 100);

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{formatStatName(name)}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              shadowColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    width: 64,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    width: 36,
    textAlign: 'right',
    marginRight: 10,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
});
