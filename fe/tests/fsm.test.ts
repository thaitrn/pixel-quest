import { describe, it, expect } from 'vitest';
import { FSM } from '../src/systems/fsm';

describe('FSM', () => {
  it('BOOT → MENU ok', () => {
    const f = new FSM();
    expect(f.transition('MENU')).toBe(true);
    expect(f.current).toBe('MENU');
  });

  it('chặn transition không hợp lệ (PAUSED từ MENU)', () => {
    const f = new FSM();
    expect(f.transition('PAUSED')).toBe(false);
    expect(f.current).toBe('BOOT');
  });

  it('RUNNING ⇄ PAUSED', () => {
    const f = new FSM();
    f.transition('MENU'); f.transition('RUNNING');
    expect(f.transition('PAUSED')).toBe(true);
    expect(f.transition('RUNNING')).toBe(true);
  });

  it('fire handler khi rời state đã đăng ký', () => {
    const f = new FSM();
    const seen: string[] = [];
    f.transition('MENU');
    f.on('MENU', from => seen.push(from));
    f.transition('LEVEL_SELECT');
    expect(seen).toEqual(['MENU']);
  });

  it('GAME_OVER → MENU', () => {
    const f = new FSM();
    f.transition('MENU'); f.transition('RUNNING'); f.transition('GAME_OVER');
    expect(f.transition('MENU')).toBe(true);
  });
});
