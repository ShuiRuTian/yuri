
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
                <ActivityBar />
                <Sidebar />
                <Box component="main" sx={{ flex: 1, height: '100%', bgcolor: '#0f0f0f', overflow: 'hidden' }}>
                    {children}
                </Box>
            </Box>
        </ThemeProvider>
    );
};
