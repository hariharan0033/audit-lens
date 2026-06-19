import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Logs from "./pages/Logs";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </Layout>
  );
}
