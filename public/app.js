// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('✅ Service Worker Registered'))
    .catch(err => console.log('❌ SW Error:', err));
}

// IndexedDB Setup
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('healthcareDB', 1);
    request.onupgradeneeded = e => {
      e.target.result.createObjectStore('offlinePatients', {
        keyPath: 'id', autoIncrement: true
      });
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

async function saveOffline(patient) {
  const db = await openDB();
  const tx = db.transaction('offlinePatients', 'readwrite');
  tx.objectStore('offlinePatients').add(patient);
}

async function getOfflinePatients() {
  const db = await openDB();
  const tx = db.transaction('offlinePatients', 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore('offlinePatients').getAll();
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

async function clearOfflinePatients() {
  const db = await openDB();
  const tx = db.transaction('offlinePatients', 'readwrite');
  tx.objectStore('offlinePatients').clear();
}

// Load Stats

async function loadStats() {
  if (!navigator.onLine) {
    const cached = localStorage.getItem('cachedStats');
    if (cached) {
      const s = JSON.parse(cached);
      document.getElementById('totalPatients').textContent = s.total;
      document.getElementById('todayPatients').textContent = s.todayPatients;
      document.getElementById('pendingCount').textContent = s.pending;
      document.getElementById('doneCount').textContent = s.done;
      if (s.doctorStats) renderDoctorChart(s.doctorStats);

    }
    return;
  }
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    const s = data.data;
    localStorage.setItem('cachedStats', JSON.stringify(s));
    document.getElementById('totalPatients').textContent = s.total;
    document.getElementById('todayPatients').textContent = s.todayPatients;
    document.getElementById('pendingCount').textContent = s.pending;
   document.getElementById('doneCount').textContent = s.done;
   
    //renderDoctorChart(s.doctorStats);
    if (s.doctorStats) renderDoctorChart(s.doctorStats);
  } catch (err) {
    console.log('Stats error:', err);
  }
}

// Doctor Chart
function renderDoctorChart(doctorStats) {
  const ctx = document.getElementById('doctorChart').getContext('2d');
  if (window.doctorChartInstance) window.doctorChartInstance.destroy();
  window.doctorChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: doctorStats.map(d => d._id),
      datasets: [{
        label: 'Patients',
        data: doctorStats.map(d => d.count),
        backgroundColor: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

// Submit Patient
async function submitPatient(e) {
  e.preventDefault();
  const patient = {
    name: document.getElementById('name').value,
    age: document.getElementById('age').value,
    phone: document.getElementById('phone').value,
    problem: document.getElementById('problem').value,
    doctor: document.getElementById('doctor').value,
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    status: 'Pending'
  };

  if (navigator.onLine) {
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Patient saved successfully!', 'green');
        loadPatients();
        loadStats();
      }
    } catch (err) {
      await saveOffline(patient);
      showToast('💾 Saved offline!', 'yellow');
    }
  } else {
    await saveOffline(patient);
    showToast('💾 No internet! Saved offline.', 'yellow');
  }
  document.getElementById('patientForm').reset();
}

// Search
async function searchPatients() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { loadPatients(); return; }
  if (!navigator.onLine) {
    showToast('⚠️ Search needs internet!', 'yellow');
    return;
  }
  try {
    const res = await fetch(`/api/search?q=${q}`);
    const data = await res.json();
    renderPatients(data.data, false);
  } catch (err) {
    console.log('Search error:', err);
  }
}

// Update Status
async function updateStatus(id, status) {
  try {
    await fetch(`/api/patients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    showToast(`✅ Status updated to ${status}!`, 'green');
    loadPatients();
    loadStats();
  } catch (err) {
    showToast('❌ Update failed!', 'red');
  }
}

// Delete Patient
async function deletePatient(id) {
  if (!confirm('Are you sure you want to delete this patient?')) return;
  try {
    await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    showToast('🗑️ Patient deleted!', 'red');
    loadPatients();
    loadStats();
  } catch (err) {
    showToast('❌ Delete failed!', 'red');
  }
}

// Add Prescription
async function addPrescription(id) {
  const prescription = prompt('Enter prescription:');
  if (!prescription) return;
  try {
    await fetch(`/api/patients/${id}/prescription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescription })
    });
    showToast('💊 Prescription added!', 'green');
    loadPatients();
  } catch (err) {
    showToast('❌ Failed!', 'red');
  }
}


// Load Patients

async function loadPatients() {
  if (!navigator.onLine) {
    const cached = localStorage.getItem('cachedPatients');
    if (cached) renderPatients(JSON.parse(cached), false);
    else loadOfflinePatients();
    return;
  }
  try {
    const res = await fetch('/api/patients');
    const data = await res.json();
    localStorage.setItem('cachedPatients', JSON.stringify(data.data));
    renderPatients(data.data, false);
  } catch (err) {
    const cached = localStorage.getItem('cachedPatients');
    if (cached) renderPatients(JSON.parse(cached), false);
    else loadOfflinePatients();
  }
}

async function loadOfflinePatients() {
  const patients = await getOfflinePatients();
  renderPatients(patients, true);
}

// Render Patients
function renderPatients(patients, isOffline) {
  const list = document.getElementById('patientList');
  if (patients.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-center col-span-2">No patients found</p>';
    return;
  }

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Confirmed': 'bg-blue-100 text-blue-700',
    'Done': 'bg-green-100 text-green-700'
  };

  list.innerHTML = patients.map(p => `
    <div class="bg-white rounded-xl p-4 shadow border-l-4 ${isOffline ? 'border-yellow-400' : 'border-sky-400'}">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-bold text-gray-800 text-lg">${p.name}</h3>
        <span class="text-xs px-2 py-1 rounded-full ${isOffline ? 'bg-yellow-100 text-yellow-700' : (statusColors[p.status] || 'bg-gray-100 text-gray-700')}">
          ${isOffline ? '💾 Offline' : p.status}
        </span>
      </div>
      <p class="text-gray-500 text-sm">Age: ${p.age} | 📞 ${p.phone}</p>
      <p class="text-gray-600 mt-1">🤒 ${p.problem}</p>
      <p class="text-gray-600">👨‍⚕️ ${p.doctor}</p>
      <p class="text-gray-400 text-xs mt-2">📅 ${p.date} at ${p.time}</p>
      ${p.prescription ? `<p class="text-purple-600 text-xs mt-1">💊 ${p.prescription}</p>` : ''}
      ${!isOffline ? `
      <div class="flex gap-2 mt-3 flex-wrap">
        <button onclick="updateStatus('${p._id}', 'Confirmed')"
          class="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 rounded-lg">
          ✅ Confirm
        </button>
        <button onclick="updateStatus('${p._id}', 'Done')"
          class="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white py-1 rounded-lg">
          🏁 Done
        </button>
        <button onclick="addPrescription('${p._id}')"
          class="flex-1 text-xs bg-purple-500 hover:bg-purple-600 text-white py-1 rounded-lg">
          💊 Rx
        </button>
        
        <button onclick="deletePatient('${p._id}')"
          class="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white py-1 rounded-lg">
          🗑️ Del
        </button>
      </div>` : ''}
    </div>
  `).join('');
}

// Auto Sync
window.addEventListener('online', async () => {
  updateStatus2();
  showToast('🌐 Back online! Syncing...', 'blue');
  const offlinePatients = await getOfflinePatients();
  if (offlinePatients.length > 0) {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: offlinePatients })
      });
      const data = await res.json();
      if (data.success) {
        await clearOfflinePatients();
        showToast(`✅ ${data.synced} patients synced!`, 'green');
        loadPatients();
        loadStats();
      }
    } catch (err) {
      console.log('Sync failed:', err);
    }
  }
});

window.addEventListener('offline', () => {
  updateStatus2();
  showToast('📴 Gone offline! Saving locally.', 'yellow');
});

function updateStatus2() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  if (navigator.onLine) {
    indicator.className = 'w-3 h-3 rounded-full bg-green-400';
    statusText.textContent = 'Online';
    statusText.className = 'text-green-300 font-semibold text-sm';
  } else {
    indicator.className = 'w-3 h-3 rounded-full bg-yellow-400';
    statusText.textContent = 'Offline';
    statusText.className = 'text-yellow-300 font-semibold text-sm';
  }
}

// Toast
function showToast(message, color) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500'
  };
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 ${colors[color]} text-white px-6 py-3 rounded-xl shadow-lg z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Dark Mode
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const btn = document.getElementById('darkModeBtn');
  btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
}

// Tab Switch
function showTab(tab) {
  document.getElementById('dashboardTab').classList.add('hidden');
  document.getElementById('registerTab').classList.add('hidden');
  document.getElementById('patientsTab').classList.add('hidden');
  document.getElementById(tab + 'Tab').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-sky-600', 'text-white');
    btn.classList.add('text-gray-600');
  });
  document.getElementById('btn-' + tab).classList.add('bg-sky-600', 'text-white');
  document.getElementById('btn-' + tab).classList.remove('text-gray-600');
}

// Init
document.getElementById('patientForm').addEventListener('submit', submitPatient);
document.getElementById('searchInput').addEventListener('input', searchPatients);
updateStatus2();
loadPatients();
loadStats();