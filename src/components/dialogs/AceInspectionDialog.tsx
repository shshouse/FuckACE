import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import { getAceReport } from '../../services/processControl';
import type { AceReport } from '../../types/app';

interface AceInspectionDialogProps {
  open: boolean;
  onClose: () => void;
}

function toSeverity(level: string): AlertColor {
  if (level === 'warn') {
    return 'warning';
  }
  if (level === 'ok') {
    return 'success';
  }
  return 'info';
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        {title}（{items.length}）
      </Typography>
      {items.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          无
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ p: 0.8, maxHeight: 160, overflow: 'auto' }}>
          {items.map((line, index) => (
            <Typography
              key={`${title}-${index}`}
              variant="caption"
              component="p"
              sx={{ wordBreak: 'break-all', lineHeight: 1.6 }}
            >
              {line}
            </Typography>
          ))}
        </Paper>
      )}
    </Box>
  );
}

export function AceInspectionDialog({ open, onClose }: AceInspectionDialogProps) {
  const [report, setReport] = useState<AceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getAceReport());
    } catch (loadError) {
      setError(`检测失败: ${loadError}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void load();
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>ACE 体检</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              只读检测，不会修改系统设置
            </Typography>
            <Button size="small" onClick={() => void load()} disabled={loading}>
              {loading ? '检测中...' : '重新检测'}
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {report?.items.map((item, index) => (
            <Alert key={`item-${index}`} severity={toSeverity(item.level)}>
              <Typography variant="subtitle2" fontWeight={600}>
                {item.title}
              </Typography>
              <Typography variant="caption" component="p">
                {item.detail}
              </Typography>
            </Alert>
          ))}

          {report && (
            <>
              <ReportSection title="进程" items={report.processes} />
              <ReportSection title="服务" items={report.services} />
              <ReportSection title="驱动" items={report.drivers} />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  安装位置（{report.installations.length}）
                </Typography>
                {report.installations.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    无
                  </Typography>
                ) : (
                  <Paper variant="outlined" sx={{ p: 0.8 }}>
                    <Stack spacing={0.6}>
                      {report.installations.map((item) => (
                        <Box key={item.path}>
                          <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between">
                            <Typography variant="caption" noWrap title={item.path} sx={{ maxWidth: '62%' }}>
                              {item.path}
                            </Typography>
                            <Typography variant="caption" color={item.active ? 'primary.main' : 'text.secondary'}>
                              {item.kind} · {item.size_mb.toFixed(1)} MB · {item.files} 个文件 · {item.active ? '使用中' : '未引用'}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
