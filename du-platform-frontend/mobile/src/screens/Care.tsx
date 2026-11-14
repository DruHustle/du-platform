import React, { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { Action, Card, Copy, Field, Heading, Message, Screen } from "../ui";
import copy from "../careCopy.json";
import countryList from "../careCountries.json";

const pages = {
  zb: "https://www.zb.co.zw/diaspora/cash-funeral-plan",
  diaspora: "https://diasporainsurance.com/zimbabwe/",
  doves: "https://doves.co.zw/global-plan/",
};

function ResidenceField({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(false);
  const term = query.trim().toLowerCase();
  const matches =
    term && !selected
      ? countryList
          .filter(
            ([code, name]) =>
              code.toLowerCase() === term || name.toLowerCase().includes(term),
          )
          .slice(0, 6)
      : [];
  return (
    <Card>
      <Field
        label={label}
        placeholder="Type a country, then select its name"
        autoCorrect={false}
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setSelected(false);
          onSelect("");
        }}
      />
      {matches.map(([code, name]) => (
        <Action
          key={code}
          title={name}
          secondary
          onPress={() => {
            setQuery(name);
            setSelected(true);
            onSelect(code);
          }}
        />
      ))}
      {!!term && !selected && !matches.length && (
        <Copy>
          No countries found. Try the country name or its two-letter code.
        </Copy>
      )}
    </Card>
  );
}

export function CareScreen() {
  const [goal, setGoal] = useState<"funeral" | "repatriation" | undefined>();
  const [applicant, setApplicant] = useState("");
  const [covered, setCovered] = useState("");
  const [error, setError] = useState("");
  const ready = Boolean(goal && applicant && covered);
  const providers: (keyof typeof pages)[] = [];
  if (ready && applicant !== "ZW") {
    if (goal === "funeral" && covered === "ZW")
      providers.push("zb", "diaspora");
    if (goal === "repatriation" && covered !== "ZW")
      providers.push("doves", "diaspora");
  }

  async function openProvider(provider: keyof typeof pages) {
    setError("");
    try {
      await WebBrowser.openBrowserAsync(pages[provider]);
    } catch {
      setError(
        "Could not open the provider’s website. Check your connection and select the provider again.",
      );
    }
  }

  return (
    <Screen>
      <Heading>{copy.title}</Heading>
      <Copy>{copy.intro}</Copy>
      {(["funeral", "repatriation"] as const).map((choice) => (
        <Action
          key={choice}
          title={copy[choice]}
          secondary={goal !== choice}
          selected={goal === choice}
          onPress={() => {
            setGoal(choice);
            setError("");
          }}
        />
      ))}
      {goal && (
        <>
          <Copy>{copy.lookup_help}</Copy>
          <ResidenceField
            label={copy.applicant}
            onSelect={(code) => {
              setApplicant(code);
              setError("");
            }}
          />
          <ResidenceField
            label={copy.covered}
            onSelect={(code) => {
              setCovered(code);
              setError("");
            }}
          />
          {ready && providers.length === 0 && (
            <Message message={copy.no_match} />
          )}
          {providers.map((provider) => (
            <Card key={provider}>
              <Heading>{copy.providers[provider].title}</Heading>
              <Copy>{copy.providers[provider].body}</Copy>
              <Copy>{copy.handoff}</Copy>
              <Action
                title={copy.providers[provider].action}
                onPress={() => void openProvider(provider)}
              />
            </Card>
          ))}
          {!!error && <Message error message={error} />}
        </>
      )}
    </Screen>
  );
}
