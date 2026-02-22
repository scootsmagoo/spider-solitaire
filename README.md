# Simple Spider Solitaire

Accessible Spider Solitaire for your mom, built to run in two ways:

- as an installable Linux desktop app
- in a web browser for quick testing

It includes:

- Spider modes: 1-suit, 2-suit, 4-suit
- low-vision default deck (large rank/suit symbols, no illustrated face cards)
- multiple deck themes
- UI scale, high contrast, alternative suit palette, reduced motion
- drag-and-drop play, hint button, undo/redo
- autosave, restart/new game, and basic stats (wins/losses/best time)

## Development

Install dependencies:

```bash
npm install
```

Run in browser (local testing):

```bash
npm run dev:web
```

Run desktop app (Electron + Vite dev server):

```bash
npm run dev:desktop
```

## Builds

Web build:

```bash
npm run build:web
```

Desktop build artifacts:

```bash
npm run build:electron
```

Linux distributable (AppImage via electron-builder):

```bash
npm run dist:linux
```

## Flatpak (Debian/Ubuntu friendly)

A Flatpak manifest is provided at:

- `flatpak/com.example.SimpleSpider.yml`

Example local build/install flow:

```bash
flatpak-builder --force-clean build-dir flatpak/com.example.SimpleSpider.yml
flatpak-builder --user --install --force-clean build-dir flatpak/com.example.SimpleSpider.yml
flatpak run com.example.SimpleSpider
```

## Test and lint

```bash
npm run test
npm run lint
```
