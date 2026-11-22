# Using OpenShot

The editor opens with a sample screenshot so you can try the tools before importing anything. Choose **Add media**, drop an image or video onto the editor, or paste an image from the clipboard. The first import replaces the sample. Further imports add layers. Double-click a screen or choose **Replace media** to change only that screen.

## Frames and layout

Choose **Mockup** to pick a frame, device variant, orientation, and crop. The address field on browser frames is a display label; it does not navigate to or capture that website. Use cover to fill the screen or contain to keep the whole image. The crop controls move the source within the screen, and screen zoom adjusts its magnification.

Choose **Templates** for a starting composition. Your current media stays in the template. Choose **Layout** for canvas dimensions or a repeated arrangement. Layouts repeat the source media; replace each individual layer when you want different screenshots in the composition.

Drag a layer to move it. The lower-right selection handle resizes it. **Layout** also provides numeric position and size controls. **Effects** provides rotation, tilt, and scale. The selection toolbar duplicates, reorders, or removes a layer. Open **Layers** to select, hide, or lock a layer. Locked layers are skipped by pointer selection.

## Backgrounds and styling

Choose a preset gradient or set custom colors. Transparent backgrounds show a checkerboard in the editor; the checkerboard is not part of the export. You can upload a photo, match colors from the screenshot, use a blurred copy of the media, or animate a mesh background. Grain, patterns, and window/leaf/diagonal shadows add texture.

Optional Unsplash search is available in the web version when the host has configured an API key. It is not needed for uploaded photos or any other editing feature. Choosing a photo contacts Unsplash and reports the selection to its download endpoint. Images are then embedded in the local project so the project can be reopened without that remote photo URL.

**Style** controls frame treatments, corners, padding, shadows, light direction, and reflection. **Effects** controls media adjustments and filters. **Text & shapes** adds text, highlighted code cards, or geometric shapes. **Watermark** adds your own text or logo; leaving it empty exports without a watermark.

## Animation and video

Open **Animation** and choose a motion preset for the selected layer. Each layer can have its own motion. The timeline provides play, pause, restart, duration, and scrubbing. Loop controls preview playback and GIF repetition.

For custom motion, set a time on the timeline, set the layer's position, scale, rotation, tilt, or opacity, and add a keyframe. Repeat at another time. OpenShot interpolates between those values using the selected easing. Keyframes take priority over the preset. Selecting a new preset clears that layer's custom keyframes.

Video imports expose trim start, trim end, and playback speed in **Mockup**. A trimmed clip repeats when the composition lasts longer than the clip. The composition duration is independent of individual layer motion. Video and animation exports currently contain no audio.

## Saving and exporting

Use the project menu next to the name to rename, open, or save a project. A `.openshot` file includes the media and settings. It is different from an exported image: a project can be edited again.

**Export** offers images or animation. PNG and WebP retain a transparent background. JPG does not. MP4, WebM, and GIF render the animation timeline from the beginning. A still image captures the current playhead time. Image scale changes the output resolution, not the layout. MP4 pads an odd output dimension by one pixel because H.264 requires even dimensions.

**Copy image** places a PNG on the clipboard when the browser grants clipboard access. When the clipboard is unavailable, export a PNG file instead.

## Keyboard shortcuts

| Action                    | Shortcut             |
| ------------------------- | -------------------- |
| Undo                      | Ctrl/Command Z       |
| Redo                      | Ctrl/Command Shift Z |
| Save project              | Ctrl/Command S       |
| Open project              | Ctrl/Command O       |
| Duplicate layer           | Ctrl/Command D       |
| Delete selected layer     | Delete               |
| Play or pause             | Space                |
| Move layer                | Arrow keys           |
| Move in larger steps      | Shift and arrow keys |
| Close a dialog or preview | Escape               |
| View shortcuts            | ?                    |

Performance mode reduces preview resolution and texture work. It does not reduce the resolution of exported files. Light and dark appearance are available in the project menu.
