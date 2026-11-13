import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { keyboardBottomInset } from "./keyboardLayout";

export const colors = { ink: "#13233a", navy: "#071525", gold: "#e5b63b", pale: "#f3f5f7", border: "#cbd5e1", red: "#a6212b" };
export function Screen({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const viewport = useRef<View>(null);
  const measurement = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const adjustForKeyboard = useCallback(() => {
    if (Platform.OS !== "android") return;
    const generation = ++measurement.current;
    const keyboardTop = Keyboard.metrics()?.screenY;
    if (keyboardTop === undefined) {
      setKeyboardInset(0);
      return;
    }
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      if (generation === measurement.current) {
        setKeyboardInset(keyboardBottomInset({ y, height }, keyboardTop));
      }
    });
  }, []);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", adjustForKeyboard);
    const hide = Keyboard.addListener("keyboardDidHide", adjustForKeyboard);
    return () => {
      ++measurement.current;
      show.remove();
      hide.remove();
    };
  }, [adjustForKeyboard]);

  return <SafeAreaView edges={["left", "right"]} style={styles.safe}>
    <View ref={viewport} collapsable={false} onLayout={adjustForKeyboard}
      style={[styles.flex, Platform.OS === "android" && { paddingBottom: keyboardInset }]}>
      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(36, insets.bottom + 16) }]}>
        {children}
      </ScrollView>
    </View>
  </SafeAreaView>;
}
export function Heading({children}: React.PropsWithChildren) { return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>; }
export function Copy({children}: React.PropsWithChildren) { return <Text style={styles.copy}>{children}</Text>; }
export function Card({children}: React.PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Action({title, onPress, disabled = false, secondary = false, selected, expanded, accessibilityLabel}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
  expanded?: boolean;
  accessibilityLabel?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled, selected, expanded}} disabled={disabled} onPress={onPress} style={({pressed}) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}
export function Field({label, ...props}: TextInputProps & {label: string}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#65758b" {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} /></View>;
}
export function Message({message, error = false}: {message: string; error?: boolean}) { return <Text accessibilityRole={error ? "alert" : "text"} style={[styles.message, error && styles.error]}>{message}</Text>; }
export function Loading({label = "Loading…"}: {label?: string}) { return <View style={styles.loading}><ActivityIndicator color={colors.ink} /><Text style={styles.copy}>{label}</Text></View>; }
export const styles = StyleSheet.create({
  flex: {flex: 1}, safe: {flex: 1, backgroundColor: colors.pale}, content: {padding: 16, paddingBottom: 36, gap: 14},
  heading: {fontSize: 27, lineHeight: 34, fontWeight: "700", color: colors.ink}, copy: {fontSize: 16, lineHeight: 24, color: colors.ink},
  card: {backgroundColor: "white", borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10},
  button: {minHeight: 48, borderRadius: 10, backgroundColor: colors.navy, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10},
  buttonText: {fontSize: 16, lineHeight: 21, color: "white", fontWeight: "700", textAlign: "center"}, secondary: {backgroundColor: "white", borderColor: colors.ink, borderWidth: 1}, secondaryText: {color: colors.ink}, disabled: {opacity: 0.48}, pressed: {opacity: 0.75},
  field: {gap: 6}, label: {fontSize: 16, fontWeight: "600", color: colors.ink}, input: {minHeight: 48, borderWidth: 1, borderColor: "#64748b", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink, backgroundColor: "white"}, multiline: {minHeight: 120, textAlignVertical: "top"},
  message: {fontSize: 15, lineHeight: 22, color: colors.ink}, error: {color: colors.red}, loading: {flexDirection: "row", alignItems: "center", gap: 10},
});
