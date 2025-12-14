import { atom } from 'jotai';

// UI State
export const activeSidebarItemAtom = atom<string>('traffic'); // 'traffic', 'client', 'scripting', 'settings'
export const activeTabAtom = atom<string | null>(null); // ID of active request tab
export const selectedRequestIdAtom = atom<string | null>(null);
export const proxyStatusAtom = atom<'stopped' | 'running'>('stopped');
export const proxyPortAtom = atom<number>(8888);

// Data State
export const trafficListAtom = atom<any[]>([]); // To be defined properly with types
export const requestsAtom = atom<any[]>([]); // Saved collections
export const clientHistoryAtom = atom<any[]>([]); // API Client History
export const compareSelectionAtom = atom<string[]>([]); // IDs to compare

// Search/Filter
export const filterQueryAtom = atom<string>("");
