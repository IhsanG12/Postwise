import type { PlatformType } from "@/lib/types";

export interface Scene {
  tag: string;
  prompt: string;
}

// Every prompt follows the same formula:
// [subject + environment] + [lighting] + [camera/lens] + [mood/grade] + [safety guardrails]
const BASE_SUFFIX =
  "Editorial luxury lifestyle photography. Shot on Hasselblad medium format, 85mm lens. " +
  "Shallow depth of field. Cinematic color grading, rich shadows, clean highlights. " +
  "No brand logos, no trademarks, no visible text.";

// Fallback pools — used only when no style is selected (video format ignores
// styleId; see lib/generation/styles.ts). Slideshow always has a style, so
// these rarely fire, but they keep pickScenes() working without one.
const FACELESS_SCENES: Scene[] = [
  {
    tag: "supercar_night",
    prompt:
      "A matte black aerodynamic supercar parked on a deserted rain-slicked city street at 2am. " +
      "Puddles mirror neon signage from surrounding buildings. Smoke drifts across the foreground. " +
      "Low angle wide shot, dramatic side lighting. " + BASE_SUFFIX,
  },
  {
    tag: "penthouse_view",
    prompt:
      "Interior of a minimalist penthouse suite, floor-to-ceiling frameless glass walls. " +
      "Manhattan skyline at blue hour, city lights just beginning to glow. " +
      "A single crystal glass of champagne on a white marble island in the foreground, slightly blurred. " +
      "Wide angle, extreme depth of field. " + BASE_SUFFIX,
  },
  {
    tag: "private_jet",
    prompt:
      "Interior of a private aircraft, cream-coloured hand-stitched leather seats, " +
      "polished walnut wood trim, brass fixtures. Oval porthole window shows soft clouds at 40,000ft. " +
      "Warm cabin lighting, golden hour glow from window. Close-medium shot. " + BASE_SUFFIX,
  },
  {
    tag: "yacht_deck",
    prompt:
      "The teak bow deck of a 60-metre superyacht at golden hour. " +
      "Ionian Sea stretching to a hazy horizon, another island visible in the distance. " +
      "Two champagne flutes and a frosted ice bucket on a low teak table. " +
      "Shot from deck level looking toward the horizon, sun flare on one side. " + BASE_SUFFIX,
  },
  {
    tag: "designer_watch",
    prompt:
      "An ultra-thin luxury mechanical wristwatch lying diagonally on smooth grey slate. " +
      "Intricate visible movement through sapphire case back, micro-engraved rotor catching light. " +
      "Extreme macro, razor-thin focus plane, background completely dissolved into bokeh. " +
      "Single overhead spotlight. " + BASE_SUFFIX,
  },
  {
    tag: "rooftop_pool",
    prompt:
      "An infinity edge pool on a hotel rooftop at golden hour, water perfectly still. " +
      "Dubai skyline mirrored in the surface. White linen sun loungers with folded towels. " +
      "Shot from water level at the pool edge, horizon line bisects the frame. " + BASE_SUFFIX,
  },
  {
    tag: "mountain_estate",
    prompt:
      "A contemporary glass-and-concrete private villa cantilevered over a Swiss alpine valley. " +
      "Morning mist fills the valley below, snow-capped peaks visible above. " +
      "Interior warm glow visible through floor-to-ceiling glass. " +
      "Drone perspective, slightly elevated, wide shot. " + BASE_SUFFIX,
  },
  {
    tag: "luxury_suite",
    prompt:
      "A five-star hotel suite, king bed with crisp white 1000-thread-count linen, " +
      "two breakfast trays with French press coffee, croissants, and fresh-cut roses. " +
      "Floor-to-ceiling sheer curtains catching morning light, Côte d'Azur ocean view behind. " +
      "Wide interior shot, warm morning light. " + BASE_SUFFIX,
  },
];

const FACE_SCENES: Scene[] = [
  {
    tag: "supercar_arrival",
    prompt:
      "A well-dressed person stepping out of a sleek black supercar onto a red carpet outside a luxury hotel at night. " +
      "Motion blur on the car door, sharp on the person. Camera flash aesthetic, paparazzi angle. " +
      "Cinematic, aspirational. " + BASE_SUFFIX,
  },
  {
    tag: "jet_window",
    prompt:
      "A person reclined in a cream leather private jet seat, looking out the oval window at golden clouds. " +
      "One hand rests on the armrest holding a glass of champagne. Warm cabin light. " +
      "Medium shot, slightly from the side. " + BASE_SUFFIX,
  },
  {
    tag: "yacht_bow",
    prompt:
      "A person standing at the very bow of a superyacht, arms relaxed, facing the open Mediterranean sea. " +
      "White linen outfit, hair moving in wind, golden hour backlight creating rim lighting around their silhouette. " +
      "Shot from below the bow railing. " + BASE_SUFFIX,
  },
  {
    tag: "penthouse_terrace",
    prompt:
      "A person leaning on the glass railing of a penthouse terrace, looking out over a glowing city skyline at dusk. " +
      "Champagne flute in hand, city lights below just starting to appear. " +
      "Medium shot from slightly to the side. " + BASE_SUFFIX,
  },
  {
    tag: "pool_lounge",
    prompt:
      "A person reclining on a white cushioned sun lounger at a rooftop infinity pool, " +
      "oversized sunglasses, effortlessly relaxed. " +
      "Pool edge in foreground, city skyline blurred behind. Bright midday light, clean shadows. " +
      "Medium wide shot. " + BASE_SUFFIX,
  },
];

// Per-style scene pools. Each style's settingFamily gets its own dedicated set
// so a slideshow reads as one coherent shoot — a chosen style shouldn't ever
// mix a mountain estate with a neon city street. promptSuffix (color grade /
// lighting / mood, from styles.ts) is layered on top of these in images.ts;
// these prompts only need to nail the setting and composition.
const STYLE_SCENES: Record<string, { faceless: Scene[]; face: Scene[] }> = {
  golden_mediterranean: {
    faceless: [
      {
        tag: "gm_yacht_bow_sunset",
        prompt:
          "The teak bow of a sailing yacht at golden hour, Amalfi coastline receding into a warm haze. " +
          "A folded linen throw and a glass of chilled rosé rest on the deck rail. " +
          "Shot from deck level, sun flare grazing the frame. " + BASE_SUFFIX,
      },
      {
        tag: "gm_villa_terrace",
        prompt:
          "A whitewashed seaside villa terrace draped in bougainvillea, infinity pool edge visible below. " +
          "The Mediterranean stretches out under late-afternoon sun. " +
          "Wide angle from the terrace table, warm rim light. " + BASE_SUFFIX,
      },
      {
        tag: "gm_marina_rose",
        prompt:
          "A marina dock at golden hour, moored sailing yachts lined up behind a low table holding a single glass of rosé. " +
          "Warm honey-toned light reflecting off the water. " +
          "Close-medium shot, shallow depth of field. " + BASE_SUFFIX,
      },
      {
        tag: "gm_cliffside_pool",
        prompt:
          "A cliffside infinity pool overlooking the Mediterranean, water glowing amber in the late sun. " +
          "White sun loungers along the pool edge, coastline curving into the distance. " +
          "Shot from water level, horizon bisecting the frame. " + BASE_SUFFIX,
      },
      {
        tag: "gm_seaside_table",
        prompt:
          "An outdoor terrace dining table set with a seafood platter, citrus, and chilled white wine, sea view behind. " +
          "Golden hour light raking across the linen tablecloth. " +
          "Overhead-angled shot, warm natural light. " + BASE_SUFFIX,
      },
      {
        tag: "gm_sailboat_detail",
        prompt:
          "Close detail of a sailing yacht deck — coiled rope, brass fittings, weathered teak — lit by low golden sun. " +
          "Sea sparkling softly out of focus behind. " +
          "Macro-medium shot, warm sun flare. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "gm_face_yacht_bow",
        prompt:
          "A person standing at a sailing yacht's bow at golden hour, white linen outfit, coastline hazy behind them. " +
          "Warm backlight rims their silhouette. " +
          "Shot from below the bow railing. " + BASE_SUFFIX,
      },
      {
        tag: "gm_face_villa_terrace",
        prompt:
          "A person leaning on a whitewashed villa terrace railing, bougainvillea framing the shot, Mediterranean behind. " +
          "Warm late-afternoon light. " +
          "Medium shot, slightly from the side. " + BASE_SUFFIX,
      },
      {
        tag: "gm_face_cliffside_pool",
        prompt:
          "A person at the edge of a cliffside infinity pool, coastline curving away below, golden hour glow on the water. " +
          "Relaxed posture, looking toward the horizon. " +
          "Medium wide shot, warm light. " + BASE_SUFFIX,
      },
      {
        tag: "gm_face_marina_walk",
        prompt:
          "A person walking along a sunlit marina dock, moored yachts behind them, golden hour warmth across the scene. " +
          "Candid mid-stride pose. " +
          "Medium shot, soft natural light. " + BASE_SUFFIX,
      },
    ],
  },

  midnight_monaco: {
    faceless: [
      {
        tag: "mm_casino_facade",
        prompt:
          "A Monte Carlo–style casino facade at night, warm gold lights against deep blue-black sky, cars idling under the entrance. " +
          "Cinematic low-light photography, bokeh from surrounding city lights. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "mm_rooftop_bar_night",
        prompt:
          "A rooftop bar at night, a single cocktail glass on a dark marble ledge, city skyline glittering below. " +
          "Bokeh city lights, cool blue-black shadows. " +
          "Close-medium shot, low angle. " + BASE_SUFFIX,
      },
      {
        tag: "mm_supercar_valet",
        prompt:
          "A sleek car under a casino entrance's dramatic overhead lighting, valet stand beside it, night sky behind. " +
          "High-contrast shadows, cool highlights. " +
          "Low angle wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "mm_champagne_bar",
        prompt:
          "A stacked champagne coupe tower on a dark marble bar, glowing under moody nightclub lighting. " +
          "Deep shadows, cool silver highlights on the glass. " +
          "Close-up, shallow depth of field. " + BASE_SUFFIX,
      },
      {
        tag: "mm_harbor_night",
        prompt:
          "Monaco's harbor at night, superyachts lit up and reflected in dark water, city lights climbing the hillside behind. " +
          "Cinematic low-light photography, cool blue-black tones. " +
          "Wide shot from the harbor promenade. " + BASE_SUFFIX,
      },
      {
        tag: "mm_penthouse_bar_night",
        prompt:
          "A dark, moody penthouse bar interior, city skyline glittering through the window behind rows of glassware. " +
          "Bokeh city lights, high-contrast shadow. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "mm_face_casino_entrance",
        prompt:
          "A person walking into a glowing casino entrance at night, warm gold light spilling onto the street. " +
          "Cool blue-black night sky behind, cinematic bokeh. " +
          "Medium shot, three-quarter angle. " + BASE_SUFFIX,
      },
      {
        tag: "mm_face_rooftop_bar",
        prompt:
          "A person at a rooftop bar rail at night, city skyline glittering below, cocktail in hand. " +
          "Bokeh city lights, cool high-contrast shadows. " +
          "Medium shot from the side. " + BASE_SUFFIX,
      },
      {
        tag: "mm_face_harbor_night",
        prompt:
          "A person standing at a harbor railing at night, lit superyachts and city lights reflected in the water behind them. " +
          "Cinematic low-light photography. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "mm_face_valet_arrival",
        prompt:
          "A person stepping out of a car under a casino's dramatic entrance lighting at night. " +
          "High-contrast shadows, cool silver highlights, motion blur on the car door. " +
          "Low angle, paparazzi-style framing. " + BASE_SUFFIX,
      },
    ],
  },

  alpine_minimalist: {
    faceless: [
      {
        tag: "am_chalet_exterior",
        prompt:
          "A minimalist glass-and-timber chalet exterior, snow blanketing the roofline, overcast alpine sky. " +
          "Flat, even lighting, crisp white-grey palette. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_snow_terrace",
        prompt:
          "A snow-dusted chalet terrace, minimalist furniture, mountain peaks rising behind under soft overcast light. " +
          "Cool neutral tones, flat even lighting. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_fireplace_interior",
        prompt:
          "A minimalist alpine living room, a single modern fireplace glowing, neutral grey-white furnishings. " +
          "Soft window light, quiet composition. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_ski_gear_still",
        prompt:
          "A pair of minimalist skis and poles leaned against a whitewashed wall, fresh snow at the base. " +
          "Crisp, flat overcast light. " +
          "Close-medium still-life shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_mountain_window",
        prompt:
          "A floor-to-ceiling window framing snow-capped peaks, a single armchair in silhouette in the foreground. " +
          "Cool white-grey light, minimalist interior. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_snow_path",
        prompt:
          "A cleared stone path through fresh snow leading to a modern chalet entrance, overcast daylight. " +
          "Crisp neutral palette, flat even lighting. " +
          "Wide shot, symmetrical composition. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "am_face_terrace",
        prompt:
          "A person standing on a snow-dusted chalet terrace, mountain peaks behind under soft overcast light. " +
          "Cool neutral tones, calm posture. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_face_window",
        prompt:
          "A person by a floor-to-ceiling window overlooking snowy peaks, holding a warm drink, minimalist interior. " +
          "Soft cool daylight. " +
          "Medium shot from the side. " + BASE_SUFFIX,
      },
      {
        tag: "am_face_fireplace",
        prompt:
          "A person seated near a minimalist fireplace, neutral grey-white interior, quiet relaxed posture. " +
          "Soft warm glow against cool ambient light. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "am_face_snow_walk",
        prompt:
          "A person walking along a snow-cleared path near a modern chalet, overcast alpine light. " +
          "Crisp white-grey palette. " +
          "Medium wide shot, candid mid-stride. " + BASE_SUFFIX,
      },
    ],
  },

  desert_noir: {
    faceless: [
      {
        tag: "dn_modernist_villa",
        prompt:
          "A modernist concrete desert villa at dusk, long dramatic shadows stretching across the sand. " +
          "Dusty amber and rust tones, high-contrast light. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_dune_horizon",
        prompt:
          "A sweeping dune landscape at dusk, ridgelines casting long shadows toward the camera. " +
          "Dramatic amber sky, cinematic contrast. " +
          "Wide landscape shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_infinity_pool_desert",
        prompt:
          "An infinity pool overlooking desert dunes at dusk, water catching the last amber light. " +
          "Dramatic long shadows, dusty rust tones. " +
          "Shot from water level, horizon bisecting the frame. " + BASE_SUFFIX,
      },
      {
        tag: "dn_desert_car",
        prompt:
          "A matte-finished car parked amid dunes at dusk, tire tracks trailing behind it in the sand. " +
          "Dramatic side lighting, long shadow cast across the dune. " +
          "Low angle wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_courtyard_shadow",
        prompt:
          "A desert villa's interior courtyard, geometric shadow patterns cast by dusk sun through a lattice screen. " +
          "Deep amber-rust contrast. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_terrace_firepit",
        prompt:
          "An outdoor terrace firepit glowing at dusk, desert dunes fading into the amber horizon behind. " +
          "Warm firelight against cool dusk shadow. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "dn_face_dune_silhouette",
        prompt:
          "A person's silhouette walking along a dune ridge at dusk, dramatic amber sky behind them. " +
          "Long cast shadow, high-contrast light. " +
          "Wide shot, figure small against the landscape. " + BASE_SUFFIX,
      },
      {
        tag: "dn_face_villa_terrace",
        prompt:
          "A person standing on a modernist villa terrace at dusk, desert dunes stretching out behind them. " +
          "Dusty amber and rust color tones. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_face_pool_desert",
        prompt:
          "A person at the edge of an infinity pool overlooking desert dunes, dusk light on the water. " +
          "Dramatic long shadows. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "dn_face_courtyard",
        prompt:
          "A person standing in a desert courtyard, geometric lattice-screen shadows falling across them at dusk. " +
          "Deep amber-rust contrast. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
    ],
  },

  riviera_pastel: {
    faceless: [
      {
        tag: "rp_cabana_row",
        prompt:
          "A row of striped pastel cabanas along a bright beach, midday sun, soft diffused light. " +
          "Pastel pinks, blues, and creams throughout. " +
          "Wide breezy shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_pastel_villa",
        prompt:
          "A pastel-colored seaside villa exterior, midday light, shutters and awnings in soft cream and pink. " +
          "Bright airy photography. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_cafe_table",
        prompt:
          "A seaside café table with a pastel-striped umbrella overhead, an iced drink with a paper straw catching the light. " +
          "Soft diffused midday light. " +
          "Close-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_pool_pastel",
        prompt:
          "A pastel-tiled pool glowing under midday sun, water rippling gently, cream lounge chairs at the edge. " +
          "Bright, airy, soft-diffused light. " +
          "Shot from pool level. " + BASE_SUFFIX,
      },
      {
        tag: "rp_bicycle_seaside",
        prompt:
          "A vintage cream bicycle with a woven basket leaning against a pastel pink wall, seaside town street. " +
          "Bright airy midday light. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_umbrella_beach",
        prompt:
          "Pastel beach umbrellas and cream lounge chairs on soft sand, calm turquoise sea behind. " +
          "Soft diffused midday light, breezy and light. " +
          "Wide beach shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "rp_face_cabana",
        prompt:
          "A person lounging beside a striped pastel cabana on a bright beach, relaxed and breezy. " +
          "Soft diffused midday light. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_face_cafe",
        prompt:
          "A person at a seaside café table under a pastel umbrella, midday light, effortless chic. " +
          "Bright airy photography. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "rp_face_pool_pastel",
        prompt:
          "A person at the edge of a pastel-tiled pool, midday sun, playful relaxed pose. " +
          "Bright soft-diffused light. " +
          "Medium shot from pool level. " + BASE_SUFFIX,
      },
      {
        tag: "rp_face_bicycle",
        prompt:
          "A person walking a vintage cream bicycle along a pastel seaside street, midday light. " +
          "Breezy, playful, effortless chic. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
    ],
  },

  matte_black_editorial: {
    faceless: [
      {
        tag: "mb_garage_supercar",
        prompt:
          "A matte black supercar in a private concrete garage, a single hard spotlight raking across its bodywork. " +
          "High-contrast monochrome, deep matte blacks. " +
          "Low angle wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "mb_studio_watch",
        prompt:
          "A studio product shot of a black-cased watch on a matte black surface, hard directional light carving out its form. " +
          "High-contrast monochrome. " +
          "Macro shot, razor-thin focus plane. " + BASE_SUFFIX,
      },
      {
        tag: "mb_dark_interior",
        prompt:
          "A minimalist dark interior, sharp architectural lines, a single hard light source casting deep shadow. " +
          "Sleek moody editorial aesthetic. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "mb_urban_stairwell",
        prompt:
          "A moody concrete stairwell lit by a single hard light, deep shadow pooling in the corners. " +
          "High-contrast monochrome. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
      {
        tag: "mb_leather_seat_detail",
        prompt:
          "Close-up of black leather car interior stitching, hard directional light catching the texture. " +
          "Deep matte blacks, sleek editorial mood. " +
          "Macro-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "mb_black_marble_bar",
        prompt:
          "A black marble bar counter, a single glass catching a hard spotlight, the rest of the room dissolved into shadow. " +
          "High-contrast monochrome. " +
          "Close-medium shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "mb_face_garage",
        prompt:
          "A person standing beside a matte black supercar in a private garage, hard spotlight carving dramatic shadow. " +
          "High-contrast monochrome, sleek and powerful. " +
          "Medium shot, low angle. " + BASE_SUFFIX,
      },
      {
        tag: "mb_face_studio",
        prompt:
          "A person in a dark editorial studio, a single hard directional light sculpting their features. " +
          "Deep matte blacks, moody mood. " +
          "Medium studio portrait. " + BASE_SUFFIX,
      },
      {
        tag: "mb_face_stairwell",
        prompt:
          "A person on a moody concrete stairwell, a single hard light source casting high-contrast shadow. " +
          "Sleek monochrome editorial aesthetic. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
      {
        tag: "mb_face_bar",
        prompt:
          "A person at a black marble bar, a single dramatic spotlight, the rest of the room in shadow. " +
          "High-contrast monochrome. " +
          "Medium shot. " + BASE_SUFFIX,
      },
    ],
  },

  tropical_emerald: {
    faceless: [
      {
        tag: "te_jungle_villa",
        prompt:
          "A glass-walled jungle villa surrounded by lush emerald greenery, humid golden late-morning light filtering through leaves. " +
          "Vibrant resort photography. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_infinity_pool_jungle",
        prompt:
          "An infinity pool overlooking a dense tropical jungle canopy, water glowing under humid golden light. " +
          "Lush emerald greens throughout. " +
          "Shot from water level, horizon bisecting the frame. " + BASE_SUFFIX,
      },
      {
        tag: "te_palm_terrace",
        prompt:
          "A resort terrace framed by broad palm leaves, golden late-morning light streaming through the fronds. " +
          "Vibrant natural bright light. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_waterfall_pool",
        prompt:
          "A natural pool at the base of a tropical waterfall, mist catching golden light, jungle greenery all around. " +
          "Lush emerald tones, humid golden glow. " +
          "Wide landscape shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_tropical_breakfast",
        prompt:
          "A resort breakfast table with fresh tropical fruit, dense jungle view behind, golden late-morning light. " +
          "Vibrant resort photography. " +
          "Overhead-angled close shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_canopy_walkway",
        prompt:
          "An elevated wooden walkway threading through a tropical jungle canopy, golden light breaking through the leaves. " +
          "Lush emerald greens, humid glow. " +
          "Wide shot along the walkway. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "te_face_infinity_pool",
        prompt:
          "A person at the edge of an infinity pool, dense jungle canopy behind them, humid golden light. " +
          "Lush resort escapism mood. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_face_jungle_terrace",
        prompt:
          "A person on a resort terrace framed by palm leaves, golden late-morning light. " +
          "Vibrant tropical tones. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_face_waterfall",
        prompt:
          "A person near a tropical waterfall pool, mist catching golden light, jungle greenery around them. " +
          "Lush emerald color grade. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "te_face_villa_lounge",
        prompt:
          "A person lounging in a glass-walled jungle villa, dense greenery visible through the windows. " +
          "Humid golden light, resort escapism. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
    ],
  },

  penthouse_dusk: {
    faceless: [
      {
        tag: "pd_penthouse_lounge",
        prompt:
          "A penthouse lounge interior at blue hour, city skyline glowing through floor-to-ceiling glass. " +
          "Twilight purple and amber tones, moody ambient light. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_bar_cart",
        prompt:
          "A penthouse bar cart with cut crystal decanters, city lights just beginning to glow through the window behind. " +
          "Twilight blue-hour lighting. " +
          "Close-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_floor_window_skyline",
        prompt:
          "A floor-to-ceiling window framing a twilight skyline, a single armchair silhouetted in the foreground. " +
          "Purple and amber color grade, skyline glow. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_rooftop_lounge_furniture",
        prompt:
          "Outdoor penthouse terrace furniture at dusk, city skyline glowing amber and purple behind. " +
          "Moody twilight ambiance. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_dining_twilight",
        prompt:
          "A penthouse dining table set for two, candlelight mixing with twilight skyline glow through the window. " +
          "Upscale introspective mood. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_interior_stair_glow",
        prompt:
          "A sculptural penthouse interior staircase, twilight skyline glow washing through nearby glass. " +
          "Purple-amber color grade, moody ambient light. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "pd_face_terrace",
        prompt:
          "A person on a penthouse terrace railing at dusk, twilight skyline glowing behind them. " +
          "Purple and amber color grade. " +
          "Medium shot from the side. " + BASE_SUFFIX,
      },
      {
        tag: "pd_face_lounge",
        prompt:
          "A person on a penthouse lounge sofa, skyline glow washing through the glass behind them at blue hour. " +
          "Moody upscale ambiance. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_face_bar_cart",
        prompt:
          "A person at a penthouse bar cart, twilight skyline glowing through the window behind them. " +
          "Introspective glamour mood. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "pd_face_window",
        prompt:
          "A person standing at a floor-to-ceiling window, city lights glowing at dusk behind them. " +
          "Twilight blue-hour lighting. " +
          "Medium shot from the side. " + BASE_SUFFIX,
      },
    ],
  },

  arctic_platinum: {
    faceless: [
      {
        tag: "ap_ice_lodge_exterior",
        prompt:
          "A modern snow lodge exterior under bright winter daylight, crisp white snow against cool platinum sky. " +
          "Crisp high-key photography. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_icy_terrace",
        prompt:
          "An icy terrace overlooking a snow-covered winter estate, bright winter daylight, cool silver-white palette. " +
          "Crisp high-key lighting. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_frozen_lake_view",
        prompt:
          "A floor-to-ceiling window framing a frozen lake, bright winter daylight flooding the interior. " +
          "Cool platinum-white color grade. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_winter_fireplace",
        prompt:
          "A minimalist winter interior, white tones throughout, a single modern fireplace glowing softly. " +
          "Icy elegant high-key lighting. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_crystal_still",
        prompt:
          "A still life of cut-crystal glassware on a bed of ice, bright winter daylight catching every facet. " +
          "Cool silver-white highlights. " +
          "Macro-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_ski_lodge_deck",
        prompt:
          "A lodge deck overlooking snowy mountain peaks, bright winter daylight, crisp cold air visible. " +
          "Cool platinum-white palette. " +
          "Wide landscape shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "ap_face_terrace",
        prompt:
          "A person on an icy terrace, snow-covered winter estate grounds behind them, bright winter daylight. " +
          "Cool silver-white tones. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_face_lodge_window",
        prompt:
          "A person by a floor-to-ceiling window overlooking a frozen lake, bright winter light. " +
          "Cool platinum-white color grade. " +
          "Medium shot from the side. " + BASE_SUFFIX,
      },
      {
        tag: "ap_face_ski_deck",
        prompt:
          "A person on a lodge deck, snowy mountains rising behind them, bright winter daylight. " +
          "Crisp, exclusive, cold elegance. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "ap_face_fireplace",
        prompt:
          "A person near a minimalist fireplace in a white winter interior, soft warm glow against cool ambient light. " +
          "Icy elegant high-key lighting. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
    ],
  },

  vintage_gold_rush: {
    faceless: [
      {
        tag: "vg_vintage_car_estate",
        prompt:
          "A classic vintage car parked in the gravel drive of an old-world estate, warm late-afternoon light. " +
          "Vintage film photography, subtle grain. " +
          "Wide establishing shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_library_interior",
        prompt:
          "A grand old-world library interior, leather-bound books lining the walls, warm afternoon light through tall windows. " +
          "Sepia-gold color grade, subtle film grain. " +
          "Wide interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_estate_garden",
        prompt:
          "A classic estate garden with stone statues and manicured hedges, warm late-afternoon glow. " +
          "Old-money timeless aesthetic. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_gramophone_still",
        prompt:
          "A vintage still life — a brass gramophone beside stacked leather-bound books — warm sepia-gold light. " +
          "Subtle film grain texture. " +
          "Close-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_grand_staircase",
        prompt:
          "A grand old-world staircase with an ornate wrought-iron banister, warm sepia light falling across the steps. " +
          "Vintage film photography. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_vintage_car_detail",
        prompt:
          "A close-up of a vintage car's chrome grille and headlamp, warm late-afternoon light catching every curve. " +
          "Sepia-gold tones, subtle grain. " +
          "Macro-medium shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "vg_face_vintage_car",
        prompt:
          "A person standing beside a classic vintage car on an old-world estate's gravel drive, warm late-afternoon light. " +
          "Old-money nostalgia. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_face_library",
        prompt:
          "A person in a grand old-world library, warm afternoon light through tall windows, leather-bound books around them. " +
          "Sepia-gold color grade. " +
          "Medium interior shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_face_garden",
        prompt:
          "A person walking through a classic estate garden, stone statues and hedges around them, warm late-afternoon glow. " +
          "Timeless prestige mood. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "vg_face_staircase",
        prompt:
          "A person descending a grand old-world staircase, warm sepia light falling across the steps. " +
          "Vintage film photography, subtle grain. " +
          "Medium architectural shot. " + BASE_SUFFIX,
      },
    ],
  },

  neon_tokyo: {
    faceless: [
      {
        tag: "nt_neon_alley",
        prompt:
          "A narrow neon-lit city alley at night, signage reflecting off wet pavement in electric pink and blue. " +
          "Neon-lit street photography, reflective wet-street glow. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_rooftop_club",
        prompt:
          "A rooftop nightclub scene, neon accent lighting against a futuristic city skyline at night. " +
          "Vibrant neon pinks and blues. " +
          "Wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_neon_car",
        prompt:
          "A sleek sports car parked on a neon-lit street at night, reflections streaking across the wet asphalt. " +
          "Electric pink and blue city lights. " +
          "Low angle wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_crosswalk_neon",
        prompt:
          "A busy neon-lit crosswalk at night, signage glowing in every direction, wet pavement reflecting the colors. " +
          "Futuristic night-life energy. " +
          "Wide street-level shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_arcade_glow",
        prompt:
          "The neon glow of an arcade storefront at night, futuristic signage reflected in a rain-slicked street. " +
          "Vibrant neon color grade. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_skyline_neon",
        prompt:
          "A futuristic city skyline at night accented with neon light trails, low cloud catching the color glow. " +
          "Electric high-energy mood. " +
          "Wide landscape shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "nt_face_neon_street",
        prompt:
          "A person walking a neon-lit city street at night, reflections in the wet pavement around them. " +
          "Electric pink and blue city lights. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_face_rooftop_club",
        prompt:
          "A person at a rooftop nightclub, neon lights and futuristic skyline glowing behind them. " +
          "Vibrant neon color grade. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_face_crosswalk",
        prompt:
          "A person at a neon-lit crosswalk at night, signage glowing in electric colors around them. " +
          "Futuristic night-life energy. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "nt_face_neon_car",
        prompt:
          "A person leaning against a neon-lit sports car at night, reflective wet-street glow around them. " +
          "Electric high-energy mood. " +
          "Medium shot, low angle. " + BASE_SUFFIX,
      },
    ],
  },

  sunbleached_yacht: {
    faceless: [
      {
        tag: "sy_yacht_deck_bright",
        prompt:
          "A bright, overexposed yacht deck at midday, open water stretching to the horizon under a bleached-white sky. " +
          "High-key nautical photography. " +
          "Wide deck-level shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_marina_bright",
        prompt:
          "A sunbleached marina dock at midday, white boats moored in rows, bright overexposed highlights. " +
          "Nautical yacht-deck aesthetic. " +
          "Wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_open_water_bow",
        prompt:
          "A yacht bow facing open water at midday, bright overexposed sky, white wake trailing behind. " +
          "Crisp midday light. " +
          "Low angle wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_deck_lounge",
        prompt:
          "A yacht deck lounge area with white cushions, bright midday sun bleaching the whole scene. " +
          "Bright high-key color grade. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_marina_rope_detail",
        prompt:
          "A close detail of coiled nautical rope against bright white decking, overexposed midday highlights. " +
          "High-key nautical photography. " +
          "Macro-medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_yacht_flybridge",
        prompt:
          "A yacht flybridge view over open water at midday, bright bleached sky and sea meeting at the horizon. " +
          "Overexposed sun-bleached whites. " +
          "Wide shot. " + BASE_SUFFIX,
      },
    ],
    face: [
      {
        tag: "sy_face_yacht_deck",
        prompt:
          "A person on a bright yacht deck at midday, open water behind them, overexposed high-key light. " +
          "Breezy, nautical, effortless wealth. " +
          "Medium wide shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_face_marina",
        prompt:
          "A person walking along a sunbleached marina dock at midday, white boats moored behind them. " +
          "Bright high-key color grade. " +
          "Medium shot. " + BASE_SUFFIX,
      },
      {
        tag: "sy_face_bow",
        prompt:
          "A person at a yacht's bow facing open water at midday, bright overexposed sky behind them. " +
          "Crisp midday light. " +
          "Medium wide shot, low angle. " + BASE_SUFFIX,
      },
      {
        tag: "sy_face_lounge",
        prompt:
          "A person relaxing on a yacht deck lounge, white cushions, bright midday sun bleaching the scene. " +
          "Effortless nautical ease. " +
          "Medium shot. " + BASE_SUFFIX,
      },
    ],
  },
};

export function pickScenes(
  count: number,
  withFace: boolean,
  excludeTags: string[] = [],
  styleId?: string | null
): Scene[] {
  const stylePool = styleId ? STYLE_SCENES[styleId] : undefined;
  const pool = stylePool
    ? (withFace ? stylePool.face : stylePool.faceless)
    : (withFace ? FACE_SCENES : FACELESS_SCENES);

  const unused = pool.filter((s) => !excludeTags.includes(s.tag));
  // Prefer scenes not already in play; fall back to the full pool once every
  // scene has been used (e.g. count exceeds pool size).
  const candidates = unused.length > 0 ? unused : pool;
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const result: Scene[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}

export function getDimensions(platform: PlatformType): { width: number; height: number } {
  return platform === "instagram"
    ? { width: 1080, height: 1350 }
    : { width: 1080, height: 1920 };
}
