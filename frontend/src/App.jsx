import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import WatchVideo from "./pages/WatchVideo.jsx";
import CreatorStudio from "./pages/CreatorStudio.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/watch/:videoId" element={<WatchVideo />} />
            <Route path="/studio" element={<CreatorStudio />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
