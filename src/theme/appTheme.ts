import { createTheme } from '@mui/material/styles';

// 细窄滚动条样式，避免 WebView 默认滚动条在暗色界面下过亮
const createScrollbarOverrides = (thumb: string, thumbHover: string) => ({
  '*::-webkit-scrollbar': {
    width: 8,
    height: 8,
  },
  '*::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '*::-webkit-scrollbar-thumb': {
    backgroundColor: thumb,
    borderRadius: 4,
  },
  '*::-webkit-scrollbar-thumb:hover': {
    backgroundColor: thumbHover,
  },
});

export const lightTheme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: createScrollbarOverrides('rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.35)'),
    },
  },
});//主题样式，刺客边风有你好果子吃
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    success: {
      main: '#81c784',
    },
    warning: {
      main: '#ffb74d',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    h3: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: createScrollbarOverrides('rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.32)'),
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});
