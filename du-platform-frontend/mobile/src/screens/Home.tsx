import React from "react";
import { ImageBackground, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Action, Card, Copy, Heading, Screen, colors } from "../ui";
export function HomeScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen>
      <ImageBackground
        source={require("../../assets/victoria-falls.webp")}
        imageStyle={{ borderRadius: 14 }}
        style={styles.hero}
      >
        <View style={styles.overlay}>
          <Text style={styles.eyebrow}>DIASPORA UNLOCKED</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Rooted in Zimbabwe. Connected across Southern Africa.
          </Text>
        </View>
      </ImageBackground>
      <Heading>Explore what connects us</Heading>
      <Action
        title="Search Diaspora Unlocked"
        secondary
        onPress={() => navigation.navigate("Search")}
      />
      <Card>
        <Heading>Plan a visit</Heading>
        <Copy>
          Compare flight options and look for a place to stay near your
          destination.
        </Copy>
        <Action
          title="Find flights"
          onPress={() => navigation.navigate("Travel", { section: "flights" })}
        />
        <Action
          title="Find a stay"
          secondary
          onPress={() => navigation.navigate("Travel", { section: "stays" })}
        />
      </Card>
      <Card>
        <Heading>Shop from home</Heading>
        <Copy>
          Browse Zimbabwean food, crafts and sportswear. Check product details
          and request an availability update.
        </Copy>
        <Action
          title="Browse products"
          onPress={() => navigation.navigate("Shop")}
        />
      </Card>
      <Card>
        <Heading>Explore business opportunities</Heading>
        <Copy>
          Find projects and investment research on the Diaspora Unlocked
          website.
        </Copy>
        <Action
          title="Browse investment research"
          secondary
          onPress={() =>
            navigation.navigate("External", {
              path: "/investment",
              title: "Investment",
            })
          }
        />
      </Card>
      <Action
        title="Contact us"
        secondary
        onPress={() => navigation.navigate("Contact")}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    minHeight: 190,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: colors.navy,
  },
  overlay: { backgroundColor: "rgba(7,21,37,0.74)", padding: 18, gap: 8 },
  eyebrow: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  title: { color: "white", fontSize: 24, lineHeight: 31, fontWeight: "700" },
});
