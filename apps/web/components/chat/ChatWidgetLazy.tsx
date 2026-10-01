"use client";

import dynamic from "next/dynamic";

// Carga diferida del widget de chat para aligerar el bundle inicial. En Next 15
// `ssr: false` solo se permite desde un Client Component, de ahí este wrapper.
export const ChatWidgetLazy = dynamic(
  () => import("@/components/chat/ChatWidget").then((mod) => mod.ChatWidget),
  { ssr: false }
);
