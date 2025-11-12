import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as ManualIcon,
  CheckCircle,
  Schedule,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SportsEsports as GameIcon,
  Extension as ModIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    success: {
      main: '#81c784',
    },
    warning: {
      main: '#ffb74d',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    h3: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

interface ProcessStatus {
  target_core: number;
  sguard64_found: boolean;
  sguard64_restricted: boolean;
  sguardsvc64_found: boolean;
  sguardsvc64_restricted: boolean;
  weixin_found: boolean;
  weixin_restricted: boolean;
  message: string;
}

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
}

interface SystemInfo {
  cpu_model: string;
  cpu_cores: number;
  cpu_logical_cores: number;
  os_name: string;
  os_version: string;
  is_admin: boolean;
  total_memory_gb: number;
}

interface ProcessPerformance {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_mb: number;
}

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [targetCore, setTargetCore] = useState<number | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [performance, setPerformance] = useState<ProcessPerformance[]>([]);
  const [aggressiveMode, setAggressiveMode] = useState(false);

  let countdownTimer: number | null = null;

  const addLog = useCallback((message: string) => {
    const newLog: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const executeProcessRestriction = useCallback(async () => {
    try {
      addLog('进程限制开始b（￣▽￣）d　');
      setLoading(true);

      const result = await invoke<ProcessStatus>('restrict_processes', { 
        aggressiveMode: aggressiveMode 
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
  }, [addLog, aggressiveMode]);

  const startMonitoring = useCallback(async () => {
    try {
      await invoke('start_timer', { aggressiveMode: aggressiveMode });
      setIsMonitoring(true);
      addLog(`启动进程监控 (${aggressiveMode ? '激进模式' : '标准模式'})`);
      await executeProcessRestriction();
    } catch (error) {
      addLog(`启动监控失败: ${error}`);
      setIsMonitoring(false);
    }
  }, [addLog, executeProcessRestriction, aggressiveMode]);

  const stopMonitoring = useCallback(async () => {
    try {
      await invoke('stop_timer');
      setIsMonitoring(false);
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      addLog('停止进程监控');
    } catch (error) {
      addLog(`停止监控失败: ${error}`);
    }
  }, [addLog]);

  const manualExecute = useCallback(async () => {
    if (!isMonitoring) {
      addLog('请先启动监控');
      return;
    }
    addLog('手动执行限制操作');
    await executeProcessRestriction();
  }, [isMonitoring, addLog, executeProcessRestriction]);

  useEffect(() => {
    if (isMonitoring) {
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            executeProcessRestriction();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
    };
  }, [isMonitoring, executeProcessRestriction]);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const info = await invoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
      addLog(`系统信息已加载: ${info.os_name} ${info.os_version}`);
      addLog(`CPU: ${info.cpu_model}`);
      addLog(`核心: ${info.cpu_cores}物理/${info.cpu_logical_cores}逻辑`);
      addLog(`内存: ${info.total_memory_gb.toFixed(2)} GB`);
      
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
      const perf = await invoke<ProcessPerformance[]>('get_process_performance');
      setPerformance(perf);
    } catch (error) {
      console.error('获取性能数据失败:', error);
    }
  }, []);

  useEffect(() => {
    addLog('FuckACE已启动，开始法克ACE');
    fetchSystemInfo();
    startMonitoring();

    const perfInterval = setInterval(fetchPerformance, 5000);

    return () => {
      clearInterval(perfInterval);
    };
  }, [addLog, startMonitoring, fetchSystemInfo, fetchPerformance]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getProcessStatusColor = (found: boolean, restricted: boolean) => {
    if (!found) return 'default';
    return restricted ? 'warning' : 'success';
  };

  const getProcessStatusText = (found: boolean, restricted: boolean) => {
    if (!found) return '未找到';
    return restricted ? '已限制' : '运行中';
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const openExternalLink = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error('打开链接失败:', error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : createTheme()}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={3} sx={{ p: 1.5, mb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
                <Avatar 
                  src="/logo.png" 
                  sx={{ width: 36, height: 36 }}
                  variant="rounded"
                />
              <Box>
                <Typography variant="h5" component="h1" color="primary" sx={{ lineHeight: 1.2 }}>
                  FuckACE v0.1
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  小春正在持续监控并限制ACE占用
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<GameIcon />}
                onClick={async () => await openExternalLink('https://www.mikugame.icu/')}
                sx={{ minWidth: 'auto', px: 1 }}
                size="small"
                title="MikuGame - 初音游戏库"
              >
                找游戏
              </Button>
              <Button
                variant="outlined"
                startIcon={<ModIcon />}
                onClick={async () => await openExternalLink('https://www.mikumod.com/')}
                sx={{ minWidth: 'auto', px: 1 }}
                size="small"
                title="MikuMod - 游戏模组社区"
              >
                找模组
              </Button>
              <Button
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={async () => await openExternalLink('https://github.com/shshouse')}
                sx={{ minWidth: 'auto', px: 1 }}
                size="small"
                title="作者: shshouse"
              >
                作者github
              </Button>
              <Button
                variant="outlined"
                startIcon={darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                onClick={toggleDarkMode}
                sx={{ minWidth: 'auto', px: 1 }}
                size="small"
              >
                {darkMode ? '浅色' : '暗色'}
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box display="flex" flexDirection="column" gap={1} sx={{ flex: 1, overflow: 'hidden' }}>
          <Box display="flex" gap={1}>
            <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>监控状态</Typography>
              <Box display="flex" flexDirection="column" gap={0.8} sx={{ maxHeight: 150, overflow: 'hidden' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">监控状态:</Typography>
                  <Chip
                    icon={isMonitoring ? <CheckCircle /> : <Schedule />}
                    label={isMonitoring ? '监控中' : '已停止'}
                    color={isMonitoring ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">下次执行:</Typography>
                  <Chip
                    label={`${countdown}秒`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">目标核心:</Typography>
                  <Chip
                    label={targetCore !== null ? `核心 ${targetCore}` : '检测中...'}
                    color="info"
                    variant="outlined"
                    size="small"
                  />
                </Box>

                {loading && <LinearProgress sx={{ mt: 1 }} />}
              </Box>
            </Paper>

            <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>进程状态</Typography>
              <List dense sx={{ maxHeight: 150, overflowY: 'auto' }}>
                <ListItem secondaryAction={
                    <Chip
                      label={getProcessStatusText(processStatus?.sguard64_found || false, processStatus?.sguard64_restricted || false)}
                      color={getProcessStatusColor(processStatus?.sguard64_found || false, processStatus?.sguard64_restricted || false)}
                      size="small"
                    />
                  }
                  sx={{ py: 0.3 }}
                >
                  <ListItemText primary="SGuard64.exe" primaryTypographyProps={{ variant: 'body2', fontSize: '0.85rem' }} />
                </ListItem>
                <Divider />
                <ListItem secondaryAction={
                    <Chip
                      label={getProcessStatusText(processStatus?.sguardsvc64_found || false, processStatus?.sguardsvc64_restricted || false)}
                      color={getProcessStatusColor(processStatus?.sguardsvc64_found || false, processStatus?.sguardsvc64_restricted || false)}
                      size="small"
                    />
                  }
                  sx={{ py: 0.3 }}
                >
                  <ListItemText primary="SGuardSvc64.exe" primaryTypographyProps={{ variant: 'body2', fontSize: '0.85rem' }} />
                </ListItem>
                <Divider />
                <ListItem secondaryAction={
                    <Chip
                      label={getProcessStatusText(processStatus?.weixin_found || false, processStatus?.weixin_restricted || false)}
                      color={getProcessStatusColor(processStatus?.weixin_found || false, processStatus?.weixin_restricted || false)}
                      size="small"
                    />
                  }
                  sx={{ py: 0.3 }}
                >
                  <ListItemText primary="Weixin.exe" primaryTypographyProps={{ variant: 'body2', fontSize: '0.85rem' }} />
                </ListItem>
              </List>
            </Paper>

            <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>系统信息</Typography>
              {systemInfo ? (
                <Box display="flex" flexDirection="column" gap={0.5} sx={{ maxHeight: 150, overflow: 'hidden' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">CPU:</Typography>
                    <Typography variant="caption" noWrap sx={{ maxWidth: '65%' }} title={systemInfo.cpu_model}>
                      {systemInfo.cpu_model.split(' ').slice(-2).join(' ')}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">核心:</Typography>
                    <Typography variant="caption">{systemInfo.cpu_cores}P / {systemInfo.cpu_logical_cores}L</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">系统:</Typography>
                    <Typography variant="caption">{systemInfo.os_name} {systemInfo.os_version.split('.')[0]}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">内存:</Typography>
                    <Typography variant="caption">{systemInfo.total_memory_gb.toFixed(1)} GB</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">权限:</Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption">{systemInfo.is_admin ? '管理员' : '普通用户'}</Typography>
                      {systemInfo.is_admin && <CheckCircle color="success" sx={{ fontSize: 14 }} />}
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">加载中...</Typography>
              )}
            </Paper>
          </Box>

          <Box display="flex" gap={1}>
            <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>性能监控</Typography>
              {performance.length > 0 ? (
                <List dense sx={{ maxHeight: 180, overflowY: 'auto' }}>
                  {performance.map((proc) => (
                    <Box key={proc.pid}>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" fontWeight="500">
                                {proc.name} (PID: {proc.pid})
                              </Typography>
                              <Chip 
                                label={`CPU: ${proc.cpu_usage.toFixed(1)}%`}
                                size="small"
                                color={proc.cpu_usage > 10 ? 'error' : proc.cpu_usage > 5 ? 'warning' : 'success'}
                              />
                            </Box>
                          }
                          secondary={
                            <Box mt={0.5}>
                              <Typography variant="caption" display="block">
                                内存: {proc.memory_mb.toFixed(2)} MB
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min(proc.cpu_usage, 100)} 
                                sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                                color={proc.cpu_usage > 10 ? 'error' : proc.cpu_usage > 5 ? 'warning' : 'success'}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  未检测到目标进程
                </Typography>
              )}
            </Paper>

            <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>控制面板</Typography>
              <Box display="flex" flexDirection="column" gap={1} sx={{ maxHeight: 180 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={aggressiveMode}
                      onChange={(e) => setAggressiveMode(e.target.checked)}
                      disabled={isMonitoring}
                      color="warning"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      完全限制模式{aggressiveMode && '(额外对ACE进程开启效能模式,I/O和内存优先级降低)'}
                    </Typography>
                  }
                />
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={startMonitoring}
                  disabled={isMonitoring || loading}
                  size="medium"
                  fullWidth
                >
                  启动监控
                </Button>
                <Button
                  variant="contained"
                  startIcon={<StopIcon />}
                  onClick={stopMonitoring}
                  disabled={!isMonitoring || loading}
                  color="secondary"
                  size="medium"
                  fullWidth
                >
                  停止监控
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ManualIcon />}
                  onClick={manualExecute}
                  disabled={!isMonitoring || loading}
                  color="info"
                  size="medium"
                  fullWidth
                >
                  立即执行
                </Button>
              </Box>
            </Paper>
          </Box>

          <Paper elevation={2} sx={{ p: 1.5, flex: '0 0 auto', maxWidth: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>操作日志</Typography>
            <Box
              ref={logContainerRef}
              sx={{
                height: 80,
                maxHeight: 80,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 0.75,
                backgroundColor: 'background.default',
              }}
            >
              {logs.map((log) => (
                <Typography
                  key={log.id}
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    py: 0.15,
                    lineHeight: 1.4,
                  }}
                >
                  [{log.timestamp}] {log.message}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;