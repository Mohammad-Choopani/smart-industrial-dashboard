console.log("Dashboard loaded");

// ==== SETTINGS ====
const NUM_SENSORS     = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS     = 30;

// ==== STATE ====
const sensors = [];
let time = 0;

// ==== UTILITIES ====
// Simulate temp with occasional spike
function simulateTemp(base = 65) {
  const wave  = Math.sin(time * 0.05) * 3;
  const noise = (Math.random() - 0.5) * 2;
  let temp = base + wave + noise;
  if (Math.random() < 0.02) temp += Math.random() * 15 + 10;
  temp = Math.min(Math.max(temp, 40), 120);
  return Math.round(temp * 10) / 10;
}

// Initial data & labels
function getInitialData() {
  return Array(DATA_POINTS).fill(65);
}
function getInitialLabels() {
  return Array(DATA_POINTS).fill('').map((_, i) =>
    new Date(Date.now() - (DATA_POINTS - i) * 1000)
      .toLocaleTimeString("en-US", { hour12: false })
  );
}

// Text‑to‑speech
function speakError(msg) {
  const u = new SpeechSynthesisUtterance(msg);
  u.rate = 1.0;
  speechSynthesis.speak(u);
}

// Add alert to list
function pushAlert(text) {
  const list = document.getElementById('alerts');
  if (list.children.length === 1 && list.children[0].textContent === 'No active alerts.') {
    list.innerHTML = '';
  }
  const li = document.createElement('li');
  li.textContent = text;
  li.style.color = 'red';
  list.appendChild(li);
}

// Manual alert button
function addAlert() {
  const msg = 'Error: Emergency Stop Triggered (H400)';
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}

// Auto‑alerts on chart updates
function checkForAlerts(value, idx) {
  if (value > ALERT_THRESHOLD) {
    const msg = `Error: Sensor ${idx+1} overheated at ${value}°C`;
    pushAlert(`🚨 ${msg}`);
    speakError(msg);
  }
}

// ==== CHART SETUP ====
for (let i = 0; i < NUM_SENSORS; i++) {
  const ctx = document.getElementById(`chart${i+1}`).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getInitialLabels(),
      datasets: [{ 
        label: `Sensor 0${i+1}`, 
        data: getInitialData(), 
        backgroundColor: 'rgba(0,102,204,0.1)',
        borderColor: 'rgba(0,102,204,1)',
        tension: 0.3, fill: true, pointRadius:2 
      }]
    },
    options: {
      responsive: true, animation: false,
      scales: { y: { min:40, max:120, title:{display:true,text:'°C'} } },
      plugins:{ legend:{display:false} }
    }
  });
  sensors.push(chart);
}

// ==== ANALYTICS ====
function updateAnalytics() {
  const all = sensors.flatMap(c => c.data.datasets[0].data);
  const n = all.length;
  const over = all.filter(v=>v>ALERT_THRESHOLD).length;
  const sum = all.reduce((a,b)=>a+b,0), avg = sum/n;
  const sorted = [...all].sort((a,b)=>a-b);
  const mid = Math.floor(n/2);
  const med = n%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  const varr = all.reduce((a,b)=>a+(b-avg)**2,0)/n;
  const sd = Math.sqrt(varr);

  document.getElementById('metric-total-readings').textContent  = n;
  document.getElementById('metric-total-overheats').textContent = over;
  document.getElementById('metric-error-rate').textContent      = ((over/n)*100).toFixed(1)+'%';
  document.getElementById('metric-avg-temp').textContent        = avg.toFixed(1)+'°C';
  document.getElementById('metric-max-temp').textContent        = Math.max(...all).toFixed(1)+'°C';
  document.getElementById('metric-min-temp').textContent        = Math.min(...all).toFixed(1)+'°C';
  document.getElementById('metric-median-temp').textContent     = med.toFixed(1)+'°C';
  document.getElementById('metric-std-dev').textContent         = sd.toFixed(1)+'°C';
  document.getElementById('metric-sensors-online').textContent  = sensors.length;
  document.getElementById('metric-data-points').textContent     = DATA_POINTS;
}

// ==== SIMULATION FUNCTIONS ====
function simulateTotalOverheat() {
  const msg = 'Critical Error: Total system overheat!';
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}
function simulateElectricityError() {
  const msg = 'Critical Error: Electricity outage detected!';
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}
function simulateMachineBroken() {
  const msg = 'Critical Error: Machine malfunction – broken!';
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}
function simulateCoolingFailure() {
  const msg = 'Critical Error: Cooling system failure!';
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}
function simulateSensorFault() {
  const idx = Math.floor(Math.random()*NUM_SENSORS)+1;
  const msg = `Sensor ${idx} fault – no data received`;
  pushAlert(`🚨 ${msg}`);
  speakError(msg);
}

// ==== UPDATE LOOP ====
function updateAllCharts() {
  time++;
  sensors.forEach((chart,i)=>{
    const v = simulateTemp(65 + i*2);
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(v);
    chart.data.labels.shift();
    chart.data.labels.push(new Date().toLocaleTimeString("en-US",{hour12:false}));
    chart.update();
    checkForAlerts(v,i);
  });
  updateAnalytics();
}

setInterval(updateAllCharts, 10);
