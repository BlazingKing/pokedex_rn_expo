import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePokemonList, usePokemon } from '../hooks/usePokemon';
import { getPokemonId } from '../utils/pokemon';
import PokemonCard from '../components/PokemonCard';
import PokemonCardSkeleton from '../components/PokemonCardSkeleton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import type { Pokemon } from '../types/pokemon';
import { useQuery } from '@tanstack/react-query';
import { searchPokemon } from '../api/pokemon';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: Nav;
}

const TYPE_FILTERS = ['all', 'fire', 'water', 'grass', 'electric', 'psychic', 'dark', 'dragon'];

export default function HomeScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = usePokemonList();

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchPokemon(debouncedSearch),
    enabled: debouncedSearch.length > 2,
    retry: false,
  });

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    const timeout = setTimeout(() => setDebouncedSearch(text), 500);
    return () => clearTimeout(timeout);
  }, []);

  const allPokemonUrls = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data]
  );

  const renderItem = useCallback(({ item, index }: { item: { name: string; url: string }; index: number }) => {
    const id = getPokemonId(item.url);
    return <PokemonCardItem id={id} navigation={navigation} typeFilter={activeType} />;
  }, [navigation, activeType]);

  if (debouncedSearch.length > 2) {
    return (
      <SafeAreaView style={styles.container}>
        <Header search={search} onSearch={handleSearch} activeType={activeType} onTypeChange={setActiveType} />
        {isSearching ? (
          <ActivityIndicator color="#818CF8" style={{ marginTop: 40 }} />
        ) : searchResult ? (
          <View style={styles.searchResult}>
            <PokemonCard
              pokemon={searchResult}
              onPress={() => navigation.navigate('Detail', { id: searchResult.id, name: searchResult.name })}
            />
          </View>
        ) : (
          <Text style={styles.notFound}>No Pokémon found</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header search={search} onSearch={handleSearch} activeType={activeType} onTypeChange={setActiveType} />
      {isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <PokemonCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={allPokemonUrls}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#818CF8" style={{ marginVertical: 16 }} /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function PokemonCardItem({
  id,
  navigation,
  typeFilter,
}: {
  id: number;
  navigation: Nav;
  typeFilter: string;
}) {
  const { data: pokemon } = usePokemon(id);

  if (!pokemon) return <PokemonCardSkeleton />;

  if (typeFilter !== 'all' && !pokemon.types.some((t) => t.type.name === typeFilter)) {
    return null;
  }

  return (
    <PokemonCard
      pokemon={pokemon}
      onPress={() => navigation.navigate('Detail', { id: pokemon.id, name: pokemon.name })}
    />
  );
}

function Header({
  search,
  onSearch,
  activeType,
  onTypeChange,
}: {
  search: string;
  onSearch: (t: string) => void;
  activeType: string;
  onTypeChange: (t: string) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Pokédex</Text>
      <Text style={styles.subtitle}>Who's that Pokémon?</Text>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search by name..."
          placeholderTextColor="#475569"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Type Filter */}
      <FlatList
        data={TYPE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.typeList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onTypeChange(item)}
            style={[styles.typeChip, activeType === item && styles.typeChipActive]}
          >
            <Text style={[styles.typeChipText, activeType === item && styles.typeChipTextActive]}>
              {item.toUpperCase()}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080F1E' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  title: {
    color: '#F1F5F9',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
  },
  typeList: { marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeChipActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  typeChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  typeChipTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 30 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  searchResult: { padding: 16, maxWidth: '50%' },
  notFound: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
