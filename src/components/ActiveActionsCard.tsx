import { PlayArrow as StartIcon, Tune as TuneIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SwitchProps } from '@mui/material/Switch';
import type {
  RestrictionSettingKey,
  RestrictionSettings,
} from '../types/app';

interface SettingItem {
  key: RestrictionSettingKey;
  label: string;
  color: SwitchProps['color'];
  description: string;
}

interface ActiveActionsCardProps {
  settings: RestrictionSettings;
  autoStartEnabled: boolean;
  loading: boolean;
  isMonitoring: boolean;
  affinityCustomized: boolean;
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

export function ActiveActionsCard({
  settings,
  autoStartEnabled,
  loading,
  isMonitoring,
  affinityCustomized,
  onSettingChange,
  onToggleAutoStartup,
  onOpenAffinitySettings,
  onExecute,
}: ActiveActionsCardProps) {
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
    <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 0.5, fontWeight: 600 }}>
        主动限制(开游戏后使用)
      </Typography>
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={0.5} sx={{ mb: 0.5 }}>
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
      <Box display="flex" flexDirection="column" gap={0.6} sx={{ flex: 1, justifyContent: 'flex-end' }}>
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
    </Paper>
  );
}
