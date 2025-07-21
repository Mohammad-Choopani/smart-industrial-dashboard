console.log("Dashboard loaded");

const ctx = document.getElementById('myChart').getContext('2d');

const chart = new Chart(ctx, {
  type: 'line', // نمودار خطی
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Sensor 01 Data',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: 'rgba(0, 102, 204, 0.2)',
      borderColor: 'rgba(0, 102, 204, 1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      pointRadius: 3
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

function addAlert() {
  const alertsList = document.getElementById('alerts');

  if (alertsList.children.length === 1 && alertsList.children[0].textContent === 'No active alerts.') {
    alertsList.innerHTML = '';
  }

  const newAlert = document.createElement('li');
  newAlert.textContent = '🚨 Alarm H400 - Emergency Stop Triggered!';
  newAlert.style.color = 'red';
  alertsList.appendChild(newAlert);
}

const ALERT_THRESHOLD = 40; // حد آلارم

function checkForAlerts(value) {
  const alertsList = document.getElementById('alerts');

  if (value > ALERT_THRESHOLD) {
    if (alertsList.children.length === 1 && alertsList.children[0].textContent === 'No active alerts.') {
      alertsList.innerHTML = '';
    }

    const newAlert = document.createElement('li');
    newAlert.textContent = `🚨 Alarm! Sensor value ${value} exceeded threshold ${ALERT_THRESHOLD}!`;
    newAlert.style.color = 'red';
    alertsList.appendChild(newAlert);
  }
}

let t = 0;

function simulateNeuralSignal() {
  const frequency = 0.2; // how fast signal changes
  const amplitude = 30;  // base range
  const noise = 10;      // randomness intensity

  const signal = Math.sin(t * frequency) * amplitude + (Math.random() * noise - noise / 2) + 50;

  t++;

  return Math.round(signal);
}


function updateChartData() {
  const newValue = simulateNeuralSignal();

  chart.data.datasets[0].data.shift();
  chart.data.datasets[0].data.push(newValue);

  chart.data.labels.shift();
  chart.data.labels.push(new Date().toLocaleTimeString("en-US", { hour12: false }));

  chart.update();

  checkForAlerts?.(newValue);
}

// شروع آپدیت داده هر 3 ثانیه
setInterval(updateChartData, 300);
