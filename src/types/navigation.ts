export type RootStackParamList = {
  Tabs: undefined;
  Detail: { id: string | number; name: string };
  Compare: { idA: number; idB: number };
  Battle: { idA: number | string; idB: number | string };
};

export type TabParamList = {
  Home: undefined;
  Favourites: undefined;
  Quiz: undefined;
  Team: undefined;
};
