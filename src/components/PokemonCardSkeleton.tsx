import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function PokemonCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, { opacity }]}>
        <View style={styles.number} />
        <View style={styles.image} />
        <View style={styles.name} />
        <View style={styles.type} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, margin: 6 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 14,
    minHeight: 180,
    gap: 8,
  },
  number: { width: 40, height: 10, backgroundColor: '#334155', borderRadius: 5 },
  image: { width: 80, height: 80, backgroundColor: '#334155', borderRadius: 40, alignSelf: 'center' },
  name: { width: '60%', height: 12, backgroundColor: '#334155', borderRadius: 6 },
  type: { width: '40%', height: 18, backgroundColor: '#334155', borderRadius: 9 },
});
