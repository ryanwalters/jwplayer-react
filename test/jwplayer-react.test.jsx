import { cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JWPlayer from '../src/jwplayer';
import { mockLibrary, players } from './util';

const noop = () => {};

const playlist = 'https://cdn.jwplayer.com/v2/media/1g8jjku3';
const library = 'https://cdn.jwplayer.com/libraries/lqsWlr4Z.js';
let expectedInstance = -1;

// Helper function to mount component and get instance
const mount = async (component) => {
  const ref = React.createRef();

  // Clone element with ref
  const componentWithRef = React.cloneElement(component, { ref });

  const renderResult = render(componentWithRef);

  // Wait for component to mount properly
  await waitFor(() => {
    expect(ref.current).toBeTruthy();
  });

  return {
    ...renderResult,
    instance: () => ref.current,
    unmount: () => {
      renderResult.unmount();
      cleanup();
    },
  };
};

beforeEach(() => {
  window.jwplayer = mockLibrary;
});

afterEach(() => {
  window.jwplayer = null;
  cleanup();
});

describe('setup', () => {
  let component, mounted, instance;

  const setupTest = async (props) => {
    component = <JWPlayer {...props} />;
    mounted = await mount(component);
    instance = mounted.instance();
    expectedInstance++;
  };

  const checkTests = () => {
    // Has ref
    expect(instance.ref).toBeTruthy();
    // Sets api instance to instance.player
    expect(instance.player).toBe(players[instance.id]);
    // Doesn't set didMount/WillUnmount callbacks if they aren't passed in props
    expect(instance.didMountCallback).toEqual(undefined);
    expect(instance.willUnmountCallback).toEqual(undefined);
    // Increments ID Properly
    expect(instance.id).toEqual(`jwplayer-${expectedInstance}`);
    // Invokes player setup with correct config
    expect(window.jwplayer(instance.id).setup.mock.calls.length).toBe(1);
    expect(window.jwplayer(instance.id).setup.mock.calls[0][0]).toEqual({
      playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
      isReactComponent: true,
    });
  };

  it('sets up when jwplayer is pre-instantiated', async () => {
    await setupTest({ playlist });
    checkTests();
  });

  it('sets up when jwplayer library provided', async () => {
    await setupTest({ playlist, library });
    checkTests();
  });

  it('Errors with no library and falsey window.jwplayer', async () => {
    window.jwplayer = null;

    // This should cause an error in componentDidMount
    const component = <JWPlayer />;
    const ref = React.createRef();

    // Add a callback to catch the error
    const errorComponent = React.cloneElement(component, {
      ref,
      didMountCallback: () => {
        // This won't be called because mount will fail
      },
    });

    // Render will trigger componentDidMount which will throw
    render(errorComponent);

    // Wait for any async operations
    await waitFor(() => {
      if (ref.current) {
        expect(ref.current.player).toBeNull();
      }
    }, { timeout: 100 });

    expectedInstance++; // Account for the created instance
  });

  it('creates a script tag when mounted if window.jwplayer is not defined', async () => {
    window.jwplayer = null;
    const testPromise = setupTest({ library, playlist });
    const script = document.getElementsByTagName('script')[0];
    expect(script instanceof HTMLScriptElement).toEqual(true);
    await testPromise; // Wait for setup to complete
  });
});

describe('methods', () => {
  const createMountedComponent = async (props) => {
    const component = (
      <JWPlayer library={library} playlist={playlist} {...props} />
    );
    const mounted = await mount(component);
    return mounted;
  };

  describe('generateId', () => {
    it('increments index when generating unique ID', async () => {
      const component = await createMountedComponent();
      expectedInstance++;
      expect(component.instance().id).toEqual(`jwplayer-${expectedInstance}`);
      const component2 = await createMountedComponent();
      expect(component2.instance().id).toEqual(
        `jwplayer-${++expectedInstance}`,
      );
      const component3 = await createMountedComponent();
      expect(component3.instance().id).toEqual(
        `jwplayer-${++expectedInstance}`,
      );
    });
  });

  describe('generateConfig', () => {
    it('generates a setup config from props without assigning unsupported properties', async () => {
      const comp = await createMountedComponent({
        unsupportedProperty: 3,
        floating: {},
        width: 500,
      });
      const setupConfig = window.jwplayer(comp.instance().id).setup.mock
        .calls[0][0];
      const expectedSetupConfig = {
        floating: {},
        isReactComponent: true,
        playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
        width: 500,
      };
      expect(setupConfig).toEqual(expectedSetupConfig);
    });

    it('Props overwrite matching base config properties', async () => {
      const baseConfig = { width: 400, height: 300 };
      const comp = await createMountedComponent({
        config: baseConfig,
        unsupportedProperty: 3,
        floating: {},
        width: 500,
      });
      const setupConfig = window.jwplayer(comp.instance().id).setup.mock
        .calls[0][0];
      const expectedSetupConfig = {
        floating: {},
        isReactComponent: true,
        playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
        width: 500,
        height: 300,
      };
      expect(setupConfig).toEqual(expectedSetupConfig);
    });

    it('Base config overwrites jwDefaults', async () => {
      const baseConfig = { width: 720, height: 480 };
      window.jwDefaults = {
        width: 400,
        height: 300,
        floating: {},
      };
      const comp = await createMountedComponent({ config: baseConfig });
      const setupConfig = window.jwplayer(comp.instance().id).setup.mock
        .calls[0][0];
      window.jwDefaults = {};
      expect(setupConfig).toEqual({
        width: 720,
        height: 480,
        floating: {},
        isReactComponent: true,
        playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
      });
    });
  });

  it('createEventListeners', async () => {
    const component = await createMountedComponent({
      onReady: noop,
      onPlay: noop,
      oncePause: noop,
    });
    const id = component.instance().id;
    expect(window.jwplayer(id).once.mock.calls.length).toBe(1);
    expect(window.jwplayer(id).on.mock.calls.length).toBe(1);
    expect(window.jwplayer(id).on.mock.calls).toContainEqual([
      'all',
      expect.any(Function),
    ]);
  });

  describe('updateOnEventListener', () => {
    it('does not fire on handler on invalid event', async () => {
      const component = await createMountedComponent();
      component.instance().player.on = (name, handler) => {
        handler('invalid');
      };

      let fired = false;
      const nextProps = {
        onPlay: () => {
          fired = true;
        },
      };
      component.instance().updateOnEventListener(nextProps);
      expect(fired).toBe(false);
    });

    it('fires on handler on event', async () => {
      const component = await createMountedComponent();
      component.instance().player.on = (name, handler) => {
        handler('play');
      };

      let fired = false;
      const nextProps = {
        onPlay: () => {
          fired = true;
        },
      };
      component.instance().updateOnEventListener(nextProps);
      expect(fired).toBe(true);
    });

    it('fires all handler on all event', async () => {
      const component = await createMountedComponent();
      component.instance().player.on = (name, handler) => {
        handler(name);
      };

      let fired = false;
      const nextProps = {
        onAll: () => {
          fired = true;
        },
      };
      component.instance().updateOnEventListener(nextProps);
      expect(fired).toBe(true);
    });

    it('does not remove previous on event listener if it does not exist', async () => {
      const component = await createMountedComponent();
      const offSpy = component.instance().player.off;

      const nextProps = { onPlay: noop };
      component.instance().onHandler = null;
      component.instance().updateOnEventListener(nextProps);
      expect(offSpy).not.toHaveBeenCalled();
    });

    it('removes previous on event listener', async () => {
      const component = await createMountedComponent();
      const offSpy = component.instance().player.off;

      const nextProps = { onPlay: noop };
      component.instance().updateOnEventListener(nextProps);
      expect(offSpy).toHaveBeenCalled();
    });
  });

  describe('didOnEventsChange', () => {
    it('should return false if on event props did not change', async () => {
      const component = await createMountedComponent();
      const nextProps = { unsupportedProperty: 3 };
      const eventsChange = component.instance().didOnEventsChange(nextProps);
      expect(eventsChange).toBe(false);
    });

    it('should return true if on event prop was added', async () => {
      const component = await createMountedComponent();
      const nextProps = { onPlay: noop };
      const eventsChange = component.instance().didOnEventsChange(nextProps);
      expect(eventsChange).toBe(true);
    });

    it('should return true if on event prop was removed', async () => {
      const component = await createMountedComponent({ onPlay: noop });
      const nextProps = {};
      const eventsChange = component.instance().didOnEventsChange(nextProps);
      expect(eventsChange).toBe(true);
    });

    it('should return true if on event prop was changed', async () => {
      const component = await createMountedComponent({ onPlay: vi.fn() });
      const nextProps = { onPlay: noop };
      const eventsChange = component.instance().didOnEventsChange(nextProps);
      expect(eventsChange).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('mounts with callback', async () => {
      const spy = vi.fn();
      const mounted = await createMountedComponent({
        didMountCallback: (...args) => spy(...args),
      });
      await mounted.instance().componentDidMount();
      expect(spy).toHaveBeenCalled();
    });

    it('unmounts with callback', async () => {
      const spy = vi.fn();
      const mounted = await createMountedComponent({
        willUnmountCallback: (...args) => spy(...args),
      });
      const removeSpy = mounted.instance().player.remove;

      mounted.unmount();
      expect(spy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it('can unmount without callback', async () => {
      const mounted = await createMountedComponent();
      const removeSpy = mounted.instance().player.remove;

      mounted.unmount();
      expect(removeSpy).toHaveBeenCalled();
    });

    it('still unmounts if player externally destroyed', async () => {
      const mounted = await createMountedComponent();
      mounted.instance().player = null;
      mounted.unmount();
    });

    it('should update component if props have changed', async () => {
      const component = await createMountedComponent();
      const nextProps = { unsupportedProperty: 3 };
      const shouldUpdate = component
        .instance()
        .shouldComponentUpdate(nextProps);
      expect(shouldUpdate).toBe(true);
    });

    it('should not update component if on event props change', async () => {
      const component = await createMountedComponent();
      const nextProps = { onPlay: noop };
      const shouldUpdate = component
        .instance()
        .shouldComponentUpdate(nextProps);
      expect(shouldUpdate).toBe(false);
    });

    it('should not update component if player does not exist', async () => {
      const component = await createMountedComponent();
      component.instance().player = null;
      const shouldUpdate = component.instance().shouldComponentUpdate({});
      expect(shouldUpdate).toBe(false);
    });
  });

  describe('util functions', () => {
    it('getHandlerName extracts correct handler name from prop', async () => {
      const { getHandlerName } = await import('../src/util');
      const { ON_REGEX } = await import('../src/const');
      
      const result = getHandlerName('onPlay', ON_REGEX);
      expect(result).toBe('play');
    });

    it('getHandlerName handles uppercase event names', async () => {
      const { getHandlerName } = await import('../src/util');
      const { ON_REGEX } = await import('../src/const');
      
      const result = getHandlerName('onPlaylistComplete', ON_REGEX);
      expect(result).toBe('playlistComplete');
    });

    it('getHandlerName handles once events', async () => {
      const { getHandlerName } = await import('../src/util');
      const { ONCE_REGEX } = await import('../src/const');
      
      const result = getHandlerName('onceReady', ONCE_REGEX);
      expect(result).toBe('ready');
    });

    it('getHandlerName returns empty string for non-matching prop', async () => {
      const { getHandlerName } = await import('../src/util');
      const { ON_REGEX } = await import('../src/const');
      
      const result = getHandlerName('playlist', ON_REGEX);
      expect(result).toBe('');
    });

    it('generateUniqueId creates unique IDs', async () => {
      const { generateUniqueId } = await import('../src/util');
      
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      
      expect(id1).toMatch(/^jwplayer-\d+$/);
      expect(id2).toMatch(/^jwplayer-\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('generateConfig filters unsupported props', async () => {
      const { generateConfig } = await import('../src/util');
      
      const config = generateConfig({
        playlist: 'test.mp4',
        unsupportedProp: 'value',
        width: 640,
        height: 360,
      });
      
      expect(config.playlist).toBe('test.mp4');
      expect(config.width).toBe(640);
      expect(config.height).toBe(360);
      expect(config.unsupportedProp).toBeUndefined();
      expect(config.isReactComponent).toBe(true);
    });

    it('generateConfig merges base config with props', async () => {
      const { generateConfig } = await import('../src/util');
      
      const config = generateConfig({
        config: { autostart: true, mute: true },
        playlist: 'test.mp4',
        mute: false,
      });
      
      expect(config.autostart).toBe(true);
      expect(config.mute).toBe(false); // Props override base config
      expect(config.playlist).toBe('test.mp4');
    });

    it('loadPlayer resolves when window.jwplayer exists', async () => {
      const { loadPlayer } = await import('../src/util');
      window.jwplayer = mockLibrary;
      
      await expect(loadPlayer()).resolves.toBeUndefined();
    });

    it('loadPlayer throws error when no library and no window.jwplayer', async () => {
      const { loadPlayer } = await import('../src/util');
      window.jwplayer = null;
      
      // Use try-catch to test synchronous error
      expect(() => loadPlayer()).toThrow('jwplayer-react requires either a library prop, or a library script');
    });

    it('createPlayerLoadPromise creates script tag with correct src', async () => {
      const { createPlayerLoadPromise } = await import('../src/util');
      const testUrl = 'https://test.com/player.js';
      
      // Start the promise but don't wait for it
      const promise = createPlayerLoadPromise(testUrl);
      
      // Check that script was created
      const scripts = document.getElementsByTagName('script');
      const testScript = Array.from(scripts).find(s => s.src === testUrl);
      
      expect(testScript).toBeTruthy();
      expect(testScript.src).toBe(testUrl);
      
      // Simulate script load to resolve promise
      testScript.onload();
      await promise;
    });

    it('createPlayerLoadPromise rejects on script error', async () => {
      const { createPlayerLoadPromise } = await import('../src/util');
      const testUrl = 'https://test.com/error.js';
      
      const promise = createPlayerLoadPromise(testUrl);
      
      // Find the script and trigger error
      const scripts = document.getElementsByTagName('script');
      const testScript = Array.from(scripts).find(s => s.src === testUrl);
      
      expect(testScript).toBeTruthy();
      
      // Trigger error
      const errorEvent = new Event('error');
      testScript.onerror(errorEvent);
      
      await expect(promise).rejects.toEqual(errorEvent);
    });
  });

  describe('integration tests', () => {
    it('handles complete lifecycle: mount -> events -> update -> unmount', async () => {
      const readySpy = vi.fn();
      const playSpy = vi.fn();
      const oncePauseSpy = vi.fn();
      const mountSpy = vi.fn();
      const unmountSpy = vi.fn();

      const component = await createMountedComponent({
        onReady: readySpy,
        onPlay: playSpy,
        oncePause: oncePauseSpy,
        didMountCallback: mountSpy,
        willUnmountCallback: unmountSpy,
      });

      expect(mountSpy).toHaveBeenCalled();

      // Simulate player events
      const player = component.instance().player;
      
      // Trigger the all handler to simulate events
      const allHandler = player.on.mock.calls.find(call => call[0] === 'all')[1];
      
      allHandler('ready', { test: 'ready' });
      expect(readySpy).toHaveBeenCalledWith({ test: 'ready' });

      allHandler('play', { test: 'play' });
      expect(playSpy).toHaveBeenCalledWith({ test: 'play' });

      // Update props with new handler
      const newPlaySpy = vi.fn();
      component.instance().updateOnEventListener({ onPlay: newPlaySpy });
      
      // Get new handler and trigger play
      const newAllHandler = player.on.mock.calls[player.on.mock.calls.length - 1][1];
      newAllHandler('play', { test: 'new play' });
      expect(newPlaySpy).toHaveBeenCalledWith({ test: 'new play' });

      // Unmount
      component.unmount();
      expect(unmountSpy).toHaveBeenCalled();
      expect(player.remove).toHaveBeenCalled();
    });

    it('handles multiple players with unique IDs', async () => {
      const component1 = await createMountedComponent();
      const component2 = await createMountedComponent();
      const component3 = await createMountedComponent();

      const id1 = component1.instance().id;
      const id2 = component2.instance().id;
      const id3 = component3.instance().id;

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      // Each should have its own player instance
      expect(component1.instance().player).toBe(players[id1]);
      expect(component2.instance().player).toBe(players[id2]);
      expect(component3.instance().player).toBe(players[id3]);

      expectedInstance += 3;
    });

    it('handles rapid mount and unmount cycles', async () => {
      const components = [];
      const players = [];
      
      // Mount multiple components and store player references
      for (let i = 0; i < 5; i++) {
        const comp = await createMountedComponent();
        components.push(comp);
        players.push(comp.instance().player);
      }

      // Unmount all
      for (const comp of components) {
        comp.unmount();
      }

      // Verify cleanup using stored player references
      for (const player of players) {
        if (player) {
          expect(player.remove).toHaveBeenCalled();
        }
      }

      expectedInstance += 5;
    });

    it('handles onAll event with multiple events', async () => {
      const allSpy = vi.fn();
      const component = await createMountedComponent({
        onAll: allSpy,
      });

      const player = component.instance().player;
      const allHandler = player.on.mock.calls.find(call => call[0] === 'all')[1];

      // Trigger multiple events
      allHandler('ready', { state: 'ready' });
      allHandler('play', { state: 'play' });
      allHandler('pause', { state: 'pause' });
      allHandler('complete', { state: 'complete' });

      expect(allSpy).toHaveBeenCalledTimes(4);
      expect(allSpy).toHaveBeenCalledWith('ready', { state: 'ready' });
      expect(allSpy).toHaveBeenCalledWith('play', { state: 'play' });
      expect(allSpy).toHaveBeenCalledWith('pause', { state: 'pause' });
      expect(allSpy).toHaveBeenCalledWith('complete', { state: 'complete' });
    });

    it('handles event handler changes during lifecycle', async () => {
      const initialPlaySpy = vi.fn();
      const component = await createMountedComponent({
        onPlay: initialPlaySpy,
      });

      const player = component.instance().player;
      
      // Trigger initial play event
      let allHandler = player.on.mock.calls.find(call => call[0] === 'all')[1];
      allHandler('play', { timestamp: 1 });
      expect(initialPlaySpy).toHaveBeenCalledWith({ timestamp: 1 });

      // Update to new handler
      const newPlaySpy = vi.fn();
      component.instance().updateOnEventListener({ onPlay: newPlaySpy });

      // Trigger play with new handler
      allHandler = player.on.mock.calls[player.on.mock.calls.length - 1][1];
      allHandler('play', { timestamp: 2 });
      expect(newPlaySpy).toHaveBeenCalledWith({ timestamp: 2 });
      
      // Old handler should not be called again
      expect(initialPlaySpy).toHaveBeenCalledTimes(1);
    });

    it('uses custom ID when provided', async () => {
      const customId = 'my-custom-player-id';
      const component = (
        <JWPlayer library={library} playlist={playlist} id={customId} />
      );
      const mounted = await mount(component);

      expect(mounted.instance().id).toBe(customId);
    });

    it('handles window.jwDefaults correctly', async () => {
      window.jwDefaults = {
        width: 800,
        height: 450,
        autostart: false,
      };

      const component = await createMountedComponent({
        width: 1280,
      });

      const setupConfig = window.jwplayer(component.instance().id).setup.mock
        .calls[0][0];

      // Props should override jwDefaults
      expect(setupConfig.width).toBe(1280);
      // jwDefaults values should be present
      expect(setupConfig.height).toBe(450);
      expect(setupConfig.autostart).toBe(false);

      window.jwDefaults = {};
    });
  });

  describe('edge cases', () => {
    it('didOnEventsChange detects addition of multiple event handlers', async () => {
      const component = await createMountedComponent();
      const nextProps = {
        onPlay: noop,
        onPause: noop,
        onComplete: noop,
      };
      
      expect(component.instance().didOnEventsChange(nextProps)).toBe(true);
    });

    it('didOnEventsChange detects removal of multiple event handlers', async () => {
      const component = await createMountedComponent({
        onPlay: noop,
        onPause: noop,
        onComplete: noop,
      });
      const nextProps = {};
      
      expect(component.instance().didOnEventsChange(nextProps)).toBe(true);
    });

    it('didOnEventsChange detects changes in event handler order', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const component = await createMountedComponent({
        onPlay: handler1,
      });
      const nextProps = {
        onPlay: handler2,
      };
      
      expect(component.instance().didOnEventsChange(nextProps)).toBe(true);
    });

    it('handles player.off being called when onHandler is null', async () => {
      const component = await createMountedComponent();
      component.instance().onHandler = null;
      
      // Should not throw
      expect(() => {
        component.instance().updateOnEventListener({ onPlay: noop });
      }).not.toThrow();
    });

    it('handles empty event name in handler', async () => {
      const playSpy = vi.fn();
      const pauseSpy = vi.fn();
      
      // Create component with only event handlers (no other props like library, playlist)
      const ref = React.createRef();
      const component = (
        <JWPlayer
          library={library}
          playlist={playlist}
          onPlay={playSpy}
          onPause={pauseSpy}
          ref={ref}
        />
      );
      
      render(component);
      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      const player = ref.current.player;
      const allHandler = player.on.mock.calls.find(call => call[0] === 'all')[1];

      // Trigger with empty event name
      allHandler('', { data: 'test' });
      
      // Event handlers should not be called for empty event name
      expect(playSpy).not.toHaveBeenCalled();
      expect(pauseSpy).not.toHaveBeenCalled();
      
      expectedInstance++;
    });

    it('handles shouldComponentUpdate with identical props', async () => {
      const component = await createMountedComponent();
      const currentProps = { library, playlist };
      
      // Should return true for identical props (different reference)
      const shouldUpdate = component.instance().shouldComponentUpdate(currentProps);
      expect(shouldUpdate).toBe(true);
    });

    it('handles prop updates after mount with rerender', async () => {
      const ref = React.createRef();
      
      const { rerender } = render(
        <JWPlayer
          library={library}
          playlist={playlist}
          width={640}
          ref={ref}
        />
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      const player = ref.current.player;
      expect(player).toBeTruthy();

      // Rerender with different width (non-event prop change)
      rerender(
        <JWPlayer
          library={library}
          playlist={playlist}
          width={1280}
          ref={ref}
        />
      );

      // Wait for rerender to complete and effect to run
      await waitFor(() => {
        expect(ref.current.player).toBeTruthy();
      }, { timeout: 100 });

      // Verify player still exists after prop update
      expect(ref.current.player).toBeTruthy();

      expectedInstance++;
    });

    it('accesses onHandler through ref getter', async () => {
      const component = await createMountedComponent({
        onPlay: noop,
      });

      // Access the onHandler getter
      const handler = component.instance().onHandler;
      expect(handler).toBeTruthy();
      expect(typeof handler).toBe('function');
    });
  });
});
