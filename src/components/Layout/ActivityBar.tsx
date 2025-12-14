import { Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { useAtom } from 'jotai';
import { activeSidebarItemAtom, proxyStatusAtom, proxyPortAtom } from '../../store';
import HttpIcon from '@mui/icons-material/Http'; // Traffic
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'; // Collections
import CodeIcon from '@mui/icons-material/Code'; // Scripts
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export const ActivityBar = () => {
    const [activeItem, setActiveItem] = useAtom(activeSidebarItemAtom);
    const [proxyStatus, setProxyStatus] = useAtom(proxyStatusAtom);
    const [port] = useAtom(proxyPortAtom);
    const [toggling, setToggling] = useState(false);

    const toggleProxy = async () => {
        setToggling(true);
        try {
            if (proxyStatus === 'stopped') {
                await invoke('start_proxy', { port });
                setProxyStatus('running');
            } else {
                await invoke('stop_proxy');
                setProxyStatus('stopped');
            }
        } catch (e) {
            console.error("Failed to toggle proxy:", e);
        } finally {
            setToggling(false);
        }
    };

    const items = [
        { id: 'traffic', icon: <HttpIcon />, label: 'Traffic Monitor' },
        { id: 'client', icon: <FolderSpecialIcon />, label: 'API Client' },
        { id: 'scripting', icon: <CodeIcon />, label: 'Scripting' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    ];

    return (
        <Box sx={{
            width: 50,
            height: '100%',
            bgcolor: 'background.paper',
            borderRight: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 2
        }}>
            <Tooltip title={proxyStatus === 'stopped' ? `Start Proxy (${port})` : "Stop Proxy"} placement="right">
                <IconButton
                    onClick={toggleProxy}
                    disabled={toggling}
                    sx={{
                        color: proxyStatus === 'running' ? 'error.main' : 'primary.main',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        mb: 2
                    }}
                >
                    {toggling ? <CircularProgress size={24} /> : (proxyStatus === 'running' ? <StopIcon /> : <PlayArrowIcon />)}
                </IconButton>
            </Tooltip>

            {items.map((item) => (
                <Tooltip key={item.id} title={item.label} placement="right">
                    <IconButton
                        onClick={() => setActiveItem(item.id)}
                        sx={{
                            color: activeItem === item.id ? 'primary.main' : 'text.secondary',
                            borderRadius: '12px',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.05)'
                            }
                        }}
                    >
                        {item.icon}
                    </IconButton>
                </Tooltip>
            ))}
        </Box>
    );
};
