# Frontend Design Skill

## How to Think About Visual Design Systematically

Good UI design is not decoration — it is communication. Every visual decision either aids or hinders the user's ability to understand and act. Before writing a single line of CSS, ask: what is the hierarchy of information on this screen? What does the user need to do first, second, third? Design should answer those questions without the user having to think.

The opposite of intentional design is "default thinking" — reaching for whatever the framework provides out of the box. Default thinking produces UIs that look like every other SaaS product. Intentional design requires making committed choices and sticking to them.

---

## Contrast and Hierarchy

**Contrast is the primary tool for creating hierarchy.** Every element on a screen should have a rank: what is most important, what is secondary, what is tertiary. Contrast creates those ranks.

Contrast operates on multiple axes simultaneously:
- **Size contrast:** larger = more important. Headlines vs. body text.
- **Weight contrast:** bold vs. regular vs. light.
- **Color contrast:** dark on light, or accent color on neutral.
- **Spatial contrast:** isolated elements feel more important than clustered ones.
- **Typographic contrast:** serif vs. sans-serif, all-caps vs. mixed-case.

### Rules
- Establish exactly 3–4 levels of visual hierarchy on any given screen. More than that creates confusion.
- Avoid "weak contrast" — elements that are almost the same as their background but not quite. Either commit to visible contrast or make elements invisible.
- The most important action or information should be obvious without scanning. If a user has to look for it, hierarchy has failed.
- Text must meet WCAG AA minimum (4.5:1 contrast ratio for body, 3:1 for large text).

### Common mistakes
- Making everything semibold because it "looks cleaner." Weight contrast requires light and heavy, not just medium and semibold.
- Using subtle color variations to create hierarchy in data-dense UIs. Color is unreliable for hierarchy — size and weight are more robust.

---

## Typography

Typography is the foundation of a UI's personality. Font choices communicate before the user reads a single word.

### Selecting typefaces
- **Display/headings:** Choose a typeface with personality. Serifs (Fraunces, Playfair, Lora) signal craft, warmth, authority. Geometric sans-serifs (Neue Montreal, Satoshi) signal precision, modernity. The display typeface carries the brand voice.
- **Body:** Choose for readability at small sizes. DM Sans, Inter (only if used intentionally), Plus Jakarta Sans, Geist. Clean, comfortable at 14–16px.
- **Monospace:** For data values, code, coordinates, measurements. JetBrains Mono, Geist Mono, Fira Code. Monospace numbers feel like instrument panels — intentional and precise.

### Typographic scale
Use a consistent modular scale. A common scale (in rem): 0.75, 0.875, 1.0, 1.125, 1.25, 1.5, 1.875, 2.25, 3.0, 3.75.

Never use arbitrary font sizes. Every size should come from the scale.

### Line height and spacing
- Body text: 1.5–1.7 line-height
- Headings: 1.1–1.25 line-height (tighter for large display text)
- Letter-spacing: tighten large display text (`tracking-tight`), add spacing to small all-caps labels (`tracking-widest`)

### Avoid
- System fonts (system-ui, Arial, Helvetica) in a branded product — they signal "we didn't think about this"
- Mixing more than 2 typeface families
- Italic body text at scale (use sparingly for emphasis only)
- More than 75 characters per line for body text (causes fatigue)

---

## Color Theory

### Build a palette, not a collection of colors

A coherent palette has:
1. **Background** — the dominant neutral (white, cream, dark gray, etc.)
2. **Foreground** — primary text color
3. **Surface/card** — slightly differentiated from background for elevation
4. **Primary action** — the single most important interactive color (often black or a strong accent)
5. **Accent** — used sparingly for emphasis, never for large areas
6. **Muted/secondary** — supporting text, borders, icons
7. **Semantic** — green/yellow/red for status only

### Warm vs. cool neutrals
Never mix warm and cool neutrals in the same palette. If your background is a warm cream (#FFFBF5), your borders, cards, and secondary backgrounds must also be warm neutrals. Cold grays against warm cream create an uncanny, unresolved feeling.

### The "one accent" rule
Pick one accent color and use it consistently. An accent color that appears everywhere is no longer an accent — it becomes a neutral. Reserve it for: the most important CTA, success states, active selection.

### Color as meaning
- Status colors (green/yellow/red) are for data meaning — not decoration
- Do not use status colors for visual interest
- If a color means something in one place, it should mean the same thing everywhere

### Avoid
- Multiple vibrant accent colors competing for attention
- Using blue as a default (it reads as "link" or "default component library")
- Gradient backgrounds or text — signals generic AI/SaaS aesthetic
- Colored shadows or glows — decorative, not functional
- Purple, teal, or neon colors in professional tools unless the brand explicitly calls for them

---

## Layout Principles

### Spacing is structure

Whitespace is not empty space — it is the visual structure that groups and separates content. Elements close together are perceived as related; elements with space between them are perceived as separate.

Use a consistent spacing scale (multiples of 4px or 8px). Arbitrary spacing values create visual noise even when users cannot articulate why.

**Proximity rules:**
- Labels should be closer to their values than to other labels
- Grouped related information with tight internal spacing, then put more space between groups
- Section separation: at least 2x the internal element spacing

### Grid and alignment

All elements should align to an implicit grid. Even if there is no visible grid, the reader perceives alignment subconsciously. Misaligned elements read as errors.

- Left-align body text for readability
- Center-align only for short display headings or centered layouts (not body copy)
- Numbers in tables: right-align for scannable comparison
- Consistent left-edge alignment across sections creates a reading rail

### Content width

Long lines are hard to read. Constrain content columns:
- Body text: 60–75ch (characters) maximum
- Full-width only for structural elements (headers, maps, full-bleed images)
- Data tables: as wide as needed, but within a bounded container

### Vertical rhythm

Consistent spacing between sections creates a comfortable reading pace. Use multiples from your spacing scale:
- Small sections: `py-12` or `py-16`
- Major sections: `py-20` or `py-24`
- Page padding: `px-6` or `px-8` at minimum, with `max-w-6xl mx-auto` centering

---

## What Makes UI Feel Intentional vs. Generic

### Signs of intentional design

- **Committed typography:** A distinct display typeface that carries personality. Not system-ui.
- **Restrained palette:** 3–5 colors used consistently. Every color has a reason.
- **Systematic spacing:** You can feel the grid even if you cannot see it.
- **Purposeful icons:** Consistent icon set, consistent sizing, consistent color. Not a mix of filled/outlined/emoji.
- **Transitions limited to color:** `transition-colors duration-150`. No bouncing, no scaling, no complex animations on interactive elements unless animation is the product.
- **Borders instead of shadows for depth:** Subtle `1px` warm borders feel crafted. Heavy box-shadows feel like Bootstrap defaults.
- **Data presented as data:** Monospace fonts for numbers. Unit labels in muted color. Consistent decimal places.

### Signs of generic/default design

- Inter or system-ui as the only typeface
- Blue as the primary action color with no brand rationale
- `rounded-2xl` on everything (over-rounded)
- `hover:scale-105` on cards and buttons
- Glassmorphism (`backdrop-blur`) as the primary depth mechanism
- Colored gradients on CTAs
- Multiple vibrant accent colors
- Emoji used as icons
- `bg-gradient-to-r from-purple-500 to-blue-500` on anything
- Card stacks where every piece of information is inside a box inside a box

### The "does this feel like a tool or a template?" test

Before shipping any UI, ask: does this feel like it was designed for this specific product, or does it feel like a theme someone downloaded? Distinctive typography, a committed palette, and consistent spacing answer that question more than any individual component does.

---

## Component Design Rules

### Buttons

- Primary CTA: one per page/section. High contrast. Full commitment.
- Secondary: visually subordinate to primary. Same shape family, less contrast.
- Destructive: red, reserved exclusively for irreversible actions.
- Never: gradients, shadows, scale transforms. These add visual noise without improving clarity.
- Shape: choose rounded-full (pill) for a modern soft feel, or rounded-md for a more utilitarian feel — and be consistent. Do not mix.

### Forms and inputs

- Label above input, always. Placeholder text is not a label.
- Focus states must be visible (not just a color change — add an outline or ring).
- Error states: red border + error message below the field. Never rely on color alone.
- Consistent input height across all form elements.

### Data display

- Numbers in monospace
- Status indicators: colored dot + text label, not colored badge backgrounds (which compete with content)
- Empty states: helpful text explaining why empty and what to do, not just a blank area
- Loading states: skeleton screens preferred over spinners for content-heavy areas

### Panels and overlays

- Panels in mapping or dashboard interfaces: solid background (not translucent) unless translucency serves a specific purpose
- Use subtle warm borders for elevation context rather than drop shadows
- Panel width should feel considered — not a percentage of screen but a deliberate column width

---

## Accessibility Fundamentals

- All interactive elements must be keyboard-navigable
- Focus indicators must be visible
- Color must not be the only way to convey meaning (pair with icons, text, patterns)
- Touch targets: minimum 44x44px on mobile
- Do not use very small text (below 12px) for anything meaningful
- Test with reduced motion preference: wrap animations in `prefers-reduced-motion` media queries

---

## Quick Reference Checklist

Before shipping any UI component:

- [ ] Typography: using the designated display and body typefaces, not defaults
- [ ] Color: every color comes from the defined palette, no one-off hex values
- [ ] Spacing: using the spacing scale, not arbitrary values
- [ ] Hierarchy: clear visual order — primary, secondary, tertiary
- [ ] Contrast: text meets accessibility minimums
- [ ] Alignment: everything aligns to the implicit grid
- [ ] Icons: consistent set, consistent size, consistent color treatment
- [ ] Interactive states: hover and focus states defined
- [ ] No forbidden patterns: no gradients, no glassmorphism, no scale transforms, no emoji icons
