# Device model credits

OpenShot includes the following independently sourced 3D device models. These assets retain their own licenses; the MIT license for OpenShot source code does not replace them. Branded models are fan-made likenesses, with no vendor endorsement.

| Model                                                                                                                               | Author                                           | License                                                       | File                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | -------------------------- |
| [iPhone 17 Pro Max](https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d)                             | [MajdyModels](https://sketchfab.com/MG990)       | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `iphone-17-pro-max.glb`    |
| [iPhone 12 Pro](https://sketchfab.com/3d-models/iphone-12-pro-05dfc991665e45c68c8b7062136c0c6e)                                     | [DatSketch](https://sketchfab.com/DatSketch)     | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `iphone-12-pro.glb`        |
| [Samsung Galaxy S21 Ultra](https://sketchfab.com/3d-models/samsung-galaxy-s21-ultra-cd962832be7744efb6b37fe0ee2027e7)               | [DatSketch](https://sketchfab.com/DatSketch)     | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `galaxy-s21-ultra.glb`     |
| [iPad mini 6 (2021)](https://sketchfab.com/3d-models/ipad-mini-6-2021-f363c2b1c74a462588db184bd4fb024e)                             | [DatSketch](https://sketchfab.com/DatSketch)     | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `ipad-mini-6.glb`          |
| [MacBook Pro M3 16-inch (2024)](https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4)       | [jackbaeten](https://sketchfab.com/jackbaeten)   | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `macbook-pro-16.glb`       |
| [Desktop monitor](https://tevy.dev/models/desktop-monitor)                                                                          | [tevy.dev](https://tevy.dev)                     | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `desktop-monitor.glb`      |
| [Apple Watch Series 7](https://sketchfab.com/3d-models/apple-watch-series-7-free-watch-face-sdctm-cf15ecbf159f42a28df5e56bdfa666bb) | [SDC PERFORMANCE™](https://sketchfab.com/3Duae) | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)     | `apple-watch-series-7.glb` |

CC BY 4.0 requires appropriate credit, a license link and an indication of changes when sharing a rendering that includes a licensed model. The editor provides a credit record for the models in the current project. Keep those credits with published images and videos. CC0 does not require attribution.

## Changes

Screens receive the user’s image or video at render time. OpenShot regenerates planar screen UVs and normalizes the models’ orientation and scale. Authored body materials are retained; users can optionally change a finish. These operations affect the rendered presentation and do not replace the original author credit.

The iPad mini 6 and Apple Watch Series 7 packages were re-encoded with lossless Meshopt buffer compression and lossless WebP textures. No geometry simplification, quantization, hierarchy flattening or material merging was performed. The decoded geometry attributes, triangle topology, node hierarchy and transforms, and material names were compared against the original files and preserved. The iPhone 17 package uses Meshopt compression and WebP textures. All models retain their geometry and body textures; stock display bitmap removal is described below.

## Provenance

The iPhone, Samsung and MacBook assets were obtained from [app-preview-craft’s model directory](https://github.com/imshaikot/app-preview-craft-skill/tree/main/skills/app-preview-craft/assets/models), whose credits and embedded GLB metadata identify the authors and CC BY 4.0 license. The iPad and watch were obtained from [SceneView’s hash-addressed asset release](https://github.com/sceneview/sceneview/releases/tag/assets-v1), with matching [per-model credits](https://github.com/sceneview/sceneview/blob/main/assets/CREDITS.md) and embedded metadata. The monitor is the pinned v1 LOD0 model from [tevy.dev](https://tevy.dev/models/desktop-monitor), whose metadata and embedded copyright identify CC0 1.0.

Original Sketchfab pages were not all directly readable during preparation. The saved distributor credit records and embedded author, source and license metadata establish the recorded provenance; this document does not claim every original page was freshly inspected.

`device-model-sources.json` contains the source URLs, redistribution evidence, triangle counts, packaged sizes and SHA-256 hashes.

## Packaged files

| File                       |   Bytes | SHA-256                                                            |
| -------------------------- | ------: | ------------------------------------------------------------------ |
| `iphone-17-pro-max.glb`    |  461652 | `3416aa1892fa489f5e9af95c002d2eb1de82992834cdd7ba5885cc5db888363b` |
| `iphone-12-pro.glb`        |  580944 | `4046193269df3c088ca8398649a2782e8969a29494ab08f2d5c3f35eda5a01a5` |
| `galaxy-s21-ultra.glb`     | 1016968 | `2d12da1bdb65a7e8493700cc111fc259a600c632add984f2e8d45cd2e51264a1` |
| `ipad-mini-6.glb`          | 1017224 | `93dff5a8d23087bec193d5c396a61da86ea23512ba355e8b6fe407717db6a369` |
| `macbook-pro-16.glb`       | 2346500 | `96d0c784ef7402be74915d174a0d5dc9d1ea60693a63fbf592f51b0c58647bd8` |
| `desktop-monitor.glb`      | 2371324 | `9ebf01e10c083652f30c5e4bce298ebdeed0b46f846dcef7dae8b5827e9f09ac` |
| `apple-watch-series-7.glb` | 3419644 | `e1d848ded09f0a1fe00118044212b788e6bb9af93d8a667d049a51f03ac401cc` |

## Empty displays

Stock display bitmap references are removed from the packaged models. Their original byte ranges are zeroed, and the remaining texture, image and buffer-view indices are remapped. Geometry and body textures remain intact. User screenshots are never included in these files. `model-screen-cleanup.json` records the changes, and `scripts/strip-model-screens.py` documents the transformation.
