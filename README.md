# Polaroid landing — current context

## Stable rules
Plain HTML/CSS/JS authored in dist/, Three.js 0.180.0, no new dependencies.
Preserve original GLB, source mesh transforms, lighting, environment, camera and warm layout.
GLB SHA256: 412ce68ee1c518b40f3c45f39c291512f9a57eb4e9251145cc2d19b8199f7c11.

## Current implementation
camera-controls.js owns the single on-demand animation loop, Y-only dragging and ±5 degree
hover. Photo printing uses that loop and locks the idle → centering → printing → ready states.
R cancels/resets paper and restores hover/drag. Reduced motion shortens printing to 15% duration.

Glass stays in its original hierarchy, with MeshPhysicalMaterial: white, metalness 0,
roughness .08, transmission 1, opacity 1, IOR 1.5, thickness 0, clearcoat 1,
clearcoat roughness .04, environment intensity 1.3. Normal depth testing/writing stays enabled.
No diagnostic toggle, repeated hiding, opaque tint or forced render order remains.

Actual pointer raycast confirmed shutter source mesh Buttons+, material Camera, face 376.
Its isolated 448-triangle island becomes a child ShutterButton using the same material and
unchanged vertex data. Only it gets 90ms inward feedback; sibling buttons do not move.
The top switch remains hidden via its own geometry group. Original GLB stays untouched.

photo-print.js measures the lower CameraBotton slot lip from actual vertices. Slot net width
1.083595, paper width 1.040251 (96%), width/height .82; square grey image and wider bottom border.
Paper is a thin box in the display group, behind real body depth initially. Exit slope .22,
200ms centering, 90ms press/release, 150ms pause, 800ms eased eject. Exactly 70% exits the
slot plane; 30% stays inside. Lowest final geometry remains .09749 above the studio ground.

Pointer focus rectangle came from camera-3d-layer:focus-visible. The canvas region no longer
gets a rectangle; keyboard users receive a local shutter control. Legacy script.js is no longer
loaded; its old HTML photo stays hidden and receives no events.

## Actual validation
Desktop browser: glass reveals underlying details, no pointer focus rectangle, only front
shutter clicks print. Lens, flash, viewfinder, body and other button clicks do not. Rear body
occludes shutter; rear red switch does not print. Dragging does not print. R resets;
ready locks rotation. Initial paper hidden, output fits slot, shadow and paper not clipped.
390x844 browser viewport: button click and print pass, no clipping or console errors.
Real phone touchscreen hardware has not been tested. Reduced-motion branch is implemented,
but not verified with an OS/browser media override.

Run node checks/verify-controls.mjs. Run checks/verify-render.mjs in the browser after load;
checks/verify-print.mjs after ready checks actual dimensions, exposure ratio and ground clearance.

## Press me annotation
annotation.js loads the supplied SoundSeekers-Regular.otf into a CanvasTexture; the curved SVG
arrow uses a separate transparent plane. Both are in annotationGroup, a CameraDisplay child
and model sibling. Position [-.710898, -.040002, .528970], desktop scale 1, mobile .8.
The anchor uses the shutter world origin plus its retained vertex-center offset, converted
to display/local coordinates; the endpoint sits just outside the left button edge and .035
in front of its center. Depth testing stays enabled; the planes never enter model raycasts.
Text is now 3x original size, rendered at 1721x720; arrow is 1.4x with stroke weight preserved.
Angular smoothstep fade runs in existing render calls: full opacity .9 through 105°, zero at 135°.
Only annotation materials bypass depth tests and use DoubleSide; scene depth remains unchanged.
No visibility toggles or billboard are used. Tested 0°, ±30°, ±60°, ±90°, ±105°, ±120°, ±135°;
near edge-on the planar lettering is naturally compressed and can blend with the dark body.
Desktop and 390x844 viewport verified, including hover/side rotation, font loading, annotation
clicks not printing, and normal red shutter printing. checks/verify-annotation.mjs checks
font, parent, anchor, scale and fade. Camera, Glass, light, shadow and print code unchanged.
