import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { keyboardBottomInset } from "./keyboardLayout";

export const colors = { ink: "#13233a", navy: "#071525", gold: "#e5b63b", pale: "#f3f5f7", border: "#cbd5e1", red: "#a6212b" };
export function Screen({ children, wide = false }: React.PropsWithChildren<{ wide?: boolean }>) {
  const insets = useSafeAreaInsets();
  const connection = useNetInfo();
  const offline = connection.isConnected === false || connection.isInternetReachable === false;
  const viewport = useRef<React.ComponentRef<typeof View>>(null);
  const measurement = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const updateKeyboardInset = useCallback(() => {
    if (Platform.OS !== "android") return;
    const generation = ++measurement.current;
    const keyboardTop = Keyboard.metrics()?.screenY;
    if (keyboardTop === undefined) {
      setKeyboardInset(0);
      return;
    }
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      // A hide, rotation or later layout can overtake this async measurement.
      if (generation === measurement.current) setKeyboardInset(keyboardBottomInset({ y, height }, keyboardTop));
    });
  }, []);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const shown = Keyboard.addListener("keyboardDidShow", updateKeyboardInset);
    const hidden = Keyboard.addListener("keyboardDidHide", updateKeyboardInset);
    updateKeyboardInset();
    return () => {
      ++measurement.current;
      shown.remove();
      hidden.remove();
    };
  }, [updateKeyboardInset]);
  return <SafeAreaView edges={["left", "right"]} style={styles.safe}>
    {offline && <View accessibilityRole="alert" style={styles.offline}><Text style={styles.offlineText}>You are offline. Reconnect and retry.</Text></View>}
    <View ref={viewport} collapsable={false} onLayout={updateKeyboardInset}
      style={[styles.flex, Platform.OS === "android" && { paddingBottom: keyboardInset }]}>
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
      // iOS supplies native scroll insets. Android edge-to-edge windows can
      // remain full height despite adjustResize; the measured outer viewport
      // reserves only its actual overlap and keeps the IME open while scrolling.
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, wide && styles.wideContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
    >{children}</ScrollView>
    </View>
  </SafeAreaView>;
}
/** Use the available window/card width, including iPad split-screen resizing. */
export function Grid({ children }: React.PropsWithChildren) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const items = React.Children.toArray(children);
  if (!items.length) return null;
  // Larger text needs wider cards; preserve one column rather than squeezing
  // the user's chosen text size into a tablet-only two-column breakpoint.
  const columns = width >= 640 * Math.max(1, fontScale) + 14 ? 2 : 1;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>
    {items.map((child, index) => <View key={React.isValidElement(child) ? child.key : index} style={{ width: columns === 1 ? "100%" : (width - 14) / 2, minWidth: 0 }}>{child}</View>)}
  </View>;
}
export function Heading({children}: React.PropsWithChildren) { return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>; }
export function Copy({children}: React.PropsWithChildren) { return <Text style={styles.copy}>{children}</Text>; }
export function Card({children}: React.PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Action({title, onPress, disabled = false, secondary = false}: {title: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed}) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}
export function Field({label, ...props}: TextInputProps & {label: string}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#65758b" {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} /></View>;
}
export function Message({message, error = false}: {message: string; error?: boolean}) { return <Text accessibilityRole={error ? "alert" : "text"} style={[styles.message, error && styles.error]}>{message}</Text>; }
export function Loading({label = "Loading…"}: {label?: string}) { return <View style={styles.loading}><ActivityIndicator color={colors.ink} /><Text style={styles.copy}>{label}</Text></View>; }
export const styles = StyleSheet.create({
  flex: {flex: 1}, safe: {flex: 1, backgroundColor: colors.pale}, content: {width: "100%", maxWidth: 720, alignSelf: "center", padding: 16, gap: 14}, wideContent: {maxWidth: 1120},
  grid: {width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start"},
  offline: {backgroundColor: "#7f1d1d", paddingHorizontal: 16, paddingVertical: 10}, offlineText: {color: "white", fontSize: 15, lineHeight: 22, textAlign: "center"},
  heading: {fontSize: 27, lineHeight: 34, fontWeight: "700", color: colors.ink}, copy: {fontSize: 16, lineHeight: 24, color: colors.ink, flexShrink: 1},
  card: {minWidth: 0, backgroundColor: "white", borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10},
  button: {minHeight: 48, borderRadius: 10, backgroundColor: colors.navy, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10},
  buttonText: {fontSize: 16, lineHeight: 21, color: "white", fontWeight: "700", textAlign: "center"}, secondary: {backgroundColor: "white", borderColor: colors.ink, borderWidth: 1}, secondaryText: {color: colors.ink}, disabled: {opacity: 0.48}, pressed: {opacity: 0.75},
  field: {gap: 6}, label: {fontSize: 16, fontWeight: "600", color: colors.ink}, input: {minHeight: 48, borderWidth: 1, borderColor: "#64748b", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink, backgroundColor: "white"}, multiline: {minHeight: 120, textAlignVertical: "top"},
  message: {fontSize: 15, lineHeight: 22, color: colors.ink}, error: {color: colors.red}, loading: {flexDirection: "row", alignItems: "center", gap: 10},
});
