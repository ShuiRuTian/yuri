import { MainLayout } from './components/Layout/MainLayout';
import { Typography, Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { activeSidebarItemAtom } from './store';
import { TrafficList } from './components/Traffic/TrafficList';
import { RequestDetails } from './components/Traffic/RequestDetails';
import { ApiClient } from './components/Client/ApiClient';

function App() {
  const activeItem = useAtomValue(activeSidebarItemAtom);

  return (
    <MainLayout>
      {activeItem === 'traffic' && (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <TrafficList />
          </Box>
          <RequestDetails />
        </Box>
      )}
      {activeItem === 'client' && <ApiClient />}
      {activeItem !== 'traffic' && activeItem !== 'client' && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" color="text.secondary">
            {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)} View
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Feature coming soon.
          </Typography>
        </Box>
      )}
    </MainLayout>
  );
}

export default App;
