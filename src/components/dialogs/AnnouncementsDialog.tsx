import { Close as CloseIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import type { Announcement } from '../../services/api';

interface AnnouncementsDialogProps {
  open: boolean;
  announcements: Announcement[];
  onClose: () => void;
}

function getAnnouncementSeverity(priority: Announcement['priority']): AlertColor {
  if (priority === 'urgent') {
    return 'error';
  }

  if (priority === 'high') {
    return 'warning';
  }

  if (priority === 'low') {
    return 'info';
  }

  return 'success';
}

export function AnnouncementsDialog({
  open,
  announcements,
  onClose,
}: AnnouncementsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">公告</Typography>
          <Button onClick={onClose} size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {announcements.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            暂无公告
          </Typography>
        )}
        {announcements.map((announcement) => (
          <Alert
            key={announcement.id}
            severity={getAnnouncementSeverity(announcement.priority)}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {announcement.title}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {announcement.content}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              发布时间: {new Date(announcement.created_at).toLocaleDateString('zh-CN')}
            </Typography>
          </Alert>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
