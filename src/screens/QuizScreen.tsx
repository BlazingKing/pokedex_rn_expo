import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePokemon } from '../hooks/usePokemon';
import { getPokemonImageUrl } from '../utils/pokemon';
import TypeBadge from '../components/TypeBadge';

const { width: W } = Dimensions.get('window');
const IMG_SIZE = W * 0.65;
const MAX_GUESSES = 6;
const STREAK_KEY = '@daily_streak';

const EPOCH = new Date('2025-01-01').getTime();

function getDayNumber(): number {
  return Math.floor((Date.now() - EPOCH) / (1000 * 60 * 60 * 24));
}

function getDailyId(): number {
  const dateStr = new Date().toDateString();
  const hash = Array.from(dateStr).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hash % 1025) + 1;
}

function getRandomId() {
  return Math.floor(Math.random() * 151) + 1;
}

interface StreakData {
  lastDate: string;
  streak: number;
  bestStreak: number;
}

type QuizMode = 'daily' | 'random';

export default function QuizScreen() {
  const [mode, setMode] = useState<QuizMode>('daily');

  // Daily mode state
  const [dailyGuesses, setDailyGuesses] = useState<string[]>([]);
  const [dailyRevealed, setDailyRevealed] = useState(false);
  const [dailyWon, setDailyWon] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>({ lastDate: '', streak: 0, bestStreak: 0 });

  // Random mode state
  const [pokemonId, setPokemonId] = useState(getRandomId);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // Shared
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState(false);

  const dailyId = getDailyId();
  const currentId = mode === 'daily' ? dailyId : pokemonId;

  const silhouetteOpacity = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const { data: pokemon } = usePokemon(currentId);

  // Load streak on mount
  useEffect(() => {
    AsyncStorage.getItem(STREAK_KEY).then((raw) => {
      if (raw) setStreakData(JSON.parse(raw));
    });
  }, []);

  const doReveal = useCallback(() => {
    Animated.parallel([
      Animated.timing(silhouetteOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]),
    ]).start();
  }, [silhouetteOpacity, scaleAnim]);

  const shakeInput = useCallback(() => {
    setWrong(true);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setWrong(false));
  }, [shakeX]);

  const saveStreak = useCallback(async (won: boolean) => {
    const today = new Date().toDateString();
    setStreakData((prev) => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let newStreak = won
        ? (prev.lastDate === yesterday || prev.lastDate === today ? prev.streak + 1 : 1)
        : 0;
      if (!won) newStreak = 0;
      const newBest = Math.max(prev.bestStreak, newStreak);
      const next: StreakData = { lastDate: today, streak: newStreak, bestStreak: newBest };
      AsyncStorage.setItem(STREAK_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const checkGuess = useCallback(() => {
    if (!pokemon || revealed) return;
    const trimmed = guess.trim().toLowerCase();
    if (!trimmed) return;

    if (mode === 'daily') {
      if (dailyRevealed) return;
      const isCorrect = trimmed === pokemon.name.toLowerCase();
      const newGuesses = [...dailyGuesses, trimmed];
      setDailyGuesses(newGuesses);
      setGuess('');

      if (isCorrect) {
        setDailyWon(true);
        setDailyRevealed(true);
        setRevealed(true);
        doReveal();
        saveStreak(true);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setDailyRevealed(true);
        setRevealed(true);
        doReveal();
        saveStreak(false);
      } else {
        shakeInput();
      }
    } else {
      if (trimmed === pokemon.name.toLowerCase()) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setRevealed(true);
        doReveal();
      } else {
        shakeInput();
      }
    }
  }, [pokemon, revealed, guess, mode, dailyRevealed, dailyGuesses, doReveal, shakeInput, saveStreak]);

  const nextRandom = useCallback(() => {
    setPokemonId(getRandomId());
    setGuess('');
    setRevealed(false);
    silhouetteOpacity.setValue(1);
    scaleAnim.setValue(1);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [silhouetteOpacity, scaleAnim]);

  const skipRandom = useCallback(() => {
    setStreak(0);
    nextRandom();
  }, [nextRandom]);

  const switchMode = useCallback((newMode: QuizMode) => {
    setMode(newMode);
    setGuess('');
    setRevealed(false);
    silhouetteOpacity.setValue(1);
    scaleAnim.setValue(1);
    if (newMode === 'random') {
      setPokemonId(getRandomId());
    }
  }, [silhouetteOpacity, scaleAnim]);

  const shareDaily = useCallback(async () => {
    const day = getDayNumber();
    const resultEmoji = dailyWon ? '✅' : '💀';
    const guessEmojis = dailyGuesses
      .map((g, i) => {
        if (g === pokemon?.name.toLowerCase()) return '✅';
        if (i === dailyGuesses.length - 1 && !dailyWon) return '💀';
        return '❌';
      })
      .join('');
    const text = `Pokédex Daily #${day}\n${guessEmojis} ${resultEmoji}`;
    await Share.share({ message: text });
  }, [dailyGuesses, dailyWon, pokemon]);

  const imageUrl = pokemon ? getPokemonImageUrl(pokemon.id) : null;
  const dailyDone = dailyRevealed;
  const currentRevealed = mode === 'daily' ? dailyDone : revealed;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modePill, mode === 'daily' && styles.modePillActive]}
          onPress={() => switchMode('daily')}
          activeOpacity={0.8}
        >
          <Text style={[styles.modePillText, mode === 'daily' && styles.modePillTextActive]}>
            ☀️ Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modePill, mode === 'random' && styles.modePillActive]}
          onPress={() => switchMode('random')}
          activeOpacity={0.8}
        >
          <Text style={[styles.modePillText, mode === 'random' && styles.modePillTextActive]}>
            🎲 Random
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Who's that Pokémon?</Text>
        <View style={styles.scoreRow}>
          {mode === 'daily' ? (
            <>
              <View style={styles.scorePill}>
                <Text style={styles.scoreLabel}>GUESSES</Text>
                <Text style={styles.scoreValue}>{dailyGuesses.length}/{MAX_GUESSES}</Text>
              </View>
              <View style={[styles.scorePill, styles.streakPill]}>
                <Text style={styles.streakLabel}>🔥 STREAK</Text>
                <Text style={styles.scoreValue}>{streakData.streak}</Text>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scoreLabel}>BEST</Text>
                <Text style={styles.scoreValue}>{streakData.bestStreak}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.scorePill}>
                <Text style={styles.scoreLabel}>SCORE</Text>
                <Text style={styles.scoreValue}>{score}</Text>
              </View>
              <View style={[styles.scorePill, styles.streakPill]}>
                <Text style={styles.streakLabel}>🔥 STREAK</Text>
                <Text style={styles.scoreValue}>{streak}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Pokemon image */}
        <View style={styles.imageContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {imageUrl && (
              <>
                <Image source={{ uri: imageUrl }} style={styles.pokemonImage} resizeMode="contain" />
                <Animated.View style={[styles.silhouetteOverlay, { opacity: silhouetteOpacity }]}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.pokemonImage, styles.silhouette]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Revealed name + types */}
        {currentRevealed && pokemon && (
          <View style={styles.revealedInfo}>
            <Text style={styles.revealedName}>
              {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
            </Text>
            <View style={styles.typesRow}>
              {pokemon.types.map((t) => (
                <TypeBadge key={t.type.name} type={t.type.name} />
              ))}
            </View>
          </View>
        )}

        {/* Daily guess history */}
        {mode === 'daily' && dailyGuesses.length > 0 && (
          <View style={styles.guessHistory}>
            {dailyGuesses.map((g, i) => {
              const isCorrect = pokemon ? g === pokemon.name.toLowerCase() : false;
              return (
                <View key={i} style={[styles.guessRow, isCorrect && styles.guessRowCorrect]}>
                  <Text style={[styles.guessRowText, isCorrect && styles.guessRowTextCorrect]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                  <Text style={{ fontSize: 16 }}>{isCorrect ? '✅' : '✗'}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Daily result panel */}
        {mode === 'daily' && dailyDone && (
          <View style={styles.resultPanel}>
            <Text style={styles.resultEmoji}>{dailyWon ? '🎉' : '💀'}</Text>
            <Text style={styles.resultTitle}>{dailyWon ? 'Got it!' : 'Better luck tomorrow!'}</Text>
            <Text style={styles.resultSub}>
              {dailyWon
                ? `In ${dailyGuesses.length} guess${dailyGuesses.length !== 1 ? 'es' : ''}!`
                : `It was ${pokemon?.name ?? ''}!`}
            </Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareDaily} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>Share Result</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputArea}
        >
          {mode === 'random' && !revealed && (
            <>
              <Animated.View style={[styles.inputRow, { transform: [{ translateX: shakeX }] }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, wrong && styles.inputWrong]}
                  value={guess}
                  onChangeText={setGuess}
                  placeholder="Type Pokémon name…"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={checkGuess}
                />
                <TouchableOpacity style={styles.guessBtn} onPress={checkGuess} activeOpacity={0.8}>
                  <Text style={styles.guessBtnText}>GO</Text>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity onPress={skipRandom} style={styles.skipBtn} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip →</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'random' && revealed && (
            <TouchableOpacity style={styles.nextBtn} onPress={nextRandom} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>Next Pokémon →</Text>
            </TouchableOpacity>
          )}
          {mode === 'daily' && !dailyDone && (
            <>
              <Animated.View style={[styles.inputRow, { transform: [{ translateX: shakeX }] }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, wrong && styles.inputWrong]}
                  value={guess}
                  onChangeText={setGuess}
                  placeholder="Type Pokémon name…"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={checkGuess}
                />
                <TouchableOpacity style={styles.guessBtn} onPress={checkGuess} activeOpacity={0.8}>
                  <Text style={styles.guessBtnText}>GO</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: '#818CF820',
    borderColor: '#818CF8',
  },
  modePillText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  modePillTextActive: { color: '#818CF8' },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  scoreRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  streakPill: { borderColor: '#F97316' + '60' },
  scoreLabel: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  streakLabel: { color: '#F97316', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scoreValue: { color: '#F1F5F9', fontSize: 16, fontWeight: '900' },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pokemonImage: { width: IMG_SIZE, height: IMG_SIZE },
  silhouetteOverlay: { position: 'absolute', top: 0, left: 0 },
  silhouette: { tintColor: '#080F1E' },
  revealedInfo: { alignItems: 'center', paddingBottom: 12, gap: 8 },
  revealedName: { color: '#F1F5F9', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  typesRow: { flexDirection: 'row', gap: 6 },
  guessHistory: { paddingHorizontal: 24, gap: 6, marginBottom: 8 },
  guessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  guessRowCorrect: { borderColor: '#22C55E', backgroundColor: '#22C55E20' },
  guessRowText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  guessRowTextCorrect: { color: '#22C55E' },
  resultPanel: {
    marginHorizontal: 24,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  resultEmoji: { fontSize: 40 },
  resultTitle: { color: '#F1F5F9', fontSize: 22, fontWeight: '900' },
  resultSub: { color: '#64748B', fontSize: 14, textTransform: 'capitalize' },
  shareBtn: {
    marginTop: 8,
    backgroundColor: '#818CF8',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  shareBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  inputArea: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#F1F5F9',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrong: { borderColor: '#EF4444' },
  guessBtn: {
    backgroundColor: '#818CF8',
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guessBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  skipBtn: { alignSelf: 'center' },
  skipText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  nextBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
});
