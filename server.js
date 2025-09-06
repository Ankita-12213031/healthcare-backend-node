const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Healthcare Backend API is running...");
});

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const patientRoutes = require("./routes/patients");
app.use("/api/patients", patientRoutes);

const doctorRoutes = require("./routes/doctors");
app.use("/api/doctors", doctorRoutes);


const mappingRoutes = require("./routes/mappings");
app.use("/api/mappings", mappingRoutes);


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
