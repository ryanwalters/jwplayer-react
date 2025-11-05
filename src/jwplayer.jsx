import React, { useRef, useEffect, useImperativeHandle, useMemo } from 'react';
import {
  ALL, ON_REGEX, ONCE_REGEX,
} from './const';
import {
  generateConfig, generateUniqueId, loadPlayer, getHandlerName,
} from './util';

function createOnEventHandler(props) {
  return (name, optReturn) => {
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

const JWPlayer = React.forwardRef((props, forwardedRef) => {
  const internalRef = useRef(null);
  const ref = forwardedRef || internalRef;
  const playerRef = useRef(null);
  const onHandlerRef = useRef(null);
  const propsRef = useRef(props);
  const idRef = useRef(props.id || generateUniqueId());
  const mountedRef = useRef(false);

  // Update props ref for closure access
  propsRef.current = props;

  const config = useMemo(() => generateConfig(props), [props]);

  const createPlayer = () => {
    const setupConfig = { ...window.jwDefaults, ...config };
    const view = ref.current;
    return window.jwplayer(view.id).setup(setupConfig);
  };

  const createEventListeners = () => {
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

  const didOnEventsChange = (nextProps) => {
    const onEventFilter = (prop) => prop.match(ON_REGEX);
    const currEvents = Object.keys(propsRef.current).filter(onEventFilter).sort();
    const nextEvents = Object.keys(nextProps).filter(onEventFilter).sort();

    if (nextEvents.length !== currEvents.length) {
      return true;
    }

    const newEvents = nextEvents.some((event, index) => currEvents[index] !== event
      || nextProps[event] !== propsRef.current[event]);

    return newEvents;
  };

  const updateOnEventListener = (nextProps) => {
    if (onHandlerRef.current) {
      playerRef.current.off(ALL, onHandlerRef.current);
    }

    onHandlerRef.current = createOnEventHandler(nextProps);
    playerRef.current.on(ALL, onHandlerRef.current);
  };

  const shouldComponentUpdate = (nextProps) => {
    if (!playerRef.current) {
      return false;
    }

    if (didOnEventsChange(nextProps)) {
      updateOnEventListener(nextProps);
      return false;
    }

    return true;
  };

  const componentDidMount = async () => {
    await loadPlayer(props.library);
    playerRef.current = createPlayer();
    createEventListeners();

    if (props.didMountCallback) {
      props.didMountCallback({ player: playerRef.current, id: idRef.current });
    }
  };

  // Expose instance methods for tests
  useImperativeHandle(ref, () => ({
    get ref() { return ref; },
    get player() { return playerRef.current; },
    set player(value) { playerRef.current = value; },
    get id() { return idRef.current; },
    get didMountCallback() { return props.didMountCallback; },
    get willUnmountCallback() { return props.willUnmountCallback; },
    get onHandler() { return onHandlerRef.current; },
    set onHandler(value) { onHandlerRef.current = value; },
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

  return <div id={idRef.current} ref={ref} />;
});

export default JWPlayer;
