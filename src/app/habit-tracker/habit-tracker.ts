import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabitService, Habit, HABIT_COLORS, HABIT_ICONS, HABIT_CATEGORIES } from '../habit.service';

type Tab = 'week' | 'month' | 'stats';
type Theme = 'dark' | 'light';

const DAY_NAMES_AR = ['سبت','أحد','إثن','ثلا','أرب','خمي','جمع'];

@Component({
  selector: 'app-habit-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habit-tracker.html',
  styleUrl: './habit-tracker.scss'
})
export class HabitTrackerComponent implements OnInit {
  readonly COLORS = HABIT_COLORS;
  readonly ICONS = HABIT_ICONS;
  readonly CATEGORIES = HABIT_CATEGORIES;
  readonly DAY_NAMES = DAY_NAMES_AR;

  tab = signal<Tab>('week');
  theme = signal<Theme>('dark');
  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal<string | null>(null);
  editingHabit = signal<Habit | null>(null);
  motivationVisible = signal(false);
  motivationMsg = signal('');

  newHabit = { name: '', icon: '⭐', color: 'green', category: 'صحة', goal: 7 };

  readonly MOTIVATIONS = [
    '🔥 رائع! استمر!','💪 أنت بطل!','🌟 يوم مثالي!',
    '🎯 هدفك في المتناول!','🚀 لا توقف الآن!','✨ أنت تتحسن كل يوم!',
    '🏆 النجاح قريب!','❤️ اعتنِ بنفسك!','⚡ قوة لا تتوقف!'
  ];

  constructor(public svc: HabitService) {}

  ngOnInit() {
    const saved = localStorage.getItem('ht_theme') as Theme;
    if (saved) this.theme.set(saved);
  }

  toggleTheme() {
    const t = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(t);
    localStorage.setItem('ht_theme', t);
  }

  setTab(t: Tab) { this.tab.set(t); }

  weekDates() { return this.svc.getWeekDates(this.svc.currentWeekOffset()); }
  monthDates() { return this.svc.getMonthDates(); }

  prevWeek() { this.svc.currentWeekOffset.update(v => v - 1); }
  nextWeek() { this.svc.currentWeekOffset.update(v => v + 1); }
  goToday()  { this.svc.currentWeekOffset.set(0); }

  isToday(d: Date) {
    const now = new Date(); now.setHours(0,0,0,0);
    return d.getTime() === now.getTime();
  }
  isFuture(d: Date) {
    const now = new Date(); now.setHours(0,0,0,0);
    return d > now;
  }

  toggle(habitId: string, date: Date) {
    if (this.isFuture(date)) return;
    this.svc.toggle(habitId, date);
    if (this.svc.isChecked(habitId, date)) this.showMotivation();
  }

  showMotivation() {
    this.motivationMsg.set(this.MOTIVATIONS[Math.floor(Math.random() * this.MOTIVATIONS.length)]);
    this.motivationVisible.set(true);
    setTimeout(() => this.motivationVisible.set(false), 2200);
  }

  getColor(colorName: string) {
    return HABIT_COLORS.find(c => c.value === colorName) || HABIT_COLORS[0];
  }

  weekLabel() {
    const off = this.svc.currentWeekOffset();
    if (off === 0) return 'هذا الأسبوع';
    if (off === -1) return 'الأسبوع الماضي';
    const dates = this.weekDates();
    const d1 = dates[0], d2 = dates[6];
    return `${d1.getDate()}/${d1.getMonth()+1} — ${d2.getDate()}/${d2.getMonth()+1}`;
  }

  monthName() {
    const ar = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return ar[new Date().getMonth()] + ' ' + new Date().getFullYear();
  }

  monthWeeks(): (Date | null)[][] {
    const dates = this.monthDates();
    const first = dates[0];
    const dow = first.getDay();
    const padFront = (dow + 1) % 7;
    const padded: (Date | null)[] = [...Array(padFront).fill(null), ...dates];
    while (padded.length % 7 !== 0) padded.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7)
      weeks.push(padded.slice(i, i+7));
    return weeks;
  }

  habitStats(id: string) { return this.svc.getHabitStats(id); }
  overallStats() { return this.svc.getOverallStats(); }

  openAdd() {
    this.newHabit = { name: '', icon: '⭐', color: 'green', category: 'صحة', goal: 7 };
    this.showAddModal.set(true);
  }
  submitAdd() {
    if (!this.newHabit.name.trim()) return;
    this.svc.addHabit({ ...this.newHabit });
    this.showAddModal.set(false);
  }
  openEdit(h: Habit) { this.editingHabit.set({...h}); this.showEditModal.set(true); }
  submitEdit() {
    const h = this.editingHabit();
    if (!h || !h.name.trim()) return;
    this.svc.updateHabit(h.id, h);
    this.showEditModal.set(false);
  }
  confirmDelete(id: string) { this.showDeleteConfirm.set(id); }
  doDelete(id: string) { this.svc.deleteHabit(id); this.showDeleteConfirm.set(null); }

  trackHabit(_: number, h: Habit) { return h.id; }
}
