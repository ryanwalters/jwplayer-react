declare module '@jwplayer/jwplayer-react' {
  // Re-export all types from the main module
  export type {
    AllEventCallback,
    AudioTrack,
    Caption,
    Environment,
    EventCallback,
    EventData,
    JWPlayerAdvertising,
    JWPlayerCaptions,
    JWPlayerConfig,
    JWPlayerFunction,
    JWPlayerInstance,
    JWPlayerLogo,
    JWPlayerPlaylistItem,
    JWPlayerProps,
    JWPlayerRef,
    JWPlayerSkin,
    JWPlayerSource,
    JWPlayerTrack,
    PlayerState,
    Provider,
    QualityLevel,
  } from './jwplayer';

  // Default export
  import JWPlayer from './jwplayer';
  export default JWPlayer;

  // Legacy type aliases for backwards compatibility
  /**
   * @deprecated Use JWPlayerInstance instead
   */
  export type JWPlayer = import('./jwplayer').JWPlayerInstance;

  export interface DidMountCallbackArguments {
    id: string;
    player: import('./jwplayer').JWPlayerInstance;
  }
}
