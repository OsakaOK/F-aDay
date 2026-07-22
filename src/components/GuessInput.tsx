"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryOption } from "@/lib/types";

type Props = {
  options: CountryOption[];
  guessedCca3: string[];
  disabled?: boolean;
  pending?: boolean;
  onSelect: (cca3: string) => void;
};

const MAX_RESULTS = 8;

/**
 * Searchable country picker. The player must select a real country from the list
 * — there is no free-text / fuzzy submission, so a guess is always a valid country.
 */
export function GuessInput({ options, guessedCca3, disabled, pending, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const guessed = useMemo(() => new Set(guessedCca3), [guessedCca3]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const starts: CountryOption[] = [];
    const contains: CountryOption[] = [];
    for (const o of options) {
      const name = o.name.toLowerCase();
      if (name.startsWith(q)) starts.push(o);
      else if (name.includes(q)) contains.push(o);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [query, options]);

  useEffect(() => setActive(0), [query]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (o: CountryOption) => {
    if (guessed.has(o.cca3)) return;
    onSelect(o.cca3);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[active];
      if (chosen) choose(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder="Name the flag"
        autoComplete="off"
        aria-label="Guess a country"
        aria-expanded={open}
        role="combobox"
        aria-controls="country-listbox"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-edge bg-paper px-4 py-3 font-body text-base text-ink shadow-inner outline-none transition placeholder:text-inkMuted focus:border-teal focus:ring-2 focus:ring-teal disabled:cursor-not-allowed disabled:opacity-60"
      />

      {open && results.length > 0 && (
        <ul
          id="country-listbox"
          role="listbox"
          className="card absolute z-20 mt-2 max-h-72 w-full overflow-auto p-1"
        >
          {results.map((o, i) => {
            const isGuessed = guessed.has(o.cca3);
            return (
              <li key={o.cca3} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  disabled={isGuessed || pending}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left font-body text-sm text-ink transition ${
                    i === active ? "bg-tealTint" : ""
                  } ${isGuessed ? "cursor-not-allowed opacity-40" : "hover:bg-tealTint"}`}
                >
                  <span className="flex-1">{o.name}</span>
                  {isGuessed && (
                    <span className="font-mono text-xs text-inkMuted">logged</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
