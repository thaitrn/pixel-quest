// Achievement seed (F10, BR-A1)
export interface AchievementDef { id: string; name: string; desc: string; }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', desc: 'Hạ enemy đầu tiên' },
  { id: 'perfect_run', name: 'Perfect Run', desc: 'Hoàn thành level không chết' },
  { id: 'speedrunner', name: 'Speedrunner', desc: 'Hoàn thành level dưới 60s' },
  { id: 'collector', name: 'Collector', desc: 'Thu ≥100 coins trong 1 run' },
  { id: 'marathon', name: 'Marathon', desc: 'Hoàn thành 10 level' },
];
