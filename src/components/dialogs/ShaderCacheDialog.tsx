import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getShaderCacheInfo } from '../../services/processControl';
import type { ShaderCacheInfo, ShaderCleanResult } from '../../types/app';

interface ShaderCacheDialogProps {
  open: boolean;
  onClose: () => void;
  onCleanCaches: () => Promise<ShaderCleanResult>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export function ShaderCacheDialog({ open, onClose, onCleanCaches }: ShaderCacheDialogProps) {
  const [info, setInfo] = useState<ShaderCacheInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setConfirming(false);
    setResult(null);
    setError(null);
    setLoading(true);

    void getShaderCacheInfo()
      .then(setInfo)
      .catch((loadError) => {
        setInfo(null);
        setError(`读取缓存信息失败: ${loadError}`);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleClean = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    setCleaning(true);
    setError(null);

    try {
      const cleaned = await onCleanCaches();
      const skippedPart = cleaned.skipped_count > 0 ? `，${cleaned.skipped_count} 项被占用跳过` : '';
      setResult(`已清理 ${cleaned.removed_count} 项，释放 ${formatBytes(cleaned.freed_bytes)}${skippedPart}`);
      setInfo(await getShaderCacheInfo());
    } catch (cleanError) {
      setError(`清理失败: ${cleanError}`);
    } finally {
      setCleaning(false);
    }
  };

  const hasCache = (info?.items.length ?? 0) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>着色器缓存清理</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              当前占用
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary">
              {loading ? '统计中...' : formatBytes(info?.total_bytes ?? 0)}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary" component="p">
            游戏或显卡驱动更新后，旧的着色器缓存可能引起掉帧和着色器编译异常。清理后首次进入游戏会重新编译，短时间内可能有一次卡顿。
          </Typography>

          {hasCache ? (
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Stack spacing={0.5}>
                {info?.items.map((item) => (
                  <Stack key={item.path} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '72%' }} title={item.path}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption">{formatBytes(item.bytes)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : (
            !loading && (
              <Typography variant="caption" color="text.secondary">
                未发现可清理的着色器缓存
              </Typography>
            )
          )}

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant={confirming ? 'contained' : 'outlined'}
              color={confirming ? 'warning' : 'primary'}
              disabled={cleaning || loading || !hasCache}
              onClick={() => void handleClean()}
            >
              {cleaning ? '清理中...' : confirming ? '确认清理' : '清理缓存'}
            </Button>
            {confirming && (
              <Button size="small" onClick={() => setConfirming(false)}>
                取消
              </Button>
            )}
            {result && (
              <Typography variant="caption" color="text.secondary">
                {result}
              </Typography>
            )}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
