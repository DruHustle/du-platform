import React from "react";
import { Text, useWindowDimensions } from "react-native";
import { NavigationContainer, getStateFromPath, type LinkingOptions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "./src/session";
import { CartProvider } from "./src/cart";
import { nativeLink, nativeLinkingConfig, websiteLinkState } from "./src/links";
import { HomeScreen } from "./src/screens/Home";
import { ShopScreen, ProductScreen, CartScreen } from "./src/screens/Shop";
import { TravelScreen } from "./src/screens/Travel";
import { AccountScreen, ResetPasswordScreen } from "./src/screens/Account";
import { AssistantScreen, ContactScreen, SearchScreen, ExternalScreen } from "./src/screens/Help";
import { colors } from "./src/ui";

type RootStackParams = { Main: undefined; Product: {slug: string}; Cart: undefined; Search: undefined; Contact: undefined; Reset: {token?: string} | undefined; External: {path: string; title: string} };
const Tabs=createBottomTabNavigator();const Stack=createNativeStackNavigator<RootStackParams>();
const icons: Record<string,string>={Home:"⌂",Shop:"▣",Travel:"✈",Assistant:"✦",Account:"●"};
function MainTabs() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const labelWidth = Math.max(24, (width - insets.left - insets.right) / 5 - 12);
  const labelLines = Math.max(1, Math.ceil(76 * fontScale / labelWidth));
  // React Navigation otherwise uses a 32dp compact bar on iPhone landscape.
  // Reserve room for wrapped, scaled labels as well as a full touch target.
  const tabHeight = Math.max(56, 36 + Math.ceil(16 * fontScale) * labelLines);
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerStyle: { backgroundColor: colors.navy }, headerTintColor: "white", headerTitleStyle: { fontWeight: "700" },
    tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: "#53657a",
    tabBarAccessibilityLabel: route.name, tabBarLabelPosition: "below-icon", tabBarHideOnKeyboard: true,
    tabBarStyle: { height: tabHeight + insets.bottom }, tabBarIconSize: 24,
    tabBarLabel: ({ color, children }) => <Text style={{ color, fontSize: 12, lineHeight: 16, fontWeight: "600", textAlign: "center", alignSelf: "stretch" }}>{children}</Text>,
    tabBarIcon: ({ color }) => <Text allowFontScaling={false} style={{ color, fontSize: 20 }}>{icons[route.name]}</Text>,
  })}>
    <Tabs.Screen name="Home" component={HomeScreen} options={{ headerTitle: "Diaspora Unlocked" }} />
    <Tabs.Screen name="Shop" component={ShopScreen} />
    <Tabs.Screen name="Travel" component={TravelScreen} />
    <Tabs.Screen name="Assistant" component={AssistantScreen} />
    <Tabs.Screen name="Account" component={AccountScreen} />
  </Tabs.Navigator>;
}
const linking: LinkingOptions<any>={
  prefixes:["diasporaunlocked://","https://www.diasporaunlocked.com"],
  config:nativeLinkingConfig,
  getStateFromPath:(path,options)=>{
    const link=nativeLink(path);
    if(link.kind==="invalid")return undefined;
    if(link.kind==="website")return websiteLinkState(link);
    return getStateFromPath(link.path,options);
  },
};
export default function App(){
  return <SafeAreaProvider><SessionProvider><CartProvider><StatusBar style="light"/><NavigationContainer linking={linking}><Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.navy},headerTintColor:"white"}}><Stack.Screen name="Main" component={MainTabs} options={{headerShown:false}}/><Stack.Screen name="Product" component={ProductScreen} options={{title:"Product"}}/><Stack.Screen name="Cart" component={CartScreen} options={{title:"Basket"}}/><Stack.Screen name="Search" component={SearchScreen}/><Stack.Screen name="Contact" component={ContactScreen} options={{title:"Contact"}}/><Stack.Screen name="Reset" component={ResetPasswordScreen} options={{title:"Reset password"}}/><Stack.Screen name="External" component={ExternalScreen} options={{title:"Open website"}}/></Stack.Navigator></NavigationContainer></CartProvider></SessionProvider></SafeAreaProvider>;
}
