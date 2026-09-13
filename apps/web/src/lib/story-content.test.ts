import { describe, expect, it } from "vitest";

import { getStoryContent } from "./story-content";

describe("story content approval gate", () => {
  it("keeps all final VI/EN narrative fields absent until approved", () => {
    for (const locale of ["vi", "en"] as const) {
      const story = getStoryContent(locale);
      expect(story.status).toBe("pending-approval");
      expect(story.chapters).toHaveLength(3);
      expect(
        story.chapters.every(
          (chapter) => chapter.title === null && chapter.body === null,
        ),
      ).toBe(true);
    }
  });
});
