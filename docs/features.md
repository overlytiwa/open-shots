# Features and limits

The feature inventory was based on the public pages and editor labels at shots.so on 22 November 2026. No paid account or private asset library was inspected. Similar-looking domains are not used as evidence about Shots.

| Shots workflow                                      | OpenShot implementation                                                | Difference or limit                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Image and video import                              | Upload, drop, paste, multiple media layers                             | Source format decoding depends on the browser. PNG/JPG/WebP and MP4/WebM are the safest choices.                      |
| Device mockups                                      | Thirteen frame categories, device variants, orientation and color      | Original procedural artwork. No copied proprietary 3D models or exact photorealistic asset parity.                    |
| Templates and layouts                               | Twelve templates and four repeated arrangements                        | Original compositions, with independently replaceable media.                                                          |
| Glass and inset styling                             | Eight frame treatments with padding and color                          | Approximate visual treatments, not optical material simulation.                                                       |
| Corners and shadows                                 | Radius, shadow profiles, opacity, color and light direction            | The renderer uses a projected 2D surface with simulated lighting.                                                     |
| Magic backgrounds                                   | Sampled colors, blurred media and animated mesh                        | No generative image service or remote AI model.                                                                       |
| Background collections                              | Gradient library, uploaded photos, patterns and texture                | Shots' proprietary wallpaper collections are not bundled.                                                             |
| Unsplash                                            | Optional server-side search and download tracking                      | Requires the host's Unsplash API key. Offline desktop use supports uploads instead.                                   |
| Scene effects                                       | Spheres, cubes, rings, arches, shadow overlays                         | Original generated geometry rather than Shots' licensed scene assets.                                                 |
| Filters and VFX                                     | Monochrome, warm/cool, vintage, VHS, glitch and image adjustments      | These are composited visual filters, not a full video effects suite.                                                  |
| Animation, zoom and parallax                        | Twenty-four motion presets, keyframes, focus zoom, timeline and easing | Animations export without sound.                                                                                      |
| Video                                               | Video screens, trim, speed, repeating clip playback                    | No audio editing, clip sequencing, or automatic conversion of unsupported input codecs.                               |
| Custom watermark                                    | User text or uploaded logo                                             | No forced OpenShot branding.                                                                                          |
| Social output sizes                                 | Ten size presets and custom dimensions                                 | Editing canvas and exports are bounded to prevent impractical memory allocations.                                     |
| Image export                                        | PNG, JPG, WebP and clipboard PNG                                       | Clipboard requires a secure origin and browser permission.                                                            |
| Animated export                                     | H.264 MP4, WebM and GIF                                                | MP4 needs a supported browser encoder. WebM recording runs in real time. GIF is capped at 15 fps and four megapixels. |
| Sharing                                             | Self-contained compressed project URLs and project files               | No cloud storage, public gallery, revocation, or short-link service. Long links may be rejected by messaging apps.    |
| Undo, redo, preview, shortcuts and performance mode | Included                                                               | History is bounded to one hundred snapshots per session.                                                              |

## Output sizes

Export dimensions are capped at 8192 pixels per side and 32 megapixels in total. The same total pixel limit applies to imported project canvases. Each media file can be up to 150 MB. A project can contain up to one hundred layers. Large projects can still exceed the memory available on a phone or older computer; the limits are guardrails, not a memory guarantee.

GIF timing is expressed in centiseconds. Frame delays alternate as needed to keep the overall animation duration close to the timeline. GIF transparency is binary, unlike the alpha channel in PNG or WebP. MP4 flattens transparent pixels to black.

The web editor uses browser storage for one active autosaved project. Saved project files are the portable archive format. An ordinary share link has no server-side copy and cannot be revoked after sharing. Projects containing large videos should be shared as files.

## Desktop packages

Windows x64, Linux x64, macOS Intel and macOS Apple silicon builds use the same web renderer. The shell keeps Node.js out of the page, enables context isolation and sandboxing, limits navigation, and exposes only a screen-capture bridge. Screen capture depends on operating-system permissions and display availability. A container without a display cannot provide a useful screenshot source.

The initial packages are unsigned. Signing and notarization need the maintainer's platform certificates and credentials. GitHub builds cannot create those credentials on the maintainer's behalf.

## Identity

OpenShot's icon is original generated artwork. The sample project interface is original vector artwork. UI symbols come from Lucide, and Inter is bundled locally. [Third-party notices](third-party.md) lists their licenses.

Sources used to identify the reference workflows: [Shots](https://shots.so/), [Shots phone mockups](https://beta.shots.so/mockups/phone), and [Shots editor](https://beta.shots.so/magic). Product descriptions can change; this document describes this repository's implementation.
