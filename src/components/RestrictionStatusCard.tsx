import { Box, Chip, Divider, LinearProgress, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import type { ProcessStatus } from '../types/app';

interface RestrictionStatusCardProps {
  targetCores: number[];
  gameProcesses: string[];
  processStatus: ProcessStatus | null;
  loading: boolean;
}

interface MonitoredProcessItem {
  label: string;
  getFound: (status: ProcessStatus | null) => boolean;
  getRestricted: (status: ProcessStatus | null) => boolean;
}

const monitoredProcesses: MonitoredProcessItem[] = [
  {
    label: 'SGuard64',
    getFound: (status) => status?.sguard64_found || false,
    getRestricted: (status) => status?.sguard64_restricted || false,
  },
  {
    label: 'SGuardSvc64',
    getFound: (status) => status?.sguardsvc64_found || false,
    getRestricted: (status) => status?.sguardsvc64_restricted || false,
  },
  {
    label: 'ACE-Tray',
    getFound: (status) => status?.ace_tray_found || false,
    getRestricted: (status) => status?.ace_tray_restricted || false,
  },
  {
    label: 'ACE-Service64',
    getFound: (status) => status?.ace_service_found || false,
    getRestricted: (status) => status?.ace_service_restricted || false,
  },
];

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
          {monitoredProcesses.map((item, index) => (
            <Box key={item.label}>
              {index > 0 && <Divider />}
              <ListItem
                secondaryAction={
                  <Chip
                    label={getProcessStatusText(item.getFound(processStatus), item.getRestricted(processStatus))}
                    color={getProcessStatusColor(item.getFound(processStatus), item.getRestricted(processStatus))}
                    size="small"
                  />
                }
                sx={{ py: 0.3 }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontSize: '0.85rem' }} />
              </ListItem>
            </Box>
          ))}
        </List>
        {loading && <LinearProgress sx={{ mt: 0.5 }} />}
      </Box>
    </Paper>
  );
}
