# Panel Contract

Date: 2026-05-18
Status: locked for Slice 2 work

## Purpose

Any panel that earns home-screen real estate must be able to describe:

- how fresh its data is
- the one most important thing to know
- the one best next action
- where the signal came from

If a panel cannot fill this contract honestly, it should not be on the home screen yet.

## Type

```ts
export type PanelSignalHotness = 0 | 1 | 2 | 3;

export type PanelSignalAction = {
  verb: string;
  href: string;
  hotness: PanelSignalHotness;
};

export type PanelSignalSource = {
  kind: 'fs' | 'sqlite' | 'http';
  path: string;
};

export type PanelSignal = {
  freshness: {
    iso: string;
    staleAfterMs: number;
  };
  isFresh: boolean;
  headline: string;
  detail?: string;
  nextAction: PanelSignalAction | null;
  source: PanelSignalSource;
};
```

## Rules

### Headline

- One line
- Max 80 chars
- No markdown
- Should answer: "what is the one thing I need to know?"

### Detail

- Optional
- Max 120 chars
- Supports short qualifiers, counts, filenames, or timing context

### Freshness

- Must use the timestamp of the underlying source artifact
- `staleAfterMs` must reflect the real expected cadence of that source
- `isFresh` should be computed in the adapter, not at render time
- UI should surface stale state visually

### Next action

- Exactly one action
- Must be actionable now
- If there is no meaningful next action, use `null`

### Source

- Must describe the real origin of the signal
- No invented source labels

## Initial domains

- Trading
- Doctor
- Tasks

Trading is the first domain to be migrated to this contract.
