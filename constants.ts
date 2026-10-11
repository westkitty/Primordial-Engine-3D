import {CatastropheDef, CatastropheType} from './types';
import {MusicTrack} from './utils/helper';

export const CATASTROPHES: Record<CatastropheType, CatastropheDef> = {
  volcano: {
    id: 'volcano',
    name: 'Volcanic Caldera',
    shortDesc: 'Erupts molten magma caldera, volcanic bombs & smoking lava flows',
    hotkey: '▲',
    icon: '🌋',
    color: '#ff4500',
    radius: 9.0,
    cooldown: 1.2,
  },
  earthquake: {
    id: 'earthquake',
    name: 'Tectonic Quake',
    shortDesc: 'Shatters ground fissures and crumbles heavy stone structures',
    hotkey: '▢',
    icon: '⚡',
    color: '#d97706',
    radius: 9.5,
    cooldown: 1.0,
  },
  tornado: {
    id: 'tornado',
    name: 'Arcane Vortex',
    shortDesc: 'Summons violent whirlwind lifting debris and roofs skyward',
    hotkey: '🌀',
    icon: '🌪️',
    color: '#38bdf8',
    radius: 8.5,
    cooldown: 1.5,
  },
  meteor: {
    id: 'meteor',
    name: 'Celestial Meteor',
    shortDesc: 'Calls blazing cosmic asteroid shower with shockwave craters',
    hotkey: '∨',
    icon: '☄️',
    color: '#ea580c',
    radius: 10.5,
    cooldown: 1.5,
  },
  wave: {
    id: 'wave',
    name: 'Tidal Deluge',
    shortDesc: 'Surges high-velocity water wave that sweeps debris and douses fires',
    hotkey: '⭕',
    icon: '🌊',
    color: '#0284c7',
    radius: 11.0,
    cooldown: 1.2,
  },
  crystal: {
    id: 'crystal',
    name: 'Crystalline Growth',
    shortDesc: 'Sprouts towering luminous amethyst crystal clusters',
    hotkey: '✦',
    icon: '💎',
    color: '#c084fc',
    radius: 8.0,
    cooldown: 1.0,
  },
  lightning: {
    id: 'lightning',
    name: 'Divine Thunderstorm',
    shortDesc: 'Blinding high-voltage lightning strikes and sonic thunder',
    hotkey: '⚡',
    icon: '⚡',
    color: '#facc15',
    radius: 8.5,
    cooldown: 0.8,
  },
  freeze: {
    id: 'freeze',
    name: 'Glacial Blizzard',
    shortDesc: 'Freezes waterways to crystal ice sheets and frosts the realm',
    hotkey: '━',
    icon: '❄️',
    color: '#93c5fd',
    radius: 9.5,
    cooldown: 1.0,
  },
  wildfire: {
    id: 'wildfire',
    name: 'Infernal Wildfire',
    shortDesc: 'Ignites voracious spreading flames across forests and roofs',
    hotkey: '∩',
    icon: '🔥',
    color: '#ef4444',
    radius: 8.5,
    cooldown: 0.8,
  },
  restore: {
    id: 'restore',
    name: 'Primordial Restoration',
    shortDesc: 'Channels divine light to heal terrain, regrow forests & rebuild realm',
    hotkey: '💖',
    icon: '✨',
    color: '#10b981',
    radius: 16.0,
    cooldown: 1.5,
  },
};

/** Game configuration schema. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'Primordial Engine 3D',
    type: 'string',
    label: 'Game Title',
    group: 'Game',
  },

  // --- Camera ---
  fov: {
    value: 46,
    type: 'number',
    label: 'Field of View',
    group: 'Camera',
    min: 30,
    max: 90,
    step: 5,
  },
  cameraX: {
    value: 0,
    type: 'number',
    label: 'Camera X',
    group: 'Camera',
  },
  cameraY: {
    value: 28,
    type: 'number',
    label: 'Camera Y',
    group: 'Camera',
  },
  cameraZ: {
    value: 36,
    type: 'number',
    label: 'Camera Z',
    group: 'Camera',
  },

  // --- Visuals & Atmosphere ---
  backgroundColor: {
    value: '#080d18',
    type: 'color',
    label: 'Atmosphere Fog Color',
    group: 'Visuals',
  },
  ambientColor: {
    value: '#a5b4fc',
    type: 'color',
    label: 'Ambient Light Color',
    group: 'Visuals',
  },
  ambientIntensity: {
    value: 1.85,
    type: 'number',
    label: 'Ambient Intensity',
    group: 'Visuals',
    min: 0.5,
    max: 5,
    step: 0.1,
  },
  sunColor: {
    value: '#fffbeb',
    type: 'color',
    label: 'Sun Color',
    group: 'Visuals',
  },
  sunIntensity: {
    value: 5.2,
    type: 'number',
    label: 'Sun Intensity',
    group: 'Visuals',
    min: 1,
    max: 10,
    step: 0.1,
  },
  hemiSkyColor: {
    value: '#93c5fd',
    type: 'color',
    label: 'Hemisphere Sky Color',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#3b200b',
    type: 'color',
    label: 'Hemisphere Ground Color',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 1.5,
    type: 'number',
    label: 'Hemisphere Intensity',
    group: 'Visuals',
    min: 0.2,
    max: 3,
    step: 0.1,
  },

  // --- Black & White 2 Controls ---
  bwGroundDragSensitivity: {
    value: 1.15,
    type: 'number',
    label: 'Ground Leash Drag Sensitivity',
    group: 'Controls',
    min: 0.5,
    max: 3.0,
    step: 0.1,
  },
  bwZoomSensitivity: {
    value: 1.25,
    type: 'number',
    label: 'Mouse Wheel Zoom Speed',
    group: 'Controls',
    min: 0.4,
    max: 3.0,
    step: 0.1,
  },

  // --- Simulation Tuning ---
  simulationSpeed: {
    value: 1.0,
    type: 'number',
    label: 'Simulation Speed',
    group: 'Sandbox',
    min: 0.2,
    max: 2.5,
    step: 0.1,
  },
  catastrophePower: {
    value: 1.3,
    type: 'number',
    label: 'Catastrophe Force Multiplier',
    group: 'Sandbox',
    min: 0.5,
    max: 3.0,
    step: 0.1,
  },
  debrisCountLimit: {
    value: 140,
    type: 'number',
    label: 'Max Debris Pieces',
    group: 'Sandbox',
    min: 20,
    max: 250,
    step: 10,
  },
  cameraShakeEnabled: {
    value: true,
    type: 'boolean',
    label: 'Screen Shake',
    group: 'Sandbox',
  },
  dynamicWeatherLighting: {
    value: true,
    type: 'boolean',
    label: 'Dynamic Storm Skies',
    group: 'Sandbox',
  },

  // --- Physics ---
  gravity: {
    value: -18.0,
    type: 'number',
    label: 'Gravity',
    group: 'Physics',
    min: -30,
    max: 0,
    step: 0.5,
  },

  // --- System ---
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.35,
    type: 'number',
    label: 'Music Volume',
    group: 'Audio',
  },
  defaultSfxVolume: {
    value: 0.7,
    type: 'number',
    label: 'SFX Volume',
    group: 'Audio',
  },
  backgroundMusicUrl: {
    value: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'Audio',
  },
};

const {playgroundConfig} = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

export type ConfigKey = keyof typeof CONFIG;

export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'titan_clash',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    description: 'Epic, relentless orchestral battle music with war drums and brass.',
  },
  {
    name: 'heroes_journey',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/heroes_journey.mp3',
    description: 'Uplifting orchestral adventure with horns, flute and harp.',
  },
  {
    name: 'verdant_bloom',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/verdant_bloom.mp3',
    description: 'A relaxing, nature-inspired track with a calm atmosphere.',
  },
  {
    name: 'tavern_tales',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/tavern_tales.mp3',
    description: 'Lively medieval folk dance with lute and hurdy-gurdy.',
  },
];
