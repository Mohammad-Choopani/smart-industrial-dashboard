console.log("Dashboard loaded");

// ==== SETTINGS ====
const NUM_SENSORS    = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS     = 30;

// ==== STATE ====
const sensors = [];
let time = 0;

// ==== UTILITIES ====
function simulateTemp(base = 65) {
  const wave  = Math.sin(time * 0.05) * 3;
  const noise = (Math.random() - 0.5) * 2;
  let temp = base + wave + noise;

  // 2% chance of spike
  if (Math.random() < 0.02) {
    temp += Math.random() * 15 + 10;
  }

  // clamp & round
  temp = Math.min(Math.max(temp, 40), 120);
  return Math.round(temp * 10) / 10;
}

function getInitialData() {
  return Array(DATA_POINTS).fill(65);
}

function getInitialLabels() {
  return Array(DATA_POINTS)
    .fill('')
    .map((_, i) =>
      new Date(Date.now() - (DATA_POINTS - i) * 1000)
        .toLocaleTimeString("en-US", { hour12: false })
    );
}

// Manual alarm button
function addAlert() {
  const alertsList = document.getElementById('alerts');
  if (
    alertsList.children.length === 1 &&
    alertsList.children[0].textContent === 'No active alerts.'
  ) {
    alertsList.innerHTML = '';
  }
  const newAlert = document.createElement('li');
  newAlert.textContent = '🚨 Alarm H400 - Emergency Stop Triggered!';
  newAlert.style.color = 'red';
  alertsList.appendChild(newAlert);
}

// Auto alerts on threshold breach
function checkForAlerts(value, sensorIndex) {
  const alertsList = document.getElementById('alerts');
  if (value > ALERT_THRESHOLD) {
    if (
      alertsList.children.length === 1 &&
      alertsList.children[0].textContent === 'No active alerts.'
    ) {
      alertsList.innerHTML = '';
    }
    const newAlert = document.createElement('li');
    newAlert.textContent = 
      `🚨 Sensor 0${sensorIndex + 1}: ${value}°C exceeded threshold (${ALERT_THRESHOLD}°C)`;
    newAlert.style.color = 'red';
    alertsList.appendChild(newAlert);
  }
}

// ==== CHART SETUP ====
for (let i = 0; i < NUM_SENSORS; i++) {
  const ctx = document
    .getElementById(`chart${i + 1}`)
    .getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getInitialLabels(),
      datasets: [{
        label: `Sensor 0${i + 1} Data`,
        data: getInitialData(),
        backgroundColor: 'rgba(0,102,204,0.1)',
        borderColor: 'rgba(0,102,204,1)',
        borderWidth: 2,
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

// ==== ANALYTICS ====
function updateAnalytics() {
  const allData = sensors.flatMap(ch =>
    ch.data.datasets[0].data
  );
  const n = allData.length;
  const overheatCount = allData.filter(v => v > ALERT_THRESHOLD).length;
  const sum = allData.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const sorted = [...allData].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = allData.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  document.getElementById('metric-total-readings').textContent    = n;
  document.getElementById('metric-total-overheats').textContent   = overheatCount;
  document.getElementById('metric-error-rate').textContent        = ((overheatCount / n) * 100).toFixed(1) + '%';
  document.getElementById('metric-avg-temp').textContent          = avg.toFixed(1) + '°C';
  document.getElementById('metric-max-temp').textContent          = Math.max(...allData).toFixed(1) + '°C';
  document.getElementById('metric-min-temp').textContent          = Math.min(...allData).toFixed(1) + '°C';
  document.getElementById('metric-median-temp').textContent       = median.toFixed(1) + '°C';
  document.getElementById('metric-std-dev').textContent           = stdDev.toFixed(1) + '°C';
  document.getElementById('metric-sensors-online').textContent    = sensors.length;
  document.getElementById('metric-data-points').textContent       = DATA_POINTS;
}

// ==== UPDATE LOOP ====
function updateAllCharts() {
  time++;
  sensors.forEach((chart, i) => {
    const newValue = simulateTemp(65 + i * 2);
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(newValue);
    chart.data.labels.shift();
    chart.data.labels.push(
      new Date().toLocaleTimeString("en-US", { hour12: false })
    );
    chart.update();
    checkForAlerts(newValue, i);
  });
  updateAnalytics();
}

// kick it off
setInterval(updateAllCharts, 100);
