export type RootStackParamList = {
  Tabs: undefined;
  Detail: { id: string | number; name: string };
  Compare: { idA: number; idB: number };
};

export type TabParamList = {
  Home: undefined;
  Favourites: undefined;
};
