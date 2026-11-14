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
            Plan your next trip home
          </Text>
        </View>
      </ImageBackground>
      <Copy>
        Look for flights to Zimbabwe and across Southern Africa, or find a place
        to stay near family.
      </Copy>
      <Action
        title="Search flights"
        onPress={() => navigation.navigate("Travel", { section: "flights" })}
      />
      <Action
        title="Find a stay"
        secondary
        onPress={() => navigation.navigate("Travel", { section: "stays" })}
      />
      <Card>
        <Heading>Shop</Heading>
        <Copy>
          Browse Zimbabwean food and crafts. Open a product to check
          availability and email alert options.
        </Copy>
        <Action
          title="Browse Zimbabwean products"
          onPress={() => navigation.navigate("Shop")}
        />
      </Card>
      <Card>
        <Heading>Care</Heading>
        <Copy>
          Find providers to ask about funeral costs in Zimbabwe or bringing a
          loved one home from abroad.
        </Copy>
        <Action
          title="Find funeral cover providers"
          onPress={() => navigation.navigate("Care")}
        />
      </Card>
      <Card>
        <Heading>Onesa</Heading>
        <Copy>
          Draft an itinerary or ask a question about a Zimbabwean product.
        </Copy>
        <Action
          title="Open Onesa"
          onPress={() => navigation.navigate("Assistant")}
        />
      </Card>
      <Card>
        <Heading>Business guides</Heading>
        <Copy>
          Research a project in Zimbabwe, check the costs and look up
          businesses.
        </Copy>
        <Action
          title="Read business guides"
          secondary
          onPress={() =>
            navigation.navigate("External", {
              path: "/business-guides",
              title: "Business guides",
            })
          }
        />
      </Card>
      <Action
        title="Search Diaspora Unlocked"
        secondary
        onPress={() => navigation.navigate("Search")}
      />
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
