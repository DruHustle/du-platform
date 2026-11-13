import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Story = {
  id: number;
  title: string;
  category: string;
  story: string;
  author: string;
};
type Feed =
  | { state: "loading" | "error" }
  | { state: "ready"; stories: Story[] };

function publishedStories(records: unknown): Story[] {
  if (!Array.isArray(records)) throw new Error("Invalid impact feed");
  return records
    .filter((record) => record?.is_published === 1)
    .map((record) => {
      if (
        !Number.isSafeInteger(record.id) ||
        ![record.title, record.category, record.story, record.author].every(
          (value) => typeof value === "string",
        )
      ) {
        throw new Error("Invalid published impact story");
      }
      return record;
    });
}

export default function ImpactStories() {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [feed, setFeed] = useState<Feed>({ state: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setFeed({ state: "loading" });
    api
      .get("/impact/stories", { signal: controller.signal })
      .then(({ data }) => {
        const stories = publishedStories(data?.stories);
        if (!controller.signal.aborted) setFeed({ state: "ready", stories });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFeed({ state: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <DiscoverySection id="impact-stories" title={t("impact.hero.badge1")}>
      {feed.state === "loading" && (
        <p role="status">{t("impact.feed.loading")}</p>
      )}
      {feed.state === "error" && (
        <div className="space-y-3">
          <p role="status">{t("impact.feed.unavailable")}</p>
          <Button
            className="min-h-11"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("impact.feed.retry")}
          </Button>
        </div>
      )}
      {feed.state === "ready" &&
        (feed.stories.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {feed.stories.map((story) => (
              <DiscoveryTile key={story.id} title={story.title}>
                <p>
                  {story.category} · {story.author}
                </p>
                <p className="whitespace-pre-wrap break-words">{story.story}</p>
              </DiscoveryTile>
            ))}
          </div>
        ) : (
          <p role="status">{t("impact.feed.empty")}</p>
        ))}
    </DiscoverySection>
  );
}
