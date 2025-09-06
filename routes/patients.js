const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Below this, you will add authMiddleware and patient routes
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
// GET /api/patients
// POST /api/patients
router.post(
  "/",
  authMiddleware,
  [
    body("name", "Name is required").notEmpty(),
    body("age", "Age must be a number").isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, age, gender, contact, address } = req.body;

    try {
      const newPatient = await pool.query(
        "INSERT INTO patients (name, age, gender, contact, address, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [name, age, gender, contact, address, req.user.id]
      );

      res.status(201).json(newPatient.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// GET /api/patients - get all patients created by logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patients = await pool.query(
      "SELECT * FROM patients WHERE created_by=$1",
      [req.user.id]
    );
    res.json(patients.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
// GET /api/patients/:id - get a specific patient by ID
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params; // get patient ID from URL

  try {
    const patient = await pool.query(
      "SELECT * FROM patients WHERE id=$1 AND created_by=$2",
      [id, req.user.id]
    );

    if (patient.rows.length === 0) {
      return res.status(404).json({ msg: "Patient not found" });
    }

    res.json(patient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
// PUT /api/patients/:id - update a specific patient
router.put(
  "/:id",
  authMiddleware,
  [
    body("name", "Name is required").optional().notEmpty(),
    body("age", "Age must be a number").optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, age, gender, contact, address } = req.body;

    try {
      // Check if patient exists and belongs to logged-in user
      const patient = await pool.query(
        "SELECT * FROM patients WHERE id=$1 AND created_by=$2",
        [id, req.user.id]
      );

      if (patient.rows.length === 0) {
        return res.status(404).json({ msg: "Patient not found" });
      }

      // Update fields (only if provided)
      const updatedPatient = await pool.query(
        `UPDATE patients 
         SET name = COALESCE($1, name),
             age = COALESCE($2, age),
             gender = COALESCE($3, gender),
             contact = COALESCE($4, contact),
             address = COALESCE($5, address)
         WHERE id=$6 AND created_by=$7
         RETURNING *`,
        [name, age, gender, contact, address, id, req.user.id]
      );

      res.json(updatedPatient.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);


// DELETE /api/patients/:id - delete a specific patient
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if patient exists and belongs to logged-in user
    const patient = await pool.query(
      "SELECT * FROM patients WHERE id=$1 AND created_by=$2",
      [id, req.user.id]
    );

    if (patient.rows.length === 0) {
      return res.status(404).json({ msg: "Patient not found" });
    }

    // Delete patient
    await pool.query("DELETE FROM patients WHERE id=$1 AND created_by=$2", [
      id,
      req.user.id,
    ]);

    res.json({ msg: "Patient removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


module.exports = router;
