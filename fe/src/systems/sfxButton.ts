import { isMuted, toggleMuted, unlockAudio } from './sfx';

/** Tao nut mute 🔊/🔇 goc man (idempotent), pattern maybay29 ui.ts. */
export function ensureMuteButton(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pq-mute')) return;
  const btn = document.createElement('div');
  btn.id = 'pq-mute';
  btn.textContent = isMuted() ? '🔇' : '🔊';
  const toggle = () => { btn.textContent = toggleMuted() ? '🔇' : '🔊'; };
  btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); unlockAudio(); toggle(); });
  document.body.appendChild(btn);
  const style = document.createElement('style');
  style.textContent = '#pq-mute{position:fixed;top:8px;right:8px;z-index:50;width:40px;height:40px;border-radius:50%;border:2px solid #ffd166;background:rgba(0,0,0,.45);color:#ffd166;font-size:20px;line-height:36px;text-align:center;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}#pq-mute:active{background:rgba(255,209,102,.3)}';
  document.head.appendChild(style);
}
