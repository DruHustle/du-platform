import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { NavigationContainer, getStateFromPath, type LinkingOptions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "./src/session";
import { CartProvider } from "./src/cart";
import { navigationPath } from "./src/links";
import { shopDestination } from "./src/shopDiscovery";
import { HomeScreen } from "./src/screens/Home";
import { ShopScreen, ProductScreen, CartScreen } from "./src/screens/Shop";
import { TravelScreen } from "./src/screens/Travel";
import { AccountScreen, ResetPasswordScreen } from "./src/screens/Account";
import { AssistantScreen, ContactScreen, SearchScreen, ExternalScreen } from "./src/screens/Help";
import { colors } from "./src/ui";

type RootStackParams = { Main: undefined; Product: {slug: string}; Cart: undefined; Search: undefined; Contact: {reportReply: string} | undefined; Reset: {token?: string} | undefined; External: {path: string; title: string} };
const Tabs=createBottomTabNavigator();const Stack=createNativeStackNavigator<RootStackParams>();
const icons: Record<string,string>={Home:"⌂",Shop:"▣",Travel:"✈",Assistant:"✦",Account:"●"};
function MainTabs(){return <Tabs.Navigator screenOptions={({route})=>({headerStyle:{backgroundColor:colors.navy},headerTintColor:"white",headerTitleStyle:{fontWeight:"700"},tabBarActiveTintColor:colors.ink,tabBarInactiveTintColor:"#53657a",tabBarLabelStyle:{fontSize:12,fontWeight:"600"},tabBarIcon:({color})=><Text style={{color,fontSize:20}}>{icons[route.name]}</Text>})}><Tabs.Screen name="Home" component={HomeScreen} options={{headerTitle:"Diaspora Unlocked",tabBarLabel:"Home"}}/><Tabs.Screen name="Shop" component={ShopScreen}/><Tabs.Screen name="Travel" component={TravelScreen}/><Tabs.Screen name="Assistant" component={AssistantScreen}/><Tabs.Screen name="Account" component={AccountScreen}/></Tabs.Navigator>;}
const linking: LinkingOptions<any>={prefixes:["diasporaunlocked://","https://www.diasporaunlocked.com"],config:{initialRouteName:"Main",screens:{Main:{screens:{Home:"",Shop:"shop",Travel:"travel/:section?",Assistant:"onesa-ai-chat",Account:"login"}},Product:"shop/product/:slug",Reset:"reset-password"}},getStateFromPath: (path, options) => {
  const shop = shopDestination(path.startsWith("/") ? path : `/${path}`);
  if (!shop) return getStateFromPath(navigationPath(path), options);
  const tab = shop.screen === "Shop" ? { name: "Shop", params: shop.params } : { name: "Shop" };
  const main = { name: "Main", state: { routes: [tab] } };
  if (shop.screen === "Shop") return { routes: [main] };
  return { index: 1, routes: [main, { name: shop.screen, params: shop.params }] };
}};
export default function App(){
  const [offline,setOffline]=useState(false);
  useEffect(()=>NetInfo.addEventListener(state=>setOffline(state.isConnected===false||state.isInternetReachable===false)),[]);
  return <SafeAreaProvider><SessionProvider><CartProvider><StatusBar style="light"/><NavigationContainer linking={linking}>{offline&&<View accessibilityRole="alert" style={{backgroundColor:"#7f1d1d",padding:8}}><Text style={{color:"white",textAlign:"center"}}>You are offline. Reconnect and retry.</Text></View>}<Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.navy},headerTintColor:"white"}}><Stack.Screen name="Main" component={MainTabs} options={{headerShown:false}}/><Stack.Screen name="Product" component={ProductScreen} options={{title:"Product"}}/><Stack.Screen name="Cart" component={CartScreen} options={{title:"Basket"}}/><Stack.Screen name="Search" component={SearchScreen}/><Stack.Screen name="Contact" component={ContactScreen} options={{title:"Contact"}}/><Stack.Screen name="Reset" component={ResetPasswordScreen} options={{title:"Reset password"}}/><Stack.Screen name="External" component={ExternalScreen} options={{title:"Open website"}}/></Stack.Navigator></NavigationContainer></CartProvider></SessionProvider></SafeAreaProvider>;
}
