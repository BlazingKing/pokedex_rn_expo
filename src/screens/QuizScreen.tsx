import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePokemon } from '../hooks/usePokemon';
import { getPokemonImageUrl } from '../utils/pokemon';
import TypeBadge from '../components/TypeBadge';

const { width: W } = Dimensions.get('window');
const IMG_SIZE = W * 0.65;

function getRandomId() {
  return Math.floor(Math.random() * 151) + 1;
}

export default function QuizScreen() {
  const [pokemonId, setPokemonId] = useState(getRandomId);
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState(false);

  const silhouetteOpacity = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const { data: pokemon } = usePokemon(pokemonId);

  const reveal = useCallback(() => {
    setRevealed(true);
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

  const checkGuess = useCallback(() => {
    if (!pokemon || revealed) return;
    if (guess.trim().toLowerCase() === pokemon.name.toLowerCase()) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      reveal();
    } else {
      shakeInput();
    }
  }, [pokemon, revealed, guess, reveal, shakeInput]);

  const next = useCallback(() => {
    setPokemonId(getRandomId());
    setGuess('');
    setRevealed(false);
    silhouetteOpacity.setValue(1);
    scaleAnim.setValue(1);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [silhouetteOpacity, scaleAnim]);

  const skip = useCallback(() => {
    setStreak(0);
    next();
  }, [next]);

  const imageUrl = pokemon ? getPokemonImageUrl(pokemon.id) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Who's that Pokémon?</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={[styles.scorePill, styles.streakPill]}>
            <Text style={styles.streakLabel}>🔥 STREAK</Text>
            <Text style={styles.scoreValue}>{streak}</Text>
          </View>
        </View>
      </View>

      {/* Pokemon image */}
      <View style={styles.imageContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {imageUrl && (
            <>
              {/* Revealed image */}
              <Image source={{ uri: imageUrl }} style={styles.pokemonImage} resizeMode="contain" />
              {/* Silhouette overlay — fades out on reveal */}
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
      {revealed && pokemon && (
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

      {/* Input area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputArea}>
        {!revealed ? (
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
            <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Next Pokémon →</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080F1E' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pokemonImage: { width: IMG_SIZE, height: IMG_SIZE },
  silhouetteOverlay: { position: 'absolute', top: 0, left: 0 },
  silhouette: { tintColor: '#080F1E' },
  revealedInfo: { alignItems: 'center', paddingBottom: 12, gap: 8 },
  revealedName: { color: '#F1F5F9', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  typesRow: { flexDirection: 'row', gap: 6 },
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
