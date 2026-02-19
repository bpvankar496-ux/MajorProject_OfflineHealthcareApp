// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const { Patient } = require('./db');

// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(bodyParser.json());
// app.use(express.static('public'));

// // Get all patients
// app.get('/api/patients', async (req, res) => {
//   try {
//     const patients = await Patient.find().sort({ createdAt: -1 });
//     res.json({ success: true, data: patients });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// // Add new patient
// app.post('/api/patients', async (req, res) => {
//   try {
//     const patient = new Patient(req.body);
//     await patient.save();
//     res.json({ success: true, data: patient });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// // Sync offline patients
// app.post('/api/sync', async (req, res) => {
//   try {
//     const { patients } = req.body;
//     const saved = await Patient.insertMany(patients);
//     res.json({ success: true, synced: saved.length });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Patient } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Patient.countDocuments();
    const pending = await Patient.countDocuments({ status: 'Pending' });
    const confirmed = await Patient.countDocuments({ status: 'Confirmed' });
    const done = await Patient.countDocuments({ status: 'Done' });

    const today = new Date().toISOString().split('T')[0];
    const todayPatients = await Patient.countDocuments({ date: today });

    const doctorStats = await Patient.aggregate([
      { $group: { _id: '$doctor', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, data: { total, pending, confirmed, done, todayPatients, doctorStats } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new patient
app.post('/api/patients', async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update status
app.patch('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search patients
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const patients = await Patient.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { problem: { $regex: q, $options: 'i' } }
      ]
    });
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync offline patients
app.post('/api/sync', async (req, res) => {
  try {
    const { patients } = req.body;
    const saved = await Patient.insertMany(patients);
    res.json({ success: true, synced: saved.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add prescription
app.patch('/api/patients/:id/prescription', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { prescription: req.body.prescription },
      { new: true }
    );
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});