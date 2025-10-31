import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Setup from './pages/Setup'
import Studio from './pages/Studio'
import Downloads from './pages/Downloads'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/downloads" element={<Downloads />} />
      </Routes>
    </Router>
  )
}

export default App
