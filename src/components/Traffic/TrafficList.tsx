import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, TextField, InputAdornment, Checkbox, Fab } from '@mui/material';
import { useAtomValue, useAtom } from 'jotai';
import { trafficListAtom, selectedRequestIdAtom, filterQueryAtom, compareSelectionAtom } from '../../store';
import { useTrafficSocket } from '../../hooks/useTrafficSocket';
import SearchIcon from '@mui/icons-material/Search';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { DiffViewer } from './DiffViewer';
import { useState } from 'react';

export const TrafficList = () => {
    useTrafficSocket(); // Init socket
    const traffic = useAtomValue(trafficListAtom);
    const [selectedId, setSelectedId] = useAtom(selectedRequestIdAtom);
    const [filter, setFilter] = useAtom(filterQueryAtom);
    const [compareSelection, setCompareSelection] = useAtom(compareSelectionAtom);
    const [diffOpen, setDiffOpen] = useState(false);

    const getMethodColor = (method: string) => {
        switch (method.toUpperCase()) {
            case 'GET': return 'primary.main';
            case 'POST': return 'secondary.main'; // Pink
            case 'PUT': return 'warning.main'; // Orange
            case 'DELETE': return 'error.main'; // Red
            case 'PATCH': return 'info.main'; // Blue
            case 'OPTIONS': return 'text.secondary';
            default: return 'text.primary';
        }
    };

    const getStatusColor = (status?: number) => {
        if (!status) return 'text.secondary';
        if (status >= 500) return 'error.main';
        if (status >= 400) return 'error.main';
        if (status >= 300) return 'warning.main'; // e.g., 302 Found
        if (status >= 200) return 'success.main';
        return 'text.primary';
    };

    const filteredTraffic = traffic.filter(req => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return req.url.toLowerCase().includes(q) || req.method.toLowerCase().includes(q);
    });

    const handleCheck = (id: string) => {
        setCompareSelection(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (prev.length >= 2) return [prev[1], id]; // Keep max 2, rolling
            return [...prev, id];
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <Box sx={{ p: 1, borderBottom: '1px solid #333', bgcolor: 'background.paper' }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Filter by URL or Method..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': { bgcolor: 'background.default' }
                    }}
                />
            </Box>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}></TableCell>
                            <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>Method</TableCell>
                            <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>URL</TableCell>
                            <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>Time</TableCell>
                            <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTraffic.map((req) => (
                            <TableRow
                                key={req.id}
                                hover
                                sx={{
                                    cursor: 'pointer',
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    bgcolor: (theme) => selectedId === req.id ? theme.palette.action.selected : 'inherit'
                                }}
                                onClick={() => setSelectedId(req.id)}
                            >
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={compareSelection.includes(req.id)}
                                        onClick={(e) => { e.stopPropagation(); handleCheck(req.id); }}
                                    />
                                </TableCell>
                                <TableCell sx={{
                                    color: getMethodColor(req.method),
                                    fontWeight: 600
                                }}>
                                    {req.method}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{req.url}</Typography>
                                </TableCell>
                                <TableCell sx={{
                                    color: getStatusColor(req.status),
                                    fontWeight: 500
                                }}>
                                    {req.status || '...'}
                                </TableCell>
                                <TableCell>{new Date(req.timestamp).toLocaleTimeString()}</TableCell>
                                <TableCell>{req.duration ? `${req.duration}ms` : '-'}</TableCell>
                            </TableRow>
                        ))}
                        {filteredTraffic.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                                    <Typography>No matching requests.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {compareSelection.length === 2 && (
                <Fab
                    variant="extended"
                    color="primary"
                    sx={{ position: 'absolute', bottom: 16, right: 16 }}
                    onClick={() => setDiffOpen(true)}
                >
                    <CompareArrowsIcon sx={{ mr: 1 }} />
                    Compare
                </Fab>
            )}

            <DiffViewer open={diffOpen} onClose={() => setDiffOpen(false)} ids={compareSelection} />
        </Box>
    );
};
