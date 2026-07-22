"use client";

import { useEffect, useRef, useState } from "react";
import type { CommunityItem, CommunitySection as CommunityData } from "@/lib/types";
import { MAX_LEN, MIN_LEN } from "@/lib/validation";

type PostFn = (
  url: string,
  body: unknown,
) => Promise<{ ok: boolean; error?: string }>;

export function CommunitySection({
  data,
  post,
}: {
  data: CommunityData;
  post: PostFn;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FactsDrawer data={data} post={post} />
      <HintsBlock data={data} post={post} />
    </div>
  );
}

// ---- Fun facts (slide-out side drawer) ----

function FactsDrawer({ data, post }: { data: CommunityData; post: PostFn }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // While open: close on Escape, trap page scroll, and move focus into the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const count = data.facts.length;

  return (
    <>
      {/* Trigger — sits where the facts block used to, opens the side panel. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="card flex w-full items-center justify-between px-5 py-4 text-left transition hover:border-teal"
      >
        <span className="label">Explorers&apos; Fun Facts</span>
        <span className="font-mono text-xs text-inkMuted">
          {count === 0 ? "none yet" : `${count} recorded`} ›
        </span>
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Explorers' Fun Facts"
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(26rem,92vw)] flex-col border-l border-edge bg-paper shadow-2xl outline-none transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h3 className="label">Explorers&apos; Fun Facts</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close fun facts"
            className="font-mono text-lg leading-none text-inkMuted transition hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {count === 0 ? (
            <p className="font-body text-sm italic text-inkMuted">
              No accounts recorded yet — be the first to add one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.facts.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  targetType="fact"
                  canParticipate={data.canParticipateFacts}
                  post={post}
                />
              ))}
            </ul>
          )}

          {data.canParticipateFacts && !data.hasSubmittedFact && (
            <SubmitForm
              url="/api/fact"
              field="text"
              placeholder="Record a fun fact — did you know…?"
              cta="Record fact"
              note="You solved it — record something true about this place."
              post={post}
            />
          )}
          {data.hasSubmittedFact && (
            <p className="mt-3 font-body text-xs italic text-correct">
              Recorded — thank you, your fun fact was added to the log.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// ---- Community hints ----

function HintsBlock({ data, post }: { data: CommunityData; post: PostFn }) {
  return (
    <section className="card p-5">
      <h3 className="label">Explorers&apos; Hints</h3>

      {!data.canParticipateHints ? (
        <p className="mt-3 font-body text-sm italic text-inkMuted">
          Chart the flag to rate these hints and leave one for fellow
          explorers.
        </p>
      ) : (
        <>
          {data.hintPool.length === 0 ? (
            <p className="mt-3 font-body text-sm italic text-inkMuted">
              No hints charted for this flag yet.
            </p>
          ) : (
            <>
              <p className="mb-2 mt-3 font-body text-xs text-inkMuted">
                These notes guide explorers still searching — rate them so the best
                rise to the top.
              </p>
              <ul className="flex flex-col gap-2">
                {data.hintPool.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    targetType="hint"
                    canParticipate={data.canParticipateHints}
                    post={post}
                  />
                ))}
              </ul>
            </>
          )}

          {!data.hasSubmittedHint ? (
            <SubmitForm
              url="/api/hint"
              field="text"
              placeholder="Pen a hint for fellow explorers — clever, not a giveaway."
              cta="Leave hint"
              note="Shown as a marginal note to players still guessing. Can't name the country."
              post={post}
            />
          ) : (
            <p className="mt-3 font-body text-xs italic text-correct">
              Penned — your hint now guides fellow explorers.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// ---- A single votable/flaggable item ----

function ItemCard({
  item,
  targetType,
  canParticipate,
  post,
}: {
  item: CommunityItem;
  targetType: "hint" | "fact";
  canParticipate: boolean;
  post: PostFn;
}) {
  const [busy, setBusy] = useState(false);

  const act = async (url: string, body: unknown) => {
    if (busy) return;
    setBusy(true);
    await post(url, body);
    setBusy(false);
  };

  return (
    <li className="flex items-start gap-3 rounded-md border border-edge bg-paper2 px-3 py-2.5">
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <button
          type="button"
          disabled={!canParticipate || busy}
          aria-label="Upvote"
          onClick={() => act("/api/vote", { targetType, targetId: item.id, value: "up" })}
          className={`text-base leading-none transition disabled:opacity-40 ${
            item.myVote === "up" ? "text-correct" : "text-inkMuted hover:text-correct"
          }`}
        >
          ▲
        </button>
        <span className="min-w-4 text-center font-mono text-sm font-bold text-ink">
          {item.score}
        </span>
        <button
          type="button"
          disabled={!canParticipate || busy}
          aria-label="Downvote"
          onClick={() => act("/api/vote", { targetType, targetId: item.id, value: "down" })}
          className={`text-base leading-none transition disabled:opacity-40 ${
            item.myVote === "down" ? "text-wrong" : "text-inkMuted hover:text-wrong"
          }`}
        >
          ▼
        </button>
      </div>

      <div className="flex-1">
        <p className="font-body text-[0.95rem] text-ink">{item.text}</p>
        <div className="mt-1 flex items-center gap-3 font-mono text-xs text-inkMuted">
          {item.mine && <span className="text-teal">yours</span>}
          <button
            type="button"
            disabled={!canParticipate || busy || item.myFlagged}
            onClick={() => act("/api/flag", { targetType, targetId: item.id })}
            className="transition hover:text-wrong disabled:opacity-50"
          >
            {item.myFlagged ? "⚑ flagged" : "⚐ flag"}
          </button>
        </div>
      </div>
    </li>
  );
}

// ---- Submission form ----

function SubmitForm({
  url,
  field,
  placeholder,
  cta,
  note,
  post,
}: {
  url: string;
  field: string;
  placeholder: string;
  cta: string;
  note: string;
  post: PostFn;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const res = await post(url, { [field]: text });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    else setText("");
  };

  const tooShort = text.trim().length < MIN_LEN;

  return (
    <div className="mt-4 border-t border-edge pt-4">
      <textarea
        value={text}
        maxLength={MAX_LEN}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-md border border-edge bg-paper px-3 py-2 font-body text-sm text-ink shadow-inner outline-none transition placeholder:text-inkMuted focus:border-teal focus:ring-2 focus:ring-teal"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-body text-xs italic text-inkMuted">{note}</span>
        <span className="font-mono text-xs text-inkMuted">
          {text.length}/{MAX_LEN}
        </span>
      </div>
      {error && <p className="mt-1 font-body text-xs text-wrong">{error}</p>}
      <button
        type="button"
        disabled={busy || tooShort}
        onClick={submit}
        className="mt-2 rounded-md bg-teal px-4 py-2 font-display text-sm font-semibold text-paper transition hover:bg-tealStrong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Recording…" : cta}
      </button>
    </div>
  );
}
