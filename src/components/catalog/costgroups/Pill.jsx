import React from "react";

const TONES = {
  info: "bg-blue-100 text-blue-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  muted: "bg-muted text-muted-foreground",
  flag: "bg-transparent text-red-800 font-bold px-0",
};

export default function Pill({ tone = "muted", children, className = "" }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}