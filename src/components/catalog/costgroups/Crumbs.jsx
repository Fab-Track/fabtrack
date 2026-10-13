import React from "react";

export default function Crumbs({ parts }) {
  return (
    <div className="text-xs text-muted-foreground">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {p.onClick ? (
            <button type="button" onClick={p.onClick} className="text-primary underline underline-offset-2">{p.label}</button>
          ) : (
            <span className="text-foreground">{p.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}