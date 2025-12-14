import { Box, Button, TextField, MenuItem, Typography, Tabs, Tab, List, ListItem, ListItemText, ListItemButton, Paper } from '@mui/material';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAtom } from 'jotai';
import { clientHistoryAtom } from '../../store';

export const ApiClient = () => {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('https://httpbin.org/get');
    const [body, setBody] = useState('');
    const [headers, setHeaders] = useState('{}');
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0);
    const [history, setHistory] = useAtom(clientHistoryAtom);

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);

        // Add to history
        const newItem = { method, url, body, headers, timestamp: Date.now() };
        setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50

        try {
            const res: any = await invoke('send_request', {
                method,
                url,
                headers: JSON.parse(headers),
                body: body || null
            });
            setResponse(res);
        } catch (e: any) {
            setResponse({ error: e.toString() });
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryItem = (item: any) => {
        setMethod(item.method);
        setUrl(item.url);
        setBody(item.body);
        setHeaders(item.headers);
        setTab(0); // Go to body
    };

    return (
        <Box sx={{ display: 'flex', height: '100%' }}>
            {/* History Sidebar */}
            <Paper sx={{ width: 250, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
                    <Typography variant="subtitle2" fontWeight="bold">History</Typography>
                </Box>
                <List sx={{ flex: 1, overflow: 'auto' }}>
                    {history.map((item, i) => (
                        <ListItemButton key={i} onClick={() => loadHistoryItem(item)}>
                            <ListItemText
                                primary={
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                                        <span style={{ color: item.method === 'GET' ? '#66bb6a' : '#ffa726', marginRight: 8 }}>{item.method}</span>
                                        {item.url}
                                    </Typography>
                                }
                                secondary={new Date(item.timestamp).toLocaleTimeString()}
                            />
                        </ListItemButton>
                    ))}
                    {history.length === 0 && (
                        <ListItem>
                            <ListItemText secondary="No history yet" />
                        </ListItem>
                    )}
                </List>
            </Paper>

            {/* Main Client Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>
                <Typography variant="h6">API Client</Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        size="small"
                        sx={{ width: 100 }}
                    >
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                            <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Enter URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={loading}
                        sx={{ width: 100 }}
                    >
                        {loading ? '...' : 'Send'}
                    </Button>
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Body" />
                    <Tab label="Headers" />
                </Tabs>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {tab === 0 && (
                        <TextField
                            multiline
                            rows={10}
                            fullWidth
                            placeholder="Request Body (JSON/Text)"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            slotProps={{ input: { style: { fontFamily: 'monospace' } } }}
                        />
                    )}
                    {tab === 1 && (
                        <TextField
                            multiline
                            rows={10}
                            fullWidth
                            placeholder='Headers (JSON format e.g. {"Content-Type": "application/json"})'
                            value={headers}
                            onChange={(e) => setHeaders(e.target.value)}
                            slotProps={{ input: { style: { fontFamily: 'monospace' } } }}
                        />
                    )}

                    <Box sx={{ mt: 2, flex: 1, overflow: 'auto', border: '1px solid #333', borderRadius: 1, p: 1, bgcolor: '#111' }}>
                        <Typography variant="subtitle2" color="text.secondary">Response</Typography>
                        {response ? (
                            <pre style={{ margin: 0, fontSize: '12px' }}>
                                {JSON.stringify(response, null, 2)}
                            </pre>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No response yet</Typography>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
