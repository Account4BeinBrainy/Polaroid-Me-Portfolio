Life & Journey local React island. Official source: https://reactbits.dev/r/DriftWall-JS-CSS.json (retrieved 2026-09-24). Unmodified JSX/CSS retained in upstream/.

Install with pnpm install, then pnpm run build. Generated files: dist/js/life-wall.js and life-wall.css. No other page imports React.

2026-09-24 refinement: projected plane centering, full-height symmetric navigation rails, one background-colored sibling edge overlay, original caption inside the lower paper border. Active cards are corrected into the unfaded safe region using the currently interpolated transform to avoid feedback overshoot.

Black cards: eight imagegen remakes under dist/assets/life-journey/black-cards/remade; original cutouts and Desktop source photographs are retained. Comparison and browser evidence: checks/life-wall-refine.

Four-column revision: removed all edge overlays; fitTileWidth reserves projected parallax/lift bounds with the original 1.18 plane scale. Wheel uses the existing RAF and offsets, bounded 1–5x boost, 1.2s release, fresh pointer hit testing, and immediate menu/visibility reset.
