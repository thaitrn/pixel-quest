// FSM tự viết (~KISS, per architecture.md §2.2)
export type GameState =
  | 'BOOT' | 'MENU' | 'LEVEL_SELECT' | 'RUNNING' | 'PAUSED'
  | 'GAME_OVER' | 'LEVEL_COMPLETE';

type Handler = (from: GameState, to: GameState) => void;

export class FSM {
  private state: GameState = 'BOOT';
  private handlers = new Map<GameState, Set<Handler>>();

  get current(): GameState { return this.state; }

  private static transitions: Record<GameState, GameState[]> = {
    BOOT: ['MENU'],
    MENU: ['LEVEL_SELECT', 'RUNNING'],
    LEVEL_SELECT: ['MENU', 'RUNNING'],
    RUNNING: ['PAUSED', 'GAME_OVER', 'LEVEL_COMPLETE'],
    PAUSED: ['RUNNING', 'MENU', 'LEVEL_SELECT'],
    GAME_OVER: ['RUNNING', 'LEVEL_SELECT', 'MENU'],
    LEVEL_COMPLETE: ['RUNNING', 'LEVEL_SELECT', 'MENU'],
  };

  can(to: GameState): boolean {
    return FSM.transitions[this.state].includes(to);
  }

  transition(to: GameState): boolean {
    if (!this.can(to)) return false;
    const from = this.state;
    this.state = to;
    this.handlers.get(from)?.forEach(h => h(from, to));
    this.handlers.get('*' as GameState)?.forEach(h => h(from, to));
    return true;
  }

  on(state: GameState | '*', handler: Handler): void {
    const key = state as GameState;
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler);
  }
}
