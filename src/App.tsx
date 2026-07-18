import { useCallback, useEffect, useRef, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Box, Container, CssBaseline, ThemeProvider } from '@mui/material';
import { ActiveActionsCard } from './components/ActiveActionsCard';
import { AppHeader } from './components/AppHeader';
import { FetchErrorSnackbar } from './components/FetchErrorSnackbar';
import { LogPanel } from './components/LogPanel';
import { MemoryCleanCard } from './components/MemoryCleanCard';
import { PassiveActionsCard } from './components/PassiveActionsCard';
import { PerformancePanel } from './components/PerformancePanel';
import { RestrictionStatusCard } from './components/RestrictionStatusCard';
import { SystemInfoCard } from './components/SystemInfoCard';
import { AnnouncementsDialog } from './components/dialogs/AnnouncementsDialog';
import { UpdateDialog } from './components/dialogs/UpdateDialog';
import { APP_VERSION } from './constants';
import { useInitialData } from './services/api';
import {
  buildPerformancePoint,
  checkAutoStartStatus,
  checkRegistryPriorityCommand,
  cleanMemoryAndTemp,
  executeTextCommand,
  gameOptimizationActions,
  getMemoryCleanStatus,
  getProcessPerformance,
  getSystemInfo,
  hasAceProcess,
  lowerAcePriorityCommand,
  resetRegistryPriorityCommand,
  restrictProcesses,
  setAutoStartState,
  type LoggedCommandDefinition,
} from './services/processControl';
import { savePerformanceReport } from './services/report';
import { darkTheme, lightTheme } from './theme/appTheme';
import type {
  LogEntry,
  MemoryCleanStatus,
  PerfDataPoint,
  ProcessPerformance,
  ProcessStatus,
  RestrictionSettingKey,
  RestrictionSettings,
  SystemInfo,
} from './types/app';
import { storage } from './utils/storage';

const maxVisibleHistoryPoints = 360;
const restrictionSettingKeys: RestrictionSettingKey[] = [
  'enableCpuAffinity',
  'enableProcessPriority',
  'enableEfficiencyMode',
  'enableIoPriority',
  'enableMemoryPriority',
  'autoRestrict',
];

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [targetCore, setTargetCore] = useState<number | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [performance, setPerformance] = useState<ProcessPerformance[]>([]);
  const [perfHistory, setPerfHistory] = useState<PerfDataPoint[]>([]);
  const [enableCpuAffinity, setEnableCpuAffinity] = useState(true);
  const [enableProcessPriority, setEnableProcessPriority] = useState(true);
  const [enableEfficiencyMode, setEnableEfficiencyMode] = useState(false);
  const [enableIoPriority, setEnableIoPriority] = useState(false);
  const [enableMemoryPriority, setEnableMemoryPriority] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoRestrict, setAutoRestrict] = useState(false);
  const [hasAutoRestricted, setHasAutoRestricted] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<MemoryCleanStatus | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [autoMemoryCleanOnGameStart, setAutoMemoryCleanOnGameStart] = useState(false);
  const [hasAutoCleanedForGame, setHasAutoCleanedForGame] = useState(false);
  const [autoMemoryCleanThreshold, setAutoMemoryCleanThreshold] = useState<number | null>(null);
  const lastThresholdCleanRef = useRef(0);

  const gameProcesses = performance.map((process) => process.name);
  const { announcements, latestVersion, hasUpdate, fetchError } = useInitialData(APP_VERSION);
  const restrictionSettingSetters: Record<RestrictionSettingKey, (checked: boolean) => void> = {
    enableCpuAffinity: setEnableCpuAffinity,
    enableProcessPriority: setEnableProcessPriority,
    enableEfficiencyMode: setEnableEfficiencyMode,
    enableIoPriority: setEnableIoPriority,
    enableMemoryPriority: setEnableMemoryPriority,
    autoRestrict: setAutoRestrict,
  };

  const addLog = useCallback((message: string) => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
    };

    setLogs((previousLogs) => [...previousLogs, entry]);
  }, []);

  const executeProcessRestriction = useCallback(async () => {
    try {
      addLog('进程限制开始b（￣▽￣）d　');
      setLoading(true);

      const result = await restrictProcesses({
        enableCpuAffinity,
        enableProcessPriority,
        enableEfficiencyMode,
        enableIoPriority,
        enableMemoryPriority,
      });

      setProcessStatus(result);
      setTargetCore(result.target_core);
      addLog(result.message);
    } catch (error) {
      addLog(`执行失败: ${error}`);
      console.error('执行进程限制失败/(ㄒoㄒ)/~~', error);
    } finally {
      setLoading(false);
    }
  }, [
    addLog,
    enableCpuAffinity,
    enableProcessPriority,
    enableEfficiencyMode,
    enableIoPriority,
    enableMemoryPriority,
  ]);

  const executeOnce = useCallback(async () => {
    const enabledModes = [
      enableCpuAffinity ? 'CPU亲和性' : null,
      enableProcessPriority ? '进程优先级' : null,
      enableEfficiencyMode ? '效率模式' : null,
      enableIoPriority ? 'I/O优先级' : null,
      enableMemoryPriority ? '内存优先级' : null,
    ].filter(Boolean).join('+') || '标准模式';

    setIsMonitoring(true);
    addLog(`执行进程限制 (${enabledModes})`);

    try {
      await executeProcessRestriction();
    } finally {
      setIsMonitoring(false);
    }
  }, [
    addLog,
    enableCpuAffinity,
    enableProcessPriority,
    enableEfficiencyMode,
    enableIoPriority,
    enableMemoryPriority,
    executeProcessRestriction,
  ]);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const info = await getSystemInfo();

      setSystemInfo(info);
      setTargetCore(info.cpu_logical_cores - 1);
      addLog(`系统信息已加载: ${info.os_name} ${info.os_version}`);
      addLog(`CPU: ${info.cpu_model}`);
      addLog(`核心: ${info.cpu_cores}物理/${info.cpu_logical_cores}逻辑`);
      addLog(`内存: ${info.total_memory_gb.toFixed(2)} GB`);
      addLog(`WebView2环境: ${info.webview2_env}`);

      if (!info.is_admin) {
        addLog('小春未以管理员权限运行，部分功能可能受限');
      } else {
        addLog('小春已获取管理员权限，正在降低ACE占用');
      }
    } catch (error) {
      addLog(`获取系统信息失败: ${error}`);
    }
  }, [addLog]);

  const fetchPerformance = useCallback(async () => {
    try {
      const currentPerformance = await getProcessPerformance();

      setPerformance(currentPerformance);

      const point = buildPerformancePoint(currentPerformance);

      setPerfHistory((previousHistory) => [...previousHistory, point]);
    } catch (error) {
      console.error('获取性能数据失败:', error);
    }
  }, []);

  const fetchMemoryStatus = useCallback(async () => {
    try {
      const status = await getMemoryCleanStatus();
      setMemoryStatus(status);
    } catch (error) {
      console.error('获取内存状态失败:', error);
    }
  }, []);

  const performCleanup = useCallback(async () => {
    if (cleaning) return;
    setCleaning(true);
    addLog('开始清理内存...');
    try {
      const result = await cleanMemoryAndTemp();
      result.messages.forEach((message) => addLog(message));
      addLog(`清理完成，释放内存 ${result.memory_freed_mb.toFixed(1)} MB`);
      await fetchMemoryStatus();
    } catch (error) {
      addLog(`内存清理失败: ${error}`);
    } finally {
      setCleaning(false);
    }
  }, [addLog, cleaning, fetchMemoryStatus]);

  const checkAutoStart = useCallback(async () => {
    try {
      const enabled = await checkAutoStartStatus();
      setAutoStartEnabled(enabled);
    } catch (error) {
      console.error('检查自启动状态失败:', error);
    }
  }, []);

  const toggleAutoStartup = useCallback(async () => {
    try {
      const nextState = !autoStartEnabled;

      const message = await setAutoStartState(nextState);
      addLog(message);
      await checkAutoStart();
    } catch (error) {
      addLog(`切换自启动失败: ${error}`);
      console.error('切换自启动失败:', error);
    }
  }, [autoStartEnabled, addLog, checkAutoStart]);

  const runLoggedCommand = useCallback(async ({
    command,
    startMessage,
    successMessage,
    errorMessage,
  }: LoggedCommandDefinition) => {
    try {
      setLoading(true);
      addLog(startMessage);

      const outputLines = await executeTextCommand({
        command,
        startMessage,
        successMessage,
        errorMessage,
      });

      addLog(successMessage);
      outputLines.forEach((line) => addLog(line));
    } catch (error) {
      addLog(`${errorMessage}: ${error}`);
      console.error(errorMessage, error);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const lowerAcePriority = useCallback(async () => {
    await runLoggedCommand(lowerAcePriorityCommand);
  }, [runLoggedCommand]);

  const checkRegistryPriority = useCallback(async () => {
    await runLoggedCommand(checkRegistryPriorityCommand);
  }, [runLoggedCommand]);

  const resetRegistryPriority = useCallback(async () => {
    await runLoggedCommand(resetRegistryPriorityCommand);
  }, [runLoggedCommand]);

  const generateReport = useCallback(async () => {
    if (perfHistory.length === 0) {
      addLog('没有性能数据可导出');
      return;
    }

    setExportingReport(true);
    addLog('正在生成性能报告...');

    try {
      const savedPath = await savePerformanceReport({
        data: perfHistory,
        systemInfo,
      });

      addLog(`报告已保存: ${savedPath}`);
    } catch (error) {
      addLog(`生成报告失败: ${error}`);
    } finally {
      setExportingReport(false);
    }
  }, [addLog, perfHistory, systemInfo]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    addLog('FuckACE已启动，开始法克ACE');
    void fetchSystemInfo();
    void checkAutoStart();
    void fetchMemoryStatus();

    const perfInterval = setInterval(() => {
      void fetchPerformance();
    }, 5000);

    const memoryStatusInterval = setInterval(() => {
      void fetchMemoryStatus();
    }, 5000);

    return () => {
      clearInterval(perfInterval);
      clearInterval(memoryStatusInterval);
    };
  }, [addLog, checkAutoStart, fetchMemoryStatus, fetchPerformance, fetchSystemInfo]);

  useEffect(() => {
    const cachedChoices = storage.getChoices() as ReturnType<typeof storage.getChoices> & {
      autoMemoryCleanOnGameStart?: boolean;
    };

    if (!cachedChoices.rememberChoices) {
      return;
    }

    restrictionSettingKeys.forEach((key) => {
      const value = cachedChoices[key];

      if (value !== undefined) {
        restrictionSettingSetters[key](value);
      }
    });

    if (typeof cachedChoices.autoMemoryCleanOnGameStart==='boolean'){
      setAutoMemoryCleanOnGameStart(cachedChoices.autoMemoryCleanOnGameStart);
    }

    if (typeof cachedChoices.autoMemoryCleanThreshold === 'number') {
      setAutoMemoryCleanThreshold(cachedChoices.autoMemoryCleanThreshold);
    }
  }, []);

  useEffect(() => {
    storage.saveChoices({
      enableCpuAffinity,
      enableProcessPriority,
      enableEfficiencyMode,
      enableIoPriority,
      enableMemoryPriority,
      autoRestrict,
      autoMemoryCleanOnGameStart,
      rememberChoices: true,
      autoMemoryCleanThreshold,
    } as Parameters<typeof storage.saveChoices>[0] & {
      autoMemoryCleanOnGameStart: boolean;
    });
  }, [
    enableCpuAffinity,
    enableProcessPriority,
    enableEfficiencyMode,
    enableIoPriority,
    enableMemoryPriority,
    autoRestrict,
    autoMemoryCleanOnGameStart,
    autoMemoryCleanThreshold,
  ]);

  useEffect(() => {
    if (!autoRestrict || hasAutoRestricted || !systemInfo?.is_admin) {
      return;
    }

    const aceFound = hasAceProcess(performance);

    if (aceFound) {
      setHasAutoRestricted(true);
      addLog('检测到ACE进程，自动执行主动限制...');
      void executeProcessRestriction();
    }
  }, [
    addLog,
    autoRestrict,
    executeProcessRestriction,
    hasAutoRestricted,
    performance,
    systemInfo,
  ]);

  useEffect(() => {
    const aceFound = hasAceProcess(performance);

    if (autoMemoryCleanOnGameStart && aceFound && !hasAutoCleanedForGame && !cleaning) {
      setHasAutoCleanedForGame(true);
      addLog('检测到游戏启动，自动执行一次内存清理...');
      void performCleanup();
    }

    if (!aceFound) {
      if (hasAutoRestricted) {
        addLog('ACE进程已关闭，显示窗口');
        void getCurrentWindow().show();
        void getCurrentWindow().setFocus();
      }
      setHasAutoRestricted(false);
      setHasAutoCleanedForGame(false);
    }
  }, [
    addLog,
    autoMemoryCleanOnGameStart,
    cleaning,
    hasAutoCleanedForGame,
    hasAutoRestricted,
    performance,
    performCleanup,
  ]);

  useEffect(() => {
    if (autoMemoryCleanThreshold === null || !memoryStatus || cleaning) return;
    if (memoryStatus.memory_percent < autoMemoryCleanThreshold) return;

    const now = Date.now();
    const COOLDOWN_MS = 5 * 60 * 1000;
    if (now - lastThresholdCleanRef.current < COOLDOWN_MS) return;

    lastThresholdCleanRef.current = now;
    addLog(`内存占用 ${memoryStatus.memory_percent.toFixed(0)}% 超过阈值 ${autoMemoryCleanThreshold}%，自动清理...`);
    void performCleanup();
  }, [autoMemoryCleanThreshold, memoryStatus, cleaning, addLog, performCleanup]);

  useEffect(() => {
    if (hasUpdate) {
      setShowUpdateDialog(true);
    }
  }, [hasUpdate]);

  const handleSettingChange = useCallback((key: RestrictionSettingKey, checked: boolean) => {
    restrictionSettingSetters[key](checked);
  }, [restrictionSettingSetters]);

  const toggleDarkMode = () => {
    setDarkMode((currentValue) => !currentValue);
  };

  const openExternalLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error('opener插件打开链接失败:', error);

      try {
        const { open: shellOpen } = await import('@tauri-apps/plugin-shell');
        await shellOpen(url);
      } catch (shellError) {
        console.error('shell插件打开链接失败:', shellError);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const isAdmin = Boolean(systemInfo?.is_admin);
  const displayedHistory = perfHistory.slice(-maxVisibleHistoryPoints);
  const restrictionSettings: RestrictionSettings = {
    enableCpuAffinity,
    enableProcessPriority,
    enableEfficiencyMode,
    enableIoPriority,
    enableMemoryPriority,
    autoRestrict,
  };
  const passiveActions = gameOptimizationActions.map((action) => ({
    id: action.id,
    label: action.label,
    onClick: () => {
      void runLoggedCommand(action);
    },
  }));
  const currentTheme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppHeader
          appVersion={APP_VERSION}
          announcementCount={announcements.length}
          hasUpdate={hasUpdate}
          darkMode={darkMode}
          onOpenAnnouncements={() => setShowAnnouncements(true)}
          onOpenUpdates={() => setShowUpdateDialog(true)}
          onOpenBilibiliHome={() => {
            void openExternalLink('https://space.bilibili.com/309820452');
          }}
          onOpenRepository={() => {
            void openExternalLink('https://github.com/shshouse/FuckACE');
          }}
          onToggleTheme={toggleDarkMode}
        />

        <Box display="flex" flexDirection="column" gap={1} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Box display="flex" gap={1}>
            <PerformancePanel
              history={displayedHistory}
              exportingReport={exportingReport}
              onExportReport={generateReport}
            />
            <Box display="flex" flexDirection="column" gap={1} sx={{ flex: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              <SystemInfoCard systemInfo={systemInfo} />
              <MemoryCleanCard
                status={memoryStatus}
                cleaning={cleaning}
                autoMemoryCleanEnabled={autoMemoryCleanOnGameStart}
                autoMemoryCleanThreshold={autoMemoryCleanThreshold}
                onAutoMemoryCleanChange={setAutoMemoryCleanOnGameStart}
                onThresholdChange={setAutoMemoryCleanThreshold}
                onCleanNow={() => {
                  void performCleanup();
                }}
              />
            </Box>
          </Box>

          <Box display="flex" gap={1}>
            <PassiveActionsCard
              loading={loading}
              isAdmin={isAdmin}
              actions={passiveActions}
              onLowerAcePriority={lowerAcePriority}
              onCheckRegistry={checkRegistryPriority}
              onResetRegistry={resetRegistryPriority}
            />
            <ActiveActionsCard
              settings={restrictionSettings}
              autoStartEnabled={autoStartEnabled}
              loading={loading}
              isMonitoring={isMonitoring}
              onSettingChange={handleSettingChange}
              onToggleAutoStartup={toggleAutoStartup}
              onExecute={executeOnce}
            />
            <RestrictionStatusCard
              targetCore={targetCore}
              gameProcesses={gameProcesses}
              processStatus={processStatus}
              loading={loading}
            />
          </Box>

          <LogPanel logs={logs} containerRef={logContainerRef} />
        </Box>

        {/* 公告对话框 */}
        <AnnouncementsDialog
          open={showAnnouncements}
          announcements={announcements}
          onClose={() => setShowAnnouncements(false)}
        />

        <UpdateDialog
          open={showUpdateDialog}
          hasUpdate={hasUpdate}
          latestVersion={latestVersion}
          onClose={() => setShowUpdateDialog(false)}
          onDownload={() => {
            if (latestVersion) {
              void openExternalLink(latestVersion.download_url);
            }
          }}
        />

        <FetchErrorSnackbar open={fetchError} />
      </Container>
    </ThemeProvider>
  );
}

export default App;