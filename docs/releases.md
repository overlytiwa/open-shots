# Desktop releases

End users download an installer from GitHub Releases. They do not need Node.js, Electron, or a local build environment.

The Desktop workflow has four packaging jobs: Windows x64, Linux x64, Intel macOS, and Apple silicon macOS. Each installs the locked dependencies, runs the tests, builds the web editor, and packages it with Electron. Each job uploads its output as a workflow artifact. Packaging uses the host operating system for the corresponding platform.

Pushes to `main` and version tags run the packaging jobs. A final job waits for all four packages. A branch push publishes the package version only if that version has not been released before; it leaves existing releases unchanged. A version-tag run can upload the packages for that tag. It then publishes a GitHub release and attaches all the installers. The filenames are stable across versions, so the website's `/releases/latest/download/…` links keep pointing to the current release. A manual workflow run produces artifacts without creating a public release.

The package version in `package.json` and the version tag should match. Use a new version tag for a release; do not move a published tag to a different commit. The Check workflow builds the website independently of the desktop release workflow. Vercel deploys the web source through the user's own repository integration.

## Signing

The committed workflow produces unsigned packages without requiring private secrets. Windows signing and macOS notarization are separate maintainer tasks. They require certificates and the appropriate vendor accounts. Add those credentials as GitHub Actions secrets and configure electron-builder before advertising a signed release. Do not commit credentials.

## Website options

The Vercel project needs no database. The editor's only optional endpoint is `/api/photos`, a constrained proxy for Unsplash search and download tracking. Set `UNSPLASH_ACCESS_KEY` as a server-side Vercel environment variable to enable it. The key is never compiled into the browser bundle. Without it, the editor explains that photo search is not configured and still supports uploaded backgrounds.
