# Strange Grounds Design System

## Identity
Strange Grounds is a backcountry conditions intelligence platform. The design should feel like a professional outdoor tool — warm, confident, restrained. Not a SaaS dashboard. Not a lifestyle brand.

## Primary Reference
Duna.com — warm cream backgrounds, illustrated hero, serif display typography, black CTAs, generous whitespace, organized information hierarchy.

## Colors

```css
:root {
  --background: #FFFBF5;        /* warm cream */
  --foreground: #1a1a1a;         /* near-black text */
  --card: #FFF8F0;               /* slightly warmer cream for cards */
  --card-foreground: #1a1a1a;
  --primary: #1a1a1a;            /* black — for CTAs and primary actions */
  --primary-foreground: #FFFBF5; /* cream text on black buttons */
  --secondary: #F5F0E8;          /* warm light beige */
  --secondary-foreground: #4a4a3a;
  --muted: #F0EBE3;
  --muted-foreground: #6b6b5a;
  --accent: #2d5016;             /* deep forest green — use sparingly */
  --border: #E8E3DB;             /* warm border */
  --ring: #2d5016;
}
```

Black is the primary action color. Forest green is a subtle accent.
NO purple, blue, teal, or orange anywhere in the UI.

## Typography

* **Display/headings:** Fraunces (serif, bold) — loaded from Google Fonts via `--font-fraunces`
* **Body:** DM Sans — clean, modern sans-serif via `--font-dm-sans`
* **Data values:** JetBrains Mono — monospace for elevation, temperature, wind speed, coordinates (or Geist Mono)
* Default fonts (Inter, Roboto, Arial, system-ui) signal default thinking. Never use them.

## Component Rules

### Buttons
* Primary: `bg-black text-white rounded-full px-6 py-2.5 hover:bg-gray-800 transition-colors`
* Secondary: `bg-secondary text-secondary-foreground border border-border rounded-full`
* NO gradients, NO shadows on buttons, NO scale transforms on hover

### Cards
* `bg-card border border-border rounded-lg`
* Subtle warm border, no heavy shadows
* NO glassmorphism, NO backdrop-blur

### Layout
* Section spacing: `py-20` or `py-24` between major sections
* Max content width: `max-w-6xl mx-auto px-6`
* Generous whitespace — let content breathe

### Icons
* Lucide React icons ONLY — no emoji anywhere in the UI
* Icons should be `text-muted-foreground` or `text-accent`
* Import from `lucide-react`: Mountain, MapPin, Snowflake, Wind, Thermometer, etc.

### Map overlay panels (in /app)
* `bg-card/95 border border-border rounded-lg`
* Solid warm background, not glassmorphism
* Panels should feel integrated with the map, not floating SaaS widgets

### Briefing panel
* Should read like a well-typeset document, not a card stack
* Section dividers: thin `border-t border-border`
* Section headings: `text-muted-foreground uppercase tracking-widest text-xs font-semibold`
* Body text: `text-foreground text-sm leading-relaxed`
* Data values: `font-mono`

### Danger level indicators
* Use semantic colors: green (Low), yellow (Moderate), orange (Considerable), red (High), near-black (Extreme)
* Display as: colored dot + text, not colored badges

## NEVER do these things
* No gradient text or gradient backgrounds
* No glassmorphism or backdrop-blur
* No emoji as icons
* No rounded-2xl or larger (max rounded-lg)
* No hover:scale-* effects
* No purple, blue, or teal as accent colors
* No AI-style chat bubble aesthetics
* No colored shadows or glow effects
* No animated gradient borders

## INSTEAD do these things
* Distinctive typography (Fraunces serif for headings carries the brand voice)
* Bold, committed warm palette (cream + black + forest green)
* Clean layouts with generous negative space
* Subtle warm borders instead of shadows for depth
* Monospace numbers for data values (feels intentional, like an instrument panel)
* Lucide line icons in muted tones
* Transitions limited to color changes (150-300ms)
