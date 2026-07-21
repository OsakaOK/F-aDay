"use client";

import { useState } from "react";
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
      <FactsBlock data={data} post={post} />
      <HintsBlock data={data} post={post} />
    </div>
  );
}

// ---- Fun facts ----

function FactsBlock({ data, post }: { data: CommunityData; post: PostFn }) {
  return (
    <section className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Community fun facts
      </h3>

      {data.facts.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No community facts yet — be the first to add one.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
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
          placeholder="Share a fun fact — did you know…?"
          cta="Add fun fact"
          note="Only if you're from this country (honour system)."
          post={post}
        />
      )}
      {data.hasSubmittedFact && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
          Thanks — your fun fact was submitted.
        </p>
      )}
    </section>
  );
}

// ---- Community hints ----

function HintsBlock({ data, post }: { data: CommunityData; post: PostFn }) {
  return (
    <section className="card p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Community hints
      </h3>

      {!data.canParticipateHints ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Solve the flag to rate these hints and leave one for tomorrow&apos;s
          players.
        </p>
      ) : (
        <>
          {data.hintPool.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No community hints from the last cycle yet.
            </p>
          ) : (
            <>
              <p className="mt-3 mb-2 text-xs text-slate-500 dark:text-slate-400">
                These hints were shown this cycle — rate them so the best rise to the
                top.
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
              placeholder="Write a hint for the next cycle — clever, not a giveaway."
              cta="Submit hint"
              note="Shown as Hint 2 to future players. Can't mention the country's name."
              post={post}
            />
          ) : (
            <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
              Thanks — your hint will help next cycle&apos;s players.
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
    <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <button
          type="button"
          disabled={!canParticipate || busy}
          aria-label="Upvote"
          onClick={() => act("/api/vote", { targetType, targetId: item.id, value: "up" })}
          className={`text-lg leading-none transition disabled:opacity-40 ${
            item.myVote === "up" ? "text-emerald-500" : "text-slate-400 hover:text-emerald-500"
          }`}
        >
          ▲
        </button>
        <span className="min-w-4 text-center text-sm font-semibold tabular-nums">
          {item.score}
        </span>
        <button
          type="button"
          disabled={!canParticipate || busy}
          aria-label="Downvote"
          onClick={() => act("/api/vote", { targetType, targetId: item.id, value: "down" })}
          className={`text-lg leading-none transition disabled:opacity-40 ${
            item.myVote === "down" ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
          }`}
        >
          ▼
        </button>
      </div>

      <div className="flex-1">
        <p className="text-sm text-slate-800 dark:text-slate-100">{item.text}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          {item.mine && <span className="text-blue-500">you</span>}
          <button
            type="button"
            disabled={!canParticipate || busy || item.myFlagged}
            onClick={() => act("/api/flag", { targetType, targetId: item.id })}
            className="transition hover:text-rose-500 disabled:opacity-50"
          >
            {item.myFlagged ? "🚩 flagged" : "⚐ flag"}
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
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <textarea
        value={text}
        maxLength={MAX_LEN}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{note}</span>
        <span className="text-xs tabular-nums text-slate-400">
          {text.length}/{MAX_LEN}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      <button
        type="button"
        disabled={busy || tooShort}
        onClick={submit}
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Submitting…" : cta}
      </button>
    </div>
  );
}
