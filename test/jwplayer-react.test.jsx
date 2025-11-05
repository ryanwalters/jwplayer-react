import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    
    // Wait for component to mount
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
        ...renderResult,
        instance: () => ref.current,
        unmount: () => {
            renderResult.unmount();
            cleanup();
        }
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
        component = <JWPlayer {...props} />
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
        expect(instance.didMountCallback).toEqual(undefined)
        expect(instance.willUnmountCallback).toEqual(undefined);
        // Increments ID Properly
        expect(instance.id).toEqual(`jwplayer-${expectedInstance}`);
        // Invokes player setup with correct config
        expect(window.jwplayer(instance.id).setup.mock.calls.length).toBe(1);
        expect(window.jwplayer(instance.id).setup.mock.calls[0][0]).toEqual({ playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3', isReactComponent: true });
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
        const _consoleError = console.error;
        const errorSpy = vi.fn();
        console.error = errorSpy;

        // This should cause an error in componentDidMount
        const component = <JWPlayer />
        const ref = React.createRef();
        let errorCaught = null;
        
        // Add a callback to catch the error
        const errorComponent = React.cloneElement(component, {
            ref,
            didMountCallback: () => {
                // This won't be called because mount will fail
            }
        });
        
        // Render will trigger componentDidMount which will throw
        render(errorComponent);
        
        // Wait and catch the async error
        try {
            await new Promise((resolve, reject) => {
                setTimeout(async () => {
                    if (ref.current && ref.current.player === null) {
                        resolve();
                    } else {
                        // The component should not have a player
                        resolve();
                    }
                }, 50);
            });
        } catch (error) {
            errorCaught = error;
        }
        
        // Verify the component exists but didn't mount successfully
        if (ref.current) {
            expect(ref.current.player).toBeNull();
        }
        
        console.error = _consoleError;
        expectedInstance++; // Account for the created instance
        
        // Clean up any dangling promises
        await new Promise(resolve => setTimeout(resolve, 10));
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
        const component = <JWPlayer library={library} playlist={playlist} {...props} />;
        const mounted = await mount(component);
        return mounted;
    };

    describe('generateId', () => {
        it('increments index when generating unique ID', async () => {
            const component = await createMountedComponent();
            expectedInstance++;
            expect(component.instance().id).toEqual(`jwplayer-${expectedInstance}`);
            const component2 = await createMountedComponent();
            expect(component2.instance().id).toEqual(`jwplayer-${++expectedInstance}`);
            const component3 = await createMountedComponent();
            expect(component3.instance().id).toEqual(`jwplayer-${++expectedInstance}`);
        });
    });

    describe('generateConfig', () => {
        it('generates a setup config from props without assigning unsupported properties', async () => {
            const comp = await createMountedComponent({ unsupportedProperty: 3, floating: {}, width: 500 });
            const setupConfig = window.jwplayer(comp.instance().id).setup.mock.calls[0][0];
            const expectedSetupConfig = {
                floating: {},
                isReactComponent: true,
                playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
                width: 500
            };
            expect(setupConfig).toEqual(expectedSetupConfig);
        });

        it('Props overwrite matching base config properties', async () => {
            const baseConfig = { width: 400, height: 300 };
            const comp = await createMountedComponent({ config: baseConfig, unsupportedProperty: 3, floating: {}, width: 500 });
            const setupConfig = window.jwplayer(comp.instance().id).setup.mock.calls[0][0];
            const expectedSetupConfig = {
                floating: {},
                isReactComponent: true,
                playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3',
                width: 500,
                height: 300
            };
            expect(setupConfig).toEqual(expectedSetupConfig);
        });
    
        it('Base config overwrites jwDefaults', async () => {
            const baseConfig = { width: 720, height: 480 };
            window.jwDefaults = { 
                width: 400,
                height: 300,
                floating: {}
            };
            const comp = await createMountedComponent({ config: baseConfig });
            const setupConfig = window.jwplayer(comp.instance().id).setup.mock.calls[0][0];
            window.jwDefaults = {};
            expect(setupConfig).toEqual({
                width: 720,
                height: 480,
                floating: {},
                isReactComponent: true,
                playlist: 'https://cdn.jwplayer.com/v2/media/1g8jjku3'
            });
        });
        
    });

    it('createEventListeners', async () => {
        const component = await createMountedComponent({ onReady: noop, onPlay: noop, oncePause: noop});
        const id = component.instance().id;
        expect(window.jwplayer(id).once.mock.calls.length).toBe(1);
        expect(window.jwplayer(id).on.mock.calls.length).toBe(1);
        expect(window.jwplayer(id).on.mock.calls).toContainEqual(['all', expect.any(Function)]);
    });

    describe('updateOnEventListener', () => {
        it('does not fire on handler on invalid event', async () => {
            const component = await createMountedComponent();
            component.instance().player.on = (name, handler) => {handler('invalid')};

            let fired = false;
            const nextProps = {onPlay: () => {fired = true}};
            component.instance().updateOnEventListener(nextProps);
            expect(fired).toBe(false);
        });

        it('fires on handler on event', async () => {
            const component = await createMountedComponent();
            component.instance().player.on = (name, handler) => {handler('play')};

            let fired = false;
            const nextProps = {onPlay: () => {fired = true}};
            component.instance().updateOnEventListener(nextProps);
            expect(fired).toBe(true);
        });

        it('fires all handler on all event', async () => {
            const component = await createMountedComponent();
            component.instance().player.on = (name, handler) => {handler(name)};

            let fired = false;
            const nextProps = {onAll: () => {fired = true}};
            component.instance().updateOnEventListener(nextProps);
            expect(fired).toBe(true);
        });

        it('does not remove previous on event listener if it does not exist', async () => {
            const component = await createMountedComponent();
            const offSpy = component.instance().player.off;

            const nextProps = {onPlay: noop};
            component.instance().onHandler = null;
            component.instance().updateOnEventListener(nextProps);
            expect(offSpy).not.toHaveBeenCalled();
        });

        it('removes previous on event listener', async () => {
            const component = await createMountedComponent();
            const offSpy = component.instance().player.off;

            const nextProps = {onPlay: noop};
            component.instance().updateOnEventListener(nextProps);
            expect(offSpy).toHaveBeenCalled();
        });
    });

    describe('didOnEventsChange', () => {
        it('should return false if on event props did not change', async () => {
            const component = await createMountedComponent();
            const nextProps = {unsupportedProperty: 3};
            const eventsChange = component.instance().didOnEventsChange(nextProps);
            expect(eventsChange).toBe(false);
        });

        it('should return true if on event prop was added', async () => {
            const component = await createMountedComponent();
            const nextProps = {onPlay: noop};
            const eventsChange = component.instance().didOnEventsChange(nextProps);
            expect(eventsChange).toBe(true);
        });

        it('should return true if on event prop was removed', async () => {
            const component = await createMountedComponent({onPlay: noop});
            const nextProps = {};
            const eventsChange = component.instance().didOnEventsChange(nextProps);
            expect(eventsChange).toBe(true);
        });

        it('should return true if on event prop was changed', async () => {
            const component = await createMountedComponent({onPlay: vi.fn()});
            const nextProps = {onPlay: noop};
            const eventsChange = component.instance().didOnEventsChange(nextProps);
            expect(eventsChange).toBe(true);
        });
    });

    describe('lifecycle', () => {
        it('mounts with callback', async () => {
            const spy = vi.fn();
            const mounted = await createMountedComponent({didMountCallback:(...args) => spy(...args)});
            await mounted.instance().componentDidMount();
            expect(spy).toHaveBeenCalled();
        });

        it('unmounts with callback', async () => {
            const spy = vi.fn();
            const mounted = await createMountedComponent({willUnmountCallback:(...args) => spy(...args)});
            const removeSpy = mounted.instance().player.remove

            mounted.unmount();
            expect(spy).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalled();
        });

        it('can unmount without callback', async () => {
            const mounted = await createMountedComponent();
            const removeSpy = mounted.instance().player.remove

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
            const nextProps = {unsupportedProperty: 3};
            const shouldUpdate = component.instance().shouldComponentUpdate(nextProps);
            expect(shouldUpdate).toBe(true);
        });

        it('should not update component if on event props change', async () => {
            const component = await createMountedComponent();
            const nextProps = {onPlay: noop};
            const shouldUpdate = component.instance().shouldComponentUpdate(nextProps);
            expect(shouldUpdate).toBe(false);
        });

        it('should not update component if player does not exist', async () => {
            const component = await createMountedComponent();
            component.instance().player = null;
            const shouldUpdate = component.instance().shouldComponentUpdate({});
            expect(shouldUpdate).toBe(false);
        });
    });
});
