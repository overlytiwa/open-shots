# CPU-rendered device frames

These transparent frame images are rendered from the same independently licensed GLBs listed in `device-model-sources.json`. They are not procedural SVG device drawings and do not contain artwork from Shots. Original model authors, sources and licenses remain applicable to these derivative renders.

`render-frames.py` uses Blender 4.3.2 CPU Cycles with an orthographic front camera, three studio area lights and transparent film. Hardware uses 256 samples and opening masks use 64 samples. The Blender build has no OpenImageDenoise support, so denoising is disabled. Each image has a maximum dimension of 900 px and a small transparent camera margin.

Each model produces:

- `{id}.png`: hardware with a true transparent display opening, using a holdout shader so geometry behind the display cannot fill the opening
- `{id}-mask.png`: an alpha mask for the display, preserving its rounded corners and hardware cutouts
- `{id}.json`: render size and normalized display projection bounds

`frames.json` collects all seven entries. Its `screen` coordinates use an upper-left origin, normalized from 0 to 1 relative to the full image. The front orthographic projection has rectangular screen bounds. `screenQuad` lists top-left, top-right, bottom-right and bottom-left in the same coordinates.

To composite, place the screenshot/video into the display bounds on a transparent canvas, clip it using the mask’s alpha with `destination-in`, then draw the hardware overlay above it. A rectangular screenshot alone is insufficient, because it would leak outside curved display corners and through camera cutouts.

These front renders provide a portable fallback when WebGL is unavailable. Applying a 2D perspective transform to a fallback image cannot reveal new physical side/back geometry. Genuine camera changes require the GLB renderer.

## Material and visibility changes

The screen material becomes holdout for the hardware pass and white emission for the mask pass. The authored body materials are otherwise retained, with these explicit changes:

- iPhone 17 Pro Max: its `glass.002` material was an opaque pale material over the camera island. Its base color was changed to dark glass and roughness set to 0.25 for this fallback render.
- Apple Watch Series 7: the front `Glass_8` group is hidden to keep a clean display opening.
- Desktop monitor: its KTX2 body textures could not be decoded by this CPU asset pipeline. Those maps were omitted, and a plain graphite PBR finish was assigned to the retained model geometry. The cables are hidden.

The first four assets’ Meshopt buffers were decoded through glTF-Transform 4.5.1. WebP images were re-encoded to PNG for Blender’s importer. Quantized attributes were dequantized for import. No model was simplified or replaced by different geometry.

`frame-assets.json` records final PNG hashes and sizes. The scripts and decoded intermediates are preparation files, not runtime dependencies.
