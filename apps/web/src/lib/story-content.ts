export type StoryLocale = "en" | "vi";

export type StoryContent = {
  chapters: Array<{
    artwork: string;
    body: string | null;
    title: string | null;
  }>;
  status: "pending-approval" | "published";
};

const chapterArtwork = [
  "/assets/story/story-oink-town.png",
  "/assets/story/story-crystal-incident.png",
  "/assets/story/story-adventure.png",
] as const;

/** Final narrative copy is product-authored content. Null is intentional until
 * approved VI and EN variants are supplied; filenames are not promoted to lore. */
export function getStoryContent(locale: StoryLocale): StoryContent {
  void locale;
  return {
    status: "pending-approval",
    chapters: chapterArtwork.map((artwork) => ({
      artwork,
      body: null,
      title: null,
    })),
  };
}
