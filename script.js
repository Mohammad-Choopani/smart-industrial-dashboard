console.log("Dashboard loaded");

// ==== SETTINGS ====
const NUM_SENSORS = 5;
const ALERT_THRESHOLD = 90;
const DATA_POINTS = 30;

// ==== GLOBAL STATE ====
const sensors = [];
let time = 0;

// ==== UTILS ====
function createCanvasContext(id) {
  return document.getElementById(id).getContext('2d');
}

function simulateTemp(base = 65) {
  const wave = Math.sin(time * 0.05) * 3;
  const noise = (Math.random() - 0.5) * 2;
  let temp = base + wave + noise;

  if (Math.random() < 0.02) {
    temp += Math.random() * 15 + 10; // spike
  }

  return Math.round(Math.min(Math.max(temp, 40), 120) * 10) / 10;
}

function getInitialData() {
  return Array(DATA_POINTS).fill(65);
}

function getInitialLabels() {
  return Array(DATA_POINTS).fill('').map((_, i) =>
    new Date(Date.now() - (DATA_POINTS - i) * 1000).toLocaleTimeString("en-US", { hour12: false })
  );
}

function checkForAlerts(value, sensorIndex) {
  const alertsList = document.getElementById('alerts');

  if (value > ALERT_THRESHOLD) {
    if (alertsList.children.length === 1 && alertsList.children[0].textContent === 'No active alerts.') {
      alertsList.innerHTML = '';
    }

    const newAlert = document.createElement('li');
    newAlert.textContent = `🚨 Sensor 0${sensorIndex + 1}: ${value}°C exceeded threshold (${ALERT_THRESHOLD}°C)`;
    newAlert.style.color = 'red';
    alertsList.appendChild(newAlert);
  }
}

// ==== CHART SETUP ====
for (let i = 0; i < NUM_SENSORS; i++) {
  const ctx = createCanvasContext(`chart${i + 1}`);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getInitialLabels(),
      datasets: [{
        label: `Sensor 0${i + 1} Data`,
        data: getInitialData(),
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        borderColor: 'rgba(0, 102, 204, 1)',
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
          title: { display: true, text: "°C" }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  sensors.push(chart);
}

// ==== UPDATE LOOP ====
function updateAllCharts() {
  time++;

  sensors.forEach((chart, i) => {
    const newValue = simulateTemp(65 + i * 2); // slight base offset per sensor

    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(newValue);

    chart.data.labels.shift();
    chart.data.labels.push(new Date().toLocaleTimeString("en-US", { hour12: false }));

    chart.update();

    checkForAlerts(newValue, i);
  });
}

setInterval(updateAllCharts, 1000);
