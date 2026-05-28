# Midjourney Renders Manifest

**Status:** Tracking document for Woody's Realm visual assets.
**Updated by Claude when new renders are received and saved.**

---

## Folder structure

```
dashboard/public/art/
├── agents/
│   ├── sigils/          # 1:1 square portraits (sidebar cards)
│   │   ├── thor.png
│   │   ├── lebot-james.png
│   │   ├── perseus.png
│   │   ├── fenrir.png
│   │   └── sauron.png
│   └── heroes/          # 16:9 wider portraits (dedicated agent pages)
│       ├── thor.png
│       ├── lebot-james.png
│       ├── perseus.png
│       ├── fenrir.png
│       └── sauron.png
├── scenes/              # 21:9 ultrawide backgrounds (time-of-day mode shifts)
│   ├── dawn-asgard.png
│   ├── day-olympus.png
│   ├── dusk-mordor.png
│   └── night-norse-stars.png
├── yggdrasil/           # v2 cognitive theater
│   └── tree.svg         # hand-tuned vector, NOT Midjourney
└── refs/                # Optional: original Midjourney upscales + source references
```

---

## Render checklist

### Agent sigils (1:1) — render Thor first, his URL becomes `--sref` for the rest

- [ ] **THOR** — `agents/sigils/thor.png` — **render this FIRST**
- [ ] **LEBOT JAMES** — `agents/sigils/lebot-james.png`
- [ ] **PERSEUS** — `agents/sigils/perseus.png`
- [ ] **FENRIR** — `agents/sigils/fenrir.png`
- [ ] **SAURON** — `agents/sigils/sauron.png`

### Agent hero variants (16:9)

- [ ] **THOR** hero — `agents/heroes/thor.png`
- [ ] **LEBOT JAMES** hero — `agents/heroes/lebot-james.png`
- [ ] **PERSEUS** hero — `agents/heroes/perseus.png`
- [ ] **FENRIR** hero — `agents/heroes/fenrir.png`
- [ ] **SAURON** hero — `agents/heroes/sauron.png`

### Time-of-day scenes (21:9)

- [ ] **DAWN** Asgard golden hour (5-9am) — `scenes/dawn-asgard.png`
- [ ] **DAY** Mount Olympus (9am-5pm) — `scenes/day-olympus.png`
- [ ] **DUSK** Mordor distance (5-9pm) — `scenes/dusk-mordor.png`
- [ ] **NIGHT** Norse stars / Yggdrasil cosmos (9pm-5am) — `scenes/night-norse-stars.png`

### Yggdrasil v2 (vector SVG, illustrator commission)

- [ ] **Yggdrasil tree** — `yggdrasil/tree.svg` — separate illustrator brief, NOT Midjourney

---

## Naming convention (locked)

- **Lowercase with hyphens** (matches your project's file convention from CLAUDE.md)
- **No version suffixes** in the canonical filename — when you replace a render, the new one overwrites the old
- **PNG format** (not JPG — preserves transparency edges + color fidelity)
- **Optional `-vN` suffix** if Woody wants to keep multiple variants for comparison (e.g., `thor-v2.png`, `thor-v3.png`)

---

## Delivery log

| Date | Asset | Source | Filename | Notes |
|---|---|---|---|---|
| — | — | — | — | (entries added as renders are received) |
