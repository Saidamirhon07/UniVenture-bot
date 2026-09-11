import type { ScreenId } from "../types";

const artwork: Partial<Record<ScreenId, string>> = {
  essay: "essay",
  brainstorm: "brainstorm",
  rewrite: "rewrite",
  ec: "ec",
  recommendation: "recommendation",
  "portfolio-builder": "portfolio-builder",
  portfolio: "portfolio",
  sat: "sat",
  ielts: "ielts",
  school: "school",
  plan: "plan",
  roadmap: "plan",
  boost: "boost",
  coach: "boost",
};

export default function ToolArtwork({ screen, className = "" }: { screen: ScreenId; className?: string }) {
  const asset = artwork[screen] || "boost";
  return (
    <img
      className={`tool-art ${className}`.trim()}
      src={`/assets/tool-icons/${asset}.webp`}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  );
}
