import {useEffect, useRef, type MutableRefObject, type RefObject} from 'react';

export type InputAction = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'cancel' |
  'tap' | 'zoomIn' | 'zoomOut' | 'rotateLeft' | 'rotateRight';

export interface PointerState {
  nx: number;
  ny: number;
  clientX: number;
  clientY: number;
  pointerType: string;
  down: boolean;
  rightDown: boolean;
  middleDown: boolean;
  shiftDown: boolean;
  wheelDelta: number;
  movementX: number;
  movementY: number;
  panDeltaX: number;
  panDeltaY: number;
  touchCount: number;
  cancelled: boolean;
  doubleClicked: boolean;
}

export interface InputSnapshot {
  actions: Record<InputAction, boolean>;
  pointer: PointerState;
}

const ACTION_KEYS: Record<string, InputAction> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down', q: 'rotateLeft', e: 'rotateRight',
  Enter: 'confirm', ' ': 'confirm', Escape: 'cancel',
};

function createEmptyActions(): Record<InputAction, boolean> {
  return {left: false, right: false, up: false, down: false, confirm: false, cancel: false,
    tap: false, zoomIn: false, zoomOut: false, rotateLeft: false, rotateRight: false};
}

function emptyPointer(): PointerState {
  return {nx: 0, ny: 0, clientX: 0, clientY: 0, pointerType: 'mouse', down: false, rightDown: false,
    middleDown: false, shiftDown: false, wheelDelta: 0, movementX: 0, movementY: 0,
    panDeltaX: 0, panDeltaY: 0, touchCount: 0, cancelled: false, doubleClicked: false};
}

export function useInput(containerRef: RefObject<HTMLDivElement | null>, options: {enabled?: boolean} = {}): MutableRefObject<InputSnapshot> {
  const {enabled = true} = options;
  const inputRef = useRef<InputSnapshot>({actions: createEmptyActions(), pointer: emptyPointer()});

  useEffect(() => {
    const input = inputRef.current;
    input.actions = createEmptyActions();
    input.pointer = emptyPointer();
    if (!enabled) return;

    const container = containerRef.current;
    const pointers = new Map<number, {x: number; y: number; type: string}>();
    let lastClickTime = 0;
    let lastClickX = 0;
    let lastClickY = 0;
    let lastCenter: {x: number; y: number; distance: number} | null = null;

    const editable = (target: EventTarget | null) => target instanceof HTMLElement &&
      (target.matches('input,textarea,select,button,[contenteditable="true"]') ||
        Boolean(target.closest('[contenteditable="true"]')));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      input.pointer.shiftDown = event.shiftKey;
      const action = ACTION_KEYS[event.key.toLowerCase()] ?? ACTION_KEYS[event.key];
      if (!action) return;
      if (event.key.startsWith('Arrow') || event.key === ' ') event.preventDefault();
      input.actions[action] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      input.pointer.shiftDown = event.shiftKey;
      const action = ACTION_KEYS[event.key.toLowerCase()] ?? ACTION_KEYS[event.key];
      if (action) input.actions[action] = false;
    };
    const updatePosition = (x: number, y: number) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
      input.pointer.clientX = x - rect.left;
      input.pointer.clientY = y - rect.top;
      input.pointer.nx = (input.pointer.clientX / w) * 2 - 1;
      input.pointer.ny = -(input.pointer.clientY / h) * 2 + 1;
    };
    const getCenter = () => {
      const positions = [...pointers.values()];
      const a = positions[0], b = positions[1];
      return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
        distance: Math.hypot(a.x - b.x, a.y - b.y)};
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!container) return;
      if (pointers.size === 0) input.pointer.cancelled = false;
      pointers.set(event.pointerId, {x: event.clientX, y: event.clientY, type: event.pointerType});
      try { container.setPointerCapture(event.pointerId); } catch (_) {}
      const isMultiTouch = event.pointerType === 'touch' && pointers.size >= 2;
      input.pointer.touchCount = event.pointerType === 'touch' ? pointers.size : 0;
      if (isMultiTouch) {
        input.pointer.cancelled = true;
        input.pointer.down = false;
        input.actions.tap = false;
        lastCenter = getCenter();
        updatePosition(lastCenter.x, lastCenter.y);
        return;
      }
      const now = performance.now();
      const isLeft = event.button === 0;
      // Touch double taps are two distinct casting gestures, not mouse focus.
      // Never allow a preceding touch/pen event to seed the mouse click timer.
      const isMouseClick = isLeft && event.pointerType === 'mouse';
      input.pointer.doubleClicked = isMouseClick && lastClickTime > 0 && now - lastClickTime < 290 &&
        Math.hypot(event.clientX - lastClickX, event.clientY - lastClickY) < 24;
      if (isMouseClick) {lastClickTime = now; lastClickX = event.clientX; lastClickY = event.clientY;}
      else if (isLeft) lastClickTime = 0;
      updatePosition(event.clientX, event.clientY);
      input.pointer.pointerType = event.pointerType;
      input.pointer.down = isLeft;
      input.pointer.rightDown = event.button === 2;
      input.pointer.middleDown = event.button === 1;
      input.pointer.shiftDown = event.shiftKey;
      input.actions.tap = isLeft;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!container) return;
      const previous = pointers.get(event.pointerId);
      if (previous) pointers.set(event.pointerId, {...previous, x: event.clientX, y: event.clientY});
      if (input.pointer.touchCount >= 2 && pointers.size >= 2) {
        const center = getCenter();
        if (lastCenter) {
          input.pointer.panDeltaX += center.x - lastCenter.x;
          input.pointer.panDeltaY += center.y - lastCenter.y;
          input.pointer.wheelDelta += (lastCenter.distance - center.distance) * 0.65;
        }
        lastCenter = center;
        updatePosition(center.x, center.y);
        return;
      }
      const dx = previous ? event.clientX - previous.x : event.movementX;
      const dy = previous ? event.clientY - previous.y : event.movementY;
      input.pointer.movementX += dx;
      input.pointer.movementY += dy;
      input.pointer.shiftDown = event.shiftKey;
      updatePosition(event.clientX, event.clientY);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!container) return;
      const wasMultiTouch = input.pointer.cancelled;
      pointers.delete(event.pointerId);
      try { if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId); } catch (_) {}
      input.pointer.touchCount = event.pointerType === 'touch' ? pointers.size : 0;
      lastCenter = null;
      if (pointers.size === 0 || wasMultiTouch) {
        input.pointer.down = false;
        input.pointer.rightDown = false;
        input.pointer.middleDown = false;
        input.actions.tap = false;
      }
      updatePosition(event.clientX, event.clientY);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      input.pointer.cancelled = true;
      handlePointerUp(event);
    };
    const clearInput = () => {
      pointers.clear();
      lastCenter = null;
      input.pointer = {...emptyPointer(), cancelled: true};
      input.actions = createEmptyActions();
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      input.pointer.wheelDelta += Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 100);
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInput);
    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerCancel);
      container.addEventListener('wheel', handleWheel, {passive: false});
      container.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInput);
      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerup', handlePointerUp);
        container.removeEventListener('pointercancel', handlePointerCancel);
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [containerRef, enabled]);
  return inputRef;
}
