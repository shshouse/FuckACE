import { useMemo } from 'react';
import { RocketLaunch as RocketIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import type { MemoryCleanStatus } from '../types/app';

interface MemoryCleanCardProps {
  status: MemoryCleanStatus | null;
  cleaning: boolean;
  autoMemoryCleanEnabled: boolean;
  autoMemoryCleanThreshold: number | null;
  onAutoMemoryCleanChange: (enabled: boolean) => void;
  onThresholdChange: (threshold: number | null) => void;
  onCleanNow: () => void;
}

export function MemoryCleanCard({
  status,
  cleaning,
  autoMemoryCleanEnabled,
  autoMemoryCleanThreshold,
  onAutoMemoryCleanChange,
  onThresholdChange,
  onCleanNow,
}: MemoryCleanCardProps) {
  const memoryPercent = useMemo(() => {
    if (!status) return 0;
    return Math.min(100, Math.max(0, status.memory_percent));
  }, [status]);

  const usedGb = status?.used_memory_gb ?? 0;
  const totalGb = status?.total_memory_gb ?? 0;

  return (
    <Paper elevation={2} sx={{ p: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.3 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <RocketIcon sx={{ fontSize: 16 }} color="primary" />
          <Typography variant="subtitle2" fontWeight={600}>
            内存加速(新)
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Tooltip
            title="检测到游戏启动时自动执行一次内存清理"
            placement="bottom"
            arrow
          >
            <Stack direction="row" spacing={0.3} alignItems="center" sx={{ cursor: 'help' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                游戏前
              </Typography>
              <Switch
                size="small"
                checked={autoMemoryCleanEnabled}
                onChange={(event) => onAutoMemoryCleanChange(event.target.checked)}
                color="primary"
                sx={{ transform: 'scale(0.75)', m: 0 }}
              />
            </Stack>
          </Tooltip>
          <Tooltip
            title="内存占用达到设定阈值时自动清理，5分钟内不重复触发"
            placement="bottom"
            arrow
          >
            <Stack direction="row" spacing={0.3} alignItems="center" sx={{ cursor: 'help' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                阈值
              </Typography>
              <Switch
                size="small"
                checked={autoMemoryCleanThreshold !== null}
                onChange={(event) => onThresholdChange(event.target.checked ? 85 : null)}
                color="primary"
                sx={{ transform: 'scale(0.75)', m: 0 }}
              />
            </Stack>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ mb: 0.8 }}>
        <Stack direction="row" spacing={0.8} alignItems="baseline">
          <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ lineHeight: 1.2 }}>
            {memoryPercent.toFixed(0)}%
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            内存占用
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', ml: 'auto' }}>
            {usedGb.toFixed(1)} / {totalGb.toFixed(1)} GB
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={memoryPercent}
          color={memoryPercent >= 85 ? 'error' : memoryPercent >= 70 ? 'warning' : 'primary'}
          sx={{ height: 6, borderRadius: 3, mt: 0.3 }}
        />
      </Box>

      {autoMemoryCleanThreshold !== null && (
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.8 }}>
          <Slider
            size="small"
            value={autoMemoryCleanThreshold}
            min={80}
            max={95}
            step={5}
            onChange={(_, value) => onThresholdChange(value as number)}
            marks
            sx={{ flex: 1, py: 0, my: 0 }}
            valueLabelDisplay="off"
          />
          <Typography variant="caption" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {autoMemoryCleanThreshold}%
          </Typography>
        </Stack>
      )}

      <Button
        variant="contained"
        color="primary"
        size="small"
        fullWidth
        disabled={cleaning}
        onClick={onCleanNow}
        startIcon={<RocketIcon sx={{ fontSize: 16 }} />}
        sx={{ fontWeight: 600, py: 0.4, fontSize: '0.75rem', mt: 'auto' }}
      >
        {cleaning ? '清理中...' : '立即清理'}
      </Button>
    </Paper>
  );
}
