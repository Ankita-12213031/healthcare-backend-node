const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Inline authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header("x-auth-token"); // client sends token in header
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // store user id in req.user
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

// POST /api/doctors - add a new doctor
router.post(
  "/",
  authMiddleware,
  [
    body("name", "Name is required").notEmpty(),
    body("specialization", "Specialization is required").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, specialization, contact, email } = req.body;

    try {
      const newDoctor = await pool.query(
        "INSERT INTO doctors (name, specialization, contact, email, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [name, specialization, contact, email, req.user.id]
      );

      res.status(201).json(newDoctor.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// GET /api/doctors - get all doctors
router.get("/", authMiddleware, async (req, res) => {
  try {
    const doctors = await pool.query(
      "SELECT * FROM doctors WHERE created_by=$1",
      [req.user.id]
    );
    res.json(doctors.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// GET /api/doctors/:id - get a doctor by ID
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const doctor = await pool.query(
      "SELECT * FROM doctors WHERE id=$1 AND created_by=$2",
      [id, req.user.id]
    );

    if (doctor.rows.length === 0) return res.status(404).json({ msg: "Doctor not found" });

    res.json(doctor.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// PUT /api/doctors/:id - update a doctor
router.put(
  "/:id",
  authMiddleware,
  [
    body("name").optional().notEmpty(),
    body("specialization").optional().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, specialization, contact, email } = req.body;

    try {
      const doctor = await pool.query(
        "SELECT * FROM doctors WHERE id=$1 AND created_by=$2",
        [id, req.user.id]
      );

      if (doctor.rows.length === 0) return res.status(404).json({ msg: "Doctor not found" });

      const updatedDoctor = await pool.query(
        `UPDATE doctors
         SET name = COALESCE($1, name),
             specialization = COALESCE($2, specialization),
             contact = COALESCE($3, contact),
             email = COALESCE($4, email)
         WHERE id=$5 AND created_by=$6
         RETURNING *`,
        [name, specialization, contact, email, id, req.user.id]
      );

      res.json(updatedDoctor.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// DELETE /api/doctors/:id - delete a doctor
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const doctor = await pool.query(
      "SELECT * FROM doctors WHERE id=$1 AND created_by=$2",
      [id, req.user.id]
    );

    if (doctor.rows.length === 0) return res.status(404).json({ msg: "Doctor not found" });

    await pool.query("DELETE FROM doctors WHERE id=$1 AND created_by=$2", [id, req.user.id]);

    res.json({ msg: "Doctor removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
// DELETE /api/patients/:id - delete a specific patient
