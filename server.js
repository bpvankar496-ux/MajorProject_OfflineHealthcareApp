require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Patient ,User } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Get all patients
//app.get('/api/patients', async (req, res) => {
  //try {
    //const patients = await Patient.find().sort({ createdAt: -1 });
    //res.json({ success: true, data: patients });

app.get('/api/patients', async (req, res) => {
  try {
    const { email } = req.query;
    const query = email ? { patientEmail: email } : {};
    const patients = await Patient.find(query).sort({ createdAt: -1 });
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

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.json({ success: false, message: 'Email already exists' });
    const user = new User({ name, email, password, role });
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    //const user = await User.findOne({ email, password });
    //if (!user) return res.json({ success: false, message: 'Invalid credentials' });
    //res.json({ success: true, data: user });

const user = await User.findOne({ email, password });
if (!user) return res.json({ success: false, message: 'Invalid credentials' });
 const userData = { _id: user._id, name: user.name, email: user.email, password: user.password, role: user.role };
res.json({ success: true, data: userData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});