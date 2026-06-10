import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const BAR_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

const RULES = [
  { label: "At least 8 characters", test: p => p.length >= 8 },
  { label: "One uppercase letter", test: p => /[A-Z]/.test(p) },
  { label: "One number", test: p => /[0-9]/.test(p) },
  { label: "One special character", test: p => /[^A-Za-z0-9]/.test(p) },
];

export default function PasswordStrengthIndicator({ password }) {
  if (!password) return null;
  const score = getStrength(password);
  return (
    <div className="space-y-2 mt-1">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i <= score ? BAR_COLORS[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <p className={`text-xs font-medium ${
        score <= 1 ? "text-red-500" :
        score === 2 ? "text-orange-500" :
        score === 3 ? "text-yellow-600" :
        "text-green-600"
      }`}>
        {LABELS[score]}
      </p>
      {/* Rules */}
      <ul className="space-y-0.5">
        {RULES.map(r => {
          const pass = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 text-xs ${pass ? "text-green-600" : "text-muted-foreground"}`}>
              {pass
                ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                : <Circle className="w-3 h-3 shrink-0" />
              }
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}