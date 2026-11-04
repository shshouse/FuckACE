import {
  Avatar,
  Badge,
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  GitHub as GitHubIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  SystemUpdate as UpdateIcon,
  VideoLibrary as VideoLibraryIcon,
} from '@mui/icons-material';

interface AppHeaderProps {
  appVersion: string;
  announcementCount: number;
  hasUpdate: boolean;
  darkMode: boolean;
  onOpenAnnouncements: () => void;
  onOpenUpdates: () => void;
  onOpenBilibiliHome: () => void | Promise<void>;
  onOpenRepository: () => void | Promise<void>;
  onToggleTheme: () => void;
}

export function AppHeader({
  appVersion,
  announcementCount,
  hasUpdate,
  darkMode,
  onOpenAnnouncements,
  onOpenUpdates,
  onOpenBilibiliHome,
  onOpenRepository,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <Paper elevation={3} sx={{ p: 1.5, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            src="/logo.png"
            sx={{ width: 36, height: 36 }}
            variant="rounded"
          />
          <Box>
            <Typography variant="h5" component="h1" color="primary" sx={{ lineHeight: 1.2 }}>
              FuckACE v{appVersion}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              小春正在持续监控并限制ACE占用
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap">
          <Badge badgeContent={announcementCount} color="info">
            <Button
              variant="outlined"
              startIcon={<NotificationsIcon />}
              onClick={onOpenAnnouncements}
              sx={{ minWidth: 'auto', px: 0.8 }}
              size="small"
            >
              公告
            </Button>
          </Badge>
          <Badge badgeContent={hasUpdate ? 1 : 0} color="error">
            <Button
              variant="outlined"
              startIcon={<UpdateIcon />}
              onClick={onOpenUpdates}
              sx={{ minWidth: 'auto', px: 0.8 }}
              size="small"
              color={hasUpdate ? 'error' : 'success'}
            >
              更新
            </Button>
          </Badge>
          <Button
            variant="outlined"
            startIcon={<VideoLibraryIcon />}
            onClick={onOpenBilibiliHome}
            sx={{ minWidth: 'auto', px: 0.8 }}
            size="small"
            color="secondary"
          >
            B站主页
          </Button>
          <Button
            variant="outlined"
            startIcon={<GitHubIcon />}
            onClick={onOpenRepository}
            sx={{ minWidth: 'auto', px: 0.8 }}
            size="small"
            title="欢迎star！＞﹏＜"
          >
            Github仓库
          </Button>
          <Button
            variant="outlined"
            startIcon={darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            onClick={onToggleTheme}
            sx={{ minWidth: 'auto', px: 0.8 }}
            size="small"
          >
            {darkMode ? '浅色' : '暗色'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
