import React, { useRef, useEffect, useImperativeHandle, useMemo } from 'react';
import {
  ALL, ON_REGEX, ONCE_REGEX,
} from './const';
import {
  generateConfig, generateUniqueId, loadPlayer, getHandlerName,
} from './util';

// Declare global jwplayer types
declare global {
  interface Window {
    jwplayer: any;
    jwDefaults?: Record<string, any>;
  }
}

// Event handler types
type EventHandler = (data?: any) => void;
type AllEventHandler = (eventName: string, data?: any) => void;

// Props type - supports onEventName, onceEventName, and onAll handlers
export interface JWPlayerProps {
  id?: string;
  library?: string;
  config?: Record<string, any>;
  didMountCallback?: (args: { player: any; id: string }) => void;
  willUnmountCallback?: (args: { player: any; id: string }) => void;
  onAll?: AllEventHandler;
  [key: string]: any; // Allow dynamic on* and once* handlers
}

// Ref type exposed through imperative handle
export interface JWPlayerRef {
  ref: React.RefObject<HTMLDivElement | null>;
  player: any;
  id: string;
  didMountCallback?: (args: { player: any; id: string }) => void;
  willUnmountCallback?: (args: { player: any; id: string }) => void;
  onHandler: ((name: string, optReturn?: any) => void) | null;
  componentDidMount: () => Promise<void>;
  shouldComponentUpdate: (nextProps: JWPlayerProps) => boolean;
  updateOnEventListener: (nextProps: JWPlayerProps) => void;
  didOnEventsChange: (nextProps: JWPlayerProps) => boolean;
}

function createOnEventHandler(props: JWPlayerProps): (name: string, optReturn?: any) => void {
  return (name: string, optReturn?: any) => {
    Object.keys(props).forEach((prop) => {
      const onHandlerName = getHandlerName(prop, ON_REGEX);
      if (onHandlerName === name) {
        props[prop](optReturn);
      }
      if (onHandlerName === ALL) {
        props[prop](name, optReturn);
      }
    });
  };
}

const JWPlayer = React.forwardRef<JWPlayerRef, JWPlayerProps>((props, forwardedRef) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onHandlerRef = useRef<((name: string, optReturn?: any) => void) | null>(null);
  const propsRef = useRef<JWPlayerProps>(props);
  const idRef = useRef<string>(props.id || generateUniqueId());
  const mountedRef = useRef<boolean>(false);

  // Update props ref for closure access
  propsRef.current = props;

  const config = useMemo(() => generateConfig(props), [props]);

  const createPlayer = (): any => {
    const setupConfig = { ...window.jwDefaults, ...config };
    const view = internalRef.current;
    return window.jwplayer(view!.id).setup(setupConfig);
  };

  const createEventListeners = (): void => {
    Object.keys(propsRef.current).forEach((prop) => {
      const onceHandlerName = getHandlerName(prop, ONCE_REGEX);
      if (onceHandlerName) {
        playerRef.current.once(onceHandlerName, propsRef.current[prop]);
      }
    });

    // each on event is handled through the on('ALL') event listener instead of its own listener
    onHandlerRef.current = createOnEventHandler(propsRef.current);
    playerRef.current.on(ALL, onHandlerRef.current);
  };

  const didOnEventsChange = (nextProps: JWPlayerProps): boolean => {
    const onEventFilter = (prop: string): boolean => prop.match(ON_REGEX) !== null;
    const currEvents = Object.keys(propsRef.current).filter(onEventFilter).sort();
    const nextEvents = Object.keys(nextProps).filter(onEventFilter).sort();

    if (nextEvents.length !== currEvents.length) {
      return true;
    }

    const newEvents = nextEvents.some((event, index) => currEvents[index] !== event
      || nextProps[event] !== propsRef.current[event]);

    return newEvents;
  };

  const updateOnEventListener = (nextProps: JWPlayerProps): void => {
    if (onHandlerRef.current) {
      playerRef.current.off(ALL, onHandlerRef.current);
    }

    onHandlerRef.current = createOnEventHandler(nextProps);
    playerRef.current.on(ALL, onHandlerRef.current);
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
      props.didMountCallback({ player: playerRef.current, id: idRef.current });
    }
  };

  // Expose instance methods for tests
  useImperativeHandle(forwardedRef, () => ({
    get ref() { return internalRef; },
    get player() { return playerRef.current; },
    set player(value: any) { playerRef.current = value; },
    get id() { return idRef.current; },
    get didMountCallback() { return props.didMountCallback; },
    get willUnmountCallback() { return props.willUnmountCallback; },
    get onHandler() { return onHandlerRef.current; },
    set onHandler(value: ((name: string, optReturn?: any) => void) | null) { onHandlerRef.current = value; },
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
        props.willUnmountCallback({ player: playerRef.current, id: idRef.current });
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
});

export default JWPlayer;

