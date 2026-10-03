import type { RefObject } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { LogEntry } from '../types/app';

interface LogPanelProps {
  logs: LogEntry[];
  containerRef: RefObject<HTMLDivElement | null>;
}

export function LogPanel({ logs, containerRef }: LogPanelProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flex: 1, maxWidth: '100%', minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 64,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 0.75,
          boxSizing: 'border-box',
          backgroundColor: 'background.default',
        }}
      >
        {logs.map((log) => (
          <Typography
            key={log.id}
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              py: 0.15,
              lineHeight: 1.4,
            }}
          >
            [{log.timestamp}] {log.message}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
}
