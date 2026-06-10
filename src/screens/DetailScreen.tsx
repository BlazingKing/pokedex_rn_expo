import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePokemon, usePokemonSpecies, useEvolutionChain, useMoveDetail } from '../hooks/usePokemon';
import {
  getPokemonImageUrl,
  formatHeight,
  formatWeight,
  getEnglishFlavorText,
  flattenEvolutionChain,
} from '../utils/pokemon';
import type { EvoStageInfo, PokemonMove } from '../types/pokemon';
import { TYPE_COLORS } from '../constants/typeColors';
import TypeBadge from '../components/TypeBadge';
import StatBar from '../components/StatBar';
import RadarChart from '../components/RadarChart';
import { computeDefenseMatchup } from '../utils/typeMatchup';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

const TABS = ['About', 'Stats', 'Evolution', 'Matchup', 'Moves'];

/** Strip base name prefix and map suffix → readable label */
function formatFormLabel(fullName: string, baseName: string): string {
  const suffix = fullName.startsWith(baseName + '-')
    ? fullName.slice(baseName.length + 1)
    : fullName;
  const MAP: Record<string, string> = {
    'mega': 'Mega', 'mega-x': 'Mega X', 'mega-y': 'Mega Y',
    'alola': 'Alolan', 'galar': 'Galarian', 'hisui': 'Hisuian', 'paldea': 'Paldean',
    'gmax': 'G-Max', 'origin': 'Origin', 'primal': 'Primal', 'therian': 'Therian',
    'black': 'Black', 'white': 'White', 'zen': 'Zen', 'dusk': 'Dusk', 'dawn': 'Dawn',
  };
  return MAP[suffix] ?? suffix.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function DetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [tab, setTab] = useState(0);
  const [shiny, setShiny] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [formName, setFormName] = useState<string | null>(null);

  const { data: basePokemon, isLoading } = usePokemon(id);
  // formName === null → usePokemon(0) → enabled:false → undefined
  const { data: formData } = usePokemon(formName ?? 0);
  const pokemon = formData ?? basePokemon;

  const { data: species } = usePokemonSpecies(id);
  const { data: evoChain } = useEvolutionChain(species?.evolution_chain.url);

  // varieties from species (exclude default + gmax/totem — too many)
  // Filter out gmax/totem/costume forms — keep meaningful variants only
  const SKIP = ['gmax', 'totem', 'rock-star', 'belle', 'pop-star', 'phd', 'libre', 'cosplay', 'starter', 'partner'];
  const variants = (species?.varieties ?? []).filter(
    (v) => !v.is_default && !SKIP.some((s) => v.pokemon.name.includes(s))
  );

  // useAudioPlayer must be called unconditionally (hook rules)
  // always use base pokemon name for cry
  const cryUrl = basePokemon
    ? `https://play.pokemonshowdown.com/audio/cries/${basePokemon.name}.mp3`
    : null;
  const player = useAudioPlayer(cryUrl ? { uri: cryUrl } : null);

  if (isLoading || !pokemon || !basePokemon) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#818CF8" />
      </View>
    );
  }

  const playCry = async () => {
    if (playing) return;
    try {
      setPlaying(true);
      await setAudioModeAsync({ playsInSilentMode: true });
      player.seekTo(0);
      player.play();
      // poll for finish since expo-audio player doesn't expose onFinish directly here
      const check = setInterval(() => {
        if (!player.playing) {
          setPlaying(false);
          clearInterval(check);
        }
      }, 200);
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

        {/* Form selector — only shown when variants exist */}
        {variants.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.formsScroll}
            contentContainerStyle={styles.formsRow}
          >
            <TouchableOpacity
              onPress={() => setFormName(null)}
              style={[styles.formPill, formName === null && styles.formPillActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.formPillText, formName === null && styles.formPillTextActive]}>
                Base
              </Text>
            </TouchableOpacity>
            {variants.map((v) => (
              <TouchableOpacity
                key={v.pokemon.name}
                onPress={() => setFormName(v.pokemon.name)}
                style={[styles.formPill, formName === v.pokemon.name && styles.formPillActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.formPillText, formName === v.pokemon.name && styles.formPillTextActive]}>
                  {formatFormLabel(v.pokemon.name, basePokemon.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Row 1: Types + Shiny */}
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
        </View>

        {/* Row 2: Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={playCry}
            style={[styles.actionBadge, playing && styles.cryBadgeActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.shinyText, playing && styles.cryTextActive]}>
              {playing ? '🔊 Playing…' : '🔊 Cry'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              let randomId = Math.floor(Math.random() * 151) + 1;
              if (randomId === pokemon.id) randomId = randomId === 151 ? 1 : randomId + 1;
              navigation.navigate('Battle', { idA: pokemon.id, idB: randomId });
            }}
            style={[styles.actionBadge, styles.battleBadge]}
            activeOpacity={0.75}
          >
            <Text style={[styles.shinyText, styles.battleText]}>⚔️ Battle</Text>
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
          {tab === 4 && <MovesTab moves={pokemon.moves} />}
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
  const radarStats = pokemon.stats.map((s: any) => ({ name: s.stat.name, value: s.base_stat }));
  return (
    <View style={styles.statsContainer}>
      <RadarChart stats={radarStats} />
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

type MoveGroup = { label: string; moves: Array<{ name: string; level: number }> };

function groupMoves(moves: PokemonMove[]): MoveGroup[] {
  const levelUp: Array<{ name: string; level: number }> = [];
  const machine: Array<{ name: string; level: number }> = [];
  const egg: Array<{ name: string; level: number }> = [];
  const tutor: Array<{ name: string; level: number }> = [];
  const other: Array<{ name: string; level: number }> = [];

  for (const pm of moves) {
    const details = pm.version_group_details;
    if (details.length === 0) { other.push({ name: pm.move.name, level: 0 }); continue; }
    const last = details[details.length - 1];
    const method = last.move_learn_method.name;
    const level = last.level_learned_at;
    if (method === 'level-up') levelUp.push({ name: pm.move.name, level });
    else if (method === 'machine') machine.push({ name: pm.move.name, level });
    else if (method === 'egg') egg.push({ name: pm.move.name, level });
    else if (method === 'tutor') tutor.push({ name: pm.move.name, level });
    else other.push({ name: pm.move.name, level });
  }
  levelUp.sort((a, b) => a.level - b.level);
  const result: MoveGroup[] = [];
  if (levelUp.length) result.push({ label: 'Level Up', moves: levelUp });
  if (machine.length) result.push({ label: 'TM/HM', moves: machine });
  if (egg.length) result.push({ label: 'Egg', moves: egg });
  if (tutor.length) result.push({ label: 'Tutor', moves: tutor });
  if (other.length) result.push({ label: 'Other', moves: other });
  return result;
}

function MovesTab({ moves }: { moves: PokemonMove[] }) {
  const groups = groupMoves(moves);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'Level Up': true });
  const [selectedMove, setSelectedMove] = useState<string | null>(null);

  return (
    <View style={styles.movesContainer}>
      {groups.map((group) => (
        <View key={group.label} style={styles.moveGroup}>
          <TouchableOpacity
            style={styles.moveGroupHeader}
            onPress={() => setExpanded((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
            activeOpacity={0.7}
          >
            <Text style={styles.moveGroupLabel}>{group.label}</Text>
            <Text style={styles.moveGroupCount}>
              {group.moves.length} {expanded[group.label] ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {expanded[group.label] && group.moves.map((m) => (
            <TouchableOpacity
              key={m.name}
              style={styles.moveRow}
              onPress={() => setSelectedMove(m.name)}
              activeOpacity={0.7}
            >
              <View style={styles.moveLevelBadge}>
                <Text style={styles.moveLevelText}>
                  {group.label === 'Level Up' ? (m.level > 0 ? String(m.level) : 'E') : '—'}
                </Text>
              </View>
              <Text style={styles.moveName}>
                {m.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
              <Text style={styles.moveHint}>ⓘ</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <MoveDetailModal moveName={selectedMove} onClose={() => setSelectedMove(null)} />
    </View>
  );
}

function MoveDetailModal({ moveName, onClose }: { moveName: string | null; onClose: () => void }) {
  const { data: move, isLoading } = useMoveDetail(moveName ?? '');

  const effectEntry = move?.effect_entries?.find((e: any) => e.language.name === 'en');
  const shortEffect = effectEntry?.short_effect ?? '';

  const categoryIcon = move?.damage_class?.name === 'physical' ? '⚔️'
    : move?.damage_class?.name === 'special' ? '✨'
    : '🛡️';

  return (
    <Modal visible={!!moveName} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          {isLoading || !move ? (
            <ActivityIndicator color="#818CF8" style={{ padding: 32 }} />
          ) : (
            <>
              <Text style={styles.modalMoveName}>
                {move.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
              <View style={styles.modalRow}>
                <TypeBadge type={move.type.name} />
                <View style={styles.modalCategoryBadge}>
                  <Text style={styles.modalCategoryText}>{categoryIcon} {move.damage_class.name}</Text>
                </View>
              </View>
              <View style={styles.modalStats}>
                <ModalStatBox label="Power" value={move.power != null ? String(move.power) : '—'} />
                <ModalStatBox label="Accuracy" value={move.accuracy != null ? `${move.accuracy}%` : '—'} />
                <ModalStatBox label="PP" value={String(move.pp)} />
              </View>
              {shortEffect ? <Text style={styles.modalEffect}>{shortEffect}</Text> : null}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalStatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modalStatBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  formsScroll: { marginBottom: 8 },
  formsRow: { flexDirection: 'row', gap: 6, paddingRight: 8 },
  formPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B40',
  },
  formPillActive: {
    borderColor: '#818CF8',
    backgroundColor: '#818CF830',
  },
  formPillText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  formPillTextActive: { color: '#818CF8' },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#1E293B40',
    borderColor: '#334155',
  },
  battleBadge: {
    backgroundColor: '#EF444420',
    borderColor: '#EF444450',
  },
  battleText: { color: '#FCA5A5' },
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
  movesContainer: { gap: 12 },
  moveGroup: { gap: 2 },
  moveGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  moveGroupLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  moveGroupCount: { color: '#475569', fontSize: 11, fontWeight: '700' },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B20',
    gap: 12,
  },
  moveLevelBadge: {
    width: 32,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveLevelText: { color: '#818CF8', fontSize: 11, fontWeight: '800' },
  moveName: { flex: 1, color: '#E2E8F0', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  moveHint: { color: '#334155', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalMoveName: { color: '#F1F5F9', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textTransform: 'capitalize' },
  modalRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modalCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  modalCategoryText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  modalStats: { flexDirection: 'row', gap: 10 },
  modalStatBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalEffect: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  modalCloseBtn: {
    backgroundColor: '#818CF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
