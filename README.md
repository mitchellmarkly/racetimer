# Race Timer MVP (5K / 10K)

Offline-first single-page app for race-day timing with fast bib entry, runner import, and CSV export.

## Stack
- React + TypeScript + Vite
- Local persistence with IndexedDB, fallback to LocalStorage
- No backend / no network calls

## Run locally
```bash
npm install
npm run dev
```

## Build for production
```bash
npm run build
npm run preview
```

## Tests
```bash
npm run test
```

## Race-day workflow
1. **Start tab**
   - Tap **Start 10K** and/or **Start 5K** once each at gun time.
   - Live timer resumes correctly after refresh using persisted start timestamps.
2. **Runners tab**
   - Add runners one-by-one or bulk paste.
   - Bulk parser supports:
     - `BIB`
     - `BIB,5K`
     - `BIB,10K,First,Last`
     - `BIB First Last`
   - Import preview highlights duplicates/invalid lines.
3. **Finish tab**
   - Keep this tab open on phone.
   - Enter bib and tap **Record Finish** (or press Enter).
   - App blocks finish if race start isn't set.
   - Double-finish prompts before overwrite.
   - One-tap **Undo last finish** for quick correction.
4. **Results tab**
   - Filter by race + search bib/name.
   - Export CSV with bib, names, race, start/finish timestamps, elapsed ms, formatted elapsed.
   - **Clear all data** requires confirmation.

## Recommended race-day device setup
- Use a bright, high-contrast display and disable auto-brightness if outdoors.
- Keep screen awake:
  - iPhone/iPad: Settings → Display & Brightness → Auto-Lock → Never (temporarily)
  - Android: Screen timeout to max / developer stay-awake options if available
- Enable Airplane mode + Wi‑Fi/Bluetooth as needed; app runs fully offline.
- Add app to home screen (PWA shell can be added later, v2).
- Keep a power bank connected for long events.

## Design choices (simplicity first)
- **Single-page tab UI** for quick switching with minimal navigation overhead.
- **Bib as string** to preserve leading zeros (e.g. `0012`).
- **Default race in parser is 5K** when missing to support fastest entry; can be corrected manually.
- **IndexedDB with LocalStorage fallback** for reliability across browser/device differences.

