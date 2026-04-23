import express from "express";
import cors from "cors";
import dataRoutes from "./backend/routes/dataRoutes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend berjalan");
});

app.use("/api/data", dataRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
