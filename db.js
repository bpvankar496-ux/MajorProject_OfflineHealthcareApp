// require('dotenv').config();
// const { Patient, User } = require('./db');
// const mongoose = require('mongoose');

// const MONGO_URI = process.env.MONGO_URI;

// mongoose.connect(MONGO_URI)
//   .then(() => console.log('✅ MongoDB Connected'))
//   .catch(err => console.log('❌ MongoDB Error:', err));

// const patientSchema = new mongoose.Schema({
//   name: String,
//   age: Number,
//   phone: String,
//   problem: String,
//   doctor: String,
//   date: String,
//   time: String,
//   status: { type: String, default: 'Pending' },
//   prescription: { type: String, default: '' },
//   patientEmail: { type: String, default: '' },
//   createdAt: { type: Date, default: Date.now }
// });

// // const Patient = mongoose.model('Patient', patientSchema);
// // module.exports = { Patient };

// const Patient = mongoose.model('Patient', patientSchema);

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: String,
//   password: String,
//   role: { type: String, enum: ['doctor', 'patient'] },
//   createdAt: { type: Date, default: Date.now }
// });

// const User = mongoose.model('User', userSchema);
// module.exports = { Patient, User };



const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  phone: String,
  problem: String,
  doctor: String,
  date: String,
  time: String,
  status: { type: String, default: 'Pending' },
  prescription: { type: String, default: '' },
  patientEmail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Patient = mongoose.model('Patient', patientSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['doctor', 'patient'] },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
module.exports = { Patient, User };