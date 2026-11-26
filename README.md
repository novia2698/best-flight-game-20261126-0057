# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/novia2698/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/novia2698/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Kutilang Sky Courier — a bush-plane flight game over a golden-hour island archipelago. Fly the little red-and-cream courier plane "Kutilang" through golden rings, hop between island airstrips, and deliver parcels through storm gusts, with a lit cockpit instrument panel, full keyboard + mouse controls, and synthesized engine, wind and chime sounds. No network requests: every file the game loads lives under `game/`. The plane is named after the kutilang songbird — an original name, original art, original sounds.

Play it on the bounty page: https://make.fun/bounty/best-flight-game-20261126-0057

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Arrow keys / W-S pitch and throttle, mouse steers toward the cursor, Space brakes, P pauses, R restarts, M mutes, 1/2/3 pick a mission on the title screen.

## Missions

1. **Ring Run** — thread 8 golden rings along the coast; each ring scores and tops up fuel.
2. **Island Hop** — land gently on 3 island airstrips in sequence; soft touchdowns score, hard ones cost damage.
3. **Storm Courier** — race the clock to the far airstrip while gusts shove the plane around.

## Layout

- `game/index.html` — the page; `game/src/` — one file per job (config, random, world, physics, render, audio, input, shots, main).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — real renders of the game running in Chrome, taken with `?shot=start|play|ring|land`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=bpr1tvsc&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
