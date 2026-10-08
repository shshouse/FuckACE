import { Box, Button, Paper, Typography } from '@mui/material';

interface PassiveActionItem {
  id: string;
  label: string;
  onClick: () => void;
}

interface PassiveActionsCardProps {
  loading: boolean;
  isAdmin: boolean;
  actions: PassiveActionItem[];
  onLowerAcePriority: () => void;
  onCheckRegistry: () => void;
  onResetRegistry: () => void;
}

export function PassiveActionsCard({
  loading,
  isAdmin,
  actions,
  onLowerAcePriority,
  onCheckRegistry,
  onResetRegistry,
}: PassiveActionsCardProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 0.5, fontWeight: 600 }}>
        被动限制(开游戏前使用)
      </Typography>
      <Box display="flex" flexDirection="column" gap={0.4} sx={{ flex: 1 }}>
        <Button
          variant="contained"
          onClick={onLowerAcePriority}
          disabled={loading || !isAdmin}
          color="error"
          size="small"
          fullWidth
          sx={{ py: 0.3, fontSize: '0.75rem' }}
        >
          降低ACE优先级
        </Button>
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={0.4}>
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="contained"
              onClick={action.onClick}
              disabled={loading || !isAdmin}
              color="success"
              size="small"
              sx={{ py: 0.3, fontSize: '0.7rem', whiteSpace: 'nowrap' }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
        <Box display="flex" gap={0.4}>
          <Button
            variant="outlined"
            onClick={onCheckRegistry}
            disabled={loading}
            color="info"
            size="small"
            fullWidth
            sx={{ py: 0.3, fontSize: '0.7rem' }}
          >
            检查状态
          </Button>
          <Button
            variant="outlined"
            onClick={onResetRegistry}
            disabled={loading || !isAdmin}
            color="warning"
            size="small"
            fullWidth
            sx={{ py: 0.3, fontSize: '0.7rem' }}
          >
            恢复默认
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
