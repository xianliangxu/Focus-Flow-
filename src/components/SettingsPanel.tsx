import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Clock,
  Database,
  FolderOpen,
  Repeat,
  Plus,
  Edit2,
  Trash2,
  Flag,
  RotateCcw,
  Bookmark,
  Save,
  Upload,
  Download,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import type { RecurringTemplate, TaskPriority, ConfigProfile } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSystemLanguage } from '@/lib/language-utils';

interface SettingsPanelProps {
  settings: {
    language: string;
    workDuration: number;
    breakDuration: number;
    longBreakDuration: number;
    autoStartBreak: boolean;
    soundEnabled: boolean;
    collapsed: boolean;
    collapsePosition: { x: number; y: number };
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    globalViewSort: { mode: string; priorityWeight: number; deadlineWeight: number };
    globalViewLeafMode: boolean;
    globalViewGroupByZone: boolean;
    zoneViewSort: { mode: string; priorityWeight: number; deadlineWeight: number };
    zoneViewLeafMode: boolean;
    theme: 'dark' | 'light';
    glassQuality: 'auto' | 'high' | 'balanced' | 'eco';
    particlesEnabled: boolean;
  };
  zones: { id: string; name?: string; nameKey?: string; color: string }[];
  recurringTemplates: RecurringTemplate[];
  onAddRecurringTemplate: (template: Omit<RecurringTemplate, 'id' | 'lastTriggeredAt' | 'isActive'>) => void;
  onUpdateRecurringTemplate: (id: string, updates: Partial<RecurringTemplate>) => void;
  onDeleteRecurringTemplate: (id: string) => void;
  onBack: () => void;
  onUpdateSettings: (settings: Partial<any>) => void;
  onPreviewMode: (mode: 'work' | 'break' | 'longBreak') => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

export function SettingsPanel({
  settings,
  zones,
  recurringTemplates,
  onAddRecurringTemplate,
  onUpdateRecurringTemplate,
  onDeleteRecurringTemplate,
  onBack,
  onUpdateSettings,
  onPreviewMode,
}: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recZoneId, setRecZoneId] = useState('');
  const [recPriority, setRecPriority] = useState<TaskPriority>('medium');
  const [recIntervalValue, setRecIntervalValue] = useState(60);
  const [recIntervalUnit, setRecIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [recDeadlineValue, setRecDeadlineValue] = useState(24);
  const [recDeadlineUnit, setRecDeadlineUnit] = useState<'hours' | 'days'>('hours');
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [currentDbPath, setCurrentDbPath] = useState<string>('');
  const [autoSaveInterval, setAutoSaveInterval] = useState(settings.autoSaveInterval);
  const [configProfiles, setConfigProfiles] = useState<ConfigProfile[]>([]);
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [editingProfile, setEditingProfile] = useState<ConfigProfile | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');

  // 获取当前数据库路径
  useEffect(() => {
    const loadDbPath = async () => {
      try {
        const { getDbPath } = await import('@/lib/db');
        const path = await getDbPath();
        setCurrentDbPath(path);
      } catch {
        // browser mode
      }
    };
    loadDbPath();
  }, []);

  // 获取配置快照列表
  useEffect(() => {
    setConfigProfiles(useAppStore.getState().configProfiles || []);
  }, []);

  const handleChangeDbPath = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        title: t('settings.selectDbFolder'),
      });
      if (selected && typeof selected === 'string') {
        toast.info(t('settings.migratingData'), { duration: 3000 });
        await invoke('change_db_path', { newPath: selected });
      }
    } catch (e) {
      console.error('change db path failed:', e);
      toast.error(t('settings.migrationFailed'));
    }
  };

  const handleSaveRecurring = () => {
    if (!recTitle.trim()) return;
    const intervalMinutes =
      recIntervalUnit === 'minutes' ? recIntervalValue :
      recIntervalUnit === 'hours' ? recIntervalValue * 60 :
      recIntervalValue * 1440;
    const deadlineOffsetHours =
      recDeadlineUnit === 'hours' ? recDeadlineValue : recDeadlineValue * 24;

    if (editingTemplate) {
      onUpdateRecurringTemplate(editingTemplate.id, {
        title: recTitle.trim(),
        description: recDesc.trim(),
        zoneId: recZoneId,
        priority: recPriority,
        intervalMinutes,
        deadlineOffsetHours,
      });
    } else {
      onAddRecurringTemplate({
        title: recTitle.trim(),
        description: recDesc.trim(),
        zoneId: recZoneId,
        priority: recPriority,
        intervalMinutes,
        deadlineOffsetHours,
      });
    }
    setShowRecurringDialog(false);
    setEditingTemplate(null);
    setRecTitle('');
    setRecDesc('');
  };

  const handleEditTemplate = (tpl: RecurringTemplate) => {
    setEditingTemplate(tpl);
    setRecTitle(tpl.title);
    setRecDesc(tpl.description || '');
    setRecZoneId(tpl.zoneId);
    setRecPriority(tpl.priority);
    if (tpl.intervalMinutes % 1440 === 0) {
      setRecIntervalUnit('days');
      setRecIntervalValue(tpl.intervalMinutes / 1440);
    } else if (tpl.intervalMinutes % 60 === 0) {
      setRecIntervalUnit('hours');
      setRecIntervalValue(tpl.intervalMinutes / 60);
    } else {
      setRecIntervalUnit('minutes');
      setRecIntervalValue(tpl.intervalMinutes);
    }
    if (tpl.deadlineOffsetHours % 24 === 0) {
      setRecDeadlineUnit('days');
      setRecDeadlineValue(tpl.deadlineOffsetHours / 24);
    } else {
      setRecDeadlineUnit('hours');
      setRecDeadlineValue(tpl.deadlineOffsetHours);
    }
    setShowRecurringDialog(true);
  };

  const handleReset = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    toast.success(t('messages.settingsReset'));
  };

  const handleExportConfig = async () => {
    const state = useAppStore.getState();
    const data = {
      settings: state.settings,
      customTemplates: state.customTemplates || [],
      recurringTemplates: state.recurringTemplates || [],
      exportedAt: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-flow-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    toast.success(t('profile.exportSuccess'));
  };

  const handleImportConfig = async () => {
    try {
      const { open, readTextFile } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false });
      if (!selected || typeof selected !== 'string') return;
      const text = await readTextFile(selected);
      const parsed = JSON.parse(text);
      const ok = useAppStore.getState().importConfigProfile(parsed);
      setConfigProfiles(useAppStore.getState().configProfiles || []);
      if (ok) toast.success(t('profile.profileImported'));
      else toast.error(t('profile.importFailed'));
    } catch {
      toast.error(t('profile.importFailed'));
    }
  };

  const handleSaveProfile = (name: string) => {
    const state = useAppStore.getState();
    state.saveConfigProfile(name, state.recurringTemplates || []);
    setConfigProfiles(state.configProfiles || []);
  };

  return (
    <div className="settings-panel-container">
      <div className="settings-panel-header">
        <Button variant="ghost" size="icon" className="back-btn" onClick={onBack} title={t('common.back')}>
          <RotateCcw size={14} />
        </Button>
        <div className="settings-panel-title">
          <Clock size={14} className="text-blue-400" />
          {t('settings.title')}
        </div>
      </div>

      <div className="settings-content">
        {/* Language */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('settings.language')}</h3>
          <div className="setting-item">
            <Select
              value={settings.language}
              onValueChange={(value) => {
                onUpdateSettings({ language: value, languageManual: true });
                i18n.changeLanguage(value);
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-black/30 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI BYOK Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('nlp.settingsTitle')}</h3>
          <p className="settings-section-desc">{t('nlp.settingsDesc')}</p>
          <div className="setting-item flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{t('nlp.statusNone')}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                {t('nlp.editConfig')}
              </Button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <Sparkles size={12} className="mr-1.5 text-cyan-400" />
            {t('settings.appearance')}
          </h3>
          <p className="settings-section-desc">{t('settings.appearanceDesc')}</p>

          {/* Theme toggle */}
          <div className="setting-item">
            <div className="setting-label">
              <span>{t('settings.theme')}</span>
              <span className="setting-desc">{t('settings.themeDesc')}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn('h-8 flex-1 text-xs', settings.theme === 'light' ? 'border-cyan-400/70 text-cyan-300 bg-cyan-400/10' : 'border-white/15')}
                onClick={() => onUpdateSettings({ theme: 'light' })}
              >
                <Sun size={12} className="mr-1" />
                {t('settings.light')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn('h-8 flex-1 text-xs', settings.theme === 'dark' ? 'border-cyan-400/70 text-cyan-300 bg-cyan-400/10' : 'border-white/15')}
                onClick={() => onUpdateSettings({ theme: 'dark' })}
              >
                <Moon size={12} className="mr-1" />
                {t('settings.dark')}
              </Button>
            </div>
          </div>

          {/* Glass quality */}
          <div className="setting-item">
            <div className="setting-label">
              <span>{t('settings.glassQuality')}</span>
              <span className="setting-desc">{t('settings.glassQualityDesc')}</span>
            </div>
            <Select
              value={settings.glassQuality}
              onValueChange={(value) => onUpdateSettings({ glassQuality: value })}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-black/30 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('settings.glassQualityAuto')}</SelectItem>
                <SelectItem value="high">{t('settings.glassQualityHigh')}</SelectItem>
                <SelectItem value="balanced">{t('settings.glassQualityBalanced')}</SelectItem>
                <SelectItem value="eco">{t('settings.glassQualityEco')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Particles */}
          <div className="setting-item switch">
            <div className="setting-label">
              <span>{t('settings.particlesEnabled')}</span>
              <span className="setting-desc">{t('settings.particlesEnabledDesc')}</span>
            </div>
            <Switch
              checked={settings.particlesEnabled}
              onCheckedChange={(checked) => onUpdateSettings({ particlesEnabled: checked })}
            />
          </div>
        </div>

        {/* Timer Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('settings.timerSettings')}</h3>

          <div className="setting-item">
            <div className="setting-label">
              <span>{t('settings.workDuration')} {t('settings.workDurationMinutes')}</span>
              <Input
                type="number"
                value={Math.round(settings.workDuration / 60)}
                onChange={(e) => {
                  const minutes = Math.max(1, parseInt(e.target.value) || 25);
                  onUpdateSettings({ workDuration: minutes * 60 });
                }}
                className="w-20 h-7 text-xs text-right font-mono bg-black/30 border-white/20 text-white"
                min={1}
              />
            </div>
            <Slider
              value={[Math.round(settings.workDuration / 60)]}
              onValueChange={(value) => onUpdateSettings({ workDuration: value[0] * 60 })}
              min={1}
              max={120}
              step={1}
              className="setting-slider mt-2"
            />
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>{t('settings.breakDuration')} {t('settings.workDurationMinutes')}</span>
              <Input
                type="number"
                value={Math.round(settings.breakDuration / 60)}
                onChange={(e) => {
                  const minutes = Math.max(1, parseInt(e.target.value) || 5);
                  onUpdateSettings({ breakDuration: minutes * 60 });
                }}
                className="w-20 h-7 text-xs text-right font-mono bg-black/30 border-white/20 text-white"
                min={1}
              />
            </div>
            <Slider
              value={[Math.round(settings.breakDuration / 60)]}
              onValueChange={(value) => onUpdateSettings({ breakDuration: value[0] * 60 })}
              min={1}
              max={60}
              step={1}
              className="setting-slider mt-2"
            />
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span>{t('settings.longBreakDuration')} {t('settings.workDurationMinutes')}</span>
              <Input
                type="number"
                value={Math.round(settings.longBreakDuration / 60)}
                onChange={(e) => {
                  const minutes = Math.max(1, parseInt(e.target.value) || 15);
                  onUpdateSettings({ longBreakDuration: minutes * 60 });
                }}
                className="w-20 h-7 text-xs text-right font-mono bg-black/30 border-white/20 text-white"
                min={1}
              />
            </div>
            <Slider
              value={[Math.round(settings.longBreakDuration / 60)]}
              onValueChange={(value) => onUpdateSettings({ longBreakDuration: value[0] * 60 })}
              min={1}
              max={90}
              step={1}
              className="setting-slider mt-2"
            />
          </div>
        </div>

        {/* Other Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            {t('settings.otherSettings')}
          </h3>

          {/* Auto Start Break */}
          <div className="setting-item switch">
            <div className="setting-label">
              <span>{t('settings.autoStartBreak')}</span>
              <span className="setting-desc">{t('settings.autoStartBreakDesc')}</span>
            </div>
            <Switch
              checked={settings.autoStartBreak}
              onCheckedChange={(checked) => onUpdateSettings({ autoStartBreak: checked })}
            />
          </div>

          {/* Sound Enabled */}
          <div className="setting-item switch">
            <div className="setting-label">
              <span>{t('settings.soundEnabled')}</span>
              <span className="setting-desc">{t('settings.soundEnabledDesc')}</span>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => onUpdateSettings({ soundEnabled: checked })}
            />
          </div>

          {/* Auto Save Enabled */}
          <div className="setting-item switch">
            <div className="setting-label">
              <span>{t('settings.autoSaveEnabled')}</span>
              <span className="setting-desc">{t('settings.autoSaveEnabledDesc')}</span>
            </div>
            <Switch
              checked={settings.autoSaveEnabled || false}
              onCheckedChange={(checked) => onUpdateSettings({ autoSaveEnabled: checked })}
            />
          </div>

          {/* Auto Save Interval */}
          {settings.autoSaveEnabled && (
            <div className="setting-item">
              <div className="setting-label">
                <span>{t('settings.autoSaveInterval')} {t('settings.autoSaveIntervalSeconds')}</span>
                <Input
                  type="number"
                  value={autoSaveInterval}
                  onChange={(e) => {
                    const val = Math.max(10, parseInt(e.target.value) || 60);
                    setAutoSaveInterval(val);
                    onUpdateSettings({ autoSaveInterval: val });
                  }}
                  className="w-20 h-7 text-xs text-right font-mono bg-black/30 border-white/20 text-white"
                  min={10}
                />
              </div>
              <Slider
                value={[autoSaveInterval]}
                onValueChange={(value) => {
                  setAutoSaveInterval(value[0]);
                }}
                onValueCommit={(value) => {
                  onUpdateSettings({ autoSaveInterval: value[0] });
                }}
                min={10}
                max={300}
                step={10}
                className="setting-slider mt-2"
              />
            </div>
          )}
        </div>

        {/* Data Storage Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <Database size={12} className="mr-1.5 text-emerald-400" />
            {t('settings.dataStorage') || 'Data Storage'}
          </h3>
          <p className="settings-section-desc">
            {t('settings.dataStorageDesc') || 'Change where your data is saved. Select a cloud drive folder (like OneDrive, iCloud, or Dropbox) to sync across devices.'}
          </p>

          <div className="setting-item flex flex-col gap-2">
            <div className="text-xs text-white/50 break-all bg-black/20 p-2 rounded border border-white/10 flex items-center justify-between">
              <span className="truncate">{currentDbPath || t('common.loading')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit h-7 text-xs"
              onClick={handleChangeDbPath}
            >
              <FolderOpen size={12} className="mr-1.5" />
              {t('settings.changeLocation') || 'Change Location'}
            </Button>
          </div>
        </div>

        {/* Recurring Tasks Settings */}
        <div className="settings-section">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
            <h3 className="flex items-center text-sm font-semibold text-white/70">
              <Repeat size={12} className="mr-1.5 text-green-400" />
              {t('settings.recurringTasks')}
            </h3>
            <Button size="sm" className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setShowRecurringDialog(true)}>
              <Plus size={12} className="mr-1" />
              {t('settings.newRule')}
            </Button>
          </div>
          <p className="settings-section-desc mb-3">
            {t('settings.recurringTasksDesc')}
          </p>

          <div className="flex flex-col gap-2">
            {!recurringTemplates || recurringTemplates.length === 0 ? (
              <div className="text-center py-4 text-xs text-white/30 bg-black/10 rounded-md border border-dashed border-white/10">
                {t('recurring.noRules')}
              </div>
            ) : (
              recurringTemplates.map(tpl => (
                <div key={tpl.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/90">{tpl.title}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tpl.isActive}
                        onCheckedChange={(c) => onUpdateRecurringTemplate(tpl.id, { isActive: c })}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:text-blue-400 hover:bg-blue-400/10" onClick={() => handleEditTemplate(tpl)} title={t('settings.editRule')}>
                        <Edit2 size={12} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:text-red-400 hover:bg-red-400/10" onClick={() => onDeleteRecurringTemplate(tpl.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                    <span className="flex items-center">
                      <Repeat size={10} className="mr-1" />
                      {t('recurring.every')} {tpl.intervalMinutes >= 1440 ? `${tpl.intervalMinutes / 1440} ${t('recurring.days')}` : tpl.intervalMinutes >= 60 ? `${tpl.intervalMinutes / 60} ${t('recurring.hours')}` : `${tpl.intervalMinutes} ${t('recurring.minutes')}`}
                    </span>
                    <span className="flex items-center">
                      <Clock size={10} className="mr-1" />
                      {t('recurring.ddl')}: {t('recurring.afterGeneration')} {tpl.deadlineOffsetHours >= 24 ? `${tpl.deadlineOffsetHours / 24} ${t('recurring.days')}` : `${tpl.deadlineOffsetHours} ${t('recurring.hours')}`}
                    </span>
                    <span className="flex items-center">
                      <Flag size={10} className="mr-1" />
                      {t('recurring.targetZone')}: {zones.find(z => z.id === tpl.zoneId)?.name || t('recurring.unknownZone')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 新建定时任务的弹窗 */}
        <Dialog open={showRecurringDialog} onOpenChange={setShowRecurringDialog}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[400px] p-4 text-xs">
            <DialogHeader>
              <DialogTitle className="text-[14px]">{editingTemplate ? t('recurring.editRule') : t('recurring.addRule')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">{t('recurring.ruleTitle')}</label>
                <Input value={recTitle} onChange={e => setRecTitle(e.target.value)} className="h-7 text-xs bg-black/30 border-white/20" placeholder={t('recurring.ruleTitlePlaceholder')} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">{t('recurring.ruleDescription')}</label>
                <Input value={recDesc} onChange={e => setRecDesc(e.target.value)} className="h-7 text-xs bg-black/30 border-white/20" placeholder={t('recurring.ruleDescriptionPlaceholder')} />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs text-white/60">{t('recurring.triggerInterval')} <span className="text-white/30 text-xs">{t('recurring.minInterval')}</span></label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={recIntervalUnit === 'minutes' ? 5 : 1}
                      value={recIntervalValue}
                      onChange={e => {
                        const val = Number(e.target.value);
                        // 如果单位是分钟，限制最低输入为5
                        if (recIntervalUnit === 'minutes' && val < 5 && val !== 0) {
                          setRecIntervalValue(5);
                        } else {
                          setRecIntervalValue(val);
                        }
                      }}
                      className="h-7 text-xs bg-black/30 border-white/20"
                    />
                    <Select value={recIntervalUnit} onValueChange={(v: 'minutes' | 'hours' | 'days') => {
                      setRecIntervalUnit(v);
                      if (v === 'minutes' && recIntervalValue < 5) {
                        setRecIntervalValue(5);
                      }
                    }}>
                      <SelectTrigger className="w-[80px] h-7 text-xs bg-black/30 border-white/20"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="minutes">{t('recurring.minutes')}</SelectItem><SelectItem value="hours">{t('recurring.hours')}</SelectItem><SelectItem value="days">{t('recurring.days')}</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs text-white/60">{t('recurring.targetZone')}</label>
                  <Select value={recZoneId} onValueChange={setRecZoneId}>
                    <SelectTrigger className="h-7 text-xs bg-black/30 border-white/20"><SelectValue placeholder={t('recurring.selectZone')} /></SelectTrigger>
                    <SelectContent>
                      {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs text-white/60">{t('recurring.autoDeadline')} {t('recurring.afterGeneration')}</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} value={recDeadlineValue} onChange={e => setRecDeadlineValue(Number(e.target.value))} className="h-7 text-xs bg-black/30 border-white/20" />
                    <Select value={recDeadlineUnit} onValueChange={(v: 'hours' | 'days') => setRecDeadlineUnit(v)}>
                      <SelectTrigger className="w-[80px] h-7 text-xs bg-black/30 border-white/20"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="hours">{t('recurring.hours')}</SelectItem><SelectItem value="days">{t('recurring.days')}</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs text-white/60">{t('recurring.priority')}</label>
                  <Select value={recPriority} onValueChange={(v: TaskPriority) => setRecPriority(v)}>
                    <SelectTrigger className="h-7 text-xs bg-black/30 border-white/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('task.priorityHigh')}</SelectItem>
                      <SelectItem value="medium">{t('task.priorityMedium')}</SelectItem>
                      <SelectItem value="low">{t('task.priorityLow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" className="h-7 text-xs" onClick={() => setShowRecurringDialog(false)}>{t('common.cancel')}</Button>
              <Button className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveRecurring} disabled={!recTitle.trim()}>
                {t('recurring.saveRule')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Environment Profiles Section */}
        <div className="settings-section mt-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
            <h3 className="flex items-center text-sm font-semibold text-white/70">
              <Bookmark size={12} className="mr-1.5 text-indigo-400" />
              {t('settings.environmentProfiles')}
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleImportConfig}>
                <Upload size={12} className="mr-1" /> {t('common.import')}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleExportConfig}>
                <Download size={12} className="mr-1" /> {t('common.export')}
              </Button>
            </div>
          </div>
          <p className="settings-section-desc mb-3">
            {t('settings.environmentProfilesDesc')}
          </p>

          <Button
            variant="outline"
            className="w-full h-7 text-xs mb-3 border-dashed border-indigo-500/50 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
            onClick={() => setShowSaveProfileDialog(true)}
          >
            <Save size={12} className="mr-1.5" /> {t('settings.saveAsSnapshot')}
          </Button>

          <div className="flex flex-col gap-2">
            {(!configProfiles || configProfiles.length === 0) && (
              <div className="text-center py-4 text-xs text-white/30 bg-black/10 rounded-md border border-white/5">
                {t('profile.noProfiles')}
              </div>
            )}
            {(configProfiles || []).map(profile => (
              <div key={profile.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/90">{profile.name}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 text-xs px-2 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => {
                      applyConfigProfile(profile.id);
                      toast.success(`${t('profile.profileApplied')}: ${profile.name}`);
                    }}>
                      {t('common.apply')}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:text-blue-400 hover:bg-blue-400/10" onClick={() => {
                      setEditingProfile(profile);
                      setEditingProfileName(profile.name);
                    }}>
                      <Edit2 size={12} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:text-red-400 hover:bg-red-400/10" onClick={() => deleteConfigProfile(profile.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-white/40">
                  {t('profile.createdAt')}: {new Date(profile.createdAt).toLocaleString()} · {t('profile.containsRules', { count: profile.recurringTemplates.length })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Profile Dialog */}
        <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[400px] p-4 text-xs">
            <DialogHeader>
              <DialogTitle className="text-[14px]">{t('profile.saveProfile')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <Input
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder={t('profile.exampleMode')}
                className="h-7 text-xs bg-black/30 border-white/20"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveProfileDialog(false)}>{t('common.cancel')}</Button>
              <Button className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" disabled={!profileName.trim()} onClick={() => {
                handleSaveProfile(profileName.trim());
                setProfileName('');
                setShowSaveProfileDialog(false);
                toast.success(t('profile.profileSaved'));
              }}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[400px] p-4 text-xs">
            <DialogHeader>
              <DialogTitle className="text-[14px]">{t('profile.editProfile') || 'Edit Profile'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <Input
                value={editingProfileName}
                onChange={e => setEditingProfileName(e.target.value)}
                placeholder={t('profile.snapshotName')}
                className="h-7 text-xs bg-black/30 border-white/20"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" className="h-7 text-xs" onClick={() => setEditingProfile(null)}>{t('common.cancel')}</Button>
              <Button className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" disabled={!editingProfileName.trim()} onClick={() => {
                if (editingProfile) {
                  updateConfigProfile(editingProfile.id, { name: editingProfileName.trim() });
                  toast.success(t('profile.profileSaved'));
                }
                setEditingProfile(null);
                setEditingProfileName('');
              }}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Button */}
        <div className="settings-footer">
          <Button
            variant="outline"
            size="sm"
            className="reset-btn h-7 text-xs"
            onClick={handleReset}
          >
            <RotateCcw size={12} className="mr-1" />
            {t('settings.resetSettings')}
          </Button>
        </div>
      </div>
    </div>
  );
}
