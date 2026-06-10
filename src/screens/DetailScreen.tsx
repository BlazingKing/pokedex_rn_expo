import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePokemon, usePokemonSpecies, useEvolutionChain } from '../hooks/usePokemon';
import {
  getPokemonImageUrl,
  formatHeight,
  formatWeight,
  getEnglishFlavorText,
  flattenEvolutionChain,
} from '../utils/pokemon';
import type { EvoStageInfo } from '../types/pokemon';
import { TYPE_COLORS } from '../constants/typeColors';
import TypeBadge from '../components/TypeBadge';
import StatBar from '../components/StatBar';
import { computeDefenseMatchup } from '../utils/typeMatchup';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

const TABS = ['About', 'Stats', 'Evolution', 'Matchup'];

export default function DetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [tab, setTab] = useState(0);
  const [shiny, setShiny] = useState(false);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const { data: pokemon, isLoading } = usePokemon(id);
  const { data: species } = usePokemonSpecies(id);
  const { data: evoChain } = useEvolutionChain(species?.evolution_chain.url);

  if (isLoading || !pokemon) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#818CF8" />
      </View>
    );
  }

  const playCry = async () => {
    if (playing) return;
    // Showdown MP3 works on both iOS and Android (PokéAPI OGG is Android-only)
    const url = `https://play.pokemonshowdown.com/audio/cries/${pokemon.name}.mp3`;
    try {
      setPlaying(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlaying(false);
      });
      await sound.playAsync();
    } catch {
      setPlaying(false);
    }
  };

  const primaryType = pokemon.types[0]?.type.name ?? 'normal';
  const colors = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;
  const imageUrl = shiny
    ? pokemon.sprites.other['official-artwork'].front_shiny ?? getPokemonImageUrl(pokemon.id)
    : getPokemonImageUrl(pokemon.id);
  const flavorText = species ? getEnglishFlavorText(species.flavor_text_entries) : '';
  const genus = species?.genera.find((g) => g.language.name === 'en')?.genus ?? '';

  const evoStages = evoChain ? flattenEvolutionChain(evoChain.chain) : [];

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={[colors.bg + '80', colors.bg + '20', '#080F1E']}
        style={styles.hero}
      >
        {/* Back button */}
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Pokémon number */}
        <Text style={styles.heroNumber}>#{String(pokemon.id).padStart(4, '0')}</Text>
        <Text style={styles.heroName}>
          {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
        </Text>
        <Text style={styles.genus}>{genus}</Text>

        {/* Types + Shiny badge + Cry button */}
        <View style={styles.typesRow}>
          {pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} />
          ))}
          <TouchableOpacity
            onPress={() => setShiny((s) => !s)}
            style={[styles.shinyBadge, shiny && styles.shinyBadgeActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.shinyText, shiny && styles.shinyTextActive]}>✨ SHINY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={playCry}
            style={[styles.shinyBadge, playing && styles.cryBadgeActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.shinyText, playing && styles.cryTextActive]}>
              {playing ? '🔊 ...' : '🔊 CRY'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Glow orb */}
        <View style={[styles.glowOrb, { backgroundColor: colors.glow + '20' }]} />

        {/* Pokémon image */}
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="contain" />
      </LinearGradient>

      {/* Card */}
      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(i)}
              style={[styles.tab, tab === i && { borderBottomColor: colors.glow }]}
            >
              <Text style={[styles.tabText, tab === i && { color: colors.glow }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {tab === 0 && <AboutTab pokemon={pokemon} flavorText={flavorText} />}
          {tab === 1 && <StatsTab pokemon={pokemon} />}
          {tab === 2 && <EvoTab stages={evoStages} currentName={pokemon.name} onPress={(name) => navigation.replace('Detail', { id: name, name })} />}
          {tab === 3 && <MatchupTab types={pokemon.types.map((t) => t.type.name)} />}
        </View>
      </ScrollView>
    </View>
  );
}

function AboutTab({ pokemon, flavorText }: { pokemon: any; flavorText: string }) {
  return (
    <View style={styles.aboutContainer}>
      {flavorText ? <Text style={styles.flavorText}>{flavorText}</Text> : null}
      <View style={styles.infoGrid}>
        <InfoBox label="Height" value={formatHeight(pokemon.height)} />
        <InfoBox label="Weight" value={formatWeight(pokemon.weight)} />
        <InfoBox label="Base XP" value={String(pokemon.base_experience ?? '—')} />
        <InfoBox label="Abilities" value={pokemon.abilities.map((a: any) => a.ability.name).join(', ')} />
      </View>
    </View>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatsTab({ pokemon }: { pokemon: any }) {
  const total = pokemon.stats.reduce((sum: number, s: any) => sum + s.base_stat, 0);
  return (
    <View style={styles.statsContainer}>
      {pokemon.stats.map((s: any) => (
        <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} />
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>{total}</Text>
      </View>
    </View>
  );
}

function EvoTab({ stages, currentName, onPress }: { stages: EvoStageInfo[]; currentName: string; onPress: (name: string) => void }) {
  if (stages.length === 0) return <ActivityIndicator color="#818CF8" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.evoContainer}>
      {stages.map((stage, i) => (
        <React.Fragment key={stage.name}>
          <EvoStage
            name={stage.name}
            isCurrent={stage.name === currentName}
            onPress={() => stage.name !== currentName && onPress(stage.name)}
          />
          {i < stages.length - 1 && (
            <View style={styles.evoArrowRow}>
              <Text style={styles.evoArrow}>↓</Text>
              {stages[i + 1].minLevel !== null ? (
                <View style={styles.evoLevelBadge}>
                  <Text style={styles.evoLevelText}>Lv. {stages[i + 1].minLevel}</Text>
                </View>
              ) : stages[i + 1].trigger === 'trade' ? (
                <View style={styles.evoLevelBadge}>
                  <Text style={styles.evoLevelText}>Trade</Text>
                </View>
              ) : stages[i + 1].trigger === 'use-item' ? (
                <View style={styles.evoLevelBadge}>
                  <Text style={styles.evoLevelText}>Item</Text>
                </View>
              ) : (
                <View style={styles.evoLevelBadge}>
                  <Text style={styles.evoLevelText}>Special</Text>
                </View>
              )}
            </View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function MatchupTab({ types }: { types: string[] }) {
  const matchup = computeDefenseMatchup(types);

  const sections: Array<{ label: string; multiplier: string; key: keyof typeof matchup; color: string }> = [
    { label: 'Weak ×4', multiplier: '×4', key: 'quad', color: '#EF4444' },
    { label: 'Weak ×2', multiplier: '×2', key: 'double', color: '#F97316' },
    { label: 'Resists ×½', multiplier: '×½', key: 'half', color: '#22C55E' },
    { label: 'Resists ×¼', multiplier: '×¼', key: 'quarter', color: '#0EA5E9' },
    { label: 'Immune ×0', multiplier: '×0', key: 'immune', color: '#818CF8' },
  ];

  return (
    <View style={styles.matchupContainer}>
      {sections.map(({ label, multiplier, key, color }) => {
        const typeList = matchup[key];
        if (typeList.length === 0) return null;
        return (
          <View key={key} style={styles.matchupSection}>
            <View style={styles.matchupHeader}>
              <Text style={[styles.matchupMultiplier, { color }]}>{multiplier}</Text>
              <Text style={styles.matchupLabel}>{label}</Text>
            </View>
            <View style={styles.matchupTypes}>
              {typeList.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EvoStage({ name, isCurrent, onPress }: { name: string; isCurrent: boolean; onPress: () => void }) {
  const { data: poke } = usePokemon(name);
  const imageUrl = poke ? getPokemonImageUrl(poke.id) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.evoStage, isCurrent && styles.evoStageCurrent]}
      disabled={isCurrent}
    >
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.evoImage} resizeMode="contain" />}
      <Text style={[styles.evoName, isCurrent && styles.evoNameCurrent]}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </Text>
      {isCurrent && <Text style={styles.evoCurrent}>CURRENT</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  loading: { flex: 1, backgroundColor: '#080F1E', justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    minHeight: 300,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B80',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  backIcon: { color: '#F1F5F9', fontSize: 20 },
  heroNumber: { color: '#334155', fontSize: 14, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  heroName: { color: '#F1F5F9', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  genus: { color: '#64748B', fontSize: 13, marginBottom: 10 },
  typesRow: { flexDirection: 'row', marginBottom: 12 },
  glowOrb: {
    position: 'absolute',
    right: -40,
    top: 40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  heroImage: {
    width: SCREEN_W * 0.55,
    height: SCREEN_W * 0.55,
    alignSelf: 'center',
  },
  shinyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#EAB30820',
    borderColor: '#FACC1540',
    marginRight: 6,
  },
  shinyBadgeActive: {
    backgroundColor: '#EAB30840',
    borderColor: '#FACC15AA',
  },
  shinyText: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  shinyTextActive: { color: '#FACC15' },
  card: {
    flex: 1,
    backgroundColor: '#080F1E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { color: '#475569', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  tabContent: { padding: 24 },
  aboutContainer: { gap: 16 },
  flavorText: { color: '#94A3B8', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  infoLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  infoValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  statsContainer: { gap: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  totalLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  totalValue: { color: '#F1F5F9', fontSize: 18, fontWeight: '900' },
  evoContainer: { alignItems: 'center', gap: 8 },
  evoStage: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    width: 160,
  },
  evoStageCurrent: {
    borderColor: '#818CF8',
    backgroundColor: '#818CF820',
  },
  evoImage: { width: 80, height: 80 },
  evoName: { color: '#94A3B8', fontSize: 14, fontWeight: '700', textTransform: 'capitalize', marginTop: 4 },
  evoNameCurrent: { color: '#F1F5F9' },
  evoCurrent: { color: '#818CF8', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  evoArrowRow: { alignItems: 'center', gap: 4 },
  evoArrow: { color: '#334155', fontSize: 20 },
  evoLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  evoLevelText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cryBadgeActive: { backgroundColor: '#3B82F620', borderColor: '#60A5FA80' },
  cryTextActive: { color: '#60A5FA' },
  matchupContainer: { gap: 20 },
  matchupSection: { gap: 10 },
  matchupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchupMultiplier: { fontSize: 18, fontWeight: '900', minWidth: 36 },
  matchupLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  matchupTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
