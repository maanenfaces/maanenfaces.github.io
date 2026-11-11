export const DREAMLO_PUBLIC_KEY = "69458ce88f40bbcf805ef9d4";
export const DREAMLO_PRIVATE_KEY = "hs-2UxzkEE63Qe2M03wFnw54oKmXEjbE24PZxu_IlWYA";

export const DEV_MODE = true;
export const SONG_START_AT = 1;
export const LANE_WIDTH = 6;

export const SONG_STRUCTURE = [

    // ---------------------------------------------------------
    // INTRO
    // ---------------------------------------------------------

    { label: "INTRO 1",
      start: 0,
      theme: {
        solidFloor: true,
        floorTexture: "/game_v2/assets/seamless_pbr_green_grass_ground_texture_with_small_white_flowers_and_leaves.png"
      },
      glitchScreen: {
          enabled: true,
          parts: [
              "En 2026, nous assistons aux prémices de la plus grosse révolution technologique de l'histoire.",
              "L'humanité est destiné à un futur brillant.",
              "Démarrage de la partie..."
          ]
      },
      bonuses: { density: 0 },
      obstacles: { density: 0 },
      scenery: { density: 0 },
    },

    /*
    { label: "INTRO 1",
      start: 0,
      bonuses: { density: 0 },
      obstacles: { density: 0.05 },
      scenery: {
        density: 0.05,
        elements: [
          { class: "PropagandaBillboard", weight: 0.3 }
        ]
      },
      theme: {
        solidFloor: true,
        floorTexture: "/game_v2/assets/seamless_pbr_green_grass_ground_texture_with_small_white_flowers_and_leaves.png"
      }
    },
    { label: "INTRO 1",
      start: 5,
      speed: 1.2,
      bonuses: { density: 0.1 },
      obstacles: { density: 0.9 }
    },
    */

    { label: "INTRO 1",
      start: 14,
      speed: 1.3,
      glitchScreen: { enabled: false },
      obstacles: { density: 0.21 }
    },

    // ---------------------------------------------------------
    // VERSE 1 WARMUP
    // ---------------------------------------------------------

    { label: "VERSE 1 WARMUP",
      start: 28,
      effects: { curve: { intensity: 1 } },
      obstacles: { density: 0.25 },
      theme: { colors: [0xffff00] }
    },
    { label: "VERSE 1 WARMUP",
      start: 35,
      obstacles: { density: 0.27 },
    },
    { label: "VERSE 1 WARMUP",
      start: 41,
      effects: { curve: { intensity: 2 } }
    },

    // ---------------------------------------------------------
    // VERSE 1
    // ---------------------------------------------------------

    { label: "VERSE 1",
      start: 55,
      colors: [0xffff00, 0xffa500, 0x00ff00],
      effects: { wave: { intensity: 0.1 } }
    },
    { label: "VERSE 1",
      start: 74,
    },
    { label: "VERSE 1 BUILD-UP",
      start: 81,
      effects: { curve: { intensity: 3 }, wave: { intensity: 0.3 } }
    },

    // ---------------------------------------------------------
    // BRIDGE 1
    // ---------------------------------------------------------
    { label: "BRIDGE 1",
      start: 95,
      theme: { colors: [0xffff00] },
      bonuses: { density: 0.4, distributions: [{"speed": 100}] },
      obstacles: { density: 0.3 },
      effects: { curve: { intensity: 5 }, wave: { intensity: 0.5 } }
    },
    { label: "BRIDGE 1 BUILD-UP",
      start: 109,
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
        start: 116,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        scenery: { horizonCity: { enabled: false } },
        effects: { curve: { intensity: 0 }, wave: { intensity: 0.2 }, roll: { intensity: 50 } }
    },

    // ---------------------------------------------------------
    // CHORUS 1
    // ---------------------------------------------------------
    {
        label: "CHORUS 1",
        start: 122,
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
        start: 136,
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
        start: 149,
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
        start: 155,
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
        start: 163,
        speed: 2,
        theme: {
            colors: [0xffff00],
            gridOpacity: 1
        },
        obstacles: { density: 0.15 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0.03 } }
    },
    {
        label: "POST-CHORUS 1 VOICE",
        start: 190,
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
        start: 217,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2 WARMUP",
        start: 237,
        speed: 0.7,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2",
        start: 283,
        speed: 0.7,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.02 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "VERSE 2",
        start: 285,
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
        start: 304,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },
    {
        label: "BRIDGE 2 BUILD-UP",
        start: 318,
        speed: 0.8,
        theme: { colors: [0xffff00] },
        obstacles: { density: 0.03 },
        effects: { curve: { intensity: 2 }, wave: { intensity: 0 } }
    },

    // ---------------------------------------------------------
    // CHORUS 2
    // ---------------------------------------------------------
    { start: 332, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 345, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 359, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 366, label: "CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // POST-CHORUS 2
    // ---------------------------------------------------------
    { start: 372, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 399, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 413, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 426, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 440, label: "POST-CHORUS 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 1
    // ---------------------------------------------------------
    { start: 453, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 467, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 480, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 494, label: "ENDING PART 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING BREAK 1
    // ---------------------------------------------------------
    { start: 501, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 504, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 508, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 511, label: "ENDING BREAK 1", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 2
    // ---------------------------------------------------------
    { start: 514, label: "ENDING PART 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 521, label: "ENDING PART 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING BREAK 2
    // ---------------------------------------------------------
    { start: 528, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 529, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 531, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 534, label: "ENDING BREAK 2", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 538, label: "ENDING BREAK 22", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // ENDING PART 3
    // ---------------------------------------------------------
    { start: 541, label: "ENDING PART 3", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 548, label: "ENDING PART 3", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },

    // ---------------------------------------------------------
    // OUTRO
    // ---------------------------------------------------------
    { start: 555, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 566, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } },
    { start: 574, label: "OUTRO", speed: 0.8, theme: { colors: [0xffff00] }, obstacles: { density: 0.03 }, effects: { curve: { intensity: 2 }, wave: { intensity: 0 } } }
];
