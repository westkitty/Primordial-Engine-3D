import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CATASTROPHES, getConfig} from './constants';
import {Game, type GraphicsQuality} from './Game';
import {TrialTacticalMap} from './components/TrialTacticalMap';
import type {ChronicleEvent, FieldChannel, GroundStats} from './environment';
import {windAt, type Wind} from './weather';
import {TRIAL_COST, type TrialView} from './trial';
import {readSlot, summaries, VAULT_SLOTS, vaultKey, writeSlot, type VaultSlot} from './vault';
import type {CatastropheType} from './types';
import {captureKingdom, hydrateGround, KINGDOM_STORAGE_KEY, MAX_SAVE_BYTES, matchesBaseline, parseKingdom,
  type SavedBlock, type SavedKingdom, type WorldCheckpoint} from './continuity';
import {forkFromTimeAnchor, newTimeLedger, previousMoment, recordTimeAnchor, type AnchorCause} from './timeline';
import {groundStats} from './environment';
import BackgroundMusic from './utils/BackgroundMusic';
import {gameAudio, type GameState} from './utils/helper';
import {usePlayground, usePlaygroundGameLifecycle} from './utils/usePlayground';

const POWERS = Object.keys(CATASTROPHES) as CatastropheType[];
const BEST_KEY = 'primordial_engine_3d_best_v2';
const TRIAL_BEST_KEY = 'primordial_engine_trial_best_v1';
const newSeed = () => Math.floor(Math.random() * 0x100000000) >>> 0;
function readLocalKingdom(): SavedKingdom | null {
  try {return parseKingdom(window.localStorage.getItem(KINGDOM_STORAGE_KEY));}
  catch (_) {return null;}
}
function downloadJSON(name: string, data: string) {
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const style = `
  .pe-ui { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #f1f5f9; }
  .pe-ui button, .pe-ui select, .pe-ui input { font: inherit; }
  .pe-panel { background: rgba(9,17,35,.85); border: 1px solid rgba(148,163,184,.25); border-radius: 13px;
    box-shadow: 0 14px 42px rgba(0,0,0,.36); backdrop-filter: blur(12px); }
  .pe-button { min-height: 38px; border: 1px solid rgba(148,163,184,.38); border-radius: 9px; padding: 8px 11px;
    background: rgba(30,41,59,.88); color: #f1f5f9; cursor: pointer; touch-action: manipulation; }
  .pe-button:focus-visible { outline: 3px solid #facc15; outline-offset: 2px; }
  .pe-button:hover { background: rgba(51,65,85,.96); }
  .pe-button:disabled { opacity: .4; cursor: not-allowed; }
  .pe-button[aria-pressed="true"] { border-color: #fbbf24; background: rgba(113,63,18,.75); }
  .pe-power { display: flex; align-items: center; gap: 7px; min-width: 0; text-align: left; }
  .pe-power span { font-size: 19px; }
  .pe-power strong { font-size: 12px; line-height: 1.2; }
  .pe-power em { font-style: normal; font-size: 10px; opacity: .55; margin-left: auto; }
  .pe-powers { display: grid; grid-template-columns: repeat(5, minmax(108px, 1fr)); gap: 5px; padding: 9px; }
  .pe-top { position: absolute; z-index: 10; top: max(12px, env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; pointer-events: none; }
  .pe-top > * { pointer-events: auto; }
  .pe-bottom { position: absolute; z-index: 10; bottom: max(12px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);
    width: min(725px, calc(100% - 20px)); pointer-events: auto; }
  .pe-actions { display: flex; align-items: center; gap: 6px; padding: 8px; flex-wrap: wrap; justify-content: center; }
  .pe-subtitle { color: #94a3b8; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
  .pe-help { padding: 11px; font-size: 12px; line-height: 1.5; color: #cbd5e1; }
  .pe-ledger { position: absolute; z-index: 11; top: 135px; right: 12px; width: min(364px, calc(100% - 24px));
    max-height: calc(100% - 245px); overflow-y: auto; padding: 13px; pointer-events: auto; }
  .pe-ledger h2 { font-size: 13px; margin: 0; letter-spacing: .14em; color: #f6c775; }
  .pe-stat-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 4px; margin: 10px 0; }
  .pe-stat { text-align: center; background: rgba(96, 64, 43, .25); border-radius: 7px; padding: 6px 2px; }
  .pe-stat b { display: block; font-size: 14px; }
  .pe-stat span { font-size: 9px; color: #bfc7d5; }
  .pe-chronicle { margin: 9px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  .pe-chronicle li { border-left: 2px solid #997648; padding: 3px 0 3px 10px; }
  .pe-chronicle small { color: #a6b2c1; margin-left: 6px; }
  .pe-chronicle p { color: #bfc7d5; line-height: 1.45; font-size: 11px; margin: 3px 0 0; }
  .pe-save-status { color: #aebed1; font-size: 11px; margin-left: 7px; }
  .pe-inspection { padding: 8px 10px; margin: 8px 0; background: rgba(37, 52, 65, .7);
    border: 1px solid rgba(251,191,36,.35); border-radius: 8px; font-size: 11px; line-height: 1.5; }
  .pe-trial { position: absolute; z-index: 11; top: 112px; right: 12px; width: min(344px, calc(100% - 24px));
    max-height: min(41vh, 320px); overflow-y: auto; padding: 12px; pointer-events: auto; border-color: rgba(251,191,36,.48); }
  .pe-trial h2 {font-size: 14px; margin: 0 0 6px; color: #f6d38a; letter-spacing: .10em;}
  .pe-trial progress {display:block;width:100%;height:9px;accent-color:#e8b762;}
  .pe-trial .pe-objective {font-size:12px;line-height:1.45;color:#e2e8f0;margin: 8px 0;}
  .pe-timeline { position: absolute; z-index: 12; top: 132px; left: 12px; width: min(380px, calc(100% - 24px));
    max-height: calc(100% - 245px); overflow-y: auto; padding: 13px; pointer-events: auto; }
  .pe-timeline h2 { margin: 0; font-size: 14px; letter-spacing: .12em; color: #f6c775; }
  .pe-time-list { list-style: none; padding: 0; display: grid; gap: 7px; margin: 12px 0 0; }
  .pe-time-list li { border-left: 2px solid #ae8753; background: rgba(25,38,55,.7); padding: 6px; border-radius: 3px 8px 8px 3px; }
  .pe-time-list button { width: 100%; text-align: left; display: block; font-weight: 650; }
  .pe-time-list small { display: block; color: #bfc7d5; font-size: 11px; line-height: 1.45; padding: 5px 3px 0; }
  @media (max-width: 600px) {
    .pe-top { top: max(8px, env(safe-area-inset-top)); left: 8px; right: 8px; }
    .pe-top h1 { font-size: 12px !important; }
    .pe-top .pe-subtitle { font-size: 9px; }
    .pe-powers { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 42vh; overflow-y: auto; }
    .pe-power strong { font-size: 11px; }
    .pe-button { min-height: 44px; }
    .pe-actions { justify-content: space-around; }
    .pe-ledger { top: 105px; right: 8px; max-height: calc(100% - 253px); width: min(355px, calc(100% - 16px)); }
    .pe-trial {top: 109px;right: 8px;max-height: min(36vh, 255px);width:min(344px,calc(100% - 16px));}
    .pe-timeline { top: 105px; left: 8px; max-height: min(45vh, 360px); width: min(355px, calc(100% - 16px)); }
    .pe-ledger { max-height: min(45vh, 360px); }
    .pe-powers { max-height: min(35vh, 210px); }
    .pe-top .pe-panel { max-width: 69vw !important; }
    .pe-top > .pe-panel:last-child { font-size: 10px !important; }
  }
  @media (max-height: 550px) and (max-width: 900px) {
    .pe-ledger, .pe-timeline { top: 62px; max-height: 42vh; }
    .pe-bottom { bottom: 3px; }
  }

  /* THE FIELD ATLAS: ink, weathered brass and mineral green. Never obscure the world. */
  .pe-ui {
    --pe-ink: #101e26; --pe-steel: #263c43; --pe-brass: #e1c181;
    --pe-parchment: #f1e8cf; --pe-muted: #c5cecc;
    font-family: 'Trebuchet MS', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--pe-parchment);
  }
  .pe-ui .pe-panel {
    background: linear-gradient(157deg, rgba(24,43,48,.94), rgba(13,27,35,.91));
    border: 1px solid rgba(211,186,125,.50);
    border-top-color: rgba(244,224,166,.68);
    border-radius: 11px;
    box-shadow: 0 2px 0 rgba(4,12,17,.58), 0 10px 32px rgba(2,8,12,.42),
      inset 0 1px 0 rgba(255,248,211,.05);
    backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
  }
  .pe-ui .pe-top h1, .pe-ui .pe-panel h2, .pe-ui .pe-timeline h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-variant: small-caps; letter-spacing: .08em;
    color: #f3dfb0;
  }
  .pe-ui .pe-subtitle { color: #c6cdc2; letter-spacing: .13em; font-weight: 640; }
  .pe-ui .pe-button {
    min-height: 42px; border: 1px solid rgba(183,195,180,.30);
    border-bottom-color: rgba(210,178,118,.40);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(47,70,73,.95), rgba(26,42,49,.96));
    color: #f2eddf; font-weight: 560; letter-spacing: .012em;
    box-shadow: inset 0 1px 0 rgba(239,230,193,.065), 0 2px 3px rgba(1,9,12,.24);
    transition: background-color .14s ease, border-color .14s ease, box-shadow .14s ease, transform .14s ease;
  }
  .pe-ui .pe-button:hover:not(:disabled) {
    background: linear-gradient(180deg, #415d60, #2b4148);
    border-color: rgba(234,204,142,.74);
  }
  .pe-ui .pe-button:active:not(:disabled) { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,.24); }
  .pe-ui .pe-button:focus-visible { outline: 3px solid #f7d77d; outline-offset: 3px; }
  .pe-ui .pe-button[aria-pressed='true'], .pe-ui .pe-button[aria-expanded='true'] {
    border-color: #e0bd73;
    background: linear-gradient(160deg, #5a5036, #3c493e);
    color: #fff0c5;
    box-shadow: 0 0 0 1px rgba(209,160,72,.15), inset 0 1px 0 rgba(255,236,158,.15);
  }
  .pe-ui .pe-button:disabled { opacity: .48; filter: saturate(.5); }
  .pe-ui .pe-power { padding: 10px; gap: 9px; min-height: 54px; }
  .pe-ui .pe-power span { flex: 0 0 auto; filter: saturate(.8); }
  .pe-ui .pe-power strong { font-size: 12px; letter-spacing: .035em; }
  .pe-ui .pe-power em { color: #d6ceba; opacity: .84; font-size: 10px; }
  .pe-ui .pe-powers { gap: 7px; padding: 11px; }
  .pe-ui .pe-actions { border-top: 1px solid rgba(231,196,129,.24); gap: 7px; }
  .pe-ui .pe-stat { background: #253b3d; border: 1px solid rgba(205,190,141,.25); }
  .pe-ui .pe-stat b { color: #e9d5a5; font-variant-numeric: tabular-nums; }
  .pe-ui .pe-stat span { color: #c6d1c8; }
  .pe-ui .pe-chronicle li, .pe-ui .pe-time-list li { border-left-color: #d4b16e; }
  .pe-ui .pe-inspection { background: rgba(24,49,52,.82); border-color: rgba(227,199,130,.64); }
  .pe-ui .pe-trial progress {accent-color: #dfbd77;}
  .pe-ui .pe-save-status { color: #d4dccf; }
  .pe-ui fieldset { border-color: rgba(224,191,126,.38) !important; }
  .pe-ui legend { color: #e7cf9a; font-family: Georgia, serif; }
  .pe-ui select { color-scheme: dark; }
  .pe-ui input[type=file] { color: #e8e5d4; }
  @media (max-width: 600px) {
    .pe-ui .pe-button { min-height: 44px; }
    .pe-ui .pe-powers {grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px;}
    .pe-ui .pe-power {min-height: 48px;}
    .pe-ui .pe-panel { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
    .pe-ui .pe-actions { gap: 5px; }
    .pe-ui .pe-actions .pe-button {flex: 1 1 auto;}
  }
  @media (prefers-reduced-motion: reduce) {
    .pe-ui *, .pe-ui *::before, .pe-ui *::after {transition-duration: 0s !important; animation-duration: 0.01ms !important;}
    .pe-ui .pe-button:active:not(:disabled) {transform: none;}
  }
  @media (prefers-contrast: more) {
    .pe-ui .pe-panel, .pe-ui .pe-button {border-width: 2px;}
    .pe-ui .pe-subtitle {color: #f5f5ee;}
  }
`;

interface CustomWindow extends Window {canHandleBackKey?: boolean;}

export default function App() {
  const {sdk} = usePlayground();
  // Decode once. React state never becomes authoritative over the 3D world.
  const [restoredKingdom, setRestoredKingdom] = useState<SavedKingdom | null>(readLocalKingdom);
  const [worldSeed, setWorldSeed] = useState(() => restoredKingdom?.seed ?? newSeed());
  const seedRef = useRef(worldSeed);
  const [checkpointRequest, setCheckpointRequest] = useState(0);
  const [saveStatus, setSaveStatus] = useState(restoredKingdom ? 'Saved kingdom loaded' : 'Not saved yet');
  const pendingExportRef = useRef(false);
  const pendingVaultRef = useRef<{slot: VaultSlot; replace: boolean} | null>(null);
  const [vaultRevision, setVaultRevision] = useState(0);
  const [vaultStatus, setVaultStatus] = useState('Save three protected kingdom checkpoints.');
  const [gameState, setGameState] = useState<GameState>(() => ({status: 'PLAYING',
    score: restoredKingdom?.score ?? 0, level: 1, chaosScore: restoredKingdom?.chaosScore ?? 0}));
  const [activePower, setActivePower] = useState<CatastropheType>('volcano');
  const [resetSignal, setResetSignal] = useState(0);
  // An epoch token prevents a stale frame from overwriting a newly rewound world.
  const epochRef = useRef(0);
  const canonicalBlocksRef = useRef<SavedBlock[] | null>(null);
  const pendingAnchorRef = useRef<{label: string; marker: string; cause: AnchorCause} | null>(null);
  const forkLabelRef = useRef<string | null>(null);
  const anchorCounterRef = useRef(0);
  const importSequenceRef = useRef(0);
  const [timeline, setTimeline] = useState(newTimeLedger);
  const [timeOpen, setTimeOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialAutoFocus,setTrialAutoFocus]=useState(true);
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialGeneration, setTrialGeneration] = useState(0);
  const preTrialSettingsRef = useRef<{speed:number; force:number} | null>(null);
  const [trialProgress, setTrialProgress] = useState<TrialView | null>(null);
  const [trialBest, setTrialBest] = useState(() => {
    try {return Math.max(0,Number(window.localStorage.getItem(TRIAL_BEST_KEY)) || 0);} catch (_) {return 0;}
  });
  const [simulationSpeed, setSimulationSpeed] = useState(Number(getConfig('simulationSpeed')));
  const [powerForce, setPowerForce] = useState(Number(getConfig('catastrophePower')) || 1.2);
  const [quality, setQuality] = useState<GraphicsQuality>(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 'low' : 'medium');
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [forecastMode, setForecastMode] = useState(false);
  const [memoryLayer, setMemoryLayer] = useState<'all' | FieldChannel>('all');
  const [wind, setWind] = useState<Wind>(() => windAt(restoredKingdom?.simTime ?? 0, worldSeed));
  const [inspectedGround, setInspectedGround] = useState<string | null>(null);
  const [chronicle, setChronicle] = useState<ChronicleEvent[]>(() => restoredKingdom?.chronicle ?? []);
  const preTrialChronicleRef=useRef<ChronicleEvent[] | null>(null);
  const [groundMetrics, setGroundMetrics] = useState<GroundStats>(() => restoredKingdom
    ? groundStats(hydrateGround(restoredKingdom.ground))
    : {heated: 0, soaked: 0, frozen: 0, scarred: 0, formedStone: 0});
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [message, setMessage] = useState(restoredKingdom
    ? 'The kingdom has returned. Its scars survived the last visit.'
    : 'Select a miracle below, then touch the world to cast.');
  const [telemetry, setTelemetry] = useState({fps: 0, calls: 0});
  const [bestScore, setBestScore] = useState(() => {
    try { return Math.max(0, Number(window.localStorage.getItem(BEST_KEY)) || 0); }
    catch (_) { return 0; }
  });

  const gameStateRef = useRef(gameState);
  const chronicleRef = useRef(chronicle);
  gameStateRef.current = gameState;
  chronicleRef.current = chronicle;

  const onCheckpoint = useCallback((core: WorldCheckpoint, sourceEpoch: number) => {
    // Same-seed time travel also invalidates old scene checkpoints.
    if (core.seed !== seedRef.current || sourceEpoch !== epochRef.current) return;
    const save = captureKingdom(core, {score: gameStateRef.current.score,
      chaosScore: gameStateRef.current.chaosScore ?? 0,
      chronicle: chronicleRef.current});
    const serialized = JSON.stringify(save);
    // Never overwrite the last good save with a snapshot that could not be
    // reloaded. This also protects session time anchors and portable exports.
    if (serialized.length > MAX_SAVE_BYTES || !parseKingdom(serialized)) {
      setSaveStatus('Snapshot failed validation; previous world save preserved');
      pendingExportRef.current = false;
      pendingAnchorRef.current = null;
      if (pendingVaultRef.current) setVaultStatus('Snapshot failed validation; slot preserved');
      pendingVaultRef.current = null;
      return;
    }
    const pendingVault = pendingVaultRef.current;
    if (pendingVault) {
      pendingVaultRef.current = null;
      let result: ReturnType<typeof writeSlot> = 'storage-unavailable';
      try {result = writeSlot(window.localStorage, pendingVault.slot, save, pendingVault.replace);} catch (_) {}
      setVaultStatus(result === 'saved' ? `Slot ${pendingVault.slot} secured independently of autosave.` :
        result === 'occupied' ? `Slot ${pendingVault.slot} is occupied; use Replace slot.` :
        result === 'invalid' ? 'Invalid checkpoint; slot was preserved.' : 'Storage unavailable; slot was preserved.');
      if (result === 'saved') setVaultRevision(n => n + 1);
    }
    const pending = pendingAnchorRef.current;
    if (pending) {
      pendingAnchorRef.current = null;
      setTimeline(previous => recordTimeAnchor(previous, save, pending.label, pending.marker, pending.cause));
    }
    // A local storage failure must not prevent the optional portable export.
    try {
      window.localStorage.setItem(KINGDOM_STORAGE_KEY, serialized);
      setSaveStatus(`Saved locally at ${new Date(save.savedAt).toLocaleTimeString()}`);
    } catch (_) {setSaveStatus('Local storage unavailable; export still works');}
    if (pendingExportRef.current) {
      pendingExportRef.current = false;
      downloadJSON('primordial-kingdom-v1.json', serialized);
    }
  }, []);
  const exportTrialReport = () => {
    if (!trialProgress || trialProgress.result==='running') return;
    downloadJSON('primordial-covenant-after-action.json',JSON.stringify({
      format:'primordial-covenant-after-action-v1', title:'The Covenant',
      interpretation:'Fictional gameplay results, not records of actual lives or events',
      result:trialProgress.result,score:trialProgress.score,
      completed:trialProgress.cleared,attempts:trialProgress.casts,
      stages:trialProgress.reports,
    },null,2));
  };
  const onTrialView = useCallback((next: TrialView | null) => {
    setTrialProgress(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const restorePreTrialSettings = useCallback(() => {
    const prior = preTrialSettingsRef.current;
    preTrialSettingsRef.current = null;
    if (prior) {setSimulationSpeed(prior.speed);setPowerForce(prior.force);}
  }, []);
  const endTrial = useCallback(() => {
    preTrialChronicleRef.current=null;
    setTrialEnabled(false);
    setTrialProgress(null);
    setTrialOpen(false);
    restorePreTrialSettings();
    setMessage('The Covenant ended. Unrestricted sandbox casting has returned.');
  }, [restorePreTrialSettings]);
  const beginTrial = () => {
    // Trials play on the actual current kingdom. Its old scars are not wiped.
    // Time & cast strength are locked for comparable challenge scores.
    if (!trialEnabled) {
      preTrialSettingsRef.current = {speed:simulationSpeed,force:powerForce};
      preTrialChronicleRef.current=[...chronicleRef.current];
    } else if (preTrialChronicleRef.current) {
      // Reset the visible causal record with the world for a genuinely comparable retry.
      // Cancel queued asynchronous outputs from the previous attempt: they must not
      // claim the replacement world's state as their own evidence.
      pendingAnchorRef.current=null;
      pendingVaultRef.current=null;
      pendingExportRef.current=false;
      chronicleRef.current=[...preTrialChronicleRef.current];
      setChronicle(chronicleRef.current);
    }
    setTrialProgress(null);
    setActivePower('wave');
    setTrialEnabled(true);
    setTrialGeneration(previous => previous + 1);
    setPowerForce(1);
    setSimulationSpeed(1);
    setGameState(previous => ({...previous,status:'PLAYING'}));
    setInspectMode(false);
    setForecastMode(false);
    setPowerMenuOpen(false);
    setSettingsOpen(false);
    setHelpOpen(false);
    setMemoryOpen(false);
    setTimeOpen(false);
    setTrialOpen(true);
    setMessage('The Covenant begins. Locate the warning beacon and defend the living kingdom.');
  };
  // One deliberate camera framing per ordeal. Never wrest control every frame.
  useEffect(() => {
    if (!trialEnabled || !trialAutoFocus || !trialProgress || trialProgress.result!=='running') return;
    setCameraPreset(`trial:${trialProgress.target.x}:${trialProgress.target.z}`);
  }, [trialEnabled, trialGeneration, trialAutoFocus, trialProgress?.stage]);
  useEffect(() => {
    if (trialProgress?.result !== 'victory' || trialProgress.score <= trialBest) return;
    setTrialBest(trialProgress.score);
    try {window.localStorage.setItem(TRIAL_BEST_KEY,String(trialProgress.score));} catch (_) {}
  }, [trialProgress?.result,trialProgress?.score,trialBest]);
  const onBaseline = useCallback((blocks: SavedBlock[]) => {
    // Source geometry, not a user-supplied file, determines import compatibility.
    canonicalBlocksRef.current = blocks;
  }, []);
  const onSaveRejected = useCallback(() => {
    preTrialChronicleRef.current=null;
    setTrialEnabled(false);setTrialProgress(null);setTrialOpen(false);restorePreTrialSettings();
    try {window.localStorage.removeItem(KINGDOM_STORAGE_KEY);} catch (_) {}
    setRestoredKingdom(null);
    const seed = newSeed();
    seedRef.current = seed;
    epochRef.current += 1;
    pendingAnchorRef.current = null;
    pendingVaultRef.current = null;
    setTimeline(newTimeLedger());
    setWorldSeed(seed);
    setWind(windAt(0, seed));
    setResetSignal(prev => prev + 1);
    setGameState({status: 'PLAYING', score: 0, level: 1, chaosScore: 0});
    setChronicle([]);
    setSaveStatus('Incompatible save rejected');
    setMessage('Saved geometry did not match this project. A new kingdom was created.');
  }, [restorePreTrialSettings]);
  const saveNow = () => setCheckpointRequest(previous => previous + 1);
  const anchorNow = () => {
    pendingAnchorRef.current = {label: 'Chosen moment', marker: `manual:${++anchorCounterRef.current}`, cause: 'manual'};
    setCheckpointRequest(previous => previous + 1);
  };
  const exportWorld = () => {
    pendingExportRef.current = true;
    setCheckpointRequest(previous => previous + 1);
  };
  const saveToVault = (slot: VaultSlot, replace: boolean) => {
    pendingVaultRef.current = {slot, replace};
    setCheckpointRequest(n => n + 1);
  };
  const activateSavedWorld = (saved: SavedKingdom, message: string) => {
    if (!canonicalBlocksRef.current || !matchesBaseline(saved, canonicalBlocksRef.current)) return false;
    preTrialChronicleRef.current=null;
    setTrialEnabled(false);setTrialProgress(null);setTrialOpen(false);restorePreTrialSettings();
    // Invalidate all old frame checkpoints, pending slot writes and file imports.
    importSequenceRef.current += 1;
    seedRef.current = saved.seed;
    epochRef.current += 1;
    pendingVaultRef.current = null;
    pendingAnchorRef.current = null;
    pendingExportRef.current = false;
    setTimeline(newTimeLedger());
    setRestoredKingdom(saved);
    setWorldSeed(saved.seed);
    setWind(windAt(saved.simTime, saved.seed));
    setResetSignal(n => n + 1);
    setGameState({status: 'PAUSED', score: saved.score, level: 1, chaosScore: saved.chaosScore});
    setChronicle(saved.chronicle);
    setGroundMetrics(groundStats(hydrateGround(saved.ground)));
    setInspectedGround(null);
    try {window.localStorage.setItem(KINGDOM_STORAGE_KEY, JSON.stringify(saved));}
    catch (_) {setSaveStatus('Restored in memory; local storage unavailable');}
    setMessage(message);
    return true;
  };
  const restoreFromVault = (slot: VaultSlot) => {
    try {
      const saved = readSlot(window.localStorage, slot);
      if (saved && activateSavedWorld(saved, `Restored checkpoint ${slot}. Paused for inspection.`)) {
        setVaultStatus(`Slot ${slot} loaded safely; original slot remains intact.`);
        return;
      }
    } catch (_) { /* Private storage may be disabled. */ }
    setVaultStatus(`Slot ${slot} is empty, corrupt, or incompatible; current world preserved.`);
  };
  const vaultSlots = useMemo(() => {
    try {return summaries(window.localStorage);} catch (_) {return [];}
  }, [vaultRevision]);
  const importWorld = async (file: File | undefined) => {
    if (!file) return;
    const startedInEpoch = epochRef.current;
    const sequence = ++importSequenceRef.current;
    try {
      if (file.size > MAX_SAVE_BYTES) throw new Error('oversized');
      const content = await file.text();
      if (startedInEpoch !== epochRef.current || sequence !== importSequenceRef.current) return;
      const saved = parseKingdom(content);
      if (!saved) throw new Error('invalid');
      if (!canonicalBlocksRef.current || !matchesBaseline(saved, canonicalBlocksRef.current))
        throw new Error('incompatible geometry');
      // The same validated transition owns both imported worlds and vault restores.
      if (!activateSavedWorld(saved, 'Imported kingdom. Paused for inspection.')) throw new Error('incompatible');
      setSaveStatus('World imported; validating scene');
    } catch (_) {
      if (startedInEpoch === epochRef.current && sequence === importSequenceRef.current)
        setSaveStatus('Invalid or incompatible world file; current kingdom preserved');
    }
  };

  useEffect(() => {
    (window as CustomWindow).canHandleBackKey = true;
    if (sdk) sdk.startGame();
  }, [sdk]);
  useEffect(() => {
    gameAudio.setVolume(sfxMuted ? 0 : Number(getConfig('defaultSfxVolume')));
  }, [sfxMuted]);
  useEffect(() => {
    if (gameState.score <= bestScore) return;
    setBestScore(gameState.score);
    try {window.localStorage.setItem(BEST_KEY, String(gameState.score));} catch (_) {}
  }, [gameState.score, bestScore]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);
        setMemoryOpen(false);setTimeOpen(false);setInspectMode(false);setForecastMode(false);setTrialOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.closest('button,input,textarea,select,[contenteditable="true"]'))) return;
      if (/^[1-9]$/.test(event.key) || event.key === '0') {
        const index = event.key === '0' ? 9 : Number(event.key) - 1;
        setActivePower(POWERS[index]);
        setMessage(`${CATASTROPHES[POWERS[index]].name} selected`);
      }
      if (event.key.toLowerCase() === 'p' && !event.repeat) {
        setGameState(prev => ({...prev, status: prev.status === 'PAUSED' ? 'PLAYING' : 'PAUSED'}));
      }
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, []);

  const onGestureSuccess = useCallback((type: CatastropheType) => {
    setActivePower(type);
    gameAudio.playPowerupChime();
  }, []);
  const onGestureFail = useCallback(() => { gameAudio.playHoverMicroTone(); }, []);
  const onMessage = useCallback((nextMessage: string) => { setMessage(nextMessage); }, []);
  const onTelemetry = useCallback((fps: number, calls: number) => {
    setTelemetry(prev => prev.fps === fps && prev.calls === calls ? prev : {fps, calls});
  }, []);
  const onWorldEvent = useCallback((event: ChronicleEvent) => {
    setChronicle(prev => [event, ...prev].slice(0, 300));
    // Snapshot after the committed React score and chronicle updates. Multiple
    // events batched in a frame share the latest coherent world snapshot.
    pendingAnchorRef.current = {label: event.kind === 'reaction' ? 'The aftermath' : event.title,
      marker: `event:${event.id}`, cause: 'event'};
    setCheckpointRequest(previous => previous + 1);
  }, []);
  const onWind = useCallback((next: Wind) => {
    setWind(prev => prev.name === next.name && Math.abs(prev.strength - next.strength) < 0.04 ? prev : next);
  }, []);
  const onGroundStats = useCallback((next: GroundStats) => {
    setGroundMetrics(prev => Object.keys(next).every(
      key => prev[key as keyof GroundStats] === next[key as keyof GroundStats]) ? prev : next);
  }, []);
  const onInspect = useCallback((description: string) => {
    setInspectedGround(description);
    setMemoryOpen(true);
  }, []);
  const exportChronicle = useCallback(() => {
    if (chronicle.length === 0) return;
    const data = {format: 'primordial-chronicle-v1', title: 'Primordial Engine 3D',
      events: [...chronicle].reverse(), ground: groundMetrics};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'primordial-world-memory.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [chronicle, groundMetrics]);
  const resetWorld = () => {
    preTrialChronicleRef.current=null;
    setTrialEnabled(false);setTrialProgress(null);setTrialOpen(false);restorePreTrialSettings();
    // Only the active kingdom is forgotten, never the best-score history.
    const seed = newSeed();
    seedRef.current = seed;
    epochRef.current += 1;
    pendingAnchorRef.current = null;
    pendingVaultRef.current = null;
    setTimeline(newTimeLedger());
    pendingExportRef.current = false;
    try {window.localStorage.removeItem(KINGDOM_STORAGE_KEY);} catch (_) {}
    setRestoredKingdom(null);
    setWorldSeed(seed);
    setWind(windAt(0, seed));
    setSaveStatus('New world; not saved yet');
    setGameState({status: 'PLAYING', score: 0, level: 1, chaosScore: 0});
    setResetSignal(previous => previous + 1);
    setChronicle([]);
    setInspectedGround(null);
    setGroundMetrics({heated: 0, soaked: 0, frozen: 0, scarred: 0, formedStone: 0});
    setMessage('A new world begins. The previous kingdom has been regenerated.');
  };
  // The first checkpoint in each epoch is a real playable rewind point.
  useEffect(() => {
    const forkLabel = forkLabelRef.current;
    forkLabelRef.current = null;
    pendingAnchorRef.current = {
      label: forkLabel ?? (resetSignal === 0 ? 'The kingdom before' : 'A kingdom begins'),
      marker: `epoch:${resetSignal}`, cause: forkLabel ? 'fork' : 'genesis',
    };
    setCheckpointRequest(previous => previous + 1);
  }, [resetSignal]);

  const rewindTo = (id: number) => {
    if (trialEnabled && trialProgress?.result === 'running') {
      setMessage('The Time Atlas is locked during a live Covenant ordeal. End the trial to rewind.');
      return;
    }
    preTrialChronicleRef.current=null;
    setTrialEnabled(false);setTrialProgress(null);setTrialOpen(false);restorePreTrialSettings();
    const fork = forkFromTimeAnchor(timeline, id);
    if (!fork || !canonicalBlocksRef.current || !matchesBaseline(fork.restored, canonicalBlocksRef.current)) {
      setMessage('This moment cannot be restored against the current kingdom geometry.');
      return;
    }
    const source = timeline.anchors.find(moment => moment.id === id);
    const saved = fork.restored;
    seedRef.current = saved.seed;
    epochRef.current += 1;
    pendingAnchorRef.current = null;
    pendingExportRef.current = false;
    forkLabelRef.current = `Fork of ${source?.label ?? 'the past'}`;
    pendingVaultRef.current = null; // Never write a prior world's queued slot request after rewind.
    setTimeline(fork.ledger);
    setRestoredKingdom(saved);
    setWorldSeed(saved.seed);
    setWind(windAt(saved.simTime, saved.seed));
    setResetSignal(previous => previous + 1);
    setGameState({status: 'PAUSED', score: saved.score, level: 1, chaosScore: saved.chaosScore});
    setChronicle(saved.chronicle);
    setGroundMetrics(groundStats(hydrateGround(saved.ground)));
    setInspectedGround(null);
    try {window.localStorage.setItem(KINGDOM_STORAGE_KEY, JSON.stringify(saved));
      setSaveStatus('Rewound world saved locally');}
    catch (_) {setSaveStatus('Rewound, but local storage is unavailable');}
    setMessage(`A different future begins at T+${saved.simTime.toFixed(1)}s. Paused until resumed.`);
  };
  const undoId = previousMoment(timeline)?.id ?? null;
  const paused = gameState.status === 'PAUSED';
  const speed = paused ? 0 : simulationSpeed;
  usePlaygroundGameLifecycle(gameState, sdk);

  return (
    <div className="pe-ui" style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#080d18'}}>
      <style>{style}</style>
      <BackgroundMusic url={getConfig('backgroundMusicUrl')} isPlaying={!paused}
        isMuted={musicMuted} volume={musicMuted ? 0 : Number(getConfig('defaultMusicVolume'))} />
      <main style={{position: 'absolute', inset: 0}} aria-label="Interactive 3D kingdom">
        <Game gameState={gameState} setGameState={setGameState} activePower={activePower}
          isMiraclePrimed={!paused && !inspectMode && !forecastMode} onGestureSuccess={onGestureSuccess} onGestureFail={onGestureFail}
          resetSignal={resetSignal} worldSeed={worldSeed} restoredKingdom={restoredKingdom}
          checkpointRequest={checkpointRequest} onCheckpoint={onCheckpoint} onSaveRejected={onSaveRejected}
          onBaseline={onBaseline}
          simSpeed={speed} powerForce={powerForce} interactionMode={forecastMode ? 'forecast' : inspectMode ? 'inspect' : 'cast'}
          cameraPreset={cameraPreset} onPresetApplied={() => setCameraPreset(null)}
          onMessage={onMessage} onTelemetry={onTelemetry} quality={quality}
          onWorldEvent={onWorldEvent} onGroundStats={onGroundStats} onInspect={onInspect}
          onWind={onWind} memoryLayer={memoryLayer}
          trialEnabled={trialEnabled} trialGeneration={trialGeneration} onTrialView={onTrialView} />
      </main>

      <div className="pe-top">
        <div className="pe-panel" style={{padding: '10px 14px', maxWidth: 'min(420px, 75vw)'}}>
          <h1 style={{fontSize: 15, letterSpacing: '.11em', margin: 0, fontWeight: 800}}>PRIMORDIAL ENGINE <span style={{color: '#fbbf24'}}>3D</span></h1>
          <div className="pe-subtitle">{trialEnabled ? 'The Covenant · Ordeal mode' : 'Living catastrophe sandbox'}</div>
          <div aria-live="polite" style={{marginTop: 7, fontSize: 12, color: '#e2e8f0'}}>{message}</div>
          <div style={{display: 'flex', gap: 12, marginTop: 7, fontSize: 11, color: '#cbd5e1'}}>
            <span>Chaos {gameState.chaosScore?.toLocaleString()}</span><span>Best {bestScore.toLocaleString()}</span>
          </div>
        </div>
        <div className="pe-panel" style={{padding: 8, textAlign: 'right', fontSize: 11}}>
          <div>{paused ? 'PAUSED' : `${telemetry.fps || '--'} FPS`} | {telemetry.calls} calls</div>
          <div className="pe-subtitle">{quality} graphics · wind {wind.name} {wind.strength.toFixed(1)}</div>
        </div>
      </div>

      {(trialOpen || trialEnabled) && <aside className="pe-trial pe-panel" aria-label="The Covenant challenge">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <h2>THE COVENANT</h2>
          <button className="pe-button" type="button" aria-label={trialEnabled ? (trialOpen ? 'Collapse trial panel' : 'Expand trial panel') : 'Close trial panel'}
            onClick={() => setTrialOpen(prev => !prev)}>
            {trialEnabled ? (trialOpen ? 'Collapse' : 'Expand') : 'Close'}
          </button>
        </div>
        {trialEnabled && !trialOpen && trialProgress?.result === 'running' ? <div style={{fontSize:11}} aria-live="off">
          {trialProgress.stageName} · {trialProgress.timeLeft}s · {trialProgress.energy} will
          <button className="pe-button" type="button" style={{marginLeft:8}}
            onClick={() => setCameraPreset(`trial:${trialProgress.target.x}:${trialProgress.target.z}`)}>Focus</button>
        </div> : !trialEnabled ? <>
          <p className="pe-objective">Three ordeals. A wildfire, a volcanic breach, and the falling sky.
            Protect what can be saved, transform what cannot, and restore the kingdom before time runs out.</p>
          <p className="pe-subtitle">Optional · starts on your current kingdom · Retry restores that attempt's original world;
            Return to sandbox keeps its final consequences. Trial history is session-only.</p>
          <p className="pe-subtitle">Your miracles also leave a record: damage you directly cause outside the
            objective lowers your grade even if those structures are restored later.</p>
          <button className="pe-button" type="button" onClick={beginTrial}>Begin three-act trial</button>
        </> : trialProgress ? <>
          <div aria-live="off" style={{fontSize:11,color:'#f4d49a',marginBottom:4}}>
            {trialProgress.result === 'running' ?
              `${trialProgress.stageName} · ${trialProgress.timeLeft}s left` :
              trialProgress.result === 'victory' ? 'COVENANT FULFILLED' : 'COVENANT BROKEN'}
          </div>
          <p className="pe-objective" style={{marginBottom:4}}>{trialProgress.objective}</p>
          <div style={{color:'#b9c7d8',fontSize:11,lineHeight:1.4}}>{trialProgress.progress}</div>
          {trialProgress.result === 'running' && <>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'8px 0 4px',fontSize:11}}>
              <span>Will {trialProgress.energy}/100</span>
              <span>Points {trialProgress.score}</span>
              <span>Ordeals {trialProgress.cleared}/3</span>
            </div>
            <progress value={trialProgress.energy} max={100} aria-label="Divine will available" />
            <p style={{fontSize:11,margin:'6px 0',color:'#fca5a5'}}>
              {trialProgress.nextThreat !== null ? `Incoming threat in ${trialProgress.nextThreat}s · follow the beacon` :
                'Threat active. The environment continues changing after its effect ends.'}</p>
            {trialProgress.pendingPlayerImpacts>0 && <p style={{fontSize:11,color:'#f1b894',lineHeight:1.45}}>
              {trialProgress.pendingPlayerImpacts} of your meteors still descending · the current ordeal cannot finalize until they land.
            </p>}
            <div className="pe-subtitle">{trialProgress.clue}</div>
            <p style={{fontSize:11,color:trialProgress.collateralCost>0?'#f1b894':'#b8c9d7',lineHeight:1.45,margin:'6px 0'}}>
              Witness account · {trialProgress.collateralStructures} off-target structures · {trialProgress.collateralTrees} trees harmed
              {trialProgress.collateralCost>0 ? ` · up to ${trialProgress.collateralPenalty} points at risk` : ' · No player-caused off-target harm recorded'}.
              Opposing threats are excluded.
            </p>
            <div style={{fontSize:12,lineHeight:1.45,borderLeft:'2px solid #f7c65b',padding:'5px 8px',marginTop:6,
              background:'rgba(122,80,22,.18)'}} aria-live="off">Next action: {trialProgress.nextAction}</div>
            <p style={{fontSize:11}}>Selected miracle costs {TRIAL_COST[activePower]} will.
              {trialProgress.energy < TRIAL_COST[activePower]
                ? ` Need ${TRIAL_COST[activePower]-trialProgress.energy} more will; wait or choose a cheaper miracle.`
                : ' Ready to cast once its individual cooldown finishes.'}</p>
            <label className="pe-subtitle" style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}>
              <input type="checkbox" checked={trialAutoFocus} onChange={event=>setTrialAutoFocus(event.target.checked)} />
              Auto-focus once per ordeal
            </label>
            <details><summary style={{cursor:'pointer',fontSize:11,color:'#f5d99f',padding:4}}>Tactical map · real threats</summary>
              <TrialTacticalMap view={trialProgress} />
            </details>
            <button className="pe-button" type="button"
              onClick={() => setCameraPreset(`trial:${trialProgress.target.x}:${trialProgress.target.z}`)}>
              Focus beacon · {Math.round(trialProgress.target.x)}, {Math.round(trialProgress.target.z)}
            </button>
          </>}
          {trialProgress.result !== 'running' && <p className="pe-objective">
            Final trial score: {trialProgress.score.toLocaleString()} · Victory record {trialBest.toLocaleString()}
          </p>}
          {trialProgress.reports.length>0 && <details open={trialProgress.result!=='running'}>
            <summary style={{cursor:'pointer',fontWeight:700,fontSize:12,marginTop:9}}>After-action ledger · {trialProgress.reports.length} ordeals</summary>
            <ol style={{paddingLeft:20,fontSize:11,lineHeight:1.55,margin:'7px 0'}}>
              {trialProgress.reports.map(report=><li key={report.stage} style={{marginBottom:5}}>
                <strong>{report.name}: {report.grade} · {report.result==='failed'?'Failed':`+${report.points} pts`}</strong>
                <div style={{color:'#bcd0e0'}}>{report.duration}s · {report.casts} casts · {report.preservation}% protected at finish
                  · peak {report.worstDamage} damaged entities</div>
                <div style={{color:report.collateralCost>0?'#f1b894':'#a5cfb2'}}>
                  Your off-target impact: {report.collateralStructures} structures, {report.collateralTrees} trees
                  · {report.result==='secured' ? `${report.collateralPenalty} points deducted` : 'harm recorded (no points awarded)'}
                </div>
              </li>)}
            </ol>
            <p className="pe-subtitle">Opponent damage and the damage from your spells are accounted for separately.
              Healing does not undo the fact that damage occurred.</p>
          </details>}
          <div style={{display:'flex',gap:8,marginTop:9,flexWrap:'wrap'}}>
            {trialProgress.result !== 'running' && <>
              <button className="pe-button" type="button" onClick={exportTrialReport}>Export after-action record</button>
              <button className="pe-button" type="button" onClick={beginTrial}>Retry from the same starting kingdom</button>
            </>}
            <button className="pe-button" type="button" onClick={endTrial}>Return to sandbox</button>
          </div>
        </> : <p className="pe-objective">Initializing trial against the current kingdom…</p>}
      </aside>}

      {timeOpen && <aside className="pe-timeline pe-panel" aria-label="Temporal atlas">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
          <div><h2>THE FORKING HOURS</h2>
            <div className="pe-subtitle">Temporal atlas · branch {timeline.branch}</div></div>
          <button className="pe-button" type="button" onClick={() => setTimeOpen(false)}>Close</button>
        </div>
        <p style={{fontSize: 12, lineHeight: 1.45, color: '#cbd5e1'}}>These are real kingdom states, not screenshots.
          Revisit an earlier moment to fork a new future. The old future remains available in this session.
          Time travel resets temporary debris and pauses the simulation.</p>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button className="pe-button" type="button" onClick={anchorNow}>Anchor this moment</button>
            <button className="pe-button" type="button" disabled={undoId === null}
              onClick={() => undoId !== null && rewindTo(undoId)}>
              Undo to previous anchor</button>
          </div>
        <div className="pe-subtitle" style={{marginTop: 7}}>Up to 12 moments · session only; export a world to preserve it</div>
        <ol className="pe-time-list">
          {[...timeline.anchors].reverse().map(anchor => <li key={anchor.id}>
            <button className="pe-button" type="button" onClick={() => rewindTo(anchor.id)}
              aria-label={`Rewind to ${anchor.label}, branch ${anchor.branch}, time ${anchor.simTime.toFixed(0)} seconds`}>
              {anchor.label} · T+{Math.floor(anchor.simTime)}s</button>
            <small>Branch {anchor.branch} · {anchor.structuresLost} fallen structures ·
              {anchor.treesLost} burned trees · {anchor.scarredCells} changed cells</small>
            {anchor.parentId !== null && <small>
              Since the prior moment: {anchor.structuresDelta >= 0 ? '+' : ''}{anchor.structuresDelta} structures,{' '}
              {anchor.treesDelta >= 0 ? '+' : ''}{anchor.treesDelta} trees,{' '}
              {anchor.scarsDelta >= 0 ? '+' : ''}{anchor.scarsDelta} surface cells
            </small>}
          </li>)}
        </ol>
        {!timeline.anchors.length && <p className="pe-subtitle">Recording the first kingdom moment.</p>}
      </aside>}

      {memoryOpen && <aside className="pe-ledger pe-panel" aria-label="World memory">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10}}>
          <div><h2>THE KINGDOM REMEMBERS</h2>
            <div className="pe-subtitle">Surface scars / saved continuity</div></div>
          <button className="pe-button" type="button" aria-label="Close world memory"
            onClick={() => setMemoryOpen(false)}>Close</button>
        </div>
        <div className="pe-stat-grid" aria-label="Surface condition counts">
          {([
            ['Hot', groundMetrics.heated], ['Wet', groundMetrics.soaked],
            ['Frost', groundMetrics.frozen], ['Ash', groundMetrics.scarred],
            ['Stone', groundMetrics.formedStone],
          ] as const).map(([label, count]) =>
            <div className="pe-stat" key={label}><b>{count}</b><span>{label}</span></div>)}
        </div>
        <label style={{fontSize: 12}}>Show surface layer{' '}
          <select className="pe-button" aria-label="Surface overlay channel" value={memoryLayer}
            onChange={event => setMemoryLayer(event.target.value as 'all' | FieldChannel)}>
            {(['all', 'heat', 'water', 'frost', 'ash', 'stone'] as const).map(layer =>
              <option key={layer} value={layer}>{layer === 'all' ? 'All materials' : layer}</option>)}
          </select>
        </label>
        <div className="pe-subtitle">Cell counts, not simulated people or terrain volume · wind {wind.name}</div>
        <div className="pe-save-status" role="status">{saveStatus}</div>
        {inspectedGround && <div className="pe-inspection" role="status">{inspectedGround}</div>}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 11}}>
          <strong style={{fontSize: 12}}>CONSEQUENCE RECORD <span style={{color: '#94a3b8', fontWeight: 400}}>({chronicle.length})</span></strong>
          <button className="pe-button" type="button" disabled={!chronicle.length} onClick={exportChronicle}>
            Export chronicle</button>
        </div>
        {chronicle.length ? <ol className="pe-chronicle">
          {chronicle.slice(0, 30).map(event => <li key={event.id}>
            <strong style={{fontSize: 12}}>{event.kind === 'reaction' ? 'AFTERMATH' : event.title}</strong>
            <small>T+{Math.floor(event.time)}s</small><p>{event.detail}</p>
          </li>)}
        </ol> : <p style={{fontSize: 12, color: '#bfc7d5'}}>No catastrophes recorded. Cast a miracle, then inspect what remains.</p>}
        {chronicle.length > 30 && <p className="pe-subtitle">Showing the latest 30; export contains up to 300 records.</p>}
      </aside>}

      <div className="pe-bottom pe-panel" aria-label="Divine control dock">
        {powerMenuOpen && (
          <div className="pe-powers" role="group" aria-label="Available miracles">
            {POWERS.map((id, index) => (
              <button key={id} className="pe-button pe-power" type="button" aria-pressed={id === activePower}
                title={CATASTROPHES[id].shortDesc} onClick={() => {setActivePower(id); setMessage(`${CATASTROPHES[id].name} selected`);}}>
                <span aria-hidden="true">{CATASTROPHES[id].icon}</span>
                <strong>{CATASTROPHES[id].name}</strong>
                <em style={{color:trialEnabled && trialProgress?.result==='running' && trialProgress.energy<TRIAL_COST[id]?'#fca5a5':undefined}}>
                  {trialEnabled && trialProgress?.result === 'running' ?
                    `${TRIAL_COST[id]} will${trialProgress.energy<TRIAL_COST[id]?' · wait':''}` : index === 9 ? 0 : index + 1}
                </em>
              </button>
            ))}
          </div>
        )}
        {settingsOpen && (
          <div className="pe-help" style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12}}>
            <label>Speed <select disabled={trialEnabled && trialProgress?.result === 'running'} aria-label="Simulation speed" value={simulationSpeed}
              onChange={e => setSimulationSpeed(Number(e.target.value))} className="pe-button">
              {[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}x</option>)}
            </select></label>
            <label>Force <input disabled={trialEnabled && trialProgress?.result === 'running'} aria-label="Catastrophe force" type="range" min={0.5} max={3} step={0.25}
              value={powerForce} onChange={e => setPowerForce(Number(e.target.value))}/>
              <output aria-label="Force multiplier">{powerForce.toFixed(2)}×</output></label>
            <label>Graphics <select aria-label="Graphics quality" value={quality}
              onChange={e => setQuality(e.target.value as GraphicsQuality)} className="pe-button">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select></label>
            <button className="pe-button" type="button" aria-pressed={musicMuted}
              onClick={() => setMusicMuted(prev => !prev)}>Music {musicMuted ? 'off' : 'on'}</button>
            <button className="pe-button" type="button" aria-pressed={sfxMuted}
              onClick={() => setSfxMuted(prev => !prev)}>SFX {sfxMuted ? 'off' : 'on'}</button>
            {(['god', 'castle', 'village', 'sanctuary'] as const).map(id =>
              <button key={id} className="pe-button" type="button" onClick={() => setCameraPreset(id)}>{id}</button>)}
            <button className="pe-button" type="button" onClick={saveNow}>Save kingdom</button>
            <button className="pe-button" type="button" onClick={exportWorld}>Export world</button>
            <label className="pe-button" style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
              Load world
              <input aria-label="Load saved world JSON" type="file" accept=".json,application/json"
                style={{maxWidth: 116, fontSize: 10}}
                onChange={e => {const file = e.target.files?.[0]; e.target.value = ''; void importWorld(file);}} />
            </label>
            <fieldset aria-label="Three protected kingdom checkpoints" style={{width: '100%', border: '1px solid #475569', borderRadius: 8, padding: 8}}>
              <legend>Kingdom vault · 3 independent slots</legend>
              {VAULT_SLOTS.map(slot => {
                const present = vaultSlots.find(s => s.slot === slot);
                let occupied = Boolean(present);
                try {occupied = window.localStorage.getItem(vaultKey(slot)) !== null;} catch (_) {}
                return <div key={slot} style={{display: 'flex', alignItems: 'center', gap: 6,
                  justifyContent: 'space-between', flexWrap: 'wrap', padding: '4px 0'}}>
                  <span style={{fontSize: 11}}>Slot {slot}: {present
                    ? `T+${Math.floor(present.simTime)}s · ${new Date(present.savedAt).toLocaleDateString()}`
                    : occupied ? 'Unreadable slot; replacement requires explicit action' : 'Empty'}</span>
                  {!occupied ? <button type="button" className="pe-button"
                    onClick={() => saveToVault(slot, false)}>Save slot</button> : <>
                    {present && <button type="button" className="pe-button"
                      onClick={() => restoreFromVault(slot)}>Load slot</button>}
                    <button type="button" className="pe-button"
                      aria-label={`Replace protected slot ${slot} with the active kingdom`}
                      onClick={() => saveToVault(slot, true)}>Replace slot</button>
                  </>}
                </div>;
              })}
              <div className="pe-save-status" role="status">{vaultStatus}</div>
            </fieldset>
            <button className="pe-button" type="button" onClick={resetWorld}>Regenerate kingdom</button>
          </div>
        )}
        {helpOpen && <div className="pe-help">Tap/click to cast. Draw a rune to cast its matching power. A failed rune never casts.
          Mouse: right-drag orbit, Shift+right-drag or middle-drag pan, wheel zoom, double-click focus.
          Keyboard: WASD/arrow pan, Q/E orbit, number keys 1-0 choose miracles, P pause.
          Touch: one finger cast/draw, two fingers pan and pinch to zoom. Inspect reads heat, water, ash and risk; Forecast estimates immediate effects without casting.
          The Covenant is an optional, session-only three-act challenge with real incoming threats, limited casting energy and an after-action record. Retry restores its starting world; ending the trial keeps the result. The Time Atlas cannot rewind while an ordeal is running.
          World Memory records surface changes and secondary events. The Forking Hours lets you save a moment and
          rewind to a new timeline branch; earlier futures remain for this session, but are not saved to disk.
          Kingdoms are checkpointed to this browser and can be exported or imported in Settings. Restoration repairs locally; regeneration replaces the saved world.</div>}
        <div className="pe-actions">
          <button className="pe-button" aria-expanded={powerMenuOpen} type="button"
            onClick={() => {setPowerMenuOpen(prev => !prev); setSettingsOpen(false); setHelpOpen(false);
              setMemoryOpen(false);setTimeOpen(false);}}>
            {CATASTROPHES[activePower].icon} {CATASTROPHES[activePower].name} <span aria-hidden="true">▾</span>
          </button>
          <button className="pe-button" type="button" aria-pressed={paused}
            onClick={() => setGameState(prev => ({...prev, status: prev.status === 'PAUSED' ? 'PLAYING' : 'PAUSED'}))}>
            {paused ? '▶ Resume' : 'Ⅱ Pause'}
          </button>
          <button className="pe-button" type="button" aria-pressed={inspectMode}
            onClick={() => {setInspectMode(prev => !prev); setForecastMode(false); setMemoryOpen(true); setTimeOpen(false);
              setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);
              setMessage(inspectMode ? 'Casting enabled.' : 'Inspection enabled. Tap a surface to read its history.');}}>
            {inspectMode ? 'Inspecting' : 'Inspect'}</button>
          <button className="pe-button" type="button" aria-pressed={forecastMode}
            onClick={() => {setForecastMode(prev => !prev);setInspectMode(false);setTimeOpen(false);
              setMemoryOpen(true);setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);
              setMessage(forecastMode ? 'Casting enabled.' : 'Forecast enabled: tap ground to preview without casting.');}}>
            {forecastMode ? 'Forecasting' : 'Forecast'}</button>
          <button className="pe-button" type="button" aria-expanded={memoryOpen}
            onClick={() => {setMemoryOpen(prev => !prev);setTimeOpen(false);
              setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);}}>World Memory</button>
          <button className="pe-button" type="button" disabled={trialEnabled && trialProgress?.result === 'running'} aria-expanded={timeOpen}
            onClick={() => {setTimeOpen(prev => !prev);setMemoryOpen(false);
              setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);}}>Time Atlas</button>
          <button className="pe-button" type="button" aria-pressed={trialEnabled} aria-expanded={trialOpen || trialEnabled}
            onClick={() => {if (trialEnabled) {setTrialOpen(true);} else {setTrialOpen(prev=>!prev);}
              setPowerMenuOpen(false);setSettingsOpen(false);setHelpOpen(false);setMemoryOpen(false);setTimeOpen(false);}}>
            {trialEnabled ? '⚑ Covenant' : '⚑ Trial'}</button>
          <button className="pe-button" type="button" aria-expanded={settingsOpen}
            onClick={() => {setSettingsOpen(prev => !prev); setPowerMenuOpen(false); setHelpOpen(false);
              setMemoryOpen(false);setTimeOpen(false);}}>Settings</button>
          <button className="pe-button" type="button" aria-expanded={helpOpen}
            onClick={() => {setHelpOpen(prev => !prev); setPowerMenuOpen(false); setSettingsOpen(false);
              setMemoryOpen(false);setTimeOpen(false);}}>Controls</button>
        </div>
      </div>
    </div>
  );
}
