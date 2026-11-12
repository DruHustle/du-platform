import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Action, Copy, Field } from "./ui";
import { partySummary, travelCurrencies, type TravelCategory, type TravelParty } from "./nativeTravelSearch";

function Count({ label, value, max, disabled, onChange }: {
  label: "Adults" | "Rooms";
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const item = label === "Adults" ? "an adult" : "a room";
  return <View style={styles.row}>
    <View style={styles.grow}><Copy>{label} · {value}</Copy></View>
    <Action title="−" accessibilityLabel={`Remove ${item}`} secondary
      disabled={disabled || value <= 1} onPress={() => onChange(value - 1)}/>
    <Action title="+" accessibilityLabel={`Add ${item}`} secondary
      disabled={disabled || value >= max} onPress={() => onChange(value + 1)}/>
  </View>;
}

export function TravelPartyFields({ party, category, disabled, onChange }: {
  party: TravelParty;
  category: TravelCategory;
  disabled: boolean;
  onChange: (party: TravelParty) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.section}>
    <Copy>{partySummary(party, category)}</Copy>
    <Action title={expanded ? "Hide traveller options" : "Edit travellers and currency"}
      secondary expanded={expanded} onPress={() => setExpanded(!expanded)}/>
    {expanded && <>
      <Count label="Adults" value={party.adults} max={9} disabled={disabled}
        onChange={adults => onChange({ ...party, adults })}/>
      {party.childAges.map((age, index) => <View key={index} style={styles.row}>
        <View style={styles.grow}>
          <Field label={`Child ${index + 1} age (0–17)`} value={age < 0 ? "" : String(age)}
            editable={!disabled} keyboardType="number-pad" maxLength={2}
            onChangeText={text => {
              if (!/^\d{0,2}$/.test(text)) return;
              const ages = [...party.childAges];
              ages[index] = text === "" ? -1 : Number(text);
              onChange({ ...party, childAges: ages });
            }}/>
        </View>
        <Action title="Remove" secondary accessibilityLabel={`Remove child ${index + 1}`}
          disabled={disabled} onPress={() => onChange({
            ...party, childAges: party.childAges.filter((_, i) => i !== index),
          })}/>
      </View>)}
      <Action title="Add a child" secondary disabled={disabled || party.childAges.length >= 6}
        onPress={() => onChange({ ...party, childAges: [...party.childAges, -1] })}/>
      {category === "stays" && <Count label="Rooms" value={party.rooms} max={9} disabled={disabled}
        onChange={rooms => onChange({ ...party, rooms })}/>}
      <Copy>Price currency</Copy>
      <View style={styles.row}>
        {travelCurrencies.map(currency => <View key={currency} style={styles.currency}>
          <Action title={currency} selected={currency === party.currency} secondary={currency !== party.currency}
            disabled={disabled} onPress={() => onChange({ ...party, currency })}/>
        </View>)}
      </View>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  grow: { flexGrow: 1, flexBasis: 130 },
  currency: { flexGrow: 1, flexBasis: 65 },
});
