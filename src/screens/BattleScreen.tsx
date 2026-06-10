import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { usePokemon } from '../hooks/usePokemon';
import { TYPE_COLORS } from '../constants/typeColors';
import { ATTACK_CHART } from '../constants/typeMatchup';
import type { Pokemon, MoveDetail, PokemonMove } from '../types/pokemon';
import { getPokemonImageUrl } from '../utils/pokemon';

type Props = NativeStackScreenProps<RootStackParamList, 'Battle'>;

const { width: W } = Dimensions.get('window');
const LEVEL = 42;

// ---- Helpers ----

function getStat(pokemon: Pokemon, statName: string): number {
  return pokemon.stats.find((s) => s.stat.name === statName)?.base_stat ?? 50;
}

function calcDamage(
  power: number,
  attacker: Pokemon,
  defender: Pokemon,
  moveType: string,
  damageClass: string,
): number {
  const atkStat =
    damageClass === 'special'
      ? getStat(attacker, 'special-attack')
      : getStat(attacker, 'attack');
  const defStat =
    damageClass === 'special'
      ? getStat(defender, 'special-defense')
      : getStat(defender, 'defense');

  let dmg = Math.floor(
    Math.floor((Math.floor((2 * LEVEL) / 5 + 2) * power * atkStat) / defStat) / 50,
  ) + 2;

  // STAB
  const attackerPrimaryType = attacker.types[0]?.type.name ?? '';
  if (attackerPrimaryType === moveType) {
    dmg = Math.floor(dmg * 1.5);
  }

  // Type effectiveness
  const effectiveness = ATTACK_CHART[moveType]?.[defender.types[0]?.type.name ?? ''] ?? 1;
  dmg = Math.floor(dmg * effectiveness);
  if (defender.types[1]) {
    const eff2 = ATTACK_CHART[moveType]?.[defender.types[1].type.name] ?? 1;
    dmg = Math.floor(dmg * eff2);
  }

  // Random factor 0.85 - 1.0
  const rand = 0.85 + Math.random() * 0.15;
  dmg = Math.floor(dmg * rand);

  return Math.max(1, dmg);
}

function getLevelUpMoves(pokemon: Pokemon): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of pokemon.moves) {
    const isLevelUp = m.version_group_details.some(
      (d) => d.move_learn_method.name === 'level-up',
    );
    if (isLevelUp && !seen.has(m.move.name)) {
      seen.add(m.move.name);
      result.push(m.move.name);
      if (result.length >= 20) break;
    }
  }
  return result;
}

// ---- Move cache (fetch on demand) ----

const moveCache: Record<string, MoveDetail> = {};

async function fetchMove(name: string): Promise<MoveDetail> {
  if (moveCache[name]) return moveCache[name];
  const res = await fetch(`https://pokeapi.co/api/v2/move/${name}`);
  const data = await res.json();
  const move: MoveDetail = {
    id: data.id,
    name: data.name,
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp,
    type: data.type,
    damage_class: data.damage_class,
  };
  moveCache[name] = move;
  return move;
}

// ---- Main Screen ----

type Phase = 'select-moves' | 'battle';

interface BattleState {
  hpA: number;
  hpB: number;
  maxHpA: number;
  maxHpB: number;
  turn: 'A' | 'B' | 'end';
  log: string[];
  winner: 'A' | 'B' | null;
}

export default function BattleScreen({ route, navigation }: Props) {
  const { idA, idB } = route.params;
  const { data: pokeA } = usePokemon(idA);
  const { data: pokeB } = usePokemon(idB);

  const [phase, setPhase] = useState<Phase>('select-moves');
  const [movesA, setMovesA] = useState<string[]>([]);
  const [movesB, setMovesB] = useState<string[]>([]);
  const [moveDetailsA, setMoveDetailsA] = useState<MoveDetail[]>([]);
  const [moveDetailsB, setMoveDetailsB] = useState<MoveDetail[]>([]);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const hpBarAnim = useRef(new Animated.Value(1)).current;
  const hpBarBAnim = useRef(new Animated.Value(1)).current;

  const toggleMoveA = (name: string) => {
    setMovesA((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : prev.length < 4 ? [...prev, name] : prev,
    );
  };

  const toggleMoveB = (name: string) => {
    setMovesB((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : prev.length < 4 ? [...prev, name] : prev,
    );
  };

  const startBattle = async () => {
    if (!pokeA || !pokeB) return;
    const detailsA = await Promise.all(movesA.map(fetchMove));
    const detailsB = await Promise.all(movesB.map(fetchMove));
    setMoveDetailsA(detailsA);
    setMoveDetailsB(detailsB);

    const maxHpA = getStat(pokeA, 'hp') * 2 + 60;
    const maxHpB = getStat(pokeB, 'hp') * 2 + 60;
    const speedA = getStat(pokeA, 'speed');
    const speedB = getStat(pokeB, 'speed');
    const firstTurn: 'A' | 'B' =
      speedA > speedB ? 'A' : speedB > speedA ? 'B' : Math.random() < 0.5 ? 'A' : 'B';

    setBattle({
      hpA: maxHpA,
      hpB: maxHpB,
      maxHpA,
      maxHpB,
      turn: firstTurn,
      log: [`Battle start! ${firstTurn === 'A' ? pokeA.name : pokeB.name} goes first!`],
      winner: null,
    });
    setPhase('battle');
  };

  const doAttack = useCallback(
    (moveDetail: MoveDetail) => {
      if (!pokeA || !pokeB || !battle || battle.turn === 'end' || battle.winner) return;
      if (isAIThinking) return;

      const isA = battle.turn === 'A';
      const attacker = isA ? pokeA : pokeB;
      const defender = isA ? pokeB : pokeA;

      let dmg = 0;
      let logMsg = '';

      if (!moveDetail.power) {
        logMsg = `${attacker.name} used ${moveDetail.name} — but it had no effect!`;
      } else {
        dmg = calcDamage(
          moveDetail.power,
          attacker,
          defender,
          moveDetail.type.name,
          moveDetail.damage_class.name,
        );
        logMsg = `${attacker.name} used ${moveDetail.name}! Dealt ${dmg} damage!`;
      }

      setBattle((prev) => {
        if (!prev) return prev;
        const newHpA = isA ? prev.hpA : Math.max(0, prev.hpA - dmg);
        const newHpB = isA ? Math.max(0, prev.hpB - dmg) : prev.hpB;
        const faintedA = newHpA <= 0;
        const faintedB = newHpB <= 0;
        const winner: 'A' | 'B' | null = faintedB ? 'A' : faintedA ? 'B' : null;
        const nextTurn: 'A' | 'B' | 'end' = winner ? 'end' : isA ? 'B' : 'A';
        const newLog = [
          ...prev.log,
          logMsg,
          ...(faintedB ? [`${pokeB.name} fainted!`] : []),
          ...(faintedA ? [`${pokeA.name} fainted!`] : []),
        ].slice(-8);

        // Animate HP bars
        Animated.timing(isA ? hpBarBAnim : hpBarAnim, {
          toValue: isA ? newHpB / prev.maxHpB : newHpA / prev.maxHpA,
          duration: 400,
          useNativeDriver: false,
        }).start();

        return { ...prev, hpA: newHpA, hpB: newHpB, turn: nextTurn, log: newLog, winner };
      });

      // AI turn (side B)
      if (isA) {
        setIsAIThinking(true);
        setTimeout(() => {
          const randomMove = moveDetailsB[Math.floor(Math.random() * moveDetailsB.length)];
          if (randomMove) {
            setBattle((prev) => {
              if (!prev || prev.winner) {
                setIsAIThinking(false);
                return prev;
              }
              let aiDmg = 0;
              let aiLog = '';
              if (!randomMove.power) {
                aiLog = `${pokeB.name} used ${randomMove.name} — but it had no effect!`;
              } else {
                aiDmg = calcDamage(
                  randomMove.power,
                  pokeB,
                  pokeA,
                  randomMove.type.name,
                  randomMove.damage_class.name,
                );
                aiLog = `${pokeB.name} used ${randomMove.name}! Dealt ${aiDmg} damage!`;
              }
              const newHpA2 = Math.max(0, prev.hpA - aiDmg);
              const fainted = newHpA2 <= 0;
              const winner2: 'A' | 'B' | null = fainted ? 'B' : null;
              const nextTurn2: 'A' | 'B' | 'end' = winner2 ? 'end' : 'A';
              const newLog2 = [
                ...prev.log,
                aiLog,
                ...(fainted ? [`${pokeA.name} fainted!`] : []),
              ].slice(-8);

              Animated.timing(hpBarAnim, {
                toValue: newHpA2 / prev.maxHpA,
                duration: 400,
                useNativeDriver: false,
              }).start();

              setIsAIThinking(false);
              return { ...prev, hpA: newHpA2, turn: nextTurn2, log: newLog2, winner: winner2 };
            });
          } else {
            setIsAIThinking(false);
          }
        }, 1000);
      }
    },
    [pokeA, pokeB, battle, isAIThinking, moveDetailsB, hpBarAnim, hpBarBAnim],
  );

  const resetBattle = () => {
    setPhase('select-moves');
    setMovesA([]);
    setMovesB([]);
    setMoveDetailsA([]);
    setMoveDetailsB([]);
    setBattle(null);
    setIsAIThinking(false);
    hpBarAnim.setValue(1);
    hpBarBAnim.setValue(1);
  };

  if (!pokeA || !pokeB) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#818CF8" />
      </View>
    );
  }

  if (phase === 'select-moves') {
    return (
      <MoveSelectPhase
        pokeA={pokeA}
        pokeB={pokeB}
        movesA={movesA}
        movesB={movesB}
        onToggleA={toggleMoveA}
        onToggleB={toggleMoveB}
        onStart={startBattle}
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (!battle) return null;

  return (
    <BattlePhase
      pokeA={pokeA}
      pokeB={pokeB}
      battle={battle}
      moveDetailsA={moveDetailsA}
      isAIThinking={isAIThinking}
      hpBarAnim={hpBarAnim}
      hpBarBAnim={hpBarBAnim}
      onAttack={doAttack}
      onReset={resetBattle}
      onBack={() => navigation.goBack()}
    />
  );
}

// ---- Move Select ----

function MoveSelectPhase({
  pokeA,
  pokeB,
  movesA,
  movesB,
  onToggleA,
  onToggleB,
  onStart,
  onBack,
}: {
  pokeA: Pokemon;
  pokeB: Pokemon;
  movesA: string[];
  movesB: string[];
  onToggleA: (m: string) => void;
  onToggleB: (m: string) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const movesListA = getLevelUpMoves(pokeA);
  const movesListB = getLevelUpMoves(pokeB);
  const canStart = movesA.length >= 1 && movesB.length >= 1;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Select Moves</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.selectScroll}>
        <View style={styles.selectRow}>
          {/* Side A */}
          <View style={styles.selectSide}>
            <Image
              source={{ uri: getPokemonImageUrl(pokeA.id) }}
              style={styles.selectImage}
              resizeMode="contain"
            />
            <Text style={styles.selectName}>
              {pokeA.name.charAt(0).toUpperCase() + pokeA.name.slice(1)}
            </Text>
            <Text style={styles.selectHint}>{movesA.length}/4 selected</Text>
            {movesListA.map((m) => (
              <MoveChip
                key={m}
                name={m}
                selected={movesA.includes(m)}
                onPress={() => onToggleA(m)}
              />
            ))}
          </View>

          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Side B */}
          <View style={styles.selectSide}>
            <Image
              source={{ uri: getPokemonImageUrl(pokeB.id) }}
              style={styles.selectImage}
              resizeMode="contain"
            />
            <Text style={styles.selectName}>
              {pokeB.name.charAt(0).toUpperCase() + pokeB.name.slice(1)}
            </Text>
            <Text style={styles.selectHint}>{movesB.length}/4 selected</Text>
            {movesListB.map((m) => (
              <MoveChip
                key={m}
                name={m}
                selected={movesB.includes(m)}
                onPress={() => onToggleB(m)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={onStart}
          disabled={!canStart}
        >
          <Text style={styles.startBtnText}>Start Battle!</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MoveChip({ name, selected, onPress }: { name: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.moveChip, selected && styles.moveChipSelected]}
    >
      <Text style={[styles.moveChipText, selected && styles.moveChipTextSelected]} numberOfLines={1}>
        {name.replace(/-/g, ' ')}
      </Text>
    </TouchableOpacity>
  );
}

// ---- Battle Phase ----

function BattlePhase({
  pokeA,
  pokeB,
  battle,
  moveDetailsA,
  isAIThinking,
  hpBarAnim,
  hpBarBAnim,
  onAttack,
  onReset,
  onBack,
}: {
  pokeA: Pokemon;
  pokeB: Pokemon;
  battle: BattleState;
  moveDetailsA: MoveDetail[];
  isAIThinking: boolean;
  hpBarAnim: Animated.Value;
  hpBarBAnim: Animated.Value;
  onAttack: (m: MoveDetail) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const colorA = TYPE_COLORS[pokeA.types[0]?.type.name ?? 'normal'] ?? TYPE_COLORS.normal;
  const colorB = TYPE_COLORS[pokeB.types[0]?.type.name ?? 'normal'] ?? TYPE_COLORS.normal;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Battle!</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.battleScroll}>
        {/* Pokemon hero area */}
        <View style={styles.heroRow}>
          {/* Side A */}
          <View style={styles.heroSide}>
            <Image
              source={{ uri: pokeA.sprites.front_default ?? getPokemonImageUrl(pokeA.id) }}
              style={styles.battleSprite}
              resizeMode="contain"
            />
            <Text style={styles.battleName}>
              {pokeA.name.charAt(0).toUpperCase() + pokeA.name.slice(1)}
            </Text>
            <Text style={styles.hpText}>
              {battle.hpA}/{battle.maxHpA}
            </Text>
            <HPBar
              animValue={hpBarAnim}
              hp={battle.hpA}
              maxHp={battle.maxHpA}
              color={colorA.glow}
            />
          </View>

          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Side B */}
          <View style={styles.heroSide}>
            <Image
              source={{ uri: pokeB.sprites.front_default ?? getPokemonImageUrl(pokeB.id) }}
              style={styles.battleSprite}
              resizeMode="contain"
            />
            <Text style={styles.battleName}>
              {pokeB.name.charAt(0).toUpperCase() + pokeB.name.slice(1)}
            </Text>
            <Text style={styles.hpText}>
              {battle.hpB}/{battle.maxHpB}
            </Text>
            <HPBar
              animValue={hpBarBAnim}
              hp={battle.hpB}
              maxHp={battle.maxHpB}
              color={colorB.glow}
            />
          </View>
        </View>

        {/* Turn indicator / AI thinking */}
        {battle.turn !== 'end' && (
          <Text style={styles.turnText}>
            {isAIThinking
              ? 'Opponent is choosing...'
              : `Your turn — choose a move!`}
          </Text>
        )}

        {/* Move buttons (only when it's player A turn) */}
        {battle.turn === 'A' && !isAIThinking && (
          <View style={styles.moveGrid}>
            {moveDetailsA.map((m) => (
              <TouchableOpacity
                key={m.name}
                onPress={() => onAttack(m)}
                style={[
                  styles.moveBattleBtn,
                  { borderColor: TYPE_COLORS[m.type.name]?.glow ?? '#334155' },
                ]}
              >
                <Text style={styles.moveBattleName} numberOfLines={1}>
                  {m.name.replace(/-/g, ' ')}
                </Text>
                <Text
                  style={[
                    styles.moveBattleType,
                    { color: TYPE_COLORS[m.type.name]?.glow ?? '#94A3B8' },
                  ]}
                >
                  {m.type.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isAIThinking && (
          <View style={styles.aiThinking}>
            <ActivityIndicator color="#F97316" size="small" />
            <Text style={styles.aiThinkingText}>Opponent is choosing...</Text>
          </View>
        )}

        {/* Battle log */}
        <View style={styles.logPanel}>
          <Text style={styles.logTitle}>BATTLE LOG</Text>
          {battle.log.slice(-4).map((entry, i) => (
            <Text key={i} style={styles.logEntry}>
              {entry}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Winner overlay */}
      {battle.winner && (
        <View style={styles.winnerOverlay}>
          <Text style={styles.winnerText}>
            {battle.winner === 'A'
              ? `${pokeA.name.charAt(0).toUpperCase() + pokeA.name.slice(1)} wins!`
              : `${pokeB.name.charAt(0).toUpperCase() + pokeB.name.slice(1)} wins!`}
          </Text>
          <Text style={styles.winnerEmoji}>{battle.winner === 'A' ? '🏆' : '😈'}</Text>
          <TouchableOpacity style={styles.playAgainBtn} onPress={onReset}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backOverlayBtn} onPress={onBack}>
            <Text style={styles.backOverlayText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function HPBar({
  animValue,
  hp,
  maxHp,
  color,
}: {
  animValue: Animated.Value;
  hp: number;
  maxHp: number;
  color: string;
}) {
  const pct = maxHp > 0 ? hp / maxHp : 0;
  const barColor = pct > 0.5 ? '#22C55E' : pct > 0.2 ? '#FACC15' : '#EF4444';

  return (
    <View style={styles.hpTrack}>
      <Animated.View
        style={[
          styles.hpFill,
          {
            backgroundColor: barColor,
            width: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  loading: { flex: 1, backgroundColor: '#080F1E', justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { color: '#F1F5F9', fontSize: 20 },
  topTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },

  // Select phase
  selectScroll: { padding: 16, paddingBottom: 40 },
  selectRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  selectSide: { flex: 1, gap: 6 },
  selectImage: { width: 80, height: 80, alignSelf: 'center' },
  selectName: { color: '#F1F5F9', fontSize: 13, fontWeight: '800', textTransform: 'capitalize', textAlign: 'center' },
  selectHint: { color: '#475569', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  vsDivider: { width: 28, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  vsText: { color: '#475569', fontSize: 13, fontWeight: '900' },
  moveChip: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1E293B',
  },
  moveChipSelected: { backgroundColor: '#818CF820', borderColor: '#818CF8' },
  moveChipText: { color: '#64748B', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  moveChipTextSelected: { color: '#818CF8' },
  startBtn: {
    marginTop: 24, backgroundColor: '#818CF8', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#334155' },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  // Battle phase
  battleScroll: { padding: 16, paddingBottom: 40 },
  heroRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 16 },
  heroSide: { flex: 1, alignItems: 'center', gap: 4 },
  battleSprite: { width: (W - 80) / 2, height: (W - 80) / 2 },
  battleName: { color: '#F1F5F9', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  hpText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  hpTrack: {
    width: '100%', height: 6, backgroundColor: '#1E293B',
    borderRadius: 3, overflow: 'hidden',
  },
  hpFill: { height: '100%', borderRadius: 3 },

  turnText: {
    color: '#94A3B8', fontSize: 13, fontWeight: '700',
    textAlign: 'center', marginBottom: 12,
  },
  moveGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  moveBattleBtn: {
    width: (W - 48) / 2,
    backgroundColor: '#111827', borderRadius: 14,
    padding: 12, borderWidth: 1,
    gap: 4,
  },
  moveBattleName: { color: '#F1F5F9', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  moveBattleType: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  aiThinking: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  aiThinkingText: { color: '#F97316', fontSize: 13, fontWeight: '700' },

  logPanel: {
    backgroundColor: '#111827', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#1E293B', gap: 6,
  },
  logTitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  logEntry: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },

  // Winner overlay
  winnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080F1Eee',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  winnerText: { color: '#F1F5F9', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  winnerEmoji: { fontSize: 48 },
  playAgainBtn: {
    backgroundColor: '#818CF8', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  playAgainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  backOverlayBtn: {
    backgroundColor: '#1E293B', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  backOverlayText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
});
