console.log("Dashboard loaded");

// ─── SETTINGS & STATE ─────────────────────────────────────────────────────────
const NUM_SENSORS     = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS     = 30;
const DB_KEY          = 'analyticsDB';

let sensors = [];
let time    = 0;
let updateInterval;

// in‑browser “DB”
let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];

// ─── VOICE SETUP ────────────────────────────────────────────────────────────────
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(msg) {
  const u = new SpeechSynthesisUtterance(msg);
  u.voice = voices.find(v=>v.lang.startsWith('en-US'))||voices[0];
  u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.speak(u);
}

// ─── ALERT HELPERS ─────────────────────────────────────────────────────────────
function pushAlert(text) {
  const alertsList = document.getElementById('alerts');
  if (
    alertsList.children.length === 1 &&
    alertsList.children[0].textContent === 'No active alerts.'
  ) {
    alertsList.innerHTML = '';
  }
  const li = document.createElement('li');
  li.textContent = text;
  li.style.color = 'red';
  alertsList.appendChild(li);

  // strip emoji for speech
  speak(text.replace(/^🚨\s*/, ''));
}

// ─── ANALYTICS COMPUTATION ────────────────────────────────────────────────────
function computeMetrics() {
  // gather all current data points
  const all = sensors.flatMap(c=>c.data.datasets[0].data).filter(v=>v!=null);
  const n    = all.length;
  const over = all.filter(v=>v>ALERT_THRESHOLD).length;
  const sum  = all.reduce((a,b)=>a+b, 0);
  const avg  = n ? sum/n : 0;
  const sorted = [...all].sort((a,b)=>a-b);
  const mid    = Math.floor(sorted.length/2);
  const median = sorted.length
    ? (sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2)
    : 0;
  const varr = sorted.length
    ? sorted.reduce((a,b)=>a+(b-avg)**2,0)/sorted.length
    : 0;
  const sd   = Math.sqrt(varr);

  return {
    total_readings:   n,
    total_overheats:  over,
    error_rate:       `${((over/n)*100).toFixed(1)}%`,
    avg_temp:         `${avg.toFixed(1)}°C`,
    max_temp:         sorted.length ? `${Math.max(...sorted).toFixed(1)}°C` : '0°C',
    min_temp:         sorted.length ? `${Math.min(...sorted).toFixed(1)}°C` : '0°C',
    median_temp:      `${median.toFixed(1)}°C`,
    std_dev:          `${sd.toFixed(1)}°C`,
    sensors_online:   NUM_SENSORS,
    data_points:      DATA_POINTS
  };
}

function updateAnalytics() {
  const m = computeMetrics();
  document.getElementById('metric-total-readings').textContent  = m.total_readings;
  document.getElementById('metric-total-overheats').textContent = m.total_overheats;
  document.getElementById('metric-error-rate').textContent      = m.error_rate;
  document.getElementById('metric-avg-temp').textContent        = m.avg_temp;
  document.getElementById('metric-max-temp').textContent        = m.max_temp;
  document.getElementById('metric-min-temp').textContent        = m.min_temp;
  document.getElementById('metric-median-temp').textContent     = m.median_temp;
  document.getElementById('metric-std-dev').textContent         = m.std_dev;
  document.getElementById('metric-sensors-online').textContent  = m.sensors_online;
  document.getElementById('metric-data-points').textContent     = m.data_points;
  return m;
}

// ─── LOCAL STORAGE DB ─────────────────────────────────────────────────────────
function saveDBEntry(metrics) {
  db.push({
    timestamp: new Date().toLocaleTimeString(),
    metrics
  });
  if (db.length > 50) db.shift();
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  renderDB();
}

function renderDB() {
  const panel = document.getElementById('db-panel');
  if (!db.length) {
    panel.innerHTML = '<p>No stored analytics.</p>';
    return;
  }
  // build table header from metric keys
  const keys = Object.keys(db[0].metrics);
  let html = '<table><thead><tr><th>Time</th>';
  keys.forEach(k => {
    html += `<th>${k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</th>`;
  });
  html += '</tr></thead><tbody>';
  db.forEach(row => {
    html += `<tr><td>${row.timestamp}</td>`;
    keys.forEach(k => {
      html += `<td>${row.metrics[k]}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  panel.innerHTML = html;
}

function clearDB() {
  if (confirm("Clear stored analytics?")) {
    db = [];
    localStorage.removeItem(DB_KEY);
    renderDB();
  }
}

// ─── SIMULATION HELPERS & BUTTONS ─────────────────────────────────────────────
function simulateTemp(base=65) {
  const wave  = Math.sin(time * 0.05)*3;
  const noise = (Math.random()-0.5)*2;
  let t = base + wave + noise;
  if (Math.random()<0.02) t += Math.random()*15+10;
  return Math.round(Math.min(Math.max(t,40),120)*10)/10;
}

function addAlert() {
  pushAlert('🚨 Error: Emergency Stop Triggered H400');
  clearInterval(updateInterval);
}
function simulateTotalOverheat() {
  pushAlert('🚨 Critical Error: Total system overheat');
  const label = new Date().toLocaleTimeString();
  sensors.forEach(c => {
    c.data.datasets[0].data.shift();
    c.data.datasets[0].data.push(ALERT_THRESHOLD + Math.random()*10 + 5);
    c.data.labels.shift();
    c.data.labels.push(label);
    c.update();
  });
}
function simulateElectricityError() {
  pushAlert('🚨 Critical Error: Electricity outage detected');
  const label = new Date().toLocaleTimeString();
  sensors.forEach(c => {
    c.data.datasets[0].data.shift();
    c.data.datasets[0].data.push(0);
    c.data.labels.shift();
    c.data.labels.push(label);
    c.update();
  });
}
function simulateMachineBroken() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Critical Error: Machine ${idx+1} malfunction – broken`);
  const label = new Date().toLocaleTimeString();
  const c = sensors[idx];
  c.data.datasets[0].data.shift();
  c.data.datasets[0].data.push(null);
  c.data.labels.shift();
  c.data.labels.push(label);
  c.update();
}
function simulateCoolingFailure() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Critical Error: Cooling failure on Sensor ${idx+1}`);
  const label = new Date().toLocaleTimeString();
  const c = sensors[idx];
  c.data.datasets[0].data.shift();
  c.data.datasets[0].data.push(ALERT_THRESHOLD + Math.random()*20 + 10);
  c.data.labels.shift();
  c.data.labels.push(label);
  c.update();
}
function simulateSensorFault() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Error: Sensor ${idx+1} fault – no data received`);
  const label = new Date().toLocaleTimeString();
  const c = sensors[idx];
  c.data.datasets[0].data.shift();
  c.data.datasets[0].data.push(null);
  c.data.labels.shift();
  c.data.labels.push(label);
  c.update();
}

// ─── CHART INITIALIZATION ─────────────────────────────────────────────────────
function getInitialLabels() {
  return Array(DATA_POINTS).fill('').map((_,i)=>
    new Date(Date.now()-(DATA_POINTS-i)*1000)
      .toLocaleTimeString("en-US",{hour12:false})
  );
}
function getInitialData() {
  return Array(DATA_POINTS).fill(65);
}

for (let i=0; i<NUM_SENSORS; i++) {
  const ctx = document.getElementById(`chart${i+1}`).getContext('2d');
  const chart = new Chart(ctx,{
    type:'line',
    data:{
      labels: getInitialLabels(),
      datasets:[{
        label:`Sensor ${i+1}`,
        data: getInitialData(),
        backgroundColor:'rgba(0,102,204,0.1)',
        borderColor:'rgba(0,102,204,1)',
        tension:0.3, fill:true, pointRadius:2
      }]
    },
    options:{
      responsive:true,
      animation:false,
      scales:{ y:{ min:40, max:120, title:{display:true,text:'°C'} } },
      plugins:{ legend:{display:false} }
    }
  });
  sensors.push(chart);
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
renderDB();
updateInterval = setInterval(() => {
  time++;
  // update charts & alerts
  sensors.forEach((c,i) => {
    const v = simulateTemp(65 + i*2);
    c.data.datasets[0].data.shift();
    c.data.datasets[0].data.push(v);
    c.data.labels.shift();
    c.data.labels.push(new Date().toLocaleTimeString("en-US",{hour12:false}));
    c.update();
    if (v > ALERT_THRESHOLD) {
      pushAlert(`🚨 Error: Sensor ${i+1} overheated at ${v}°C`);
    }
  });
  // update UI analytics & save
  const m = updateAnalytics();
  saveDBEntry(m);
}, 3000);
