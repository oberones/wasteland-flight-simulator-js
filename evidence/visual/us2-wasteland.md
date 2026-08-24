# US2 Wasteland Visual Review

- Date: 2026-08-22
- Status: **PASS WITH CORRECTED FINDINGS**
- Task: T041
- Evaluator: trained Codex browser evaluator using the in-app browser at 1280x720

## Review outcome

- Charcoal and dark-earth ground bands remain visible beneath rust-red slopes and jagged
  ridges. Deterministic black fracture lines read as surface cracks without opening gaps.
- The safe-spawn view contains nearby ruins outside the protected corridor. The
  straight-flight review encountered well over three distinct clusters by Z -2,146 m.
- Ruins use irregular gray/dark tiers, corner loss, missing sections, varied heights, and
  conspicuous orange emissive window bands. Their shadows establish contact even where
  intentionally missing tiers create broken silhouettes.
- Background and linear fog match `#3d2817`. Warm ambient/directional sunset light,
  terrain shading, ruin and glider shadows, and depth fog remain coherent in motion.
- Falling ash is clearly visible, follows the aircraft past 2 km of travel, stays behind
  semantic HUD/control panels, and does not obscure their text.
- No region seam, void, duplicate structure, world edge, shadow jump, or ash discontinuity
  was visible during the live route. Automated ten-minute evidence separately covers the
  full bounded-streaming path.

## Findings corrected during review

The initial visual pass found three issues: orange light flattened terrain variation,
window panels faced away from the chase view, and ash moved vertically but did not follow
the aircraft laterally between point wraps. The runtime now uses darker charcoal/rust
vertex bands and balanced sunset intensities, places emissive panels on chase-visible
faces, and translates the bounded ash field with the local aircraft. Ash size/count were
then reduced after a second pass showed excessive foreground density.

## Captures

- [Spawn-area terrain, ash, ruins, windows, fog, and shadows](./us2-wasteland-spawn.png)
- [Long-flight composition after more than 2 km](./us2-wasteland-long-flight.png)

Both captures came directly from the in-app browser after the corrected visual pass and
were saved without post-processing.
