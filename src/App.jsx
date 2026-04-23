import React, { useState } from "react";
import Login from "./Login";
import Map from "../komponen/Map";
import AdminMap from "../komponen/MapAdmin"; // ⬅️ tambahkan ini (sesuaikan path dengan struktur project-mu)

export default function App() {
  const [role, setRole] = useState(null); // "user" | "admin" | null
  const [user, setUser] = useState(null); // Firebase user

  const handleLoginSuccess = (selectedRole, firebaseUser) => {
    setRole(selectedRole);
    setUser(firebaseUser);
  };

  const handleLogout = () => {
    setRole(null);
    setUser(null);
  };

  // Belum login → tampilkan halaman Login
  if (!user || !role) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Role User → tampilkan WebGIS (Map.jsx)
  if (role === "user") {
    return (
      <>
        {/* Tombol logout mengambang di tampilan User */}
        <button
          onClick={handleLogout}
          style={{
            position: "fixed",
            top: "14px",
            right: "16px",
            zIndex: 10000,
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            background: "#0D4F63",
            color: "white",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
        <Map />
      </>
    );
  }

  // Role Admin → panggil halaman AdminMap
  if (role === "admin") {
    return (
      <>
        {/* Tombol logout mengambang di tampilan Admin */}
        <button
          onClick={handleLogout}
          style={{
            position: "fixed",
            top: "14px",
            right: "16px",
            zIndex: 10000,
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
        <AdminMap user={user} />
      </>
    );
  }

  return null;
}
