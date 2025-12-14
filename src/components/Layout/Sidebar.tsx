
import { Box, Typography } from '@mui/material';
import { useAtom } from 'jotai';
import { activeSidebarItemAtom } from '../../store';

export const Sidebar = () => {
    const [activeItem] = useAtom(activeSidebarItemAtom);

    return (
        <Box sx={{
            width: 300,
            height: '100%',
            bgcolor: 'background.default', // Slightly darker than paper
            borderRight: '1px solid #333',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {activeItem}
                </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2 }}>
                {/* Sidebar Content Switcher will go here */}
                <Typography variant="body2" color="text.secondary">
                    List for {activeItem} will appear here.
                </Typography>
            </Box>
        </Box>
    );
};
