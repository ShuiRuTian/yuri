import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { trafficListAtom } from '../store';
import { ProxyEvent, RequestRecord } from '../types';

export const useTrafficSocket = () => {
    const setTrafficList = useSetAtom(trafficListAtom);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // In dev, assume localhost:3000. In prod, might differ.
        const ws = new WebSocket('ws://localhost:3000/ws/events');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Traffic WS');
        };

        ws.onmessage = (event) => {
            try {
                const data: ProxyEvent = JSON.parse(event.data);

                setTrafficList((prev) => {
                    const existingIndex = prev.findIndex(r => r.id === data.id);

                    if (data.phase === 'request') {
                        if (existingIndex !== -1) return prev; // Duplicate?
                        const newRecord: RequestRecord = {
                            id: data.id,
                            method: data.method,
                            url: data.url,
                            timestamp: Date.now(),
                            status: undefined,
                        };
                        return [newRecord, ...prev]; // Prepend newest
                    } else if (data.phase === 'response') {
                        if (existingIndex !== -1) {
                            const updated = [...prev];
                            const record = updated[existingIndex];
                            updated[existingIndex] = {
                                ...record,
                                status: data.status || undefined,
                                duration: Date.now() - record.timestamp // Approx
                            };
                            return updated;
                        }
                    }
                    return prev;
                });
            } catch (e) {
                console.error('Failed to parse WS msg', e);
            }
        };

        ws.onclose = () => {
            console.log('Traffic WS disconnected');
            // Reconnect logic could go here
        };

        return () => {
            ws.close();
        };
    }, [setTrafficList]);
};
