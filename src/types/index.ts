export interface ProxyEvent {
    id: string;
    method: string;
    url: string;
    status: number | null;
    phase: 'request' | 'response';
}

export interface RequestRecord {
    id: string;
    method: string;
    url: string;
    status?: number;
    timestamp: number;
    duration?: number; // In ms (client side calc for now or update from BE later)
    size?: number;
}
