import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePokemonList, usePokemon, usePokemonByGen } from '../hooks/usePokemon';
import { useFavourites } from '../hooks/useFavourites';
import { useCompare } from '../hooks/useCompare';
import { getPokemonId } from '../utils/pokemon';
import PokemonCard from '../components/PokemonCard';
import PokemonCardSkeleton from '../components/PokemonCardSkeleton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchPokemon } from '../api/pokemon';
import { GENERATIONS, GEN_KEYS } from '../constants/generations';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: Nav;
}

const TYPE_FILTERS = ['all', 'fire', 'water', 'grass', 'electric', 'psychic', 'dark', 'dragon'];

export default function HomeScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeGen, setActiveGen] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { toggle: favToggle, isFav } = useFavourites();
  const { selected, toggle: compareToggle, clear: compareClear, isSelected, isReady } = useCompare();

  const genInfo = GENERATIONS[activeGen];
  const isGenFiltered = activeGen !== 'all';

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isInfiniteLoading } = usePokemonList();
  const { data: genData, isLoading: isGenLoading } = usePokemonByGen(genInfo);

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchPokemon(debouncedSearch),
    enabled: debouncedSearch.length > 2,
    retry: false,
  });

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    const timer = setTimeout(() => setDebouncedSearch(text), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGenChange = useCallback((gen: string) => {
    setActiveGen(gen);
    setActiveType('all');
  }, []);

  const allPokemonUrls = useMemo(() => {
    if (isGenFiltered) return genData?.results ?? [];
    return infiniteData?.pages.flatMap((p) => p.results) ?? [];
  }, [isGenFiltered, genData, infiniteData]);

  const isLoading = isGenFiltered ? isGenLoading : isInfiniteLoading;

  const renderItem = useCallback(
    ({ item }: { item: { name: string; url: string } }) => {
      const id = getPokemonId(item.url);
      return (
        <PokemonCardItem
          id={id}
          navigation={navigation}
          typeFilter={activeType}
          isFav={isFav(id)}
          onFavToggle={() => favToggle(id)}
          isCompareSelected={isSelected(id)}
          onCompareToggle={() => compareToggle(id)}
        />
      );
    },
    [navigation, activeType, isFav, favToggle, isSelected, compareToggle]
  );

  const handleCompare = () => {
    if (isReady) {
      navigation.navigate('Compare', { idA: selected[0], idB: selected[1] });
      compareClear();
    }
  };

  const searchSection = debouncedSearch.length > 2;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        search={search}
        onSearch={handleSearch}
        activeType={activeType}
        onTypeChange={setActiveType}
        activeGen={activeGen}
        onGenChange={handleGenChange}
      />

      {/* Gen region banner */}
      {isGenFiltered && !searchSection && (
        <View style={styles.genBanner}>
          <View style={[styles.genBannerDot, { backgroundColor: genInfo.glow }]} />
          <Text style={[styles.genBannerText, { color: genInfo.glow }]}>{genInfo.region}</Text>
          <Text style={styles.genBannerCount}>
            {genData ? `${genData.results.length} Pokémon` : ''}
          </Text>
        </View>
      )}

      {/* Compare floating bar */}
      {selected.length > 0 && (
        <View style={styles.compareBar}>
          <Text style={styles.compareBarText}>
            {selected.length === 1 ? 'Select 1 more to compare' : '2 Pokémon selected'}
          </Text>
          <View style={styles.compareBarActions}>
            {isReady && (
              <TouchableOpacity onPress={handleCompare} style={styles.compareBtn}>
                <Text style={styles.compareBtnText}>Compare ⚖️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={compareClear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search result */}
      {searchSection ? (
        isSearching ? (
          <ActivityIndicator color="#818CF8" style={{ marginTop: 40 }} />
        ) : searchResult ? (
          <View style={styles.searchResult}>
            <PokemonCard
              pokemon={searchResult}
              onPress={() => navigation.navigate('Detail', { id: searchResult.id, name: searchResult.name })}
              isFav={isFav(searchResult.id)}
              onFavToggle={() => favToggle(searchResult.id)}
              isCompareSelected={isSelected(searchResult.id)}
              onCompareToggle={() => compareToggle(searchResult.id)}
            />
          </View>
        ) : (
          <Text style={styles.notFound}>No Pokémon found</Text>
        )
      ) : isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <PokemonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={allPokemonUrls}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          onEndReached={() => !isGenFiltered && hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage && !isGenFiltered
              ? <ActivityIndicator color="#818CF8" style={{ marginVertical: 16 }} />
              : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function PokemonCardItem({
  id, navigation, typeFilter, isFav, onFavToggle, isCompareSelected, onCompareToggle,
}: {
  id: number;
  navigation: Nav;
  typeFilter: string;
  isFav: boolean;
  onFavToggle: () => void;
  isCompareSelected: boolean;
  onCompareToggle: () => void;
}) {
  const { data: pokemon } = usePokemon(id);
  if (!pokemon) return <PokemonCardSkeleton />;
  if (typeFilter !== 'all' && !pokemon.types.some((t) => t.type.name === typeFilter)) return null;

  return (
    <PokemonCard
      pokemon={pokemon}
      onPress={() => navigation.navigate('Detail', { id: pokemon.id, name: pokemon.name })}
      isFav={isFav}
      onFavToggle={onFavToggle}
      isCompareSelected={isCompareSelected}
      onCompareToggle={onCompareToggle}
    />
  );
}

function Header({
  search, onSearch, activeType, onTypeChange, activeGen, onGenChange,
}: {
  search: string; onSearch: (t: string) => void;
  activeType: string; onTypeChange: (t: string) => void;
  activeGen: string; onGenChange: (g: string) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Pokédex</Text>
      <Text style={styles.subtitle}>Who's that Pokémon?</Text>

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

      <FlatList
        data={GEN_KEYS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.filterList}
        renderItem={({ item }) => {
          const info = GENERATIONS[item];
          const isActive = activeGen === item;
          return (
            <Pressable
              onPress={() => onGenChange(item)}
              style={[styles.genChip, isActive && { backgroundColor: info.glow + '25', borderColor: info.glow }]}
            >
              <Text style={[styles.genChipText, isActive && { color: info.glow }]}>{info.label}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={TYPE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.filterList}
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
  title: { color: '#F1F5F9', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1E293B', marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#F1F5F9', fontSize: 15 },
  filterList: { marginBottom: 8 },
  genChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#1E293B', marginRight: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  genChipText: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#1E293B', marginRight: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  typeChipActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  typeChipText: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  typeChipTextActive: { color: '#FFFFFF' },
  genBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6, gap: 8,
  },
  genBannerDot: { width: 8, height: 8, borderRadius: 4 },
  genBannerText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  genBannerCount: { color: '#475569', fontSize: 12, marginLeft: 'auto' },
  compareBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1E293B', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  compareBarText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  compareBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compareBtn: {
    backgroundColor: '#818CF8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  compareBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  clearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  searchResult: { padding: 16, maxWidth: '50%' },
  notFound: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
