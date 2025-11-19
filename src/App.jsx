import React, { useState } from "react";
import Login from "./Login";
import Map from "../komponen/Map";

function AdminPage({ user, onLogout }) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "24px 32px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          textAlign: "center",
          minWidth: "320px",
        }}
      >
        <h2 style={{ marginBottom: "8px", color: "#0A3566" }}>Halaman Admin</h2>
        <p style={{ color: "#555", marginBottom: "12px", fontSize: "13px" }}>
          Selamat datang, {user?.email || "Admin"}.
        </p>
        <p style={{ color: "#777", marginBottom: "16px", fontSize: "12px" }}>
          Tampilan Admin masih kosong. Nanti bisa diisi dashboard, tabel aset,
          manajemen user, dll.
        </p>
        <button
          onClick={onLogout}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            background: "#0A3566",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

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

  // Role User → tampilkan WebGIS (Map.jsx yang sudah kamu buat)
  if (role === "user") {
    return (
      <>
        {/* Optional: tombol logout mengambang */}
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
        <Map />
      </>
    );
  }

  // Role Admin → halaman kosong sementara
  if (role === "admin") {
    return <AdminPage user={user} onLogout={handleLogout} />;
  }

  return null;
}
