U-DO Homepage — Round 2: "Billion-Dollar" Polish Pass
Context

Round 1 (accent color consolidation, neutral background, photo hero, promo card redesign) is live and is a real improvement. This round targets the specific things still making it read as "solid app" rather than "premium consumer brand" — primarily depth, blending, containment, and icon redundancy. No color/branding changes in this round; this is a polish/craft pass.

Priority order (highest visual impact for lowest effort first):

Hero gradient blend
Max-width container
Elevation/shadows
Differentiate promo icons
Photo treatment (contrast/crop)
Nav bar (flagged for future round only — not in scope here)
1. Fix the hero overlay — blend, don't box

Problem: The dark scrim behind the hero text currently reads as a rounded dark rectangle sitting on top of the photo (a "sticker" effect) rather than a gradient growing naturally out of the image.

Fix:

Remove the boxed/rounded dark overlay shape entirely.
Replace with a true gradient scrim directly over the full-bleed photo:
css
  background: linear-gradient(
    90deg,
    rgba(0,0,0,0.85) 0%,
    rgba(0,0,0,0.55) 35%,
    rgba(0,0,0,0.15) 65%,
    rgba(0,0,0,0) 85%
  );
Apply this as an absolutely-positioned overlay div (or CSS gradient layer) spanning the full hero photo, not a bounded box around just the text — the darkness should fade smoothly into the image with no visible hard edge.
Verify text contrast (headline, subtext, badge, button) still passes WCAG AA against the gradient at its lightest point where text sits.
2. Add a max-width content container

Problem: Hero, promo cards, and featured sections currently stretch edge-to-edge on large viewports. Premium sites (Stripe, DoorDash, Airbnb) cap content width so it feels curated, not stretched to fill the window.

Fix:

Wrap the homepage's main content sections (hero, promo row, featured/recently viewed grids) in a container:
css
  max-width: 1440px;
  margin: 0 auto;
  padding-inline: 24px; /* 40px+ on larger breakpoints */
Apply consistently across all homepage sections so edges align vertically down the page (hero left edge = promo card row left edge = "Featured on U-DO" left edge).
Category icons row and filter pills row should also respect this container.
3. Add elevation/shadows for depth

Problem: Hero, promo cards, and cards throughout are flat — no shadow, so nothing feels like it's floating above the page background.

Fix:

Hero: add a soft outer shadow so it reads as elevated above the page:
css
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
Promo cards: add a subtle resting shadow (currently flat with just a thin orange top bar):
css
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
Reassess the orange top-bar treatment on promo cards — it currently reads a bit "coupon-like." Try either removing it (let the icon badge carry the accent) or reducing it to 2px instead of the current thicker bar. Ship whichever looks cleaner in review — this is a judgment call, flag both versions if fast to do.
Featured/restaurant cards: confirm hover state adds a lift (translateY(-2px) + slightly larger shadow) — this was scoped in Round 1's spacing/card section; verify it's actually applied.
4. Differentiate the two promo card icons

Problem: Both "Flat Service Fee of $1" and "$0 Delivery Fee + up to 10% off" cards currently use the identical orange star-in-square icon — reads as an unfinished placeholder rather than an intentional choice.

Fix:

Flat Service Fee card → use a fee/dollar-sign or receipt icon.
$0 Delivery Fee card → use a delivery/truck or bag icon.
Keep the same icon badge style (orange rounded square, white icon) — only the glyph inside changes.
5. Hero photo treatment

Problem: The current sushi photo is dim/muted and has a lot of empty plate space on the right two-thirds of the frame — for a hero this large, it should feel vivid and appetizing, not soft/washed out.

Fix:

Apply a slight contrast + saturation boost to hero images in static/img/food/* (a simple CSS filter is fine if re-exporting assets isn't practical this round: filter: saturate(1.1) contrast(1.05);).
Where possible, crop tighter so food fills more of the frame — especially on the right side, which currently shows mostly empty plate/table.
This applies to whichever image is in rotation (sushi/tacos/burger/pizza2/donuts per the Round 1 rotation logic) — check all candidates at full hero width, not just sushi.
Explicitly out of scope this round
Category icon redesign (bolder filled/duotone set) — already scoped as its own follow-up round per prior decision; not bundled here.
Nav bar polish (search bar shadow, spacing refinement) — flagged for a future round, not blocking for this pass.
Any accent color or typography changes — those shipped in Round 1.
Validation
Hero gradient has no visible hard edge; text remains legible (contrast-check) at all breakpoints.
Page content aligns to a consistent max-width container on desktop; no edge-to-edge stretching on large viewports.
Hero and promo cards show visible elevation (shadow) against the page background.
Promo card icons are visually distinct from each other.
Hero photo (whichever is in rotation) looks vivid/appetizing at full hero size, not dim or empty-feeling.