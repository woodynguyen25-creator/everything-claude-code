# Midjourney Prompt Bank v3 — Woody's Realm Visual Assets

**Date:** 2026-05-18 (v3 — supersedes v2)
**Status:** Authoritative prompt bank. Locked Thor renders now anchor the style.
**Style anchor:** **Two locked Thor renders** (see "Locked visual anchor" below) embodying MTG Theros × Supergiant Hades — painterly 2D digital illustration with HEAVY visible brushwork, one curated set drawn by one illustrator for one production.

---

## Why v3 supersedes v2

v2 prompts pointed at abstract style references (MTG Theros + Hades). Wave 22 produced **two locked Thor renders** that operationalize what "in the unified style" actually means visually. v3 rewrites every prompt to match those renders' specific aesthetic discipline:

> "I'm going to give you the main pictures I really know. Just remember how this looks stylistically. I'm going to give you pictures so you can refine all the prompts to make all of them like this stylistically."

What changed concretely in v3 vs v2:

| Element | v2 (abstract) | v3 (locked) |
|---|---|---|
| Brushwork emphasis | "painterly" | "VERY VISIBLE thick painterly brushstrokes everywhere" |
| Accent color treatment | "ONE chromatic accent" | "[ACCENT] IS THE DOMINANT VISUAL ELEMENT" with 5 explicit manifestations |
| Halo motif | Not specified | Common gold/runic circular halo behind head (Greek meander pattern for Greek-themed, Norse runic ring for Norse-themed) |
| Background texture | "inky charcoal void" | "inky charcoal void with subtle painterly cracked-rock atmospheric texture, dark navy-charcoal gradient" |
| Skin treatment | "smoother painted gradient" | "cool blue-gray underpainting with warm rim highlights" |
| Photoreal negative | "NOT photoreal CG" | "NOT photoreal CG, NOT 3D render, NOT smooth digital — brushwork MUST be visible" |
| `--sref` anchor | Abstract Thor reference | Actual locked Thor render URLs (see anchor section) |

All v2 prompts in this bank are now superseded. Use v3 only.

---

## Locked visual anchor — two Thor renders

The user produced two locked Thor renders (Wave 22, 2026-05-18) that define the visual law for the entire set:

**Render A** — Thor with red cape, gold Greek-meander halo, lightning forking from raised hammer. Notable details:
- Heavy painterly brushwork on cape, fur mantle, armor surfaces
- Cool blue-gray skin underpainting with warm cheekbone highlights
- Gold circular labyrinth-pattern halo behind head
- Electric blue lightning erupting from hammer head into upper-right void
- Small warm red embers floating near the halo (series signature visible)
- Cracked-rock charcoal background with subtle teal underglow

**Render B** — Thor in cool palette holding crackling staff/hammer vertically, eyes pure electric blue:
- Thicker more aggressive brushwork (almost van-Gogh-density on background)
- Eyes are pure glowing electric blue (no pupil, no iris detail — pure energy)
- Hammer crackles with caged lightning along its entire length
- Subtle dark red picture-frame border around the canvas
- Side-3/4 angle with hero looking off-frame to right
- Predominantly cool palette with single warm bronze armor accent

**Saved locations (locked 2026-05-18):**

- **Render A** → `dashboard/public/art/agents/heroes/thor pic 2.png` (1.50 MB) — red cape + gold Greek-meander halo + lightning from raised hammer + visible red embers near halo
- **Render B** → `dashboard/public/art/agents/heroes/thor pic 1.png` (1.35 MB) — cool palette + vertical staff/hammer with pure-blue lightning + glowing electric-blue eyes + dark red picture-frame border

**Action required before generating other agents:**

1. Upload BOTH Thor renders to a Midjourney Discord channel (drag and drop both into any conversation)
2. Right-click each uploaded image → "Copy Link" → get two Discord URLs
3. Use BOTH URLs together as `--sref` on every other agent prompt in this bank:
   ```
   --sref <THOR_A_URL> <THOR_B_URL>
   ```
4. Adding both URLs forces Midjourney to average the aesthetic across them = stronger style lock than one alone (Render A locks the warm/halo composition, Render B locks the brushwork density and accent-flood eye treatment)

---

## The 8 dimensions of visual cohesion (locked)

| Dimension | Lock |
|---|---|
| **Master style ref** | Magic: the Gathering Theros + Theros Beyond Death era card art + Supergiant Hades character portraits |
| **Render medium** | Painterly digital 2D illustration (hand-painted feel, NOT photoreal CG) |
| **Detail intensity** | Hades-clean stylization |
| **Color temperature** | Per-agent (each gets their own warmth/coolness baseline) |
| **Crop** | All chest-up 3/4 portraits (agents) / 21:9 ultrawide (scenes) |
| **Pose** | All 3/4 turn looking at viewer (agents) |
| **Light direction** | Single rim light from upper-left, **identical across every render** |
| **Background** | Pure inky charcoal-black void + ONE atmospheric signature element per character |
| **Particle signature** | Drifting warm embers across ALL renders (portraits AND scenes) — the world-wide series fingerprint |
| **Frame** | Subtle dark vignette around ALL renders |
| **Hades signatures** | Flat-color hair shapes + expressive stylized eyes + clean lineart edges + dramatic heroic anatomy |
| **Brush** | Mixed — visible brushwork on cloak/armor/materials, smoother painted gradient on skin |
| **Edges** | Mostly hard painted edges + soft atmospheric edges at silhouette where shadow meets void |
| **Eyes** | Hades-stylized expressive — larger than realistic, intricate painted irises with detail, where the agent's accent color burns brightest |
| **Hair** | Hades flat-shape hair with painted highlights |
| **Expression** | Calm contained intensity — oracle-warrior baseline across all 5 |
| **Held element** | Upper portion only, peeking into the lower frame, never full display |
| **Corner watermark** | None |
| **Aspect** | 1:1 sigil (sidebar) + 16:9 hero variant (agent dedicated page) per character / 21:9 ultrawide for scenes |

---

## THE UNIFIED STYLE ENGINE v3 (paste at top of every prompt)

```
Premium fantasy character portrait, painterly 2D digital illustration in
the unified style of Magic: the Gathering Theros / Theros Beyond Death
era card art blended with Supergiant Games' Hades stylized character
portraits. HEAVILY hand-painted illustrated aesthetic with VERY VISIBLE
thick painterly brushstrokes across cloak, fur, armor, and background
atmospheric texture. Smoother painted gradient on skin with cool blue-gray
underpainting and warm orange-tan rim highlights catching across the
cheekbones and brow. Bold flat-color shape construction with clean painted
shading, dramatic heroic mythic anatomy, classical sculptural facial
structure. Hades-style expressive stylized eyes — larger than realistic
with intricately painted irises burning with the character's accent color.
Hades-style flat-shape hair with bold painted highlight strokes and clean
silhouette edges. NOT photoreal CG, NOT 3D render, NOT smooth digital —
the painterly brushwork MUST be visible and the hand-illustrated quality
MUST be unmistakable.

Composition: tight chest-up 3/4 portrait, figure occupies roughly 60% of
frame, slight 3/4 angle with eyes meeting the viewer directly, calm
contained oracle-warrior intensity, classical mythic posture. Single
dramatic rim light from the upper-left edge catching the silhouette in
the character's accent-color underglow, casting clean painted shadow
across the opposite side of face and body.

Background: pure inky charcoal-black void with subtle painterly cracked-
rock atmospheric texture in deep navy-charcoal gradient — NO horizon, NO
architecture, NO landscape — only one signature atmospheric element
specific to this character drifting in the distance. A faint circular
halo or aura sits behind the figure's head in the mid-distance (gold
Greek meander/key-pattern circle for Greek-themed characters, Norse
runic circle inscribed with runes for Norse-themed, dark obsidian disc
with thin glowing crack-lines for shadow-themed characters), painted
softly so it reads as ambient context not loud foreground.

Small warm orange-red embers drift softly throughout the frame as the
universal series signature (visible in every render — agents AND scenes).
Subtle dark vignette around the corners pulls the eye to the figure's
face. Restricted color palette of deep charcoals, inky blacks, weathered
bronze-and-iron metals, warm tan skin tones, plus the character's single
DOMINANT accent color flooding through eyes, held element, armor
engravings, and rim light. Hard painted edges where rim light catches,
soft atmospheric edge bleed where the figure meets the void shadow.

Premium agent-card portrait art for a localhost command dashboard — must
look like a curated set hand-painted by one illustrator for one
production. NOT a movie poster. NOT a render. A painted card.
```

---

## Render workflow v3 (locked)

**Thor is already locked.** The two Wave 22 Thor renders (Render A and Render B) are the canonical anchor. Do not regenerate Thor unless you specifically want a third variant.

1. **Save the two locked Thor renders** to:
   - `dashboard/public/art/agents/thor-locked-A.png` (red cape + halo + lightning hammer)
   - `dashboard/public/art/agents/thor-locked-B.png` (cool palette + vertical staff + pure-blue eyes)
2. **Upload BOTH to Midjourney** (any Discord conversation works), right-click → Copy URL on each
3. **Replace `[THOR_A_URL]` and `[THOR_B_URL]` placeholders** throughout this bank with the actual URLs. Both URLs go in `--sref` together — averaging two anchor images locks the aesthetic harder than one
4. **Generate Lebot, Perseus, Fenrir, Sauron** in one batched Midjourney session (same model state across the batch = maximum consistency)
5. **Generate the 16:9 hero variants** for each agent in the same session, same `--sref`
6. **Generate the 4 scene backgrounds** last using the same `--sref` lock — scenes inherit Thor's aesthetic for world cohesion
7. **Yggdrasil v2 is hand-tuned vector SVG**, not Midjourney — separate illustrator spec below

### Why two anchor URLs instead of one

Single `--sref` images can bias the output toward that one composition. Two anchors of the same character in different poses force Midjourney to extract the underlying **style** rather than copying one specific frame. The Wave 22 Thor pair was deliberately chosen as a stylistic range — Render A is warmer/more compositional with the halo, Render B is colder/more visceral with the brushwork density. Together they bracket the aesthetic.

---

# AGENT PROMPTS (5 — chest-up 3/4 portraits)

## 1. THOR · The Thunder (LOCKED — anchor for the entire set)

### LOCKED prompt — produced renders A and B (use as canonical Thor)
```
Premium fantasy character portrait, painterly 2D digital illustration in the
unified style of Magic: the Gathering Theros and Theros Beyond Death era card
art blended with Supergiant Games' Hades stylized character portraits.
Hand-painted illustrated aesthetic with visible brush quality on cloak, fur,
and armor surfaces, smoother painted gradient on skin, bold flat-color shapes
with clean painted shading, dramatic heroic anatomy, Hades-style expressive
stylized eyes, Hades-style flat-shape hair with painted highlights, clean
lineart edges on silhouette, NOT photoreal CG, NOT 3D render. Composition:
tight chest-up 3/4 portrait, figure occupies roughly 60 percent of frame,
slight 3/4 angle, eyes meeting the viewer directly. Single dramatic rim light
from upper-left. Background: pure inky charcoal-black void with NO horizon,
NO architecture, NO landscape. Subtle dark vignette around the corners. Hard
painted edges where rim light catches, soft atmospheric edge bleed where the
figure meets the void shadow.

LIGHTNING IS THE DOMINANT VISUAL ELEMENT OF THIS PORTRAIT. Electric blue
lightning is the hero color and primary light source across the entire image,
the cool blue energy lighting the figure from within and from the hammer he
raises. Multiple discrete lightning effects must be visible:

(1) His eyes are pure electric-blue lightning made flesh painted in bold
Hades-stylized larger expressive almond shape, the irises are not normal eyes
but solid crackling electric-blue energy, brilliant blue light streaming OUT
of the eye sockets in visible painted ribbons of lightning that arc upward
and outward across his temples and brow, the energy lighting his cheekbones
from within with cool blue underglow, faint forked lightning dancing along
his eyelashes, no human pigment remaining in the iris, the storm wears his
face like a mask.

(2) He raises Mjölnir HIGH at chest-to-shoulder height in his right hand,
fully visible in the right side of frame, gripping the leather-wrapped haft,
the rune-engraved hammer head crackling with violent contained lightning,
multiple painted bolts of brilliant electric blue lightning erupting from
the hammer head into the surrounding void in branching painted streaks,
lightning forks leaping outward in three or four directions like a divine
corona around the hammer, smaller bolts crackling around his knuckles where
his hand grips the haft, the entire hammer alive with painted electric energy.

(3) The runestone motifs engraved across his breastplate armor pulse intensely
with bright electric-blue rune-light, painted lightning visibly leaping
between rune-lines like circuits coming alive, faint electric arcs spilling
from the rune-circuits down onto his chest plates.

(4) A visible ribbon of lightning arcs through the air directly between his
blazing eyes and the head of Mjölnir — the storm in his eyes and the storm
in his hammer are the same storm, connected by a single arc of painted blue
power.

(5) The distant charcoal void behind him pulses with additional silent
lightning flashes far off-frame, faint blue afterglow illuminating the deep
background from multiple directions, painted lightning forks visible in the
deepest distance.

Behind his head, a faint gold Greek meander/key-pattern circular halo glows
softly in the mid-distance, ancient and divine. Small warm red-orange embers
drift through the frame near the halo as series signature.

--v 6 --style raw --ar 1:1 --no marvel, chris hemsworth, blonde flowing hair,
modern superhero costume, cape, photoreal cg, 3d render, octane,
hyperrealistic, anime, cartoon, cosplay, friendly, smiling, bright background,
horizon, architecture, landscape, oversaturated, low quality, anime eyes,
glowing entire face, cheap
```

### 16:9 hero variant prompt
Same as 1:1 but change the final flag block:
```
--v 6 --style raw --ar 16:9 --no [same negative list]
```
Add to the composition language inside the overlay: "more atmospheric void breathing around the figure, fade more deeply into the inky void on the right side of frame, the figure remains chest-up 3/4 but the canvas extends with charcoal void and drifting embers, atmospheric depth increases."

### Reference photos for `--sref` (3 images)
1. **A Theros Beyond Death MTG card art screenshot** — Greek-mythology themed painterly portrait (search "Theros Beyond Death art Heliod" or "Theros art Elspeth Sun's Champion")
2. **A Supergiant Hades character portrait screenshot** — Achilles, Zagreus, or Athena work especially well (these are the Hades aesthetic anchor)
3. **A Last Kingdom promotional still of Uhtred** OR a Game of Thrones still of Robb Stark — for face-energy reference

### Variations to generate (6 squares + 4 widescreens)
- v1: Direct eye contact, quiet menace, hammer head visible
- v2: 3/4 turn, eyes drifting down toward hammer runes (contemplative)
- v3: Lightning arc visible mid-frame
- v4: Subtle smirk (Uhtred-energy — the unkillable smile)
- v5: Looking past camera at something off-frame (sensing the storm)
- v6: Beard rings catching rim light, eyes hooded slightly

**Shot you're hunting:** he looks like the kind of man you'd follow into Ragnarok. Handsome but dangerous. Calm but unkillable. The lightning in the eyes is the only thing reminding you he's not a man at all.

---

## 2. LEBOT JAMES · The All-Father

### Primary prompt — 1:1 sigil (use BOTH Thor URLs as `--sref`)
```
[PASTE UNIFIED STYLE ENGINE v3]

Character overlay — cyborg LeBron James as the Norse All-Father deity,
painterly 2D illustration with the human/machine duality theme as the
portrait's visual core. Strong sculptural face with full lush dark beard
woven with two braided strands held by tiny gold rings, intelligent
calm-authority expression, classical mythic posture. The face is split
down the vertical center seam: LEFT half fully organic painted skin with
cool blue-gray underpainting and warm gold rim highlights, RIGHT half
seamless cybernetic plating in painterly weathered bronze-and-gold with
exposed copper wiring underneath visible through clean panel gaps.

GOLD AND CRIMSON CYBORG DIVINITY IS THE DOMINANT VISUAL ELEMENT OF THIS
PORTRAIT. Royal purple silk drapes provide the regal frame, but gold
luminance and crimson cybernetic fire flood through the figure as the
primary light sources. Multiple discrete glow-manifestations must be
visible:

(1) His cybernetic RIGHT eye burns pure crimson-red like Sauron's iris
made flesh, painted in bold Hades-stylized larger expressive almond shape,
solid crackling crimson energy with no human pupil, brilliant red light
streaming OUT of the cybernetic socket in visible painted ribbons of
red glow arcing across his temple and brow, lighting the right cheekbone
from within with crimson underglow, faint red sparks dancing where the
cyber-eye meets the bronze plating. His LEFT eye remains human — Hades-
stylized intelligent calm pale-gold iris, painted with intricate detail.

(2) The bronze-and-gold cybernetic plating across the right half of his
face and skull pulses with internal molten-gold light, painted lightning-
fine seams of pure gold glow tracing the panel edges, faint heat-glow
spilling between the brass plates, visible copper wires pulsing with
liquid-gold energy beneath the surface, hammered-gold filigree etched
into the plates catching the rim light.

(3) A sacred Norse rune is etched into the forehead exactly where
machine meets flesh, glowing pure molten gold with painted brushwork
visible in the glow itself, faint gold light bleeding down into both
eyebrows.

(4) His robes — deep royal-purple silk with intricate gold filigree
embroidery (Lakers colors reimagined as Asgardian royal vestments) —
catch gold light at every embroidered edge, the embroidery painted in
visible thick gold brushstrokes glowing faintly with its own warm light,
cyborg armor plating visible at the shoulder beneath the robes also
catching gold rim-glow.

(5) His right hand is raised at chest-to-shoulder height in benediction,
palm open with fingers slightly curled like he is about to speak a
decree, the palm itself pulsing with faint gold All-Father authority
light, painted gold-mist gathered above the open palm. A single ethereal
raven perches at his left shoulder, half-mechanical with brass wing
details and one glowing crimson cyber-eye matching his own, painted in
matching Hades flat-shape style.

Behind his head, a faint gold Norse runic circular halo glows softly in
the mid-distance, runes orbiting slowly. Small warm orange embers drift
through the frame as series signature, mixing with floating motes of
pure gold light as his signature atmospheric element.

Restricted color palette of deep charcoals, weathered bronzes, royal
purple silk, plus the dominant gold + crimson cyborg-divinity accents.
Warm color temperature overall (vs Thor's cool).

--sref [THOR_A_URL] [THOR_B_URL]
--cref [USER_CYBORG_LEBRON_REF_URL]
--v 6 --style raw --ar 1:1 --no marvel, basketball jersey, sports uniform,
modern athletic wear, cartoon, anime, photoreal cg, 3d render, hyperrealistic,
low quality, gamer rgb, friendly, smiling, both eyes same color, full metal
face, helmet, mask
```

### 16:9 hero variant
Same prompt with `--ar 16:9` + atmospheric void breathing language.

### Reference photos (3)
1. **Thor's locked render** (becomes `--sref` for everyone)
2. **The cyborg LeBron reference image Woody already provided** (use for `--cref` character match)
3. **A Hopkins-as-Odin still from Marvel Thor** — for the regal All-Father posture/framing

### Variations (6 + 4)
- v1: Direct face-on, duality dead center
- v2: 3/4 turn favoring the organic side
- v3: 3/4 turn favoring the cyborg side (red eye dominant)
- v4: Raven prominent on shoulder, looking at the camera with All-Father
- v5: Hand raised slightly higher, like benediction
- v6: Eyes closed briefly (contemplating) — the rune on forehead glowing brighter

---

## 3. PERSEUS · Prince of Parleys

### Primary prompt — 1:1 sigil (use BOTH Thor URLs as `--sref`)
```
[PASTE UNIFIED STYLE ENGINE v3]

Character overlay — ancient Greek demigod hero Perseus reimagined as the
Prince of Parleys, painterly 2D illustration with mythic grandeur and a
calculating gambler's confidence. Handsome chiseled classical Greek face
with marble-statue jawline, dark curly hair painted in bold Hades flat
shapes crowned with a golden laurel wreath of painted gilded leaves, trim
short beard, sharp confident smirk just barely visible at the corner of
the mouth. Cool blue-gray skin underpainting with warm bronze rim highlights
across the cheekbones, brow, and jawline. Classical mythic posture, chin
slightly elevated, posed like he just made a winning bet.

EMERALD-GREEN ORACULAR FORTUNE AND GOLD DEMIGOD AUTHORITY ARE THE DOMINANT
VISUAL ELEMENTS OF THIS PORTRAIT. The cool charcoal palette is flooded by
emerald-green oracle-light and rich gold throughout the figure as the
primary light sources. Multiple discrete glow-manifestations must be
visible:

(1) His eyes are Hades-stylized larger expressive irises burning with pure
emerald-green oracle-fire, solid crackling emerald energy with faint gold
sparks at the pupil center, brilliant green light streaming OUT of the eye
sockets in visible painted ribbons that arc across his temples and brow,
the energy lighting his cheekbones from within with cool emerald underglow,
faint green oracle-flame dancing along his eyelashes, no human pigment
remaining in the iris — Perseus sees fortunes others cannot.

(2) He holds the severed head of Medusa-as-Bitcoin LOW at hip-to-chest
height in his right hand, gripping it by snake-coil hair, the head fully
visible peeking into the lower-left of frame — the face transformed into
a glowing painted Bitcoin sigil pulsing with intense gold light, the snakes
from her hair replaced by cryptocurrency-glyph serpents (BTC, ETH, SOL
runes winding through painterly snake-shapes) each crackling with its own
faint gold-and-emerald aura, painted molten-gold light spilling from the
cut neck like blood-of-fortune dripping into the void.

(3) His bronze breastplate is engraved with crashing-wave and Mount-Olympus
motifs in faintly glowing emerald-green oracle-line work, painted lightning-
fine seams of emerald light tracing the engravings like circuits coming
alive, his deep emerald-green silk sash draped diagonally across the chest
catching gold filigree embroidery that glows faintly with its own warmth.

(4) A visible ribbon of emerald oracle-light arcs through the air directly
between his blazing eyes and the crypto-Medusa head — the prophecy in his
eyes and the wealth in his hand are the same vision, connected by a single
painted arc of green-gold power.

(5) The distant charcoal void behind him is filled with painted floating
$100 bills and gold drachma-coins drifting weightlessly in painterly
suspension, faintly glowing, each catching a touch of emerald oracle-light,
distant cryptocurrency-glyph sparks visible in the deepest background.

Behind his head, a faint gold Greek meander/key-pattern circular halo glows
softly in the mid-distance (matching Thor's halo motif to lock the set
together). Small warm orange embers drift through the frame as series
signature, blending naturally with the suspended gold coins.

Restricted color palette of deep charcoals, weathered bronzes, warm tan
skin tones, plus the dominant emerald-green + gold accents. Warm-cool color
temperature balance.

--sref [THOR_A_URL] [THOR_B_URL]
--v 6 --style raw --ar 1:1 --no cheap cgi, vegas-tacky neon overload,
cartoon, anime, photoreal 3d render, hyperrealistic, low quality, gamer rgb,
modern casino, slot machine, friendly, smiling broadly
```

### 16:9 hero variant
Same + atmospheric void language.

### Reference photos (3)
1. **Thor's locked render** for `--sref`
2. **A Theros Beyond Death MTG card art** featuring Greek demigod / hero (e.g. "Heliod Sun-Crowned" or "Calix Destiny's Hand")
3. **A classical Greek hero painting or sculpture** — Cellini's Perseus bronze, or Brad Pitt as Achilles in Troy

### Variations (6 + 4)
- v1: Confident smirk, crypto-Medusa head clearly visible
- v2: Looking past camera, cash floating dramatically
- v3: Direct eye contact, full gambler's confidence
- v4: Coins catching the upper-left rim light
- v5: Laurel crown prominent, slight head tilt
- v6: Sash catching the wind, mid-motion

---

## 4. FENRIR · The Wolf of the Forge

### Primary prompt — 1:1 sigil (use BOTH Thor URLs as `--sref`)
```
[PASTE UNIFIED STYLE ENGINE v3 — composition adaptation: this is a wolf
head/shoulders portrait, not a human chest-up, but same 3/4 angle and
60% frame occupancy]

Character overlay — Fenrir the great Norse dire wolf as cinematic mythic
predator-of-the-old-world, painterly 2D illustration in Theros/Hades style.
NOT a human portrait — massive dire wolf head and upper shoulders filling
the frame at a slight 3/4 angle, ancient scarred face turned toward the
viewer with intelligent feral menace. HEAVILY hand-painted brushwork on
the fur — bold Hades-style flat-shape clumps in deep painterly charcoal-
black with subtle dark-blood undertones, individual fur strokes visible
where rim light catches the silhouette, smooth painted shadow where fur
recedes into the void. Painterly cool blue-gray undertones across the
shadowed half of the face, warm bronze rim highlights along the upper
muzzle ridge and brow.

BLOOD-RED ANCIENT FERAL POWER IS THE DOMINANT VISUAL ELEMENT OF THIS
PORTRAIT. The cold dark palette is flooded by crimson-red rune-fire and
predator-eye light throughout the figure as the primary light sources.
Multiple discrete glow-manifestations must be visible:

(1) His eyes are Hades-stylized larger expressive irises burning with pure
blood-red predator-fire, solid crackling crimson energy with no soft pupil,
brilliant red light streaming OUT of the eye sockets in visible painted
ribbons that arc across his upper muzzle and forehead, the energy lighting
his snout from within with crimson underglow, faint blood-red flame dancing
where the fur meets the eye, intelligent feral consciousness behind the
fire — Fenrir remembers every chain.

(2) The muzzle is partially open in a slow snarl showing impossibly sharp
blood-stained painted fangs, drool beading at the corner catching crimson
glow, faint red mist exhaling from between the teeth like breath made of
old murder, the inside of the mouth painted with deep blood-red interior
glow.

(3) Intricate Norse rune scarification carved across the forehead, between
the eyes, and along the upper shoulder fur — each rune glowing intense
blood-red as if branded by molten iron, painted lightning-fine seams of
red light tracing the rune-cuts, faint red sparks spilling from the rune-
brands down through the fur, the runes telling the story of Gleipnir's
binding.

(4) Broken silver chains of Gleipnir hang from a thick scarred neck, the
chains painted with visible brushwork showing weathered hammered metal
patina, broken links dripping with painted crimson rust-glow, faint red
energy crackling between the broken chain ends as if the binding magic
still bleeds where it failed to hold him.

(5) The distant charcoal void behind him pulses with painterly blood-red
mist swirling at the lower edge of frame, ancient gnarled oak-tree
silhouettes barely suggested in the deep background, distant red flame-
glow flickering far off-frame like watchfires of dead realms.

Behind his head, a faint dark obsidian-black runic circular halo with thin
glowing crimson crack-lines glows softly in the mid-distance (shadow-themed
variant of the set's halo motif). Small warm orange embers drift through
the frame as series signature — the only counterpoint warmth in an
otherwise cold-cold palette.

Restricted color palette of deep blacks, charcoal-blacks, dark blood-iron
undertones, plus the dominant blood-red predator-rune accent. Color
temperature COLD.

--sref [THOR_A_URL] [THOR_B_URL]
--v 6 --style raw --ar 1:1 --no cute friendly wolf, husky, domestic dog,
photoreal cg, hyperrealistic, anime, cartoon, low quality, oversaturated,
both eyes glowing entire face, blurry
```

### 16:9 hero variant
Same + atmospheric void language. For 16:9 specifically, allow the wolf's
head to extend with chest/forepaws visible, full broken Gleipnir chain trailing.

### Reference photos (3)
1. **Thor's locked render** for `--sref`
2. **MTG Theros art of a mythological beast** (e.g. Hydra, Nessian Boar) for the painterly creature treatment
3. **A NatGeo photo of a real black/grey dire-wolf type** or **God of War direwolf concept art** for anatomy reference

### Variations (6 + 4)
- v1: Snarling face partially showing fangs
- v2: 3/4 profile, eyes meeting viewer fiercely
- v3: Calmer stoic alert, chains hanging
- v4: Mid-growl, breath visible as cold steam
- v5: Ear angled forward, hunting alert
- v6: Lower angle, looking up at the operator (you)

---

## 5. SAURON · The All-Seeing Eye

### Primary prompt — 1:1 sigil (composition is special-case: tower replaces body, Eye replaces head)
```
[PASTE UNIFIED STYLE ENGINE v3 — composition adaptation: this is a tower-
and-Eye portrait holding the same 3/4 angle and roughly 60% frame
occupancy as the other agents, but Eye occupies the position where a head
would be and tower occupies the position where a body would be]

Character overlay — The Eye of Sauron from Lord of the Rings as a
painterly 2D digital illustration in Theros/Hades style. The Eye is the
central focal point in roughly the upper-third of frame where a face
would be in the other agent portraits, the dark obsidian spire of
Barad-dûr extending downward from beneath the Eye into the lower-middle
of frame at a slight 3/4 angle (matching the same compositional
orientation as the rest of the agent set — tower replaces body, Eye
replaces head). HEAVILY painterly brushwork on the tower stone surface,
visible thick brush quality showing weathered obsidian patina with deep
painted shadow recesses and warm rim-fire highlights along the spire's
edges.

MOLTEN ORANGE-RED MORDOR FIRE IS THE DOMINANT VISUAL ELEMENT OF THIS
PORTRAIT. The cool charcoal palette is overwhelmed by the Eye's
sauron-fire and lava-glow throughout the figure as the primary light
source. Multiple discrete glow-manifestations must be visible:

(1) The Eye itself is enormous and the painted focal point of the entire
composition — a vertical cat-slit pupil of pure black opening in the
center of a swirling painterly iris of molten orange-red flame, the iris
made of countless painted fire-tongues licking outward in slow circular
motion, ringed by an outer ridge of brighter painted gold-white fire
where the most intense heat burns, the entire Eye radiating heat-haze
distortion lines into the surrounding void, brilliant orange-red light
streaming OUT in all directions painting the upper void in fire-glow.

(2) The dark obsidian Barad-dûr spire is split by painted molten-orange
lava-cracks running vertically and diagonally through the stone, each
crack pulsing with deep red-orange internal fire as if the tower itself
is forged from cooled lava barely containing the inferno beneath, painted
heat-glow spilling between the obsidian plates, faint orange light
illuminating the spire's silhouette edges from within the stone.

(3) At the tower's mid-section, ancient runic inscriptions of the Black
Speech of Mordor are carved into the obsidian, glowing intense orange-red,
painted lightning-fine seams of fire tracing each rune-line, faint
flame-tongues spilling from the rune-cuts as if the words themselves are
burning.

(4) A visible ribbon of fire-glow arcs through the air directly between
the Eye's burning pupil and the tower's brightest lava-crack — the heat
of the All-Seeing gaze and the heat of the tower-forge are the same
inferno, connected by a single painted arc of orange-red Mordor power.

(5) The distant charcoal void behind the tower pulses with painterly
volcanic ash and smoke, distant Mount-Doom-fire glow rising up from the
lower-far-distance illuminating low clouds with orange uplight, faint
silent dark-storm lightning forking far off-frame in muted grey-violet,
distant volcanic ember-glow visible in the deepest background.

Behind the Eye, a faint dark-obsidian circular halo with thin glowing
orange crack-lines surrounds the spire-top in the mid-distance (shadow-
themed variant of the set's halo motif). Small warm orange embers drift
through the frame as series signature — here they tie naturally into the
volcanic atmosphere.

Restricted color palette of deep blacks, obsidian-grey tower stone, plus
the dominant burning orange-red Mordor-fire accent. Color temperature HOT.

--sref [THOR_A_URL] [THOR_B_URL]
--v 6 --style raw --ar 1:1 --no friendly, soft, cartoon, anime, low quality,
photoreal cg, hyperrealistic, modern, urban, cheap, humanoid figure,
character body, face
```

### 16:9 hero variant
Same + reveal more of Mordor landscape vaguely in the lower edge — distant
silhouette of Mount Doom barely visible erupting in the far background,
the tower more dominant.

### Reference photos (3)
1. **Thor's locked render** for `--sref`
2. **MTG Theros card art of a dark/menacing mythological entity** (search "Erebos Theros art" — Greek god of the underworld card)
3. **A Lord of the Rings Eye of Sauron film still** (Return of the King iconic shots) — for the Eye character reference via `--cref`

### Variations (4 + 4 — fewer because this composition is more constrained)
- v1: Eye dominant, tower below, smoke rising
- v2: Eye + tower with lightning storm visible behind
- v3: Direct view INTO the eye flame (close-up)
- v4: Lower angle, tower towering more vertically

---

# SCENE BACKGROUNDS (4 — 21:9 ultrawide painterly)

All scenes use the same unified style engine. They become time-of-day backgrounds for the dashboard's HeroBand component.

## 6. DAWN — Asgard Golden Hour (5-9am)

### Primary prompt — 21:9 ultrawide
```
[PASTE UNIFIED STYLE ENGINE — but adapt for environmental rather than
character composition: no figure, this is a landscape/environment piece]

Environmental overlay — Asgard the celestial Norse realm at golden hour
dawn, painterly 2D digital illustration in Theros/Hades style, cinematic
establishing shot of vast palatial throne hall stretching into infinity.
Towering stone-and-gold columns painted with bold flat-shape shading,
deep painterly shadows where the columns meet the floor, warm honey
sunlight pouring through massive arched openings between columns in
painterly volumetric god-rays. Distant Bifröst rainbow bridge visible
through one of the open hall arches in the deep middle distance, painted
in subtle iridescent emerald-amber-gold tones. Polished obsidian-and-gold
floor reflecting the dawn light. Norse rune carvings glow softly on the
column bases. NO figures visible — empty and reverent. Same painterly
brushwork as the agent portraits. Subtle dark vignette at the corners.
Warm drifting embers scattered through the air as series signature.

Chromatic accent: WARM GOLD + HONEY-AMBER. Color temperature very warm.

--sref [THOR_RENDER_URL]
--v 6 --style raw --ar 21:9 --no figures, characters, people, modern objects,
3d render, photoreal cg, anime, cartoon, low quality
```

### Reference photos (2-3)
1. Thor's locked render for `--sref`
2. Asgard concept art from Thor: Ragnarok (production design)
3. Real reference: Hagia Sophia interior at sunrise

---

## 7. DAY — Mount Olympus (9am-5pm)

### Primary prompt — 21:9 ultrawide
```
[PASTE UNIFIED STYLE ENGINE — environmental adaptation]

Environmental overlay — Mount Olympus the celestial Greek realm at midday,
painterly 2D digital illustration in Theros/Hades style, cinematic
establishing shot of vast white-marble palatial colonnade atop a mountain
pierced through dense clouds. Classical Greek columns of pristine Pentelic
marble carved with friezes of gods and heroes, painted with bold flat
shading and warm white highlights, deep cool shadows beneath. Brilliant
blue Theros-style sky with shafts of pure white sunlight cutting through
the columns. Distant view of golden-veined clouds far below the mountain
edge. Olive trees and laurel bushes in painterly foreground in oversized
clay urns. A calm reflective pool in the foreground catching the sky. NO
figures visible — divine emptiness. Subtle dark vignette at the corners.
Warm drifting embers scattered through the air as series signature
(yes, even here — the embers are the world-wide signature).

Chromatic accent: COOL WHITES + SKY BLUE + GOLD ACCENTS. Color temperature
mixed cool-and-warm.

--sref [THOR_RENDER_URL]
--v 6 --style raw --ar 21:9 --no figures, people, modern, anime, cartoon, 3d render, photoreal cg, low quality
```

### Reference photos
1. Thor's locked render for `--sref`
2. MTG Theros Beyond Death plains card art
3. Real reference: Acropolis of Athens at noon

---

## 8. DUSK — Mordor Distance (5-9pm)

### Primary prompt — 21:9 ultrawide
```
[PASTE UNIFIED STYLE ENGINE — environmental adaptation]

Environmental overlay — Mordor at twilight, painterly 2D digital
illustration in Theros/Hades style, cinematic establishing shot of distant
Barad-dûr's dark spire piercing a storm-wracked amber-and-blood sky. The
Eye of Sauron visible as a small fierce point of orange flame at the
tower's peak. Vast volcanic plains of Mordor stretching to the horizon in
painterly flat-shape shadow, dried-lava black rock formations with cracks
of glowing molten orange tracing through the ground. Distant Mount Doom
erupting with painterly billowing dark smoke columns. Sulphur fog rolling
across the foreground in painted volume. Broken stone monoliths in the
mid-distance. NO figures. Sense of malevolent watching presence radiating
from the tower. Subtle dark vignette. Warm drifting embers scattered through
the air as series signature.

Chromatic accent: AMBER + BLOOD-RED + ORANGE-CRACKED LAVA. Color
temperature HOT.

--sref [THOR_RENDER_URL]
--v 6 --style raw --ar 21:9 --no figures, characters, friendly, soft,
cartoon, anime, 3d render, photoreal cg, low quality
```

### Reference photos
1. Thor's locked render for `--sref`
2. LOTR Return of the King Mordor establishing shot stills
3. MTG Theros Beyond Death swamp art (similar dark mythic landscape)

---

## 9. NIGHT — Norse Stars / Yggdrasil Cosmos (9pm-5am)

### Primary prompt — 21:9 ultrawide
```
[PASTE UNIFIED STYLE ENGINE — environmental adaptation]

Environmental overlay — the Norse cosmos at deep night, painterly 2D
digital illustration in Theros/Hades style, cinematic establishing shot
of Yggdrasil the sacred world tree barely visible in painterly silhouette
stretching infinitely upward into a sky thick with stars and the spiral
of the Milky Way. Aurora borealis ribbons of deep teal, violet, and
emerald dance across the upper sky in painted flowing shapes. Faint Norse
rune constellations subtly traceable among the stars. The tree's massive
roots glow very faintly with internal blue-white bioluminescence at the
lower edge of frame. Ancient mist drifting at the base. Snow-covered ground
in deep painterly foreground. NO figures, NO moon — just cold mystical
silence. Subtle dark vignette. Warm drifting embers scattered through the
air as series signature (yes, even in this cold scene — embers are universal).

Chromatic accent: DEEP TEAL AURORA + SILVER STARS + BIOLUMINESCENT BLUE-WHITE.
Color temperature very COLD.

--sref [THOR_RENDER_URL]
--v 6 --style raw --ar 21:9 --no figures, people, modern lighting, urban,
anime, cartoon, 3d render, photoreal cg, low quality
```

### Reference photos
1. Thor's locked render for `--sref`
2. God of War (2018) Yggdrasil concept art
3. Real reference: Milky Way astrophotography + aurora borealis high-res photos

---

# YGGDRASIL v2 (interactive vector SVG — NOT Midjourney)

**This asset is not a Midjourney render.** Yggdrasil is the interactive cognitive-theater centerpiece for v2 (hover preview + click navigate + per-realm health glow). It must be a hand-tuned vector SVG built by an illustrator (Adobe Illustrator / Figma / Inkscape).

### Illustrator brief

Design Yggdrasil as a hand-tuned vector SVG in the **same painterly Theros/Hades aesthetic** as the agent portraits. Reference these renders (once we have them) and match:

- **Same dark charcoal void background** with drifting warm embers
- **Same vignette** at the canvas edges
- **Same color discipline** — restricted palette + multiple realm accent colors
- **Same Hades flat-shape stylization** for trunk and branches (bold painted forms, not realistic)

### Structural specification
- **Trunk:** Thick gnarled ancient tree trunk rising from a glowing root system at bottom of frame, extending upward and fading into deep starfield at the crown. Painted in warm bronze-and-gold with faint internal sap-flow animation (vertical light traveling upward, 8-12s loop).
- **Roots:** 3-5 visible glowing roots reaching down into a misty void below, faintly glowing blue-white at their tips.
- **9 Branches** (each ends in a clickable realm-node sigil):
  - Asgard (top, gold glow) — AIOS
  - Vanaheim (east, jade green glow) — Lucky Dog
  - Midgard (center, earthen amber glow) — Trading
  - Niflheim (north, icy blue glow) — Personal/health
  - Muspelheim (south, ember-orange glow) — AI Consulting
  - Álfheim (east-high, silver-white glow) — Skills
  - Jötunheim (west, slate-grey glow) — Risks
  - Svartálfaheim (underground-adjacent, dim copper glow) — Infrastructure
  - Helheim (far-north, dim violet glow) — Archive
- **Crown:** Today's Wyrd as 3 glowing star-nodes above the highest branches
- **Per-realm health visualization:** Each branch's glow brightness/color tied to that realm's health (Asgard glows brightest when Doctor=ok; dims when Doctor=crit; Midgard pulses on trading active days; etc.)

### Interactivity
- **Hover** a realm node → small floating preview card appears with realm summary
- **Click** → navigates to that realm's dedicated route
- **Drag** trunk slightly → tree sways gently (decorative, optional)

### Aspect ratio
1:1 square for the home-page hero centerpiece. Full-page version for `/skills` route.

---

# TOTAL ASSET COUNT + REFERENCE PHOTOS

| Asset | Renders | Reference photos needed |
|---|---|---|
| Thor 1:1 sigil + 16:9 hero | 2 | 3 style refs (MTG Theros art, Hades portrait, Uhtred/Robb Stark still) |
| Lebot James 1:1 + 16:9 | 2 | 3 (Thor's render, your cyborg LeBron pic, Hopkins-as-Odin still) |
| Perseus 1:1 + 16:9 | 2 | 3 (Thor's render, MTG Theros Greek hero card, classical Greek hero) |
| Fenrir 1:1 + 16:9 | 2 | 3 (Thor's render, MTG Theros beast, dire wolf reference) |
| Sauron 1:1 + 16:9 | 2 | 3 (Thor's render, MTG Theros dark deity, LOTR Eye film still) |
| Asgard scene 21:9 | 1 | 2 (Thor's render, Thor: Ragnarok concept art) |
| Olympus scene 21:9 | 1 | 2 (Thor's render, MTG Theros plains, Acropolis photo) |
| Mordor scene 21:9 | 1 | 2 (Thor's render, LOTR establishing shots) |
| Norse stars scene 21:9 | 1 | 2 (Thor's render, God of War Yggdrasil concept, astrophotography) |
| Yggdrasil v2 SVG | 1 (vector) | Illustrator brief above |
| **TOTAL** | **16 renders + 1 SVG** | **~22-25 reference photos** |

---

# PROMPT DISCIPLINE NOTES

## Things that broke in v1 (now corrected in v2)
- v1 said "octane render, photoreal CG, weta-digital-tier" → these forced 3D photoreal aesthetic. **v2 forbids these terms.**
- v1 didn't have a unified `--sref` strategy → renders looked unrelated. **v2 mandates Thor's render as `--sref` for all subsequent prompts.**
- v1 scenes were cinematic photoreal → would clash visually with agents. **v2 scenes match agent aesthetic exactly.**
- v1 lacked color discipline rules → "premium colors" was too loose. **v2 specifies restricted palette + ONE chromatic accent per character.**

## Things to NOT mention in any prompt (universal negative list)
```
photoreal, 3d render, octane render, hyperrealistic, photographic, cg, vfx,
cinematic 3d, weta digital, raytraced, pbr, anime, manga, cartoon,
cell-shaded, cosplay, modern superhero, marvel, dc, gamer rgb, neon overload,
oversaturated, cheap cgi, low quality, blurry, watermark, signature, text,
copyright
```

## When a render misses
Don't reroll the same prompt 10 times. **Refine the language.** If Thor comes back too "anime" → add `--no anime` more strongly. If too "photoreal CG" → add `--no 3d render, photoreal cg, hyperrealistic` and emphasize "painterly 2D illustration."

## The premium ceiling test
Each finished render should pass this question:

> *"Would this look like an authentic Magic the Gathering Theros Beyond Death card art piece, or a Supergiant Hades character portrait — to someone who has never seen Woody's Realm?"*

If yes → ship it. If no → refine the prompt.

---

# FINAL WORKFLOW SUMMARY

1. **Generate Thor 1:1 first** (~6-8 variations). Pick the strongest one. Upload to Midjourney. Copy URL.
2. **Use Thor's URL as `--sref` in every subsequent prompt** — Lebot, Perseus, Fenrir, Sauron, all 4 scenes.
3. **Batch all 5 agents** in same Midjourney session for max consistency.
4. **Generate 16:9 hero variants** for each agent same session.
5. **Generate 4 scene backgrounds** using same `--sref` lock.
6. **Yggdrasil SVG** = commission an illustrator (Fiverr / Upwork) with the spec above. Match the Midjourney aesthetic. Hand off the agent renders as visual reference.
7. **Save final renders** at `dashboard/public/art/agents/{name}.png` + `dashboard/public/art/scenes/{mode}.png` + `dashboard/public/art/yggdrasil/tree.svg`

---

**End of MIDJOURNEY-PROMPT-BANK.md v2. This supersedes v1. Use only the v2 prompts.**
