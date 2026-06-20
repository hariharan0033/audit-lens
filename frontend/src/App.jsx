import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Logs from "./pages/Logs";
import Upload from "./pages/Upload";

// Apply saved theme before first render to avoid flash
const stored = (() => {
  try { return localStorage.getItem("auditsight-theme"); } catch { return null; }
})();
const initial = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.setAttribute("data-theme", initial);

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"       element={<Overview />} />
        <Route path="/logs"   element={<Logs />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </Layout>
  );
}
