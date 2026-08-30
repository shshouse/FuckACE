import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

interface AffinityCoreDialogProps {
  open: boolean;
  logicalCores: number | null;
  /** 空数组表示默认（自动绑定最后一颗核心） */
  value: number[];
  onConfirm: (cores: number[]) => void;
  onClose: () => void;
}

export function AffinityCoreDialog({
  open,
  logicalCores,
  value,
  onConfirm,
  onClose,
}: AffinityCoreDialogProps) {
  const [mode, setMode] = useState<'default' | 'custom'>(value.length > 0 ? 'custom' : 'default');
  const [selected, setSelected] = useState<number[]>(value);

  useEffect(() => {
    if (open) {
      setMode(value.length > 0 ? 'custom' : 'default');
      setSelected(value);
    }
  }, [open, value]);

  const totalCores = logicalCores ?? 0;
  const defaultCore = totalCores > 0 ? totalCores - 1 : 0;
  const canConfirm = mode === 'default' || selected.length > 0;
  const allSelected = totalCores > 0 && selected.length === totalCores;

  const toggleCore = (core: number) => {
    setSelected((previous) =>
      previous.includes(core)
        ? previous.filter((item) => item !== core)
        : [...previous, core].sort((a, b) => a - b),
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>CPU亲和性设置</DialogTitle>
      <DialogContent>
        <RadioGroup
          value={mode}
          onChange={(event) => setMode(event.target.value as 'default' | 'custom')}
        >
          <FormControlLabel
            value="default"
            control={<Radio size="small" />}
            label={
              <Typography variant="body2">
                默认：自动绑定最后一颗核心（核心 {defaultCore}，通常是能效核）
              </Typography>
            }
          />
          <FormControlLabel
            value="custom"
            control={<Radio size="small" />}
            label={<Typography variant="body2">自定义核心</Typography>}
          />
        </RadioGroup>
        {mode === 'custom' && (
          <Box sx={{ mt: 1 }}>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {Array.from({ length: totalCores }, (_, core) => (
                <Chip
                  key={core}
                  label={core}
                  size="small"
                  color={selected.includes(core) ? 'primary' : 'default'}
                  variant={selected.includes(core) ? 'filled' : 'outlined'}
                  onClick={() => toggleCore(core)}
                />
              ))}
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {logicalCores === null
                  ? '正在获取CPU信息...'
                  : `已选 ${selected.length} 颗${selected.length > 0 ? `：${selected.join(', ')}` : ''}`}
              </Typography>
              <Button
                size="small"
                onClick={() =>
                  setSelected(allSelected ? [] : Array.from({ length: totalCores }, (_, core) => core))
                }
              >
                {allSelected ? '清空' : '全选'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          disabled={!canConfirm}
          onClick={() => {
            onConfirm(mode === 'default' ? [] : selected);
            onClose();
          }}
        >
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
