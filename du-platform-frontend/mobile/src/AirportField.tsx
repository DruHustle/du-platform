import React, { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "./api";
import {
  airportCode,
  matchingAirports,
  parseAirports,
  type Airport,
} from "./travelAirports";
import { colors, Copy, Field } from "./ui";

export function useAirportDirectory() {
  const [airports, setAirports] = useState<Airport[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setUnavailable(false);
    void request("/travel/capabilities", { signal: controller.signal })
      .then(parseAirports)
      .then((rows) => {
        if (!controller.signal.aborted) setAirports(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return {
    airports,
    unavailable,
    retry: () => setAttempt((value) => value + 1),
  };
}

type AirportFieldProps = {
  label: string;
  testID: string;
  airports: Airport[] | null;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

export function AirportField({
  label,
  testID,
  airports,
  value,
  onChange,
  disabled,
}: AirportFieldProps) {
  const [focused, setFocused] = useState(false);
  const code = airportCode(value, airports);
  const selected = airports?.find((airport) => airport.id === code);
  const matches =
    focused && airports && !selected ? matchingAirports(value, airports) : [];
  return (
    <View style={styles.container}>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        testID={testID}
        accessibilityLabel={`${label}, city or airport code`}
        accessibilityHint="Type a city name to see matching airports, or enter the three-letter airport code."
        placeholder="City or airport code"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={200}
        editable={!disabled}
        selectTextOnFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {selected && (
        <Text style={styles.caption}>
          {selected.name} · {selected.id} · {selected.country}
        </Text>
      )}
      {matches.slice(0, 5).map((airport) => (
        <Pressable
          key={airport.id}
          accessibilityRole="button"
          disabled={disabled}
          accessibilityLabel={`Use ${airport.name}, ${airport.id}, ${airport.country}`}
          onPress={() => {
            onChange(airport.id);
            Keyboard.dismiss();
          }}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
        >
          <Text style={styles.optionText}>{airport.name}</Text>
          <Text style={styles.caption}>
            {airport.id} · {airport.country}
          </Text>
        </Pressable>
      ))}
      {focused && airports && value.trim() && !selected && !matches.length ? (
        <Copy>No matching airport. Try another city or airport code.</Copy>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.pale,
  },
  optionText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 16,
    flexShrink: 1,
  },
  caption: { color: "#43556b", fontSize: 15, lineHeight: 21 },
  pressed: { backgroundColor: colors.border },
});
