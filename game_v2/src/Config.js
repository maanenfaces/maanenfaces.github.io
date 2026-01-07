export const DREAMLO_PUBLIC_KEY = "69458ce88f40bbcf805ef9d4";
export const DREAMLO_PRIVATE_KEY = "hs-2UxzkEE63Qe2M03wFnw54oKmXEjbE24PZxu_IlWYA";

export const DEV_MODE = true;

export const SONG_START_AT = 120;

export const SONG_STRUCTURE = [
    // INTRO
    { start: 0,  end: 28, label: "INTRO", speed: 1, density: 0.1, effects: [], waveHeight: 0.5, curveStrength: 4, color: 0x00ff00 },

    // VERSE 1 WARMUP: DISCOVERING THE GAME
    { start: 28, end: 31, label: "VERSE 1 WARMUP", speed: 1, density: 0.1,  effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 31, end: 41, label: "VERSE 1 WARMUP", speed: 1, density: 0.15, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 41, end: 55, label: "VERSE 1 WARMUP", speed: 1, density: 0.17, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // VERSE 1: GETTING INTO THE FLOW + A FEW EFFECTS
    { start: 55, end: 74, label: "VERSE 1",          speed: 0.8, density: 0.17, effects: ["fog"], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 74, end: 81, label: "VERSE 1",          speed: 0.8, density: 0.2,  effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 81, end: 95, label: "VERSE 1 BUILD-UP", speed: 1, density: 0.08, effects: [], waveHeight: 0.3, curveStrength: 3, color: 0xffff00 },

    // BRIDGE 1
    { start: 95,  end: 109, label: "BRIDGE 1",          speed: 1,  density: 0.05, effects: [], waveHeight: 0.5, curveStrength: 5, color: 0xffff00 },
    { start: 109, end: 116, label: "BRIDGE 1 BUILD-UP", speed: 1, density: 0.02, effects: [], waveHeight: 0, curveStrength: 0, color: 0xffff00, slopeStrength: 15, rollStrength: 0.5 },
    { start: 116, end: 122, label: "BRIDGE 1 BUILD-UP", speed: 1,    density: 0.02, effects: [], waveHeight: 0.2, waveType: 2, curveStrength: 0, color: 0xffff00, slopeStrength: 25, rollStrength: 0.7 },

    // CHORUS 1
    { start: 122, end: 136, label: "CHORUS 1", speed: 1.3, density: 0.03, effects: ["flash"], waveHeight: 0, curveStrength: 2, color: [0xff0000, 0x0000ff] },
    { start: 136, end: 149, label: "CHORUS 1", speed: 1.3, density: 0.03, effects: ["glitch", "flash"], waveHeight: 0.1, curveStrength: 4, color: [0xff0000, 0x0000ff, 0x000000] },
    { start: 149, end: 155, label: "CHORUS 1", speed: 1.3, density: 0.03,  effects: ["glitch", "flash", "eclair", "shake", "moving_obstacles"], waveHeight: 0.3, curveStrength: 4, color: 0x000000, bgImage: "https://www.publicdomainpictures.net/pictures/320000/velka/rauch-hintergrund-1575902986IPo.jpg" },
    { start: 155, end: 163, label: "CHORUS 1", speed: 1.3, density: 0.03,  effects: ["glitch", "flash", "eclair", "shake", "moving_obstacles", "fog"], waveHeight: 0.3, curveStrength: 4, color: 0x000000, bgVideo: "b17ggN8TZUs", gridOpacity: 0 },

    // POST-CHORUS 1
    { start: 163, end: 190, label: "POST-CHORUS 1", speed: 2, density: 0.15, effects: [], waveHeight: 0.03, curveStrength: 2, color: 0xffff00 },
    { start: 190, end: 217, label: "POST-CHORUS 1 VOICE", speed: 2, density: 0.15, effects: [], waveHeight: 0.6, curveStrength: 2, color: 0xffff00 },

    // MID-SONG BREAK
    { start: 217, end: 237, label: "MID-SONG BREAK", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // VERSE 2 WARMUP
    { start: 237, end: 283, label: "VERSE 2 WARMUP", speed: 0.7, density: 0.02, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // VERSE 2
    { start: 283, end: 285, label: "VERSE 2", speed: 0.7, density: 0.02, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 285, end: 304, label: "VERSE 2", speed: 0.7, density: 0.02, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // BRIDGE 2
    { start: 304, end: 318, label: "BRIDGE 2",          speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 318, end: 332, label: "BRIDGE 2 BUILD-UP", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // CHORUS 2
    { start: 332, end: 345, label: "CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 345, end: 359, label: "CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 359, end: 366, label: "CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 366, end: 372, label: "CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // POST-CHORUS 2
    { start: 372, end: 399, label: "POST-CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 399, end: 413, label: "POST-CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 413, end: 426, label: "POST-CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 426, end: 440, label: "POST-CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 440, end: 453, label: "POST-CHORUS 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // ENDING PART 1
    { start: 453, end: 467, label: "ENDING PART 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 467, end: 480, label: "ENDING PART 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 480, end: 494, label: "ENDING PART 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 494, end: 501, label: "ENDING PART 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // ENDING BREAK 1
    { start: 501, end: 504, label: "ENDING BREAK 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 504, end: 508, label: "ENDING BREAK 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 508, end: 511, label: "ENDING BREAK 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 511, end: 514, label: "ENDING BREAK 1", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // ENDING PART 2
    { start: 514, end: 521, label: "ENDING PART 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 521, end: 528, label: "ENDING PART 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // ENDING BREAK 2
    { start: 528, end: 529, label: "ENDING BREAK 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 529, end: 531, label: "ENDING BREAK 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 531, end: 534, label: "ENDING BREAK 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 534, end: 538, label: "ENDING BREAK 2", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 538, end: 541, label: "ENDING BREAK 22", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // ENDING PART 3
    { start: 541, end: 548, label: "ENDING PART 3", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 548, end: 555, label: "ENDING PART 3", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },

    // OUTRO
    { start: 555, end: 566, label: "OUTRO", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 566, end: 574, label: "OUTRO", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
    { start: 574, end: 999, label: "OUTRO", speed: 0.8, density: 0.03, effects: [], waveHeight: 0, curveStrength: 2, color: 0xffff00 },
];
