import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MarketPage from './pages/MarketPage';
import ArchivePage from './pages/ArchivePage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-wall text-paper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/markets/:chainId/:marketId" element={<MarketPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
