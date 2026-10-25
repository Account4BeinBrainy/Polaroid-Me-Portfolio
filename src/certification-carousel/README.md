# Certification filter carousel

Official React Bits CircularCarousel JS-CSS registry source:
https://github.com/DavidHDev/react-bits/blob/main/public/r/CircularCarousel-JS-CSS.json
Downloaded 2026-09-30; pristine source retained under upstream/.

The local component adds only renderItem; all motion/gesture code and CSS are unchanged.
Uses the official `orbit` preset so rigid GLB filters are not sliced/bent as photographic cylinder cards. Other motion settings remain upstream defaults.

Existing React/esbuild installation in ../life-wall is reused. Build: node src/certification-carousel/build.mjs from repository root.
Six static Three.js item canvases render existing assets only on load/face change; no per-model continuous rendering loops. CSS inner wrapper flips independently of the original carousel card transform. Model mesh is not rendered until the flip passes 90 degrees.
