export type RealtimeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error';

export type ChannelConnectionState =
  'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type RealtimeErrorKind =
  'network' | 'authentication' | 'subscription' | 'unexpected';

export type RealtimeConnectionError = {
  kind: RealtimeErrorKind;
  message: string;
  occurredAt: number;
};

export type RealtimeConnectionSnapshot = {
  status: RealtimeConnectionState;
  isOnline: boolean;
  activeChannels: number;
  channels: Readonly<Record<string, ChannelConnectionState>>;
  lastError: RealtimeConnectionError | null;
};
