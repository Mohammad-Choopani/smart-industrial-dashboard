console.log("Dashboard loaded");

// ==== SETTINGS & STATE ====
const NUM_SENSORS     = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS     = 30;
const DB_KEY          = 'sensorDB';

let sensors = [];
let time    = 0;
let updateInterval;

// load or init DB
let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];

// ==== VOICE SETUP ====
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(msg) {
  const utter = new SpeechSynthesisUtterance(msg);
  utter.voice  = voices.find(v=>v.lang.startsWith('en-US')) || voices[0];
  utter.rate   = 1.0;
  utter.pitch  = 1.0;
  speechSynthesis.speak(utter);
}

// ==== ALERT HELPERS ====
function pushAlert(displayText) {
  const list = document.getElementById('alerts');
  if (list.children.length === 1 &&
      list.children[0].textContent === 'No active alerts.') {
    list.innerHTML = '';
  }
  const li = document.createElement('li');
  li.textContent = displayText;
  li.style.color = 'red';
  list.appendChild(li);

  // speak without emoji
  const spoken = displayText.replace(/^🚨\s*/, '');
  speak(spoken);
}

// ==== DATABASE HELPERS ====
function saveDBEntry(readings) {
  const entry = {
    timestamp: new Date().toLocaleTimeString(),
    readings
  };
  db.push(entry);
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  renderDB();
}
function renderDB() {
  const panel = document.getElementById('db-panel');
  if (!db.length) {
    panel.innerHTML = '<p>No stored data.</p>';
    return;
  }
  let html = '<table><thead><tr><th>Time</th>';
  for (let i = 1; i <= NUM_SENSORS; i++) {
    html += `<th>S${i}</th>`;
  }
  html += '</tr></thead><tbody>';
  db.slice(-50).forEach(row => {
    html += `<tr><td>${row.timestamp}</td>`;
    row.readings.forEach(v => {
      html += `<td>${v==null? '—' : v.toFixed(1)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  panel.innerHTML = html;
}
function clearDB() {
  if (confirm('Clear all stored data?')) {
    db = [];
    localStorage.removeItem(DB_KEY);
    renderDB();
  }
}

// ==== SIMULATION FUNCTIONS ====
function simulateTemp(base=65) {
  const wave  = Math.sin(time * 0.05) * 3;
  const noise = (Math.random()-0.5)*2;
  let t = base + wave + noise;
  if (Math.random() < 0.02) t += Math.random()*15 + 10;
  t = Math.min(Math.max(t,40),120);
  return Math.round(t*10)/10;
}

// ==== BUTTON HANDLERS ====
function addAlert() {
  pushAlert('🚨 Error: Emergency Stop Triggered H400');
  clearInterval(updateInterval);
}
function simulateTotalOverheat() {
  pushAlert('🚨 Critical Error: Total system overheat');
  const now = new Date().toLocaleTimeString();
  sensors.forEach(chart => {
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(ALERT_THRESHOLD + Math.random()*10 +5);
    chart.data.labels.shift();
    chart.data.labels.push(now);
    chart.update();
  });
}
function simulateElectricityError() {
  pushAlert('🚨 Critical Error: Electricity outage detected');
  const now = new Date().toLocaleTimeString();
  sensors.forEach(chart => {
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(0);
    chart.data.labels.shift();
    chart.data.labels.push(now);
    chart.update();
  });
}
function simulateMachineBroken() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Critical Error: Machine ${idx+1} malfunction – broken`);
  const now = new Date().toLocaleTimeString();
  const chart = sensors[idx];
  chart.data.datasets[0].data.shift();
  chart.data.datasets[0].data.push(null);
  chart.data.labels.shift();
  chart.data.labels.push(now);
  chart.update();
}
function simulateCoolingFailure() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Critical Error: Cooling failure on Sensor ${idx+1}`);
  const now = new Date().toLocaleTimeString();
  const chart = sensors[idx];
  chart.data.datasets[0].data.shift();
  chart.data.datasets[0].data.push(ALERT_THRESHOLD + Math.random()*20 +10);
  chart.data.labels.shift();
  chart.data.labels.push(now);
  chart.update();
}
function simulateSensorFault() {
  const idx = Math.floor(Math.random()*NUM_SENSORS);
  pushAlert(`🚨 Error: Sensor ${idx+1} fault – no data received`);
  const now = new Date().toLocaleTimeString();
  const chart = sensors[idx];
  chart.data.datasets[0].data.shift();
  chart.data.datasets[0].data.push(null);
  chart.data.labels.shift();
  chart.data.labels.push(now);
  chart.update();
}

// ==== CHART INIT ====
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
      responsive:true, animation:false,
      scales:{ y:{ min:40, max:120, title:{display:true,text:'°C'} } },
      plugins:{ legend:{display:false} }
    }
  });
  sensors.push(chart);
}

// ==== ANALYTICS UPDATE ====
function updateAnalytics() {
  const all = sensors.flatMap(c=>c.data.datasets[0].data);
  const valid = all.filter(v=>v!=null);
  const n = all.length;
  const over = valid.filter(v=>v>ALERT_THRESHOLD).length;
  const sum = valid.reduce((a,b)=>a+b,0);
  const avg = sum/valid.length;
  const sorted = [...valid].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length/2);
  const med = sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  const varr = sorted.reduce((a,b)=>a+(b-avg)**2,0)/sorted.length;
  const sd = Math.sqrt(varr);

  document.getElementById('metric-total-readings').textContent  = n;
  document.getElementById('metric-total-overheats').textContent = over;
  document.getElementById('metric-error-rate').textContent      = ((over/n)*100).toFixed(1)+'%';
  document.getElementById('metric-avg-temp').textContent        = avg.toFixed(1)+'°C';
  document.getElementById('metric-max-temp').textContent        = Math.max(...valid).toFixed(1)+'°C';
  document.getElementById('metric-min-temp').textContent        = Math.min(...valid).toFixed(1)+'°C';
  document.getElementById('metric-median-temp').textContent     = med.toFixed(1)+'°C';
  document.getElementById('metric-std-dev').textContent         = sd.toFixed(1)+'°C';
  document.getElementById('metric-sensors-online').textContent  = NUM_SENSORS;
  document.getElementById('metric-data-points').textContent     = DATA_POINTS;
}

// ==== MAIN LOOP ====
function updateAll() {
  time++;
  const readings = [];
  sensors.forEach((chart,i)=>{
    const v = simulateTemp(65 + i*2);
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(v);
    chart.data.labels.shift();
    chart.data.labels.push(new Date().toLocaleTimeString("en-US",{hour12:false}));
    chart.update();
    readings.push(v);
    if (v > ALERT_THRESHOLD) {
      pushAlert(`🚨 Error: Sensor ${i+1} overheated at ${v}°C`);
    }
  });
  updateAnalytics();
  saveDBEntry(readings);
}

renderDB();
updateInterval = setInterval(updateAll, 3000);
