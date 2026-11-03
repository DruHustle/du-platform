import React from "react";
import { ImageBackground, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Action, Card, Copy, Heading, Screen, colors } from "../ui";
export function HomeScreen() {
  const navigation = useNavigation<any>();
  return <Screen>
    <ImageBackground source={require("../../assets/victoria-falls.webp")} imageStyle={{borderRadius: 14}} style={styles.hero}>
      <View style={styles.overlay}><Text style={styles.eyebrow}>DIASPORA UNLOCKED</Text><Text accessibilityRole="header" style={styles.title}>Rooted in Zimbabwe. Connected across Southern Africa.</Text></View>
    </ImageBackground>
    <Heading>Explore what connects us</Heading>
    <Copy>Discover products, travel ideas and practical information for the diaspora.</Copy>
    <Action title="Search Diaspora Unlocked" onPress={() => navigation.navigate("Search")} />
    <Card><Heading>Travel</Heading><Copy>Research flights and stays and plan your next journey. Availability and booking are handled by providers.</Copy><Action title="Explore Travel" onPress={() => navigation.navigate("Travel")} /></Card>
    <Card><Heading>Shop</Heading><Copy>Discover products from home and request an assisted order where available.</Copy><Action title="Browse products" onPress={() => navigation.navigate("Shop")} /></Card>
    <Card><Heading>Business and technology</Heading><Copy>Explore investment information, projects and technology on the Diaspora Unlocked website.</Copy><Action title="Explore business information" secondary onPress={() => navigation.navigate("External", {path: "/investment", title: "Investment"})} /></Card>
    <Action title="Contact us" secondary onPress={() => navigation.navigate("Contact")} />
  </Screen>;
}
const styles=StyleSheet.create({hero:{minHeight:190,justifyContent:"flex-end",overflow:"hidden",borderRadius:14,backgroundColor:colors.navy},overlay:{backgroundColor:"rgba(7,21,37,0.74)",padding:18,gap:8},eyebrow:{color:colors.gold,fontWeight:"700",fontSize:12,letterSpacing:1},title:{color:"white",fontSize:24,lineHeight:31,fontWeight:"700"}});
