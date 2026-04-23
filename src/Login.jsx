import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingRole, setLoadingRole] = useState(null); // "user" | "admin" | null

  const handleLogin = async (role) => {
    setError("");

    //Validasi DOMAIN
    if (role === "user" && !email.endsWith("@user.com")) {
      setError(
        "Email ini bukan email User. Gunakan email berakhiran @user.com",
      );
      return;
    }

    if (role === "admin" && !email.endsWith("@admin.com")) {
      setError(
        "Email ini bukan email Admin. Gunakan email berakhiran @admin.com",
      );
      return;
    }

    setLoadingRole(role);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // AMBIL TOKEN FIREBASE
      const token = await user.getIdToken();
      console.log("TOKEN:", token);

      // 🔥 KIRIM KE BACKEND
      await fetch("http://localhost:3000/api/create-layer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: "value" }),
      });

      onLoginSuccess(role, user);
    } catch (e) {
      console.error("Login error:", e);
      let msg = "Gagal login. Periksa email / password.";
      if (e.code === "auth/user-not-found") {
        msg = "User tidak ditemukan. Daftarkan dulu di Firebase Console.";
      } else if (e.code === "auth/wrong-password") {
        msg = "Password salah.";
      } else if (e.code === "auth/invalid-email") {
        msg = "Format email tidak valid.";
      }
      setError(msg);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A3566",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "24px 32px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          minWidth: "320px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2 style={{ marginBottom: "4px", color: "#0A3566" }}>
          Dashboard Security Risk Assessment
        </h2>
        <p style={{ marginBottom: "16px", fontSize: "13px", color: "#555" }}>
          Silakan login menggunakan akun Firebase Anda
        </p>

        <div style={{ textAlign: "left", marginBottom: "12px" }}>
          <label
            style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              marginBottom: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "13px",
            }}
            placeholder="email@contoh.com"
          />

          <label
            style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "13px",
            }}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            style={{
              color: "#b10026",
              fontSize: "12px",
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}

        <p style={{ fontSize: "13px", marginBottom: "8px", color: "#555" }}>
          Pilih role untuk masuk:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => handleLogin("user")}
            disabled={loadingRole !== null}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#0A3566",
              color: "white",
              fontWeight: "bold",
              cursor: loadingRole ? "not-allowed" : "pointer",
              opacity: loadingRole === "user" ? 0.7 : 1,
            }}
          >
            {loadingRole === "user"
              ? "Masuk sebagai User..."
              : "Login sebagai User"}
          </button>

          <button
            onClick={() => handleLogin("admin")}
            disabled={loadingRole !== null}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #0A3566",
              background: "white",
              color: "#0A3566",
              fontWeight: "bold",
              cursor: loadingRole ? "not-allowed" : "pointer",
              opacity: loadingRole === "admin" ? 0.7 : 1,
            }}
          >
            {loadingRole === "admin"
              ? "Masuk sebagai Admin..."
              : "Login sebagai Admin"}
          </button>
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "#888",
            marginTop: "12px",
          }}
        >
          HSSE - Security Head Office
        </p>
      </div>
    </div>
  );
}
