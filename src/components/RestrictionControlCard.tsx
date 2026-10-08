import { PlayArrow as StartIcon, Tune as TuneIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SwitchProps } from '@mui/material/Switch';
import type {
  ProcessStatus,
  RestrictionSettingKey,
  RestrictionSettings,
} from '../types/app';

interface SettingItem {
  key: RestrictionSettingKey;
  label: string;
  color: SwitchProps['color'];
  description: string;
}

interface MonitoredProcessItem {
  label: string;
  getRestricted: (status: ProcessStatus | null) => boolean;
}

interface RestrictionControlCardProps {
  settings: RestrictionSettings;
  autoStartEnabled: boolean;
  loading: boolean;
  isMonitoring: boolean;
  affinityCustomized: boolean;
  targetCores: number[];
  gameProcesses: string[];
  processStatus: ProcessStatus | null;
  onSettingChange: (key: RestrictionSettingKey, checked: boolean) => void;
  onToggleAutoStartup: () => void;
  onOpenAffinitySettings: () => void;
  onExecute: () => void;
}

const settingItems: SettingItem[] = [
  { key: 'enableCpuAffinity', label: 'CPU亲和性', color: 'success', description: '将ACE进程绑定到指定核心（默认最后一颗，通常是能效小核），减少抢占性能核心' },
  { key: 'enableProcessPriority', label: '进程优先级', color: 'success', description: '降低ACE进程的CPU调度优先级，让游戏优先获得CPU时间' },
  { key: 'enableEfficiencyMode', label: '效率模式', color: 'warning', description: '将ACE进程设为效率模式(EcoQoS)，降低其运行频率和资源占用' },
  { key: 'enableIoPriority', label: 'I/O优先级', color: 'error', description: '降低ACE进程的磁盘读写优先级，减少与游戏抢IO' },
  { key: 'enableMemoryPriority', label: '内存优先级', color: 'error', description: '降低ACE进程的内存工作集优先级，减少内存占用影响' },
];

const monitoredProcesses: MonitoredProcessItem[] = [
  {
    label: 'SGuard64',
    getRestricted: (status) => status?.sguard64_restricted || false,
  },
  {
    label: 'SGuardSvc64',
    getRestricted: (status) => status?.sguardsvc64_restricted || false,
  },
  {
    label: 'ACE-Tray',
    getRestricted: (status) => status?.ace_tray_restricted || false,
  },
  {
    label: 'ACE-Service64',
    getRestricted: (status) => status?.ace_service_restricted || false,
  },
];

function formatCores(cores: number[]): string {
  if (cores.length <= 4) {
    return cores.join(',');
  }

  return `${cores.slice(0, 4).join(',')} 等${cores.length}颗`;
}

function resolveProcessStatus(found: boolean, restricted: boolean) {
  if (!found) {
    return { color: 'text.disabled', label: '未找到' };
  }

  if (restricted) {
    return { color: 'warning.main', label: '已限制' };
  }

  return { color: 'success.main', label: '运行中' };
}

function StatusTile({
  item,
  found,
  processStatus,
}: {
  item: MonitoredProcessItem;
  found: boolean;
  processStatus: ProcessStatus | null;
}) {
  const status = resolveProcessStatus(found, item.getRestricted(processStatus));

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1,
        py: 0.6,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.2,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" noWrap>
        {item.label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: status.color, lineHeight: 1.2 }}>
          {status.label}
        </Typography>
      </Box>
    </Box>
  );
}

export function RestrictionControlCard({
  settings,
  autoStartEnabled,
  loading,
  isMonitoring,
  affinityCustomized,
  targetCores,
  gameProcesses,
  processStatus,
  onSettingChange,
  onToggleAutoStartup,
  onOpenAffinitySettings,
  onExecute,
}: RestrictionControlCardProps) {
  const renderSettingLabel = (item: SettingItem) => {
    if (item.key !== 'enableCpuAffinity') {
      return <Typography variant="caption">{item.label}</Typography>;
    }

    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption">{item.label}</Typography>
        <IconButton
          aria-label="自定义亲和性核心"
          size="small"
          sx={{ p: 0.25 }}
          disabled={isMonitoring}
          onClick={onOpenAffinitySettings}
        >
          <TuneIcon sx={{ fontSize: 15, color: affinityCustomized ? 'primary.main' : 'text.disabled' }} />
        </IconButton>
      </Box>
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{ p: 1.5, flex: 1.7, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 0.5, fontWeight: 600 }}>
        主动限制(开游戏后使用)
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1.15, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.3 }}>
            限制项
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={0.5}>
            {settingItems.map((item) => (
              <Tooltip key={item.key} title={item.description} placement="bottom" arrow>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings[item.key]}
                      onChange={(event) => onSettingChange(item.key, event.target.checked)}
                      disabled={isMonitoring}
                      color={item.color}
                      size="small"
                    />
                  }
                  label={renderSettingLabel(item)}
                  sx={{ m: 0 }}
                />
              </Tooltip>
            ))}
          </Box>

          <Divider sx={{ my: 0.6 }} />

          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.3 }}>
            自动化
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="开机登录后自动在后台启动（约延迟10秒，驻留托盘不显示窗口）" placement="bottom" arrow>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoStartEnabled}
                    onChange={() => onToggleAutoStartup()}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="caption">开机自启动</Typography>}
                sx={{ m: 0 }}
              />
            </Tooltip>
            <Tooltip title="检测到游戏ACE进程时，自动执行一次主动限制" placement="bottom" arrow>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoRestrict}
                    onChange={(event) => onSettingChange('autoRestrict', event.target.checked)}
                    disabled={isMonitoring}
                    color="info"
                    size="small"
                  />
                }
                label={<Typography variant="caption">自动限制（新）</Typography>}
                sx={{ m: 0 }}
              />
            </Tooltip>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', mt: 0.5 }}>
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={onExecute}
              disabled={loading || isMonitoring}
              color="primary"
              size="small"
              fullWidth
            >
              执行限制
            </Button>
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" flexDirection="column" gap={0.6}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">目标核心:</Typography>
              <Chip
                label={targetCores.length > 0 ? `核心 ${formatCores(targetCores)}` : '检测中...'}
                color="info"
                variant="outlined"
                size="small"
              />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                目标进程:
              </Typography>
              <Chip
                label={gameProcesses.length > 0 ? gameProcesses.join(', ') : '未检测到'}
                color={gameProcesses.length > 0 ? 'success' : 'default'}
                size="small"
                sx={{ maxWidth: '65%' }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 0.6 }} />

          <Box
            display="grid"
            gridTemplateColumns="1fr 1fr"
            gap={0.6}
            sx={{ flex: 1, minHeight: 0 }}
          >
            {monitoredProcesses.map((item) => (
              <StatusTile
                key={item.label}
                item={item}
                found={gameProcesses.includes(item.label)}
                processStatus={processStatus}
              />
            ))}
          </Box>

          {loading && <LinearProgress sx={{ mt: 0.5 }} />}
        </Box>
      </Box>
    </Paper>
  );
}
