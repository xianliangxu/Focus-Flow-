import { z } from "zod"

export type Priority = "critical" | "heavy" | "high" | "medium" | "low"

export type Urgency = "urgent" | "high" | "medium" | "low"

export interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  createdAt: number
  completedAt?: number
  workTime: number
  estimatedTime: number
  priority: Priority
  urgency: Urgency
  zoneId?: string
  subtasks?: Task[]
  lastActiveAt?: number
  collapsed?: boolean
}

export interface TaskHistoryEntry {
  id: string
  taskId: string
  taskName: string
  summary: string
  completedAt: number
  totalWorkTime: number
  subtaskDetails: { name: string; completed: boolean }[]
}

export interface Zone {
  id: string
  name: string
  color: string
}

export interface Template {
  id: string
  name: string
  description: string
  zones: Zone[]
}

export interface Settings {
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  language: string
  languageManual: boolean
  soundEnabled: boolean
  soundVolume: number
  priority: Priority[]
  theme: 'dark' | 'light'
  glassQuality: string
  particlesEnabled: boolean
}

export interface AppState {
  tasks: Task[]
  zones: Zone[]
  templates: Template[]
  history: TaskHistoryEntry[]
  activeTaskId: string | null
  activeZoneId: string | null
  selectedZoneId: string | null
  selectedTemplateId: string | null
  settings: Settings
  isHydrated: boolean
  [key: string]: unknown
}

export const DEFAULT_SETTINGS = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  language: 'zh',
  languageManual: false,
  soundEnabled: true,
  soundVolume: 0.5,
  priority: ['high', 'medium', 'low'] as Priority[],
  theme: 'dark' as const,
  glassQuality: 'auto' as const,
  particlesEnabled: true,
} as const
