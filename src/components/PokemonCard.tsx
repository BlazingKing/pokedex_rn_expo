import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPE_COLORS } from '../constants/typeColors';
import TypeBadge from './TypeBadge';
import { getPokemonImageUrl, getPokemonId } from '../utils/pokemon';
import type { Pokemon } from '../types/pokemon';

interface Props {
  pokemon: Pokemon;
  onPress: () => void;
}

export default function PokemonCard({ pokemon, onPress }: Props) {
  const primaryType = pokemon.types[0]?.type.name ?? 'normal';
  const colors = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;
  const imageUrl = getPokemonImageUrl(pokemon.id);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      <LinearGradient
        colors={[colors.bg + '40', '#0F172A', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Glow circle */}
        <View style={[styles.glow, { backgroundColor: colors.glow + '18' }]} />

        {/* Number */}
        <Text style={styles.number}>#{String(pokemon.id).padStart(4, '0')}</Text>

        {/* Image */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</Text>
          <View style={styles.types}>
            {pokemon.types.map((t) => (
              <TypeBadge key={t.type.name} type={t.type.name} small />
            ))}
          </View>
        </View>

        {/* Border glow */}
        <View style={[styles.borderGlow, { borderColor: colors.glow + '30' }]} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: 6,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    overflow: 'hidden',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  number: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  image: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginVertical: 4,
  },
  info: {
    gap: 6,
  },
  name: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  borderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
  },
});
