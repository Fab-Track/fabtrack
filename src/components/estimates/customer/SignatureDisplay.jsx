import React from "react";

export default function SignatureDisplay({ value }) {
  if (value?.startsWith("svg:")) {
    return (
      <svg viewBox="0 0 400 100" className="h-14 w-auto">
        <path d={value.slice(4)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <span className="italic text-xl">{value}</span>;
}