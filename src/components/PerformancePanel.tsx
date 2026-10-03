import { Box, Button, Paper, Typography } from '@mui/material';
import { SaveAlt as SaveIcon } from '@mui/icons-material';
import { MetricChart } from './MetricChart';
import type { MetricLine } from './MetricChart';
import type { PerfDataPoint } from '../types/app';

interface PerformancePanelProps {
  history: PerfDataPoint[];
  exportingReport: boolean;
  onExportReport: () => void;
}

interface ChartSection {
  title: string;
  unit: string;
  tooltipFormatter: (value: unknown) => string;
  lines: readonly MetricLine[];
}

const chartLegendItems: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'SGuard64', color: '#f44336' },
  { name: 'SGuardSvc64', color: '#ff9800' },
  { name: 'ACE-Tray', color: '#42a5f5' },
  { name: 'ACE-Service64', color: '#ab47bc' },
];

const chartSections: ChartSection[] = [
  {
    title: 'CPU (%)',
    unit: '%',
    tooltipFormatter: (value: unknown) => `${value}%`,
    lines: [
      { dataKey: 'sguard_cpu', name: 'SGuard64', stroke: '#f44336' },
      { dataKey: 'sguardsvc_cpu', name: 'SGuardSvc64', stroke: '#ff9800' },
      { dataKey: 'acetray_cpu', name: 'ACE-Tray', stroke: '#42a5f5' },
      { dataKey: 'aceservice_cpu', name: 'ACE-Service64', stroke: '#ab47bc' },
    ],
  },
  {
    title: '内存 (MB)',
    unit: 'MB',
    tooltipFormatter: (value: unknown) => `${value} MB`,
    lines: [
      { dataKey: 'sguard_mem', name: 'SGuard64', stroke: '#f44336' },
      { dataKey: 'sguardsvc_mem', name: 'SGuardSvc64', stroke: '#ff9800' },
      { dataKey: 'acetray_mem', name: 'ACE-Tray', stroke: '#42a5f5' },
      { dataKey: 'aceservice_mem', name: 'ACE-Service64', stroke: '#ab47bc' },
    ],
  },
  {
    title: 'I/O (KB/s)',
    unit: 'KB',
    tooltipFormatter: (value: unknown) => `${value} KB/s`,
    lines: [
      { dataKey: 'sguard_io', name: 'SGuard64', stroke: '#f44336' },
      { dataKey: 'sguardsvc_io', name: 'SGuardSvc64', stroke: '#ff9800' },
      { dataKey: 'acetray_io', name: 'ACE-Tray', stroke: '#42a5f5' },
      { dataKey: 'aceservice_io', name: 'ACE-Service64', stroke: '#ab47bc' },
    ],
  },
];

export function PerformancePanel({
  history,
  exportingReport,
  onExportReport,
}: PerformancePanelProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flex: 2, minWidth: 0, maxWidth: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          ACE实时监控
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onExportReport}
          disabled={exportingReport || history.length === 0}
          sx={{ fontSize: '0.7rem', py: 0.2 }}
        >
          {exportingReport ? '生成中...' : '导出报告到桌面'}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
        {chartSections.map((section) => (
          <MetricChart
            key={section.title}
            title={section.title}
            data={history}
            unit={section.unit}
            tooltipFormatter={section.tooltipFormatter}
            lines={section.lines}
          />
        ))}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.2,
          pt: 0.3,
        }}
      >
        {chartLegendItems.map((item) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: item.color }} />
            <Typography variant="caption" sx={{ lineHeight: 1 }}>
              {item.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
