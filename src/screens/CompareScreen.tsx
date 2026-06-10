import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { usePokemon } from '../hooks/usePokemon';
import { getPokemonImageUrl, formatStatName, formatHeight, formatWeight } from '../utils/pokemon';
import { TYPE_COLORS, STAT_COLORS } from '../constants/typeColors';
import TypeBadge from '../components/TypeBadge';
import RadarChart from '../components/RadarChart';
import type { Pokemon } from '../types/pokemon';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;

const { width: W } = Dimensions.get('window');
const COL = (W - 48) / 2;

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export default function CompareScreen({ route, navigation }: Props) {
  const { idA, idB } = route.params;
  const { data: pokeA } = usePokemon(idA);
  const { data: pokeB } = usePokemon(idB);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Compare</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Pokémon headers */}
        <View style={styles.pokeRow}>
          <PokeHeader pokemon={pokeA} />
          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <PokeHeader pokemon={pokeB} />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <InfoPair label="Height" valueA={pokeA ? formatHeight(pokeA.height) : '—'} valueB={pokeB ? formatHeight(pokeB.height) : '—'} />
          <InfoPair label="Weight" valueA={pokeA ? formatWeight(pokeA.weight) : '—'} valueB={pokeB ? formatWeight(pokeB.weight) : '—'} />
          <InfoPair
            label="Base XP"
            valueA={String(pokeA?.base_experience ?? '—')}
            valueB={String(pokeB?.base_experience ?? '—')}
            highlightWinner
            numA={pokeA?.base_experience ?? 0}
            numB={pokeB?.base_experience ?? 0}
          />
        </View>

        {/* Stat bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base Stats</Text>
          {STAT_ORDER.map((statName) => {
            const valA = pokeA?.stats.find((s) => s.stat.name === statName)?.base_stat ?? 0;
            const valB = pokeB?.stats.find((s) => s.stat.name === statName)?.base_stat ?? 0;
            return (
              <CompareStatRow key={statName} name={statName} valA={valA} valB={valB} />
            );
          })}
          {/* Total */}
          {pokeA && pokeB && (
            <TotalRow
              totalA={pokeA.stats.reduce((s, x) => s + x.base_stat, 0)}
              totalB={pokeB.stats.reduce((s, x) => s + x.base_stat, 0)}
            />
          )}
        </View>

        {/* Radar chart overlay */}
        {pokeA && pokeB && (
          <View style={styles.radarSection}>
            <Text style={styles.sectionTitle}>STAT CHART</Text>
            <RadarChart
              stats={pokeA.stats.map((s) => ({ name: s.stat.name, value: s.base_stat }))}
              color="#818CF8"
              secondStats={pokeB.stats.map((s) => ({ name: s.stat.name, value: s.base_stat }))}
              secondColor="#F97316"
            />
            <View style={styles.radarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
                <Text style={styles.legendName}>{pokeA.name.charAt(0).toUpperCase() + pokeA.name.slice(1)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.legendName}>{pokeB.name.charAt(0).toUpperCase() + pokeB.name.slice(1)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PokeHeader({ pokemon }: { pokemon: Pokemon | undefined }) {
  if (!pokemon) return <View style={[styles.pokeHeader, { opacity: 0.3 }]} />;
  const primaryType = pokemon.types[0]?.type.name ?? 'normal';
  const colors = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;

  return (
    <LinearGradient
      colors={[colors.bg + '50', '#0F172A']}
      style={styles.pokeHeader}
    >
      <Text style={styles.pokeNumber}>#{String(pokemon.id).padStart(4, '0')}</Text>
      <Image source={{ uri: getPokemonImageUrl(pokemon.id) }} style={styles.pokeImage} resizeMode="contain" />
      <Text style={styles.pokeName}>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</Text>
      <View style={styles.pokeTypes}>
        {pokemon.types.map((t) => <TypeBadge key={t.type.name} type={t.type.name} small />)}
      </View>
    </LinearGradient>
  );
}

function InfoPair({
  label, valueA, valueB, highlightWinner = false, numA = 0, numB = 0,
}: {
  label: string; valueA: string; valueB: string;
  highlightWinner?: boolean; numA?: number; numB?: number;
}) {
  const winA = highlightWinner && numA > numB;
  const winB = highlightWinner && numB > numA;
  return (
    <View style={styles.infoPair}>
      <Text style={[styles.infoValue, winA && styles.winnerText]}>{valueA}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, winB && styles.winnerText]}>{valueB}</Text>
    </View>
  );
}

function CompareStatRow({ name, valA, valB }: { name: string; valA: number; valB: number }) {
  const color = STAT_COLORS[name] ?? '#60A5FA';
  const max = Math.max(valA, valB, 1);
  const winA = valA > valB;
  const winB = valB > valA;

  return (
    <View style={styles.statRow}>
      {/* Bar A */}
      <View style={styles.barSide}>
        <Text style={[styles.statVal, winA && { color }]}>{valA}</Text>
        <View style={styles.track}>
          <View style={[styles.fillA, { width: `${(valA / 255) * 100}%`, backgroundColor: color, opacity: winA ? 1 : 0.4 }]} />
        </View>
      </View>

      {/* Label */}
      <Text style={styles.statLabel}>{formatStatName(name)}</Text>

      {/* Bar B */}
      <View style={styles.barSide}>
        <View style={styles.trackRight}>
          <View style={[styles.fillB, { width: `${(valB / 255) * 100}%`, backgroundColor: color, opacity: winB ? 1 : 0.4 }]} />
        </View>
        <Text style={[styles.statVal, winB && { color }]}>{valB}</Text>
      </View>
    </View>
  );
}

function TotalRow({ totalA, totalB }: { totalA: number; totalB: number }) {
  const winA = totalA > totalB;
  const winB = totalB > totalA;
  return (
    <View style={[styles.statRow, styles.totalRow]}>
      <Text style={[styles.totalVal, winA && styles.winnerTotal]}>{totalA}</Text>
      <Text style={styles.totalLabel}>TOTAL</Text>
      <Text style={[styles.totalVal, winB && styles.winnerTotal]}>{totalB}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { color: '#F1F5F9', fontSize: 20 },
  topTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Pokémon headers
  pokeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  pokeHeader: {
    flex: 1, borderRadius: 20, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#1E293B',
  },
  pokeNumber: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pokeImage: { width: COL * 0.7, height: COL * 0.7 },
  pokeName: { color: '#F1F5F9', fontSize: 13, fontWeight: '800', textTransform: 'capitalize', marginTop: 4 },
  pokeTypes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6, gap: 4 },
  vsDivider: { width: 32, alignItems: 'center' },
  vsText: { color: '#475569', fontSize: 13, fontWeight: '900' },

  // Info pairs
  infoRow: { marginBottom: 20, gap: 8 },
  infoPair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, width: 70, textAlign: 'center' },
  infoValue: { color: '#94A3B8', fontSize: 13, fontWeight: '600', width: (W - 48 - 70) / 2, textAlign: 'center' },
  winnerText: { color: '#FACC15', fontWeight: '800' },

  // Stat compare
  section: { gap: 10 },
  sectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { color: '#64748B', fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
  track: { flex: 1, height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  trackRight: { flex: 1, height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden', alignItems: 'flex-end' },
  fillA: { height: '100%', borderRadius: 3 },
  fillB: { height: '100%', borderRadius: 3 },
  statLabel: { width: 54, textAlign: 'center', color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  totalRow: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#1E293B',
    justifyContent: 'space-between',
  },
  totalLabel: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalVal: { color: '#94A3B8', fontSize: 18, fontWeight: '900', width: (W - 48 - 54) / 2, textAlign: 'center' },
  winnerTotal: { color: '#FACC15' },
  radarSection: { marginTop: 24, gap: 12 },
  radarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
