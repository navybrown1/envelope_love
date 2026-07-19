# Pocket Bloom

Pocket Bloom is an original, animated browser-based virtual-pet experience inspired by the joy of 1990s handheld companions.

[Play Pocket Bloom](https://pocket-bloom-edwin-browns-projects.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnavybrown1%2Fenvelope_love&project-name=pocket-bloom&repository-name=pocket-bloom)

## The experience

- Begin with a tiny egg that must be warmed before it cracks and hatches
- Watch visible eating, drinking, playing, bathing, sleeping, dreaming, waking, affection, excitement, sadness, and crying scenes
- Raise a companion through baby, child, teen, and adult stages
- Influence its personality and evolution through the quality of care
- Explore multiple colorful environments
- Play the Catch the Starlight mini-game
- Unlock achievements and maintain care streaks
- Continue progressing while the app is closed through realistic offline stat changes
- Install it as a mobile-friendly Progressive Web App

## Pocket Bloom Cloud

Pocket Bloom uses a dedicated Supabase project for persistent, cross-device saves.

- Every installation receives a cryptographically random 128-bit Pocket Key
- The raw Pocket Key is never stored in the database; only its SHA-256 hash is retained
- Local progress remains available offline and is synchronized when connectivity returns
- Optimistic revision checks prevent silent overwrites between devices
- Existing local pets are migrated automatically on first cloud connection
- A clean device restores the cloud pet before its temporary starter egg can be uploaded
- Local backups are created before a remote save replaces the current device state

To continue on another device, open **Settings**, copy the private Pocket Key, and enter it under **Connect another Pocket Key**. Anyone with this key can access that pet, so it should be protected like a password.

## Run locally

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deployment

The repository is a zero-build static application and is ready for direct Vercel import. `vercel.json` supplies production headers and static routing metadata.

## Copyright note

Pocket Bloom is an original project. It does not use Tamagotchi artwork, characters, logos, branding, or source code.
