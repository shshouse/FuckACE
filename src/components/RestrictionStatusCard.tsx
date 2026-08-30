import { Box, Chip, Divider, LinearProgress, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import type { ProcessStatus } from '../types/app';

interface RestrictionStatusCardProps {
  targetCores: number[];
  gameProcesses: string[];
  processStatus: ProcessStatus | null;
  loading: boolean;
}

function formatCores(cores: number[]): string {
  if (cores.length <= 4) {
    return cores.join(',');
  }

  return `${cores.slice(0, 4).join(',')} 等${cores.length}颗`;
}

function getProcessStatusColor(found: boolean, restricted: boolean): ChipProps['color'] {
  if (!found) {
    return 'default';
  }

  return restricted ? 'warning' : 'success';
}

function getProcessStatusText(found: boolean, restricted: boolean) {
  if (!found) {
    return '未找到';
  }

  return restricted ? '已限制' : '运行中';
}

export function RestrictionStatusCard({
  targetCores,
  gameProcesses,
  processStatus,
  loading,
}: RestrictionStatusCardProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 0.5, fontWeight: 600 }}>
        主动限制状态
      </Typography>
      <Box display="flex" flexDirection="column" gap={0.8}>
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
            sx={{ maxWidth: '70%' }}
          />
        </Box>
        <Divider sx={{ my: 0.3 }} />
        <List dense sx={{ py: 0 }}>
          <ListItem
            secondaryAction={
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
          <ListItem
            secondaryAction={
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
        </List>
        {loading && <LinearProgress sx={{ mt: 0.5 }} />}
      </Box>
    </Paper>
  );
}
