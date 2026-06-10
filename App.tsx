import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import FavouritesScreen from './src/screens/FavouritesScreen';
import CompareScreen from './src/screens/CompareScreen';
import QuizScreen from './src/screens/QuizScreen';
import TeamScreen from './src/screens/TeamScreen';
import BattleScreen from './src/screens/BattleScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import type { RootStackParamList, TabParamList } from './src/types/navigation';
import { FavouritesProvider } from './src/context/FavouritesContext';
import { TeamProvider } from './src/context/TeamContext';
import { TrackerProvider } from './src/context/TrackerContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
    },
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#818CF8',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Pokédex',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Favourites"
        component={FavouritesScreen}
        options={{
          tabBarLabel: 'Favourites',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '❤️' : '🤍'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          tabBarLabel: 'Quiz',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❓</Text>,
        }}
      />
      <Tab.Screen
        name="Team"
        component={TeamScreen}
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚔️</Text>,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FavouritesProvider>
      <TrackerProvider>
      <TeamProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#080F1E' },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Detail" component={DetailScreen} />
            <Stack.Screen name="Compare" component={CompareScreen} />
            <Stack.Screen name="Battle" component={BattleScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
      </TeamProvider>
      </TrackerProvider>
      </FavouritesProvider>
    </QueryClientProvider>
  );
}
