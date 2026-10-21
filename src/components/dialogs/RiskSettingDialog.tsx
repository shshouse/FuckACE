import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface RiskSettingDialogProps {
  open: boolean;
  settingLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RiskSettingDialog({ open, settingLabel, onCancel, onConfirm }: RiskSettingDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>确认开启高风险项</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          即将开启：{settingLabel}
        </Typography>
        <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
          I/O 优先级与内存优先级这两项的风险相对前三项更大，不建议开启
        </Alert>
        <Typography variant="caption" color="text.secondary" component="p">
          这两项对ACE进程调度关系的改动幅度更大，可能导致问题，一般来说绿色的两项就足够的
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>保持关闭</Button>
        <Button onClick={onConfirm} color="warning" variant="contained">
          仍然开启
        </Button>
      </DialogActions>
    </Dialog>
  );
}
