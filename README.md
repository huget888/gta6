[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/huget888/gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/huget888/gta6/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Nights

An original top-down 2D open-world crime game for the make.fun **gta6-01** bounty — built with vanilla JavaScript on canvas, no libraries, no build step, no network requests.

You are **Jax Marlow**, a wheelman fresh out of the Solmar docks. Explore **Solmar City** on foot and by car, steal cars, outrun the Solmar PD, and work a five-job story chain for Rico and Mara — from your first stolen car to the Marina vault score.

## What is in the game

- **Open city** — a 3200×2400 sun-soaked city with districts (Downtown, Old Town, Harbor, Marina beach), roads, traffic, pedestrians, parks and a plaza.
- **Cars to steal and drive** — parked and moving cars, each with its own name, colour and top speed. Press **E** to steal one; the cops notice.
- **Wanted level** — 5 stars. The Solmar PD sends patrol cars that chase and ram you, and foot cops who arrest you on capture (BUSTED: fine, respawn at the station) or open fire at 3+ stars. Lay low and the heat cools.
- **Missions and a story** — 5 jobs with dialogue, objectives, map markers and cash rewards: First Wheels, The Pickup, Payback, Hot Pursuit, The Big Score.
- **Combat** — fists (**F**) and pistol (mouse aim, click or **J** to shoot) against rival gang members and armed cops, with particles, muzzle flash and screen shake.
- **HUD with minimap** — health, cash, wanted stars, mission objective, dialogue, toasts, speedometer and a live minimap with the mission marker and police dots.
- **Start screen, pause and save** — New Game / Continue (localStorage save, autosaves on every completed job, **H** to save any time).
- **Sound and music** — fully synthesized WebAudio: engine hum, sirens, gunshots, punches, jingles and a looping sunset groove. No audio files. **M** mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| E | Steal / enter car, exit car |
| Mouse + click / J | Aim and shoot |
| F | Punch |
| Shift | Run |
| P / Esc | Pause |
| H | Save game |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

`game/index.html` opens in desktop Chrome and plays with no network request — every script, image, sound and font is a file under `game/` or a `data:` URI.

## Structure

```
game/
  index.html            start / pause / end screens + canvas
  src/
    main.js             boot, game state, the frame loop, menus, save wiring
    city.js             Solmar City: roads, buildings, districts, collision
    player.js           on-foot movement, entering/exiting/stealing cars
    traffic.js          civilian cars and parked cars
    pedestrians.js      the people of Solmar City
    police.js           wanted level, patrol cars, foot cops, busts
    missions.js         the five-job story chain
    combat.js           shooting, melee, enemies, bullets, particles
    hud.js              HUD and minimap
    render.js           drawing the world
    audio.js            synthesized WebAudio effects and music
    save.js             localStorage save / load
    input.js            keyboard and mouse
main.ts                 hands the entry in: copies game/ + screenshots/ to /output
                        and writes /output/dossier.json
```

## Credits

An original game: Solmar City, Jax Marlow, Rico, Mara and the Vultures are fictional. Nothing is copied from any commercial game.
