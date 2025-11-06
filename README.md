# jwplayer-react

`<JWPlayer>` is a React Component that creates an instance of JW Player's web player. It allows for the use of any player configuration options and/or event hooks that can be used on the standard player (as props), and provides access to player's API directly via a `componentDidMount` callback.

## Contents

- [Installation](#installation)
- [Usage](#usage)
- [Props](#props)
  - [Required Props](#required-props)
  - [Optional Props](#optional-props)
  - [API Functionality](#api-functionality)
- [Advanced Implementation Examples](#advanced-implementation-examples)
- [Contributing](#contributing)

## Installation

```shell
npm i @ryanwalters/jwplayer-react
```

## Usage

### Standard player with file/library

```javascript
import JWPlayer from '@ryanwalters/jwplayer-react';
...
<JWPlayer
  file='https://path-to-my.mp4'
  library='https://path-to-my-jwplayer-library.js'
/>
...
```

### Platform-hosted playlist

```javascript
import JWPlayer from '@ryanwalters/jwplayer-react';
...
<JWPlayer
  library='https://path-to-my-jwplayer-library.js'
  playlist='https://cdn.jwplayer.com/v2/playlists/playlist_media_id'
/>
...
```

### Custom playlist

```javascript
import JWPlayer from '@ryanwalters/jwplayer-react';
...
const playlist = [{
  file: 'myfile.mp4',
  image: 'myPoster.jpg',
  tracks: [{
    file: 'https://mySubtitles.vtt',
    label: 'English',
    kind: 'captions',
    'default': true
  }],
},
{
  file: 'mySecondFile.mp4',
  image: 'MysecondFilesPoster.jpg',
}];
...
<JWPlayer
  library='https://path-to-my-jwplayer-library.js'
  playlist={playlist}
/>
...
```

## Required Props

These props are required to instantient an instance of JW Player:

- `library`
  - Must be a url to a jwplayer web player library. Required if jwplayer library not already instantiated on page (ie. if window.jwplayer is undefined).
  - Type: `string`
  - Example: `https://content.jwplatform.com/libraries/abcd1234.js`
    <br>
- `playlist` OR `file` OR `advertising` block with `oustream: true`
  - Player will require content in order to instantiate. See more [here](https://developer.jwplayer.com/jwplayer/docs/jw8-player-configuration-reference).
  - Type: `string` (for `file` or `playlist`) or `array` (for `playlist`) or `object` for `advertising`
  - Example: `https://cdn.jwplayer.com/v2/playlists/abcd1234`

If you are not using a cloud hosted player you will need to provide a license key via the config prop. This prop can also be used to pass additional player config options.

- `config`
  - JSON config object with all the available options/types available via [standard player configuration](https://developer.jwplayer.com/jwplayer/docs/jw8-player-configuration-reference)
  - Type: `object`
  - Example: `{ key: "your-key-here" }`

## Optional Props

**All JW Player config options** can be used individually as props to configure a `jwplayer-react` player, i.e., `advertising`, `analytics`, `playlist`, `related`, `width`, and `height`. See the full list [here](https://developer.jwplayer.com/jwplayer/docs/jw8-player-configuration-reference). In addition, you may use the following props:

- `on<Event>`, `once<Event>`
  - `jwplayer-react` dynamically supports all events in JW Player. Props beginning with `on` or `once` are parsed and added as JW Player event handlers. Find the full list of supported events [here](https://developer.jwplayer.com/jwplayer/docs/jw8-javascript-api-reference).
  - Type: `(event: { type: string, [key: string]: any }) => void`
  - Examples:
    `const callback = (event) => console.log(event)`
    - `onReady={callback}`: Executes callback every time `ready` event is triggered by player API. Identical to `jwplayer(id).on('ready', callback)`.
    - `onComplete={callback}`: Executes callback every time `complete` event is triggered by player API. Identical to `jwplayer(id).on('complete', callback)`.
    - `onceTime={callback}`: Executes callback the **first** time `time` event is triggered by player API. Identical to `jwplayer(id).once('time', callback)`.
      <br>
- `didMountCallback`
  - A callback triggered after component mounts. Can be used to expose the player API to other parts of your app.
  - Type: `({ player: PlayerAPI, id: string }) => void`
  - Example: See [advanced implementation example](#advanced-implementation-examples)
    <br>
- `willUnmountCallback`
  - A callback triggered before component unmounts. Can be used to fire any final api calls to player before it is removed, or to inform a higher order component that a player has been removed.
  - Type: `({ player: PlayerAPI, id: string }) => void`
  - Example: See [advanced implementation example](#advanced-implementation-examples)

## API Functionality

For advanced usage, `jwplayer-react` creates an instance of the player API when mounted, which can be accessed via the `didMountCallback` prop. The player instance exposes all API functionality listed [here](https://developer.jwplayer.com/jwplayer/docs/jw8-javascript-api-reference).

## Advanced Implementation Examples

[Interactive Example #1](https://codesandbox.io/s/jwplayer-react-example-1-forked-ctkevf?file=/src/PlayerContainer.js)

```javascript
import React, { useRef, useCallback } from 'react';
import JWPlayer from '@ryanwalters/jwplayer-react';

function PlayerContainer() {
  const playersRef = useRef({});

  // Registers players as they mount
  const playerMountedCallback = useCallback(({ player, id }) => {
    playersRef.current[id] = player;
  }, []);

  // Nulls registered players as they unmount
  const playerUnmountingCallback = useCallback(({ id }) => {
    playersRef.current[id] = null;
  }, []);

  // Prevent multiple players from playing simultaneously
  const onBeforePlay = useCallback(() => {
    Object.keys(playersRef.current).forEach((playerId) => {
      const player = playersRef.current[playerId];
      const isPlaying = player.getState() === 'playing';
      if (isPlaying) {
        player.pause();
      }
    });
  }, []);

  // Put teal colored outline on currently playing player, remove it from all other players.
  const onPlay = useCallback(() => {
    Object.keys(playersRef.current).forEach((playerId) => {
      const player = playersRef.current[playerId];
      const container = player.getContainer();
      if (player.getState() === 'playing') {
        container.style.border = '15px solid #00FFFF';
      } else {
        container.style.border = '';
      }
    });
  }, []);

  // Re-usable defaults to use between multiple players.
  const configDefaults = { width: 320, height: 180 };

  return (
    <div className="players-container">
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        onPlay={onPlay}
        didMountCallback={playerMountedCallback}
        willUnmountCallback={playerUnmountingCallback}
        playlist="https://cdn.jwplayer.com/v2/media/1g8jjku3"
        library="https://cdn.jwplayer.com/libraries/lqsWlr4Z.js"
      />
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        onPlay={onPlay}
        didMountCallback={playerMountedCallback}
        willUnmountCallback={playerUnmountingCallback}
        playlist="https://cdn.jwplayer.com/v2/media/QcK3l9Uv"
        library="https://cdn.jwplayer.com/libraries/lqsWlr4Z.js"
      />
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        onPlay={onPlay}
        didMountCallback={playerMountedCallback}
        willUnmountCallback={playerUnmountingCallback}
        playlist="https://cdn.jwplayer.com/v2/playlists/B8FTSH9D"
        playlistIndex="1"
        library="https://cdn.jwplayer.com/libraries/lqsWlr4Z.js"
      />
    </div>
  );
}

export default PlayerContainer;
```

[Interactive Example #2](https://codesandbox.io/s/jwplayer-react-example-2-forked-kl16vj?file=/src/PlayerContainer.js)

```javascript
import React, { useState, useRef, useCallback, useEffect } from 'react';
import JWPlayer from '@ryanwalters/jwplayer-react';

function PlayerContainer() {
  const [loaded, setLoaded] = useState(false);
  const playersRef = useRef({});

  // Load a player library
  useEffect(() => {
    const src = 'https://cdn.jwplayer.com/libraries/lqsWlr4Z.js';
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.onload = () => setLoaded(true); // On load, we're ready to set up our player instances
    document.body.append(script);
  }, []);

  // Registers players to container as they mount
  const didMountCallback = useCallback(({ player, id }) => {
    playersRef.current[id] = player;
    const eventLog = document.getElementById('log');

    // Log all events by player id.
    player.on('all', (event) => {
      const li = document.createElement('li');
      li.innerText = `${id}: ${event}`;
      eventLog.prepend(li);
    });
  }, []);

  // Prevent simultaneous playbacks
  const onBeforePlay = useCallback(() => {
    Object.keys(playersRef.current).forEach((playerId) => {
      const player = playersRef.current[playerId];
      const isPlaying = player.getState() === 'playing';
      if (isPlaying) {
        player.pause();
      }
    });
  }, []);

  // Re-usable defaults to use between multiple players.
  const configDefaults = { width: 320, height: 180 };

  return loaded ? (
    <div className="players-container">
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        didMountCallback={didMountCallback}
        playlist="https://cdn.jwplayer.com/v2/media/1g8jjku3"
      />
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        didMountCallback={didMountCallback}
        playlist="https://cdn.jwplayer.com/v2/media/QcK3l9Uv"
      />
      <JWPlayer
        config={configDefaults}
        onBeforePlay={onBeforePlay}
        didMountCallback={didMountCallback}
        playlist="https://cdn.jwplayer.com/v2/playlists/B8FTSH9D"
        playlistIndex="1"
      />
    </div>
  ) : (
    'loading...'
  );
}

export default PlayerContainer;
```

## Contributing

Post issues, or put up PRs that solve pre-existing issues.
