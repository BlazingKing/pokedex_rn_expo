import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTracker } from '../context/TrackerContext';
import { GENERATIONS } from '../constants/generations';
import { getPokemonImageUrl } from '../utils/pokemon';

const TOTAL_POKEMON = 1025;

const GEN_ORDER = ['gen-i', 'gen-ii', 'gen-iii', 'gen-iv', 'gen-v', 'gen-vi', 'gen-vii', 'gen-viii', 'gen-ix'] as const;

function CircularProgress({ caught, total }: { caught: number; total: number }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? caught / total : 0;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#818CF8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.circleCount}>{caught}</Text>
        <Text style={styles.circleTotal}>/ {total}</Text>
      </View>
    </View>
  );
}

interface GenCardProps {
  genKey: string;
  caught: number[];
}

function GenCard({ genKey, caught }: GenCardProps) {
  const gen = GENERATIONS[genKey];
  const minId = gen.offset + 1;
  const maxId = gen.offset + gen.limit;
  const caughtInGen = caught.filter((id) => id >= minId && id <= maxId);
  const total = gen.limit;
  const count = caughtInGen.length;
  const pct = total > 0 ? count / total : 0;

  const firstFive = caughtInGen.slice(0, 5);

  return (
    <View style={styles.genCard}>
      <View style={styles.genCardHeader}>
        <View>
          <Text style={styles.genLabel}>{gen.label}</Text>
          <Text style={styles.genRegion}>{gen.region}</Text>
        </View>
        <Text style={[styles.genCount, { color: gen.glow }]}>
          {count} / {total}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${pct * 100}%` as any, backgroundColor: gen.glow },
          ]}
        />
      </View>

      {/* Sprites */}
      {firstFive.length > 0 && (
        <View style={styles.spritesRow}>
          {firstFive.map((id) => (
            <Image
              key={id}
              source={{ uri: getPokemonImageUrl(id) }}
              style={styles.sprite}
              resizeMode="contain"
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProgressScreen() {
  const { caught, seen } = useTracker();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pokédex Progress</Text>

          <View style={styles.overallRow}>
            <CircularProgress caught={caught.length} total={TOTAL_POKEMON} />
            <View style={styles.overallText}>
              <Text style={styles.overallLabel}>OVERALL CAUGHT</Text>
              <Text style={styles.overallNumber}>
                {caught.length}
                <Text style={styles.overallOf}> / {TOTAL_POKEMON}</Text>
              </Text>
              <Text style={styles.overallPct}>
                {((caught.length / TOTAL_POKEMON) * 100).toFixed(1)}% complete
              </Text>
            </View>
          </View>
        </View>

        {/* Stat pills */}
        <View style={styles.pillRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>👁 Seen: {seen.length}</Text>
          </View>
          <View style={[styles.statPill, styles.statPillCaught]}>
            <Text style={[styles.statPillText, { color: '#4ADE80' }]}>✓ Caught: {caught.length}</Text>
          </View>
        </View>

        {/* Gen cards */}
        <View style={styles.genList}>
          {GEN_ORDER.map((key) => (
            <GenCard key={key} genKey={key} caught={caught} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 20 },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  overallText: { flex: 1 },
  overallLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  overallNumber: { color: '#F1F5F9', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  overallOf: { color: '#475569', fontSize: 22, fontWeight: '700' },
  overallPct: { color: '#818CF8', fontSize: 13, fontWeight: '700', marginTop: 4 },
  circleCount: { color: '#F1F5F9', fontSize: 22, fontWeight: '900' },
  circleTotal: { color: '#475569', fontSize: 11, fontWeight: '700' },
  pillRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginBottom: 20, marginTop: 16 },
  statPill: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statPillCaught: { borderColor: '#4ADE8040' },
  statPillText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  genList: { paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
  genCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  genCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  genLabel: { color: '#F1F5F9', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  genRegion: { color: '#475569', fontSize: 12, marginTop: 2 },
  genCount: { fontSize: 15, fontWeight: '900' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  spritesRow: { flexDirection: 'row', gap: 4 },
  sprite: { width: 32, height: 32 },
});
