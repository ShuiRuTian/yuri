import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Paper, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface DiffViewerProps {
    open: boolean;
    onClose: () => void;
    ids: string[];
}

export const DiffViewer = ({ open, onClose, ids }: DiffViewerProps) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (open && ids.length === 2) {
            setLoading(true);
            Promise.all(ids.map(id => axios.get(`http://localhost:3000/api/requests/${id}`)))
                .then(responses => {
                    setData(responses.map(r => r.data));
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setData([]);
        }
    }, [open, ids]);

    const RequestCard = ({ req }: { req: any }) => (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', overflow: 'auto', flex: 1, mx: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{req.method} {req.url}</Typography>
            <Typography variant="caption" display="block" color="text.secondary" gutterBottom>Status: {req.response_status}</Typography>

            <Typography variant="overline" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Headers</Typography>
            <Paper sx={{ p: 1, bgcolor: '#111', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{req.request_headers ? JSON.stringify(JSON.parse(req.request_headers), null, 2) : '{}'}</pre>
            </Paper>

            <Typography variant="overline" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Body</Typography>
            <Paper sx={{ p: 1, bgcolor: '#111', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {req.request_body?.length ? `Binary (${req.request_body.length} bytes)` : '(empty)'}
                </pre>
            </Paper>
            <Typography variant="overline" color="text.secondary" sx={{ mt: 2, display: 'block' }}>Response Headers</Typography>
            <Paper sx={{ p: 1, bgcolor: '#111', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{req.response_headers ? JSON.stringify(JSON.parse(req.response_headers), null, 2) : '{}'}</pre>
            </Paper>

            <Typography variant="overline" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Response Body</Typography>
            <Paper sx={{ p: 1, bgcolor: '#111', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {req.response_body?.length ? `Binary (${req.response_body.length} bytes)` : '(empty)'}
                </pre>
            </Paper>
        </Paper>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>Compare Requests</DialogTitle>
            <DialogContent dividers>
                {loading ? <CircularProgress sx={{ display: 'block', mx: 'auto' }} /> : (
                    <Box sx={{ display: 'flex', height: '70vh' }}>
                        {data.map((req, i) => (
                            <RequestCard key={i} req={req} />
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
