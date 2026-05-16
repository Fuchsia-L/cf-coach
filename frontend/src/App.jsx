import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThemeProvider from './tokens/ThemeProvider';
import AppLayout from './layout/AppLayout';
import PageHead from './components/PageHead';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Review from './pages/Review';
import Compare from './pages/Compare';
import Settings from './pages/Settings';

function PlaceholderPage({ kicker, title, lede }) {
  return <PageHead kicker={kicker} title={title} lede={lede} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Profile />} />
            <Route
              path="/training"
              element={<PlaceholderPage kicker="training" title="Training" lede="The day-by-day stage plan lives here." />}
            />
            <Route
              path="/knowledge"
              element={<PlaceholderPage kicker="knowledge" title="Knowledge map" lede="The graph of what you've learned, what's adjacent, and what's next." />}
            />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/review" element={<Review />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
