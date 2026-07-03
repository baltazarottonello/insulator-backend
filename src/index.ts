import { httpServerHandler } from "cloudflare:node";
import express from "express";
import { verifyAppHeader } from "./middleware/headers.js";
import patientRoutes from "./routes/patientsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import medicRoutes from "./routes/medicRoutes.js";

const app = express();

app.use(express.json());
app.use(verifyAppHeader);

app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/medic", medicRoutes);

app.all("/", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });
