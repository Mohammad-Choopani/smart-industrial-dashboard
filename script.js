// ==== SETTINGS ====
const NUM_SENSORS     = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS     = 30;

// ==== STATE ====
const sensors = [];
let time = 0;

// ==== VOICE SETUP ====
// Cache voices once available
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Speak a plain message (no emojis) in en-US machine voice
function speakError(msg) {
  // pick an en-US voice if possible
  const voice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
  const utter = new SpeechSynthesisUtterance(msg);
  utter.voice = voice;
  utter.rate  = 1.0;
  utter.pitch = 1.0;
  speechSynthesis.speak(utter);
}

// ==== ALERT HELPERS ====
function pushAlert(displayText) {
  const list = document.getElementById('alerts');
  // clear "No active alerts."
  if (list.children.length === 1 && list.children[0].textContent === 'No active alerts.') {
    list.innerHTML = '';
  }
  // add to list
  const li = document.createElement('li');
  li.textContent = displayText;
  li.style.color = 'red';
  list.appendChild(li);
  // strip leading emoji for speech
  const spoken = displayText.replace(/^🚨\s*/, '');
  speakError(spoken);
}

// ==== MANUAL ALERT ====
function addAlert() {
  pushAlert('🚨 Error: Emergency Stop Triggered H400');
}

// ==== AUTO ALERT ON OVERHEAT ====
function checkForAlerts(value, idx) {
  if (value > ALERT_THRESHOLD) {
    pushAlert(`🚨 Error: Sensor ${idx+1} overheated at ${value} degrees`);
  }
}

// ==== SIMULATION BUTTONS ====
function simulateTotalOverheat() {
  pushAlert('🚨 Critical Error: Total system overheat');
}
function simulateElectricityError() {
  pushAlert('🚨 Critical Error: Electricity outage detected');
}
function simulateMachineBroken() {
  pushAlert('🚨 Critical Error: Machine malfunction – broken');
}
function simulateCoolingFailure() {
  pushAlert('🚨 Critical Error: Cooling system failure');
}
function simulateSensorFault() {
  const idx = Math.floor(Math.random() * NUM_SENSORS) + 1;
  pushAlert(`🚨 Sensor ${idx} fault – no data received`);
}

// ==== DATA SIMULATION & CHART SETUP ====
function simulateTemp(base = 65) {
  const wave  = Math.sin(time * 0.05) * 3;
  const noise = (Math.random() - 0.5) * 2;
  let temp = base + wave + noise;
  if (Math.random() < 0.02) temp += Math.random() * 15 + 10;
  temp = Math.min(Math.max(temp, 40), 120);
  return Math.round(temp * 10) / 10;
}

function getInitialData() {
  return Array(DATA_POINTS).fill(65);
}
function getInitialLabels() {
  return Array(DATA_POINTS).fill('').map((_, i) =>
    new Date(Date.now() - (DATA_POINTS - i) * 1000)
      .toLocaleTimeString("en-US", { hour12: false })
  );
}

// build charts
for (let i = 0; i < NUM_SENSORS; i++) {
  const ctx = document.getElementById(`chart${i+1}`).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getInitialLabels(),
      datasets: [{
        label: `Sensor ${i+1}`,
        data: getInitialData(),
        backgroundColor: 'rgba(0,102,204,0.1)',
        borderColor: 'rgba(0,102,204,1)',
        tension: 0.3,
        fill: true,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: {
          min: 40,
          max: 120,
          title: { display: true, text: '°C' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
  sensors.push(chart);
}

// ==== ANALYTICS UPDATE ====
function updateAnalytics() {
  const all = sensors.flatMap(c => c.data.datasets[0].data);
  const n    = all.length;
  const over = all.filter(v => v > ALERT_THRESHOLD).length;
  const sum  = all.reduce((a, b) => a + b, 0);
  const avg  = sum / n;
  const sorted = [...all].sort((a, b) => a - b);
  const mid    = Math.floor(n / 2);
  const med    = n % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
  const varr   = all.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
  const sd     = Math.sqrt(varr);

  document.getElementById('metric-total-readings').textContent  = n;
  document.getElementById('metric-total-overheats').textContent = over;
  document.getElementById('metric-error-rate').textContent      = ((over/n)*100).toFixed(1) + '%';
  document.getElementById('metric-avg-temp').textContent        = avg.toFixed(1) + '°C';
  document.getElementById('metric-max-temp').textContent        = Math.max(...all).toFixed(1) + '°C';
  document.getElementById('metric-min-temp').textContent        = Math.min(...all).toFixed(1) + '°C';
  document.getElementById('metric-median-temp').textContent     = med.toFixed(1) + '°C';
  document.getElementById('metric-std-dev').textContent         = sd.toFixed(1) + '°C';
  document.getElementById('metric-sensors-online').textContent  = sensors.length;
  document.getElementById('metric-data-points').textContent     = DATA_POINTS;
}

// ==== MAIN LOOP ====
function updateAllCharts() {
  time++;
  sensors.forEach((chart, i) => {
    const v = simulateTemp(65 + i*2);
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(v);
    chart.data.labels.shift();
    chart.data.labels.push(
      new Date().toLocaleTimeString("en-US", { hour12: false })
    );
    chart.update();
    checkForAlerts(v, i);
  });
  updateAnalytics();
}

setInterval(updateAllCharts, 300);
