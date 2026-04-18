import { Injectable, signal, computed } from '@angular/core';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  goal: number; // days per week goal
  createdAt: string;
}

export interface CheckRecord {
  [key: string]: boolean; // key = habitId_dayIndex
}

export const HABIT_COLORS = [
  { name: 'أخضر',   value: 'green',   hex: '#4ade80', dark: '#166534' },
  { name: 'أزرق',   value: 'blue',    hex: '#60a5fa', dark: '#1e3a8a' },
  { name: 'بنفسجي', value: 'purple',  hex: '#a78bfa', dark: '#4c1d95' },
  { name: 'وردي',   value: 'pink',    hex: '#f472b6', dark: '#831843' },
  { name: 'برتقالي',value: 'orange',  hex: '#fb923c', dark: '#7c2d12' },
  { name: 'تركوازي',value: 'teal',    hex: '#2dd4bf', dark: '#134e4a' },
  { name: 'أحمر',   value: 'red',     hex: '#f87171', dark: '#7f1d1d' },
  { name: 'أصفر',   value: 'yellow',  hex: '#facc15', dark: '#713f12' },
];

export const HABIT_ICONS = [
  '🏃','💪','📚','🧘','💧','🥗','😴','🙏','✍️','🎯',
  '🎵','🎨','💊','🚴','🧹','💰','🧠','❤️','🌱','⭐'
];

export const HABIT_CATEGORIES = ['صحة','تعليم','روحانيات','لياقة','إنتاجية','أخرى'];

@Injectable({ providedIn: 'root' })
export class HabitService {
  habits = signal<Habit[]>([]);
  checks = signal<CheckRecord>({});
  currentWeekOffset = signal<number>(0); // 0 = current week

  constructor() { this.load(); }

  private load() {
    try {
      const h = localStorage.getItem('ht_habits_v2');
      const c = localStorage.getItem('ht_checks_v2');
      if (h) this.habits.set(JSON.parse(h));
      if (c) this.checks.set(JSON.parse(c));
      if (!this.habits().length) this.seedDefaults();
    } catch { this.seedDefaults(); }
  }

  private save() {
    localStorage.setItem('ht_habits_v2', JSON.stringify(this.habits()));
    localStorage.setItem('ht_checks_v2', JSON.stringify(this.checks()));
  }

  private seedDefaults() {
    const defaults: Habit[] = [
      { id: '1', name: 'الصلاة',       icon: '🙏', color: 'green',  category: 'روحانيات', goal: 7, createdAt: today() },
      { id: '2', name: 'الرياضة',      icon: '🏃', color: 'orange', category: 'لياقة',    goal: 5, createdAt: today() },
      { id: '3', name: 'القراءة',      icon: '📚', color: 'blue',   category: 'تعليم',    goal: 7, createdAt: today() },
      { id: '4', name: 'شرب المياه',   icon: '💧', color: 'teal',   category: 'صحة',      goal: 7, createdAt: today() },
      { id: '5', name: 'النوم مبكراً', icon: '😴', color: 'purple', category: 'صحة',      goal: 7, createdAt: today() },
    ];
    this.habits.set(defaults);
    this.save();
  }

  // Week starts Saturday (6), ends Friday (5)
  getWeekDates(weekOffset = 0): Date[] {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun, 6=Sat
    // days since last Saturday
    const daysSinceSat = (dow + 1) % 7; // Sat=0, Sun=1, ...Fri=6
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSat + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }

  getMonthDates(): Date[] {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dates: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
      dates.push(new Date(d));
    return dates;
  }

  private key(habitId: string, date: Date): string {
    return `${habitId}_${dateStr(date)}`;
  }

  isChecked(habitId: string, date: Date): boolean {
    return !!this.checks()[this.key(habitId, date)];
  }

  toggle(habitId: string, date: Date) {
    const k = this.key(habitId, date);
    const updated = { ...this.checks() };
    if (updated[k]) delete updated[k]; else updated[k] = true;
    this.checks.set(updated);
    this.save();
  }

  addHabit(h: Omit<Habit, 'id' | 'createdAt'>) {
    const newH: Habit = { ...h, id: Date.now().toString(), createdAt: today() };
    this.habits.update(arr => [...arr, newH]);
    this.save();
  }

  updateHabit(id: string, changes: Partial<Habit>) {
    this.habits.update(arr => arr.map(h => h.id === id ? { ...h, ...changes } : h));
    this.save();
  }

  deleteHabit(id: string) {
    this.habits.update(arr => arr.filter(h => h.id !== id));
    const updated: CheckRecord = {};
    for (const [k, v] of Object.entries(this.checks()))
      if (!k.startsWith(id + '_')) updated[k] = v;
    this.checks.set(updated);
    this.save();
  }

  getHabitStats(habitId: string) {
    const monthDates = this.getMonthDates();
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const past = monthDates.filter(d => d <= todayD);
    const done = past.filter(d => this.isChecked(habitId, d)).length;
    const pct = past.length ? Math.round(done / past.length * 100) : 0;
    // streak
    let streak = 0;
    const sorted = [...past].sort((a,b) => b.getTime()-a.getTime());
    for (const d of sorted) {
      if (this.isChecked(habitId, d)) streak++; else break;
    }
    // weekly goal
    const weekDates = this.getWeekDates(0);
    const weekDone = weekDates.filter(d => d <= todayD && this.isChecked(habitId, d)).length;
    return { done, pct, streak, weekDone };
  }

  getOverallStats() {
    const habits = this.habits();
    const monthDates = this.getMonthDates();
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const past = monthDates.filter(d => d <= todayD);
    let total = 0, done = 0;
    for (const h of habits) for (const d of past) {
      total++;
      if (this.isChecked(h.id, d)) done++;
    }
    const pct = total ? Math.round(done / total * 100) : 0;

    // best streak (all habits done on same day)
    let bestStreak = 0, cur = 0;
    for (const d of past) {
      const allDone = habits.every(h => this.isChecked(h.id, d));
      if (allDone && habits.length > 0) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0;
    }
    return { pct, done, total, bestStreak };
  }
}

function today() {
  return dateStr(new Date());
}
function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
