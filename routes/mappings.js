const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const authMiddleware = require("../routes/auth");

// POST /api/mappings/ - Assign a doctor to a patient
router.post(
  "/",
  authMiddleware,
  [
    body("patient_id", "Patient ID is required").isInt(),
    body("doctor_id", "Doctor ID is required").isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { patient_id, doctor_id } = req.body;

    try {
      const newMapping = await pool.query(
        "INSERT INTO patient_doctor_mapping (patient_id, doctor_id) VALUES ($1, $2) RETURNING *",
        [patient_id, doctor_id]
      );

      res.status(201).json(newMapping.rows[0]);
    } catch (err) {
      console.error("❌ Error creating mapping:", err.message);
      res.status(500).send("Server error");
    }
  }
);

// GET /api/mappings/ - Retrieve all patient-doctor mappings
router.get("/", authMiddleware, async (req, res) => {
  try {
    const mappings = await pool.query(
      `SELECT pdm.id, p.name AS patient_name, d.name AS doctor_name, pdm.created_at
       FROM patient_doctor_mapping pdm
       JOIN patients p ON pdm.patient_id = p.id
       JOIN doctors d ON pdm.doctor_id = d.id`
    );

    res.json(mappings.rows);
  } catch (err) {
    console.error("❌ Error fetching mappings:", err.message);
    res.status(500).send("Server error");
  }
});

// GET /api/mappings/:patient_id - Get all doctors assigned to a specific patient
router.get("/:patient_id", authMiddleware, async (req, res) => {
  const { patient_id } = req.params;

  try {
    const doctors = await pool.query(
      `SELECT d.id, d.name, d.specialization, d.contact, d.email
       FROM patient_doctor_mapping pdm
       JOIN doctors d ON pdm.doctor_id = d.id
       WHERE pdm.patient_id = $1`,
      [patient_id]
    );

    res.json(doctors.rows);
  } catch (err) {
    console.error("❌ Error fetching doctors for patient:", err.message);
    res.status(500).send("Server error");
  }
});

// DELETE /api/mappings/:id - Remove a doctor from a patient
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const mapping = await pool.query(
      "SELECT * FROM patient_doctor_mapping WHERE id=$1",
      [id]
    );

    if (mapping.rows.length === 0) {
      return res.status(404).json({ msg: "Mapping not found" });
    }

    await pool.query("DELETE FROM patient_doctor_mapping WHERE id=$1", [id]);

    res.json({ msg: "Mapping removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
