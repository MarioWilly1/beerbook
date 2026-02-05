import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MiCuaderno from "./pages/MiCuaderno";
import SobreNosotros from "./pages/SobreNosotros";
import Layout from "./components/Layout";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cuaderno" element={<MiCuaderno />} />
        <Route path="/sobre-nosotros" element={<SobreNosotros />} />
      </Routes>
    </Layout>
  );
}

export default App;

