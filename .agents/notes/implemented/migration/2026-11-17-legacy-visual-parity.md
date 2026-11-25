# Agent Note: Legacy visual parity

Status: implemented — the Next.js UI reproduces walnut.tv's legacy styling

## Problem

The B0 screenshot pairs showed the Next.js app with its own look: Poppins,
pill-shaped category links, a 32px logo, a bold title, Prev/Next with a
counter and a footer on desktop, a full-height sheet menu on phones, and
watched rows with a dimmed image and a yellow badge. The owner asked for no
visual differences from legacy, dark only.

## Decision

Legacy CSS on `origin/master` (`css/all.css` plus Bootstrap 3 defaults) is
the source of truth for fonts, sizes, colours and spacing.

- Open Sans in legacy's weights, 13px body, black page.
- `Header.tsx` renders the legacy navbar. Phones in portrait get legacy's
  in-flow dropdown under a button naming the current category; landscape and
  desktop show the plain links. Escape closes the dropdown and refocuses its
  button.
- `VideoDisplay.tsx` reproduces legacy's flex column: a 100vh box (91vh when
  stacked) whose player, title and footer rows start at zero height and share
  the spare height, so the player is 47% of its width plus a third of the
  rest. The player keeps its place in the shared element tree.
- Desktop has no Prev/Next or counter; arrow keys step the list. Its footer
  sits at the bottom of the viewport-tall column, a short scroll down.
  Phones get legacy's pixel arrows and footer, then the video list, which
  legacy lacks, styled as legacy sidebar rows.
- The sidebar scrolls natively with legacy's scrollbar styling.

## Alternatives considered

- **A 16:9 player capped to the viewport height.** Simpler, but the player
  and title sit at different sizes and positions than on legacy.
- **The mobile footer after the list.** The first screen would then differ
  from legacy; in legacy's slot it matches, with the list below it.
- **Keeping Radix ScrollArea and Sheet.** Their scrollbar and overlay menu
  are not legacy's; native scrolling and an in-flow list are, and four
  Radix packages go away.

## Consequences

- Hosted pairs at 1440×900, 390×844 and 390×568 match legacy within 2px.
  The desktop footer padding is 10px, as legacy's `1rem` resolves under
  Bootstrap 3. See the [hosted parity recheck](./2026-11-18-hosted-parity-recheck/README.md).
- At 844×390 legacy's column wraps and its player shrinks to a 17px sliver.
  The new app keeps a full-width player with the title one scroll below.
- Desktop's right column scrolls 50px to the Terms, Privacy and Contact
  links, as legacy's page does.
- The theme is forced dark; a stored `theme=light` is ignored.
- `VideoPlayer`'s fade-in animation and the mobile list remain differences.
- The browser fixtures drive the dropdown by `aria-controls="category-menu"`
  and use arrow keys where they clicked Next on desktop.
