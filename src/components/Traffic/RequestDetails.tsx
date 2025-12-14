import { Box, Typography, Tabs, Tab, IconButton, CircularProgress, Button, Snackbar } from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import { selectedRequestIdAtom, trafficListAtom } from '../../store';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface FullRequest {
    id: string;
    method: string;
    url: string;
    request_headers: string;
    request_body?: number[]; // Vec<u8> comes as array of numbers from JSON
    response_status?: number;
    response_headers?: string;
    response_body?: number[];
}

export const RequestDetails = () => {
    const [selectedId, setSelectedId] = useAtom(selectedRequestIdAtom);
    const traffic = useAtomValue(trafficListAtom); // Use this for fallback or quick viewing
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fullRequest, setFullRequest] = useState<FullRequest | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // Initial placeholder from list
    const summary = traffic.find(r => r.id === selectedId);

    useEffect(() => {
        if (!selectedId) {
            setFullRequest(null);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            try {
                // In dev, assume localhost:3000
                const res = await axios.get(`http://localhost:3000/api/requests/${selectedId}`);
                setFullRequest(res.data);
            } catch (err) {
                console.error("Failed to fetch request details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [selectedId]);

    if (!selectedId) return null;

    const request = fullRequest || (summary as unknown as FullRequest);
    if (!request && !loading) return null;

    const formatBody = (body?: number[]) => {
        if (!body || body.length === 0) return "No Content";
        try {
            // Check if looks like text
            const text = new TextDecoder().decode(new Uint8Array(body));
            // Try pretty print JSON
            try {
                const json = JSON.parse(text);
                return JSON.stringify(json, null, 2);
            } catch {
                return text;
            }
        } catch {
            return `Binary Data (${body.length} bytes)`;
        }
    };

    const formatHeaders = (jsonStr?: string) => {
        if (!jsonStr) return null;
        try {
            const headers = JSON.parse(jsonStr);
            return Object.entries(headers).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 100, color: 'text.secondary' }}>{k}:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{String(v)}</Typography>
                </Box>
            ));
        } catch {
            return <Typography color="error">Invalid header data</Typography>;
        }
    };

    const generateCurl = () => {
        if (!request) return '';
        let cmd = `curl -X ${request.method} "${request.url}"`;

        try {
            if (request.request_headers) {
                const h = JSON.parse(request.request_headers);
                Object.entries(h).forEach(([k, v]) => {
                    cmd += ` -H "${k}: ${v}"`;
                });
            }
        } catch { }

        if (request.request_body && request.request_body.length > 0) {
            // body is array of numbers, try text
            try {
                const text = new TextDecoder().decode(new Uint8Array(request.request_body));
                // escape single quotes
                const safeBody = text.replace(/'/g, "'\\''");
                cmd += ` -d '${safeBody}'`;
            } catch { }
        }
        return cmd;
    };

    const copyCurl = () => {
        const cmd = generateCurl();
        navigator.clipboard.writeText(cmd);
        setSnackbarOpen(true);
    };

    return (
        <Box sx={{
            width: 500,
            height: '100%',
            borderLeft: '1px solid #333',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                <Typography variant="subtitle2" sx={{ px: 1, fontWeight: 'bold' }}>Request Details</Typography>
                <Box>
                    <Button size="small" onClick={copyCurl} sx={{ mr: 1, fontSize: '0.7rem' }}>Copy cURL</Button>
                    <IconButton size="small" onClick={() => setSelectedId(null)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
                <Typography variant="body1" sx={{ wordBreak: 'break-all', fontWeight: 500, fontFamily: 'monospace' }}>
                    {request?.url}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {selectedId}
                </Typography>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Request" />
                <Tab label="Response" />
                <Tab label="Analysis" />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loading && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

                {!loading && request && tab === 0 && (
                    <Box>
                        <Typography variant="overline" color="text.secondary">General</Typography>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2"><span style={{ color: '#888' }}>Method:</span> {request.method}</Typography>
                        </Box>

                        <Typography variant="overline" color="text.secondary">Headers</Typography>
                        <Box sx={{ mb: 2, bgcolor: '#111', p: 1, borderRadius: 1 }}>
                            {formatHeaders(request.request_headers) || "No Headers"}
                        </Box>

                        <Typography variant="overline" color="text.secondary">Body</Typography>
                        <Box sx={{ bgcolor: '#111', p: 1, borderRadius: 1, overflowX: 'auto' }}>
                            <pre style={{ margin: 0, fontSize: '12px' }}>{formatBody(request.request_body)}</pre>
                        </Box>
                    </Box>
                )}
                {!loading && request && tab === 1 && (
                    <Box>
                        <Typography variant="overline" color="text.secondary">Status</Typography>
                        <Typography variant="body2" sx={{
                            color: (request.response_status && request.response_status >= 400) ? 'error.main' : 'success.main',
                            fontWeight: 'bold', mb: 2
                        }}>{request.response_status || 'Pending...'}</Typography>

                        <Typography variant="overline" color="text.secondary">Headers</Typography>
                        <Box sx={{ mb: 2, bgcolor: '#111', p: 1, borderRadius: 1 }}>
                            {formatHeaders(request.response_headers) || "No Headers"}
                        </Box>

                        <Typography variant="overline" color="text.secondary">Body</Typography>
                        <Box sx={{ bgcolor: '#111', p: 1, borderRadius: 1, overflowX: 'auto' }}>
                            <pre style={{ margin: 0, fontSize: '12px' }}>{formatBody(request.response_body)}</pre>
                        </Box>
                    </Box>
                )}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={2000}
                onClose={() => setSnackbarOpen(false)}
                message="Copied to clipboard"
            />
        </Box>
    );
};
