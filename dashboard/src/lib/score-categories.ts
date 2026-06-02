import type { ScoreCategory } from "@shame-the-web/shared";

export type ScoreCategoryGuide = {
  key: ScoreCategory;
  label: string;
  description: string;
  hint: string;
  roastLine: string;
};

export const scoreCategories: readonly ScoreCategoryGuide[] = [
  {
    key: "speed",
    label: "Speed",
    description: "How long the page keeps you waiting before it feels ready to use.",
    hint: "Heavy scripts, oversized images, slow server responses.",
    roastLine: "Pages that treat loading like a personality trait."
  },
  {
    key: "responsiveness",
    label: "Responsiveness",
    description: "Whether taps, clicks, and scrolls feel instant, or like the page is thinking about it.",
    hint: "Long tasks, blocked input, mysterious half-second freezes.",
    roastLine: "When the UI hears you but pretends it didn't."
  },
  {
    key: "stability",
    label: "Stability",
    description: "Whether content settles in place or keeps rearranging itself under your cursor.",
    hint: "Late-loading media, layout shifts, jumpy banners.",
    roastLine: "Layout shift: the sport where you lose."
  },
  {
    key: "polish",
    label: "Polish",
    description: "The overall vibe that someone actually finished building the thing.",
    hint: "Rough loading states, janky transitions, 'good enough' energy.",
    roastLine: "Beta energy on a production URL."
  }
] as const;

export function getCategoryLabel(category: ScoreCategory): string {
  return scoreCategories.find((item) => item.key === category)?.label ?? category;
}
