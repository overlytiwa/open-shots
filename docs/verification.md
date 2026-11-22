# Verification for 1.1.0

Checks used a real desktop screenshot, a real phone screenshot and a generated two-second H.264/AAC test clip. The user screenshots remain private test inputs and are not committed. The documentation image shows the empty editor.

| Check            | Result                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fresh project    | Empty drop area, green/teal icon palette, no sample screenshot                                                                    |
| Model files      | Six stock display bitmaps removed; original byte ranges zeroed; body/geometry references retained                                 |
| Legacy project   | Old built-in sample URL removed during parsing                                                                                    |
| Media            | Both user images imported, replaced and fitted; video import enabled trim/audio controls                                          |
| Device fallbacks | All seven models selected and visually inspected with media; rounded openings, notch/camera areas and watch cutout masks retained |
| Styles           | All twelve style controls selected; additional styles exposed by More; corner and light controls checked                          |
| Layout           | Live layout previews, position and tilt, animation target selection; preview seams fixed at thumbnail density                     |
| VFX              | All nine choices selected with the expected active state                                                                          |
| Timed animation  | Add animation created a beat at one second on a two-second timeline; selecting a layout edited its target                         |
| PNG              | 1920 × 1440, decoded successfully                                                                                                 |
| JPG              | 1920 × 1440, decoded successfully                                                                                                 |
| WebP             | 1920 × 1440, decoded successfully                                                                                                 |
| MP4              | 960 × 720, H.264, 60 decoded video frames at 30 fps, 2.000-second video; AAC audio present                                        |
| WebM             | 960 × 720, VP9, 60 decoded video frames at 30 fps; Opus audio present                                                             |
| GIF              | 960 × 720, 30 frames, 2000 ms total; 60/70 ms alternating delays                                                                  |
| Transparent PNG  | Alpha channel spans 0–255 after decoding                                                                                          |
| Transparent WebM | VP9 AlphaMode=1; alpha spans 0–255 when decoded using libvpx-vp9; 60 video frames                                                 |
| Model credits    | Licensed device PNG contains readable iTXt attribution; CRC validated after decoding                                              |
| Project file     | Reopened 292,234-byte project with embedded video, unmuted audio and one timed animation                                          |
| Share link       | Empty project compressed into a 1006-character fragment link and reopened in another tab                                          |
| Tests            | 16 passing geometry, animation, file validation and output-limit tests                                                            |
| Production build | TypeScript and Vite build passed; heavy 3D/encoding modules load separately                                                       |

The browser disables WebGL. Live GPU appearance was therefore not verified there; the image-backed compatibility path was exercised. Native screen-capture permission flows require a real desktop session and were not exercised in the browser. Cross-platform packaging is handled separately by the Desktop workflow.

The first MP4 audio check exposed missing native AAC encoding. A bundled local AAC fallback was added and the export was rerun successfully. Image and video dimensions, frame counts, codecs and alpha were inspected from downloaded files, rather than inferred from success messages.
