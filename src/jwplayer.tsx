import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { ALL, ON_REGEX, ONCE_REGEX } from './const';
import {
  generateConfig,
  generateUniqueId,
  getHandlerName,
  loadPlayer,
} from './util';

// JWPlayer Configuration Types
export interface JWPlayerConfig {
  file?: string | JWPlayerSource[];
  playlist?: string | JWPlayerPlaylistItem[];
  title?: string;
  description?: string;
  image?: string;
  mediaid?: string;
  width?: string | number;
  height?: string | number;
  aspectratio?: string;
  autostart?: boolean | 'viewable';
  mute?: boolean;
  repeat?: boolean;
  controls?: boolean;
  displaytitle?: boolean;
  displaydescription?: boolean;
  stretching?: 'uniform' | 'exactfit' | 'fill' | 'none';
  advertising?: JWPlayerAdvertising;
  captions?: JWPlayerCaptions;
  cast?: Record<string, unknown>;
  ga?: Record<string, unknown>;
  key?: string;
  logo?: JWPlayerLogo;
  preload?: 'auto' | 'metadata' | 'none';
  primary?: 'html5' | 'flash';
  skin?: JWPlayerSkin;
  tracks?: JWPlayerTrack[];
  [key: string]: unknown;
}

export interface JWPlayerSource {
  file: string;
  label?: string;
  type?: string;
  default?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

export interface JWPlayerPlaylistItem {
  file?: string | JWPlayerSource[];
  sources?: JWPlayerSource[];
  image?: string;
  title?: string;
  description?: string;
  mediaid?: string;
  tracks?: JWPlayerTrack[];
  [key: string]: unknown;
}

export interface JWPlayerTrack {
  file: string;
  kind?: 'captions' | 'chapters' | 'thumbnails';
  label?: string;
  default?: boolean;
}

export interface JWPlayerAdvertising {
  client?: string;
  tag?: string;
  schedule?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface JWPlayerCaptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontOpacity?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  edgeStyle?: 'none' | 'dropshadow' | 'raised' | 'depressed' | 'uniform';
  windowColor?: string;
  windowOpacity?: number;
}

export interface JWPlayerLogo {
  file?: string;
  link?: string;
  hide?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  margin?: number;
}

export interface JWPlayerSkin {
  name?: string;
  url?: string;
  active?: string;
  inactive?: string;
  background?: string;
}

// JWPlayer Instance Types
export interface JWPlayerInstance {
  setup(config: JWPlayerConfig): JWPlayerInstance;
  on(
    event: string,
    callback: EventCallback | AllEventCallback,
  ): JWPlayerInstance;
  once(event: string, callback: EventCallback): JWPlayerInstance;
  off(
    event?: string,
    callback?: EventCallback | AllEventCallback,
  ): JWPlayerInstance;
  trigger(event: string, args?: EventData): JWPlayerInstance;
  play(state?: boolean): void;
  pause(state?: boolean): void;
  stop(): void;
  load(playlist: JWPlayerPlaylistItem[] | string): void;
  playlistItem(index?: number): JWPlayerPlaylistItem | void;
  playlistNext(): void;
  playlistPrev(): void;
  playlistItemPlay(index: number): void;
  next(): void;
  seek(position: number): void;
  setCurrentQuality(index: number): void;
  setCurrentAudioTrack(index: number): void;
  setCurrentCaptions(index: number): void;
  setMute(state?: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  setFullscreen(state: boolean): void;
  resize(width: number, height: number): void;
  remove(): void;
  getState(): PlayerState;
  getPlaylist(): JWPlayerPlaylistItem[];
  getPlaylistIndex(): number;
  getPlaylistItem(index?: number): JWPlayerPlaylistItem | undefined;
  getDuration(): number;
  getPosition(): number;
  getBuffer(): number;
  getWidth(): number;
  getHeight(): number;
  getMute(): boolean;
  getVolume(): number;
  getFullscreen(): boolean;
  getQualityLevels(): QualityLevel[];
  getCurrentQuality(): number;
  getAudioTracks(): AudioTrack[];
  getCurrentAudioTrack(): number;
  getCaptionsList(): Caption[];
  getCurrentCaptions(): number;
  getPlaybackRate(): number;
  getConfig(): JWPlayerConfig;
  getContainer(): HTMLElement;
  getEnvironment(): Environment;
  getProvider(): Provider | undefined;
  addButton(
    icon: string,
    label: string,
    handler: () => void,
    id: string,
    className?: string,
  ): void;
  removeButton(id: string): void;
  [key: string]: unknown;
}

export type PlayerState =
  | 'idle'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'complete';

export interface QualityLevel {
  label: string;
  width: number;
  height: number;
  bitrate: number;
}

export interface AudioTrack {
  name: string;
  language: string;
}

export interface Caption {
  id: string;
  label: string;
  language?: string;
}

export interface Environment {
  Browser: {
    chrome: boolean;
    edge: boolean;
    facebook: boolean;
    firefox: boolean;
    ie: boolean;
    msie: boolean;
    safari: boolean;
    version: { version: string; major: number; minor: number };
  };
  OS: {
    android: boolean;
    androidNative: boolean;
    iOS: boolean;
    mobile: boolean;
    mac: boolean;
    iPad: boolean;
    iPhone: boolean;
    windows: boolean;
    version: { version: string; major: number; minor: number } | null;
  };
  Features: {
    flash: boolean;
    flashVersion: number;
    iframe: boolean;
  };
}

export interface Provider {
  name: string;
  [key: string]: unknown;
}

// Event Types
export interface EventData {
  [key: string]: unknown;
}

export type EventCallback = (data?: EventData) => void;
export type AllEventCallback = (eventName: string, data?: EventData) => void;

// JWPlayer Function Type
export interface JWPlayerFunction {
  (selector?: string | HTMLElement): JWPlayerInstance;
  version?: string;
  [key: string]: unknown;
}

// Declare global jwplayer types
declare global {
  interface Window {
    jwplayer: JWPlayerFunction;
    jwDefaults?: Partial<JWPlayerConfig>;
  }
}

// Props type - supports onEventName, onceEventName, and onAll handlers
export interface JWPlayerProps {
  id?: string;
  library?: string;
  config?: Partial<JWPlayerConfig>;
  didMountCallback?: (args: { player: JWPlayerInstance; id: string }) => void;
  willUnmountCallback?: (args: {
    player: JWPlayerInstance;
    id: string;
  }) => void;
  onAll?: AllEventCallback;
  // Allow dynamic on* and once* handlers as well as config properties
  // Using any here for dynamic properties is acceptable as we use type guards when accessing
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Ref type exposed through imperative handle
export interface JWPlayerRef {
  ref: React.RefObject<HTMLDivElement | null>;
  player: JWPlayerInstance | null;
  id: string;
  didMountCallback?: (args: { player: JWPlayerInstance; id: string }) => void;
  willUnmountCallback?: (args: {
    player: JWPlayerInstance;
    id: string;
  }) => void;
  onHandler: AllEventCallback | null;
  componentDidMount: () => Promise<void>;
  shouldComponentUpdate: (nextProps: JWPlayerProps) => boolean;
  updateOnEventListener: (nextProps: JWPlayerProps) => void;
  didOnEventsChange: (nextProps: JWPlayerProps) => boolean;
}

function createOnEventHandler(props: JWPlayerProps): AllEventCallback {
  return (name: string, optReturn?: EventData) => {
    Object.keys(props).forEach((prop) => {
      const onHandlerName = getHandlerName(prop, ON_REGEX);
      // Only process if we have a valid handler name
      if (onHandlerName && onHandlerName === name) {
        const handler = props[prop];
        if (typeof handler === 'function') {
          handler(optReturn);
        }
      }
      if (onHandlerName === ALL) {
        const handler = props[prop];
        if (typeof handler === 'function') {
          handler(name, optReturn);
        }
      }
    });
  };
}

const JWPlayer = React.forwardRef<JWPlayerRef, JWPlayerProps>(
  (props, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<JWPlayerInstance | null>(null);
    const onHandlerRef = useRef<AllEventCallback | null>(null);
    const propsRef = useRef<JWPlayerProps>(props);
    const idRef = useRef<string>(props.id || generateUniqueId());
    const mountedRef = useRef<boolean>(false);

    // Update props ref for closure access
    propsRef.current = props;

    const config = useMemo(() => generateConfig(props), [props]);

    const createPlayer = (): JWPlayerInstance => {
      const setupConfig = { ...window.jwDefaults, ...config };
      const view = internalRef.current;
      return window.jwplayer(view!.id).setup(setupConfig);
    };

    const createEventListeners = (): void => {
      Object.keys(propsRef.current).forEach((prop) => {
        const onceHandlerName = getHandlerName(prop, ONCE_REGEX);
        if (onceHandlerName && playerRef.current) {
          const handler = propsRef.current[prop];
          if (typeof handler === 'function') {
            playerRef.current.once(onceHandlerName, handler as EventCallback);
          }
        }
      });

      // each on event is handled through the on('ALL') event listener instead of its own listener
      onHandlerRef.current = createOnEventHandler(propsRef.current);
      if (playerRef.current) {
        playerRef.current.on(ALL, onHandlerRef.current);
      }
    };

    const didOnEventsChange = (nextProps: JWPlayerProps): boolean => {
      const onEventFilter = (prop: string): boolean =>
        prop.match(ON_REGEX) !== null;
      const currEvents = Object.keys(propsRef.current)
        .filter(onEventFilter)
        .sort();
      const nextEvents = Object.keys(nextProps).filter(onEventFilter).sort();

      if (nextEvents.length !== currEvents.length) {
        return true;
      }

      const newEvents = nextEvents.some(
        (event, index) =>
          currEvents[index] !== event ||
          nextProps[event] !== propsRef.current[event],
      );

      return newEvents;
    };

    const updateOnEventListener = (nextProps: JWPlayerProps): void => {
      if (onHandlerRef.current && playerRef.current) {
        playerRef.current.off(ALL, onHandlerRef.current);
      }

      onHandlerRef.current = createOnEventHandler(nextProps);
      if (playerRef.current) {
        playerRef.current.on(ALL, onHandlerRef.current);
      }
    };

    const shouldComponentUpdate = (nextProps: JWPlayerProps): boolean => {
      if (!playerRef.current) {
        return false;
      }

      if (didOnEventsChange(nextProps)) {
        updateOnEventListener(nextProps);
        return false;
      }

      return true;
    };

    const componentDidMount = async (): Promise<void> => {
      await loadPlayer(props.library);
      playerRef.current = createPlayer();
      createEventListeners();

      if (props.didMountCallback) {
        props.didMountCallback({
          player: playerRef.current,
          id: idRef.current,
        });
      }
    };

    // Expose instance methods for tests
    useImperativeHandle(forwardedRef, () => ({
      get ref() {
        return internalRef;
      },
      get player() {
        return playerRef.current;
      },
      set player(value: JWPlayerInstance | null) {
        playerRef.current = value;
      },
      get id() {
        return idRef.current;
      },
      get didMountCallback() {
        return props.didMountCallback;
      },
      get willUnmountCallback() {
        return props.willUnmountCallback;
      },
      get onHandler() {
        return onHandlerRef.current;
      },
      set onHandler(value: AllEventCallback | null) {
        onHandlerRef.current = value;
      },
      componentDidMount,
      shouldComponentUpdate,
      updateOnEventListener,
      didOnEventsChange,
    }));

    // Mount effect
    useEffect(() => {
      const mount = async () => {
        await componentDidMount();
        mountedRef.current = true;
      };

      mount();

      // Cleanup on unmount
      return () => {
        if (props.willUnmountCallback) {
          props.willUnmountCallback({
            player: playerRef.current,
            id: idRef.current,
          });
        }

        if (playerRef.current) {
          playerRef.current.off();
          playerRef.current.remove();
          playerRef.current = null;
        }
      };
    }, []);

    // Handle prop updates (after mount)
    useEffect(() => {
      if (!mountedRef.current) return;

      if (!shouldComponentUpdate(props)) {
        return;
      }

      propsRef.current = props;
    }, [props]);

    return <div id={idRef.current} ref={internalRef} />;
  },
);

export default JWPlayer;
