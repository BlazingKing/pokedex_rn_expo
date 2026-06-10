import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '../context/TeamContext';
import { usePokemon, usePokemonList, useGen1PokemonList } from '../hooks/usePokemon';
import { getPokemonImageUrl, getPokemonId } from '../utils/pokemon';
import { TYPE_COLORS } from '../constants/typeColors';
import { ATTACK_CHART, ALL_TYPES } from '../constants/typeMatchup';
import TypeBadge from '../components/TypeBadge';
import PokemonCard from '../components/PokemonCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const { width: W } = Dimensions.get('window');
const SLOT_SIZE = (W - 48 - 20) / 3; // 3 columns, 24px padding each side, 10px gap total

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TeamScreen({ navigation }: { navigation: Nav }) {
  const { team, removeMember, isFull } = useTeam();
  const [pickerOpen, setPickerOpen] = useState(false);

  const slots = Array.from({ length: 6 }, (_, i) => team[i] ?? null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Team Builder</Text>
          <Text style={styles.subtitle}>{team.length}/6 Pokémon</Text>
        </View>

        {/* 6 Slots */}
        <View style={styles.slotsGrid}>
          {slots.map((id, i) => (
            <TeamSlot
              key={i}
              id={id}
              onPress={() => {
                if (id) removeMember(id);
                else if (!isFull) setPickerOpen(true);
              }}
              onNavigate={() => id && navigation.navigate('Detail', { id, name: String(id) })}
            />
          ))}
        </View>

        {team.length < 6 && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Add Pokémon</Text>
          </TouchableOpacity>
        )}

        {/* Type Coverage Analysis */}
        {team.length > 0 && <CoverageAnalysis teamIds={team} />}
      </ScrollView>

      <PokemonPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}

function TeamSlot({
  id,
  onPress,
  onNavigate,
}: {
  id: number | null;
  onPress: () => void;
  onNavigate: () => void;
}) {
  const { data: pokemon } = usePokemon(id ?? 0);
  const primaryType = pokemon?.types[0]?.type.name ?? 'normal';
  const color = TYPE_COLORS[primaryType]?.glow ?? '#818CF8';

  if (!id) {
    return (
      <TouchableOpacity style={styles.slotEmpty} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.slotPlus}>+</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.slotFilled, { borderColor: color + '60' }]}>
      <TouchableOpacity onPress={onNavigate} activeOpacity={0.8} style={styles.slotImageArea}>
        {pokemon ? (
          <Image
            source={{ uri: getPokemonImageUrl(pokemon.id) }}
            style={styles.slotImage}
            resizeMode="contain"
          />
        ) : (
          <ActivityIndicator color="#818CF8" size="small" />
        )}
        {pokemon && (
          <Text style={styles.slotName} numberOfLines={1}>
            {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.slotRemove} onPress={onPress} hitSlop={8}>
        <Text style={styles.slotRemoveText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function CoverageAnalysis({ teamIds }: { teamIds: number[] }) {
  // Always call exactly 6 hooks — Rules of Hooks forbids calling inside .map()
  const q0 = usePokemon(teamIds[0] ?? 0);
  const q1 = usePokemon(teamIds[1] ?? 0);
  const q2 = usePokemon(teamIds[2] ?? 0);
  const q3 = usePokemon(teamIds[3] ?? 0);
  const q4 = usePokemon(teamIds[4] ?? 0);
  const q5 = usePokemon(teamIds[5] ?? 0);
  const teamPokemon = [q0, q1, q2, q3, q4, q5]
    .slice(0, teamIds.length)
    .map((q) => q.data)
    .filter(Boolean);

  const coverage = useMemo(() => {
    if (teamPokemon.length === 0) return [];
    return ALL_TYPES.map((attackType) => {
      const chart = ATTACK_CHART[attackType];
      let weakCount = 0;
      let resistCount = 0;
      let immuneCount = 0;

      for (const p of teamPokemon) {
        const defTypes = p!.types.map((t) => t.type.name);
        const mult = defTypes.reduce((acc, dt) => acc * (chart[dt] ?? 1), 1);
        if (mult === 0) immuneCount++;
        else if (mult >= 2) weakCount++;
        else if (mult <= 0.5) resistCount++;
      }

      return { type: attackType, weakCount, resistCount, immuneCount };
    }).filter((c) => c.weakCount > 0 || c.resistCount > 0 || c.immuneCount > 0)
      .sort((a, b) => b.weakCount - a.weakCount);
  }, [teamPokemon.length, teamIds.join(',')]);

  if (teamPokemon.length < teamIds.length) {
    return <ActivityIndicator color="#818CF8" style={{ margin: 24 }} />;
  }

  const weaknesses = coverage.filter((c) => c.weakCount >= 2);
  const resistances = coverage.filter((c) => c.resistCount >= 2 || c.immuneCount >= 1);

  return (
    <View style={styles.coverage}>
      <Text style={styles.coverageTitle}>Type Coverage</Text>

      {weaknesses.length > 0 && (
        <View style={styles.coverageSection}>
          <Text style={styles.coverageSectionLabel}>⚠️ Team Weaknesses</Text>
          <Text style={styles.coverageSectionHint}>Types that hit 2+ members for ×2 or more</Text>
          <View style={styles.coverageList}>
            {weaknesses.map(({ type, weakCount }) => (
              <View key={type} style={styles.coverageRow}>
                <TypeBadge type={type} />
                <View style={styles.coverageDots}>
                  {Array.from({ length: weakCount }).map((_, i) => (
                    <View key={i} style={[styles.dot, styles.dotWeak]} />
                  ))}
                  {Array.from({ length: teamIds.length - weakCount }).map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
                <Text style={styles.coverageCount}>{weakCount}/{teamIds.length}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {resistances.length > 0 && (
        <View style={styles.coverageSection}>
          <Text style={styles.coverageSectionLabel}>🛡️ Team Resistances</Text>
          <Text style={styles.coverageSectionHint}>Types resisted or nullified by 2+ members</Text>
          <View style={styles.coverageList}>
            {resistances.map(({ type, resistCount, immuneCount }) => (
              <View key={type} style={styles.coverageRow}>
                <TypeBadge type={type} />
                <View style={styles.coverageDots}>
                  {Array.from({ length: resistCount + immuneCount }).map((_, i) => (
                    <View key={i} style={[styles.dot, styles.dotResist]} />
                  ))}
                  {Array.from({ length: teamIds.length - resistCount - immuneCount }).map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
                <Text style={[styles.coverageCount, { color: '#22C55E' }]}>
                  {resistCount + immuneCount}/{teamIds.length}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {weaknesses.length === 0 && (
        <View style={styles.coverageGood}>
          <Text style={styles.coverageGoodText}>✅ No major type weaknesses!</Text>
        </View>
      )}
    </View>
  );
}

function PokemonPickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { addMember, removeMember, isInTeam, isFull } = useTeam();
  const { data } = useGen1PokemonList();

  const allPokemon = useMemo(
    () => data?.results ?? [],
    [data]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return allPokemon.slice(0, 30);
    const q = query.toLowerCase();
    return allPokemon.filter((p) => p.name.includes(q)).slice(0, 30);
  }, [query, allPokemon]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Pokémon</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name…"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.pickerGrid}
          renderItem={({ item }) => {
            const id = getPokemonId(item.url);
            const inTeam = isInTeam(id);
            return (
              <PickerItem
                id={id}
                inTeam={inTeam}
                disabled={isFull && !inTeam}
                onToggle={() => {
                  if (inTeam) removeMember(id);
                  else if (!isFull) addMember(id);
                }}
              />
            );
          }}
        />
      </View>
    </Modal>
  );
}

function PickerItem({
  id,
  inTeam,
  disabled,
  onToggle,
}: {
  id: number;
  inTeam: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { data: pokemon } = usePokemon(id);
  if (!pokemon) return <View style={styles.pickerItemPlaceholder} />;
  return (
    <View style={[styles.pickerItemWrapper, disabled && !inTeam && styles.pickerItemDisabled]}>
      <PokemonCard
        pokemon={pokemon}
        onPress={onToggle}
        isCompareSelected={inTeam}
        onCompareToggle={onToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  title: { color: '#F1F5F9', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#475569', fontSize: 13, fontWeight: '600', marginTop: 2 },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
  },
  slotEmpty: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotPlus: { color: '#334155', fontSize: 32 },
  slotFilled: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  slotImageArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 8 },
  slotImage: { width: SLOT_SIZE * 0.7, height: SLOT_SIZE * 0.7 },
  slotName: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  slotRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotRemoveText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  addBtn: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#818CF8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  // Coverage
  coverage: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  coverageTitle: { color: '#F1F5F9', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  coverageSection: { gap: 8 },
  coverageSectionLabel: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  coverageSectionHint: { color: '#475569', fontSize: 11 },
  coverageList: { gap: 8 },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverageDots: { flex: 1, flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E293B',
  },
  dotWeak: { backgroundColor: '#EF4444' },
  dotResist: { backgroundColor: '#22C55E' },
  coverageCount: { color: '#EF4444', fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  coverageGood: {
    backgroundColor: '#22C55E20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22C55E40',
    alignItems: 'center',
  },
  coverageGoodText: { color: '#22C55E', fontWeight: '700', fontSize: 14 },
  // Modal
  modalRoot: { flex: 1, backgroundColor: '#080F1E' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { color: '#F1F5F9', fontSize: 20, fontWeight: '900' },
  modalClose: {
    backgroundColor: '#818CF8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchRow: { paddingHorizontal: 24, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#F1F5F9',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerGrid: { paddingHorizontal: 6 },
  pickerItemWrapper: { flex: 1 },
  pickerItemPlaceholder: { flex: 1, margin: 6, minHeight: 180 },
  pickerItemDisabled: { opacity: 0.35 },
  pickerItemSelected: {},
});
