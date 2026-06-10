import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useFavourites } from '../hooks/useFavourites';
import { usePokemon } from '../hooks/usePokemon';
import PokemonCard from '../components/PokemonCard';
import PokemonCardSkeleton from '../components/PokemonCardSkeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: Nav;
}

export default function FavouritesScreen({ navigation }: Props) {
  const { favourites, toggle, isFav } = useFavourites();

  if (favourites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favourites</Text>
          <Text style={styles.subtitle}>Your saved Pokémon</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyText}>No favourites yet</Text>
          <Text style={styles.emptyHint}>Tap ❤️ on any Pokémon card to save it here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>{favourites.length} Pokémon saved</Text>
      </View>
      <FlatList
        data={favourites}
        keyExtractor={(id) => String(id)}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: id }) => (
          <FavCard
            id={id}
            isFav={isFav(id)}
            onFavToggle={() => toggle(id)}
            onPress={() => navigation.navigate('Detail', { id, name: String(id) })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function FavCard({
  id,
  isFav,
  onFavToggle,
  onPress,
}: {
  id: number;
  isFav: boolean;
  onFavToggle: () => void;
  onPress: () => void;
}) {
  const { data: pokemon } = usePokemon(id);
  if (!pokemon) return <PokemonCardSkeleton />;

  return (
    <PokemonCard
      pokemon={pokemon}
      onPress={onPress}
      isFav={isFav}
      onFavToggle={onFavToggle}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080F1E' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { color: '#F1F5F9', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: '#94A3B8', fontSize: 20, fontWeight: '700' },
  emptyHint: { color: '#475569', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  listContent: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 30 },
});
