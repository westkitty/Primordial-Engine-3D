// tslint:disable
/* eslint-disable */
function getRequestedPlayersCount(): number {
  const requested = Number(
    new URLSearchParams(window.location.search).get('players') ?? '1',
  );
  return Number.isInteger(requested) && requested > 0 ? requested : 1;
}

export class FakePlaygroundSDK {
  private isInitialized = false;
  private onGameEvent: ((event: any) => void) | null = null;
  private onPlayerPresence: ((presence: any) => void) | null = null;
  private onLobbyStatus: ((status: any) => void) | null = null;
  private onError: ((error: any) => void) | null = null;

  private lobbyId = 'fake-lobby-123';
  private gameId = 'fake-game-456';

  private myPlayerId = 'player-1';
  private isHost = true;
  private players: any[] = [];
  private channel!: BroadcastChannel;
  private joinIntervalId: any = null;
  private playersCount = 1;

  constructor() {
    const injectedPlayerId = (window as any).__PLAYER_ID__;
    if (injectedPlayerId) {
      this.myPlayerId = injectedPlayerId;
      this.isHost = injectedPlayerId === 'player-1';
      this.channel = new BroadcastChannel(`playground-lobby-${this.lobbyId}`);
      this.channel.onmessage = (event) => this._handleChannelMessage(event.data);
    }
  }

  async init(
    onGameEvent: (event: any) => void,
    onPlayerPresence: (presence: any) => void,
    onLobbyStatus?: (status: any) => void,
    onError?: (error: any) => void,
  ): Promise<void> {
    if (this.isInitialized) throw new Error('SDK is already initialized.');
    const injectedPlayerId = (window as any).__PLAYER_ID__;
    if (!injectedPlayerId && this._isSplitScreenEnabled()) {
      this._setupSplitScreen();
      return new Promise(() => {});
    }

    this.onGameEvent = onGameEvent;
    this.onPlayerPresence = onPlayerPresence;
    if (onLobbyStatus) this.onLobbyStatus = onLobbyStatus;
    if (onError) this.onError = onError;
    this.isInitialized = true;
    this.playersCount = (window as any).__PLAYERS_COUNT__ || 1;

    window.parent.postMessage({type: 'PREVIEW_READY'}, '*');

    if (this.isHost) {
      this.players = [
        this._createPlayer('player-1', 'Player 1 (Host)', true, true),
      ];
      for (let i = 2; i <= this.playersCount; i++) {
        this.players.push(
          this._createPlayer(`player-${i}`, `Player ${i} (Waiting...)`, false, false),
        );
      }
      for (const p of this.players) {
        this._triggerPresence('JOIN', p);
      }
    } else {
      const playerIndex = this.myPlayerId.split('-')[1];
      this.joinIntervalId = setInterval(() => {
        this._broadcast({
          type: 'PLAYER_JOINED_REQUEST',
          playerId: this.myPlayerId,
        });
      }, 300);
    }
  }

  createLobby(callback: (lobbyInfo: any) => void): void {
    setTimeout(() => callback(this._getLobbyInfo('WAITING_FOR_PLAYERS')), 100);
  }

  getLobby(arg1: any, arg2?: any): void {
    let callback = typeof arg1 === 'function' ? arg1 : arg2;
    setTimeout(() => callback(this._getLobbyInfo('GAME_IN_PROGRESS')), 100);
  }

  updatePlayerPresence(arg1: any, arg2?: any, arg3?: any): void {
    let callback = typeof arg1 === 'function' ? arg1 : (typeof arg2 === 'function' ? arg2 : arg3);
    if (typeof callback === 'function') setTimeout(() => callback(true), 100);
  }

  startGame(lobbyId?: string): void {
    this._broadcast({type: 'START_GAME', lobbyId: this.lobbyId});
    this._triggerLobbyStatus('GAME_IN_PROGRESS');
  }

  sendGameEvent(eventData: any): void {
    this._broadcast({type: 'GAME_EVENT', event: eventData, from: this.myPlayerId});
  }

  scoreUpdated(scoreData: any): void {
    const me = this.players.find((p) => p.playerId === this.myPlayerId);
    if (me) me.score = scoreData.value || 0;
    this._broadcast({type: 'SCORE_UPDATED', playerId: this.myPlayerId, scoreData});
  }

  levelComplete(level: number | string): void {
    this._broadcast({type: 'LEVEL_COMPLETE', level});
  }

  gameOver(lobbyId?: string): void {
    this._broadcast({type: 'GAME_OVER', lobbyId});
    this._triggerLobbyStatus('GAME_ENDED');
  }

  pauseStateChanged(isPaused: boolean): void {
    this._broadcast({type: 'PAUSE_STATE_CHANGED', isPaused});
  }

  showLeaderboard(lobbyId?: string): void {}

  private _isSplitScreenEnabled(): boolean {
    if ((window as any).__PLAYGROUND_MULTIPLAYER__ === true) return true;
    return getRequestedPlayersCount() > 1;
  }

  private _setupSplitScreen() {
    const html = document.documentElement.outerHTML;
    const playersCount = getRequestedPlayersCount();
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.style.cssText = 'display:grid;height:100vh;width:100vw;gap:2px;background:#222;';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    container.appendChild(iframe);
    document.body.appendChild(container);
    iframe.srcdoc = html.replace('<head>', `<head><script>window.__PLAYER_ID__="player-1";window.__PLAYERS_COUNT__=${playersCount};</script>`);
  }

  private _createPlayer(id: string, name: string, isCurrent: boolean, isHost: boolean, score: number = 0) {
    return {
      playerId: id,
      displayName: name,
      isCurrentPlayer: isCurrent,
      isHost: isHost,
      score: score,
    };
  }

  private _getLobbyInfo(state: string) {
    const mappedPlayers = this.players.map((p) => ({
      ...p,
      isCurrentPlayer: p.playerId === this.myPlayerId,
    }));
    return {
      lobbyId: this.lobbyId,
      gameId: this.gameId,
      minPlayers: this.playersCount,
      maxPlayers: this.playersCount,
      state: state,
      status: state,
      players: mappedPlayers,
    };
  }

  private _broadcast(data: any) {
    if (this.channel) this.channel.postMessage(data);
  }

  private _handleChannelMessage(data: any) {
    if (!data || !data.type) return;
    if (data.type === 'START_GAME' && !this.isHost) {
      this._triggerLobbyStatus('GAME_IN_PROGRESS');
    }
  }

  private _triggerPresence(action: 'JOIN' | 'LEAVE', player: any) {
    if (this.onPlayerPresence) {
      this.onPlayerPresence({
        action,
        status: 'SUCCESS',
        player: {...player, isCurrentPlayer: player.playerId === this.myPlayerId},
      });
    }
  }

  private _triggerLobbyStatus(status: string) {
    if (this.onLobbyStatus) {
      this.onLobbyStatus({status, lobbyId: this.lobbyId});
    }
  }
}
