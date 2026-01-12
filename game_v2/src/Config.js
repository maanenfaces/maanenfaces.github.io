export const DREAMLO_PUBLIC_KEY = "69458ce88f40bbcf805ef9d4";
export const DREAMLO_PRIVATE_KEY = "hs-2UxzkEE63Qe2M03wFnw54oKmXEjbE24PZxu_IlWYA";

export const DEV_MODE = true;
export const SONG_START_AT = 1;

export const SONG_STRUCTURE = [

    // ---------------------------------------------------------
    // INTRO
    // ---------------------------------------------------------

    { label: "INTRO 1",
      start: 0, end: 5,
      bonuses: { density: 0 },
      obstacles: { density: 0.05 }
    },
    { label: "INTRO 1",
      start: 5, end: 14,
      speed: 1.2,
      bonuses: { density: 0.1 },
      obstacles: { density: 0.16 }
    },
    { label: "INTRO 1",
      start: 14, end: 28,
      speed: 1.3,
      obstacles: { density: 0.21 }
    },

    // ---------------------------------------------------------
    // VERSE 1 WARMUP
    // ---------------------------------------------------------

    { label: "VERSE 1 WARMUP",
      start: 28, end: 35,
      effects: { curve: { intensity: 1 } },
      obstacles: { density: 0.25 },
      theme: { colors: [0xffff00] }
    },
    { label: "VERSE 1 WARMUP",
      start: 35, end: 41,
      obstacles: { density: 0.27 },
    },
    { label: "VERSE 1 WARMUP",
      start: 41, end: 55,
      effects: { curve: { intensity: 2 } }
    },

    // ---------------------------------------------------------
    // VERSE 1
    // ---------------------------------------------------------

    { label: "VERSE 1",
      start: 55, end: 74,
      colors: [0xffff00, 0xffa500, 0x00ff00],
      effects: { wave: { intensity: 0.1 } }
    },
    { label: "VERSE 1",
      start: 74, end: 81,
    },
    { label: "VERSE 1 BUILD-UP",
      start: 81, end: 95,
      effects: { curve: { intensity: 3 }, wave: { intensity: 0.3 } }
    },

    // ---------------------------------------------------------
    // BRIDGE 1
    // ---------------------------------------------------------
    { label: "BRIDGE 1",
      start: 95, end: 109,
      theme: { colors: [0xffff00] },
      bonuses: { density: 0.4, distributions: [{"speed": 100}] },
      obstacles: { density: 0.3 },
      effects: { curve: { intensity: 5 }, wave: { intensity: 0.5 } }
    },
    { label: "BRIDGE 1 BUILD-UP",
      start: 109, end: 116,
      theme: { colors: [0xffff00] },
      bonuses: {
        density: 0.05,
        distribution: [
            { entity: "PointBonus", percent: 60 },
            { entity: "SpeedBonus", percent: 25 },
            { entity: "JumpBonus",  percent: 10 },
            { entity: "GhostBonus", percent:  5 }
        ]
      },
      obstacles: { density: 0.1 },
      effects: { curve: { intensity: 0 }, wave: { intensity: 0 }, roll: { intensity: 50 } }
    },
    {
        label: "BRIDGE 1 BUILD-UP",
        start: 116, end: 122,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 0 }, wave: { intensity: 0.2 }, roll: { intensity: 0.7 } }
    },

    // ---------------------------------------------------------
    // CHORUS 1
    // ---------------------------------------------------------
    {
        label: "CHORUS 1",
        start: 122, end: 136,
        speed: 2,
        theme: { colors: [0xff0000, 0x0000ff] },
        obstacles: { density: 0.1 },
        effects: {
            lightning: { intensity: 0.2 },
            glitch: { intensity: 0.1 },
            curve: { intensity: 4 },
            wave: { intensity: 0 }
        }
    },
    {
        label: "CHORUS 1",
        start: 136, end: 149,
        speed: 2.2,
        theme: { colors: [0xff0000, 0x0000ff, 0x000000] },
        obstacles: { density: 0.1 },
        effects: {
            glitch: { intensity: 0.1 },
            flash: { intensity: 0.1 },
            curve: { intensity: 4 },
            wave: { intensity: 0.2 }
        }
    },
    {
        label: "CHORUS 1",
        start: 149, end: 155,
        speed: 2.4,
        theme: {
            colors: [0xaa0000, 0xdd0000],
            background: { imageUrl: "https://www.publicdomainpictures.net/pictures/320000/velka/rauch-hintergrund-1575902986IPo.jpg" }
        },
        obstacles: { density: 0.15 },
        effects: {
            glitch: { intensity: 0.1 },
            flash: { intensity: 0.1 },
            lightning: { intensity: 0.1 },
            curve: { intensity: 4 },
            wave: { intensity: 0.6 },
            roll: { intensity: 0.8 }
        }
    },
    {
        label: "CHORUS 1",
        start: 155, end: 163,
        speed: 2.6,
        theme: {
            colors: [0x770000, 0xaa0000],
            background: { videoId: "b17ggN8TZUs" },
            gridOpacity: 0
        },
        obstacles: { density: 0.2 },
        effects: {
            glitch: { intensity: 0.1 },
            flash: { intensity: 0.1 },
            lightning: { intensity: 0.1 },
            curve: { intensity: 4 },
            wave: { intensity: 0.8 }
        }
    },

    // ---------------------------------------------------------
    // POST-CHORUS 1
    // ---------------------------------------------------------
    {
        label: "POST-CHORUS 1",
        start: 163, end: 190,
        speed: 2,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.15 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0.03 } }
    },
    {
        label: "POST-CHORUS 1 VOICE",
        start: 190, end: 217,
        speed: 2,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.15 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0.6 } }
    },

    // ---------------------------------------------------------
    // MID-SONG BREAK & VERSE 2
    // ---------------------------------------------------------
    {
        label: "MID-SONG BREAK",
        start: 217, end: 237,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2 WARMUP",
        start: 237, end: 283,
        speed: 0.7,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2",
        start: 283, end: 285,
        speed: 0.7,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2",
        start: 285, end: 304,
        speed: 0.7,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },

    // ---------------------------------------------------------
    // BRIDGE 2
    // ---------------------------------------------------------
    {
        label: "BRIDGE 2",
        start: 304, end: 318,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "BRIDGE 2 BUILD-UP",
        start: 318, end: 332,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },

    // ---------------------------------------------------------
    // CHORUS 2
    // ---------------------------------------------------------
    { start: 332, end: 345, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 345, end: 359, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 359, end: 366, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 366, end: 372, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // POST-CHORUS 2
    // ---------------------------------------------------------
    { start: 372, end: 399, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 399, end: 413, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 413, end: 426, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 426, end: 440, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 440, end: 453, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 1
    // ---------------------------------------------------------
    { start: 453, end: 467, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 467, end: 480, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 480, end: 494, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 494, end: 501, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING BREAK 1
    // ---------------------------------------------------------
    { start: 501, end: 504, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 504, end: 508, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 508, end: 511, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 511, end: 514, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 2
    // ---------------------------------------------------------
    { start: 514, end: 521, label: "ENDING PART 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 521, end: 528, label: "ENDING PART 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING BREAK 2
    // ---------------------------------------------------------
    { start: 528, end: 529, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 529, end: 531, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 531, end: 534, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 534, end: 538, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 538, end: 541, label: "ENDING BREAK 22", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 3
    // ---------------------------------------------------------
    { start: 541, end: 548, label: "ENDING PART 3", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 548, end: 555, label: "ENDING PART 3", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // OUTRO
    // ---------------------------------------------------------
    { start: 555, end: 566, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 566, end: 574, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 574, end: 999, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } }
];
