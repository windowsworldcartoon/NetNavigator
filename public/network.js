const { exec } = require('child_process');
const dns = require('dns');
const net = require('net');
const os = require('os');
const { ipcRenderer, dialog } = require('electron');
let mode = 'normal';
// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        console.log('Tab clicked:', button.dataset.tab);
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    await ipcRenderer.invoke('updates-json').then(data => {
        const tag_name = data.tag_name;
        const version = data.version;
        if (tag_name !== version) {
            document.getElementsByClassName('loading-screen')[0].style.display = 'none';
            const update = document.createElement('div');
            update.className = 'card';
            update.id = 'update-card';
            update.innerHTML = `<div class="card-content"><h3>Update Available</h3><p>Version ${version} is available. Click <a onclick="openExternal('https://github.com/windowsworldcartoon/NetNavigator/releases/tag/${tag_name}')">here</a> to download.</p></div><div class="alert info"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="../tabler-icons-3.35.0/icons/outline/info-circle.svg"/></svg> Update available: ${tag_name}</div><div class="card-actions"><button onclick="cancelUpdate()" id='cancel-update'>Cancel</button></div>`;
            document.body.appendChild(update);

        } else {
            document.getElementsByClassName('loading-screen')[0].style.display = 'none';
            document.getElementById('welcome').style.display = 'block';
        }
    });
});

// Network Scanner
document.getElementById('scan-btn').addEventListener('click', () => {
    const baseIP = document.getElementById('scan-ip').value;
    console.log('Scanning network for base IP:', baseIP);
    const resultsDiv = document.getElementById('scan-results');
    resultsDiv.innerHTML = 'Scanning...';

    let activeIPs = [];
    let completed = 0;
    for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        exec(`ping -n 1 -w 100 ${ip}`, (error, stdout, stderr) => {
            completed++;
            if (stdout.includes('Reply from')) {
                activeIPs.push(ip);
                console.log('Active IP found:', ip);
            }
            if (completed === 254) {
                console.log('Scan completed, active IPs:', activeIPs);
                resultsDiv.innerHTML = activeIPs.length ? activeIPs.map(ip => `<div>${ip}</div>`).join('') : 'No active IPs found';
            }
        });
    }
});

// Port Checker
document.getElementById('check-port-btn').addEventListener('click', () => {
    const host = document.getElementById('host').value;
    const port = parseInt(document.getElementById('port-num').value);
    const resultsDiv = document.getElementById('port-results');
    console.log('Checking port:', port, 'on host:', host);
    if (!host && !port) {
        const errors = []
        errors.push({
            message: 'Please enter a host number',
            type: 'error'
        });
        errors.push({
            message: 'Please enter a port number',
            type: 'error'
        });
        resultsDiv.innerHTML = `<pre>${JSON.stringify(errors, null, 2)}</pre>`;
        return;
    } else if (host && !port) {
        const errors = []
        errors.push({
            message: 'Please enter a port number',
            type: 'error'
        });
        resultsDiv.innerHTML = `<pre>${JSON.stringify(errors, null, 2)}</pre>`;
    
    } else if (port <= 0 || port > 65535) {
        const errors = []
        errors.push({
            message: 'The port number must be between 1 and 65535',
            type: 'error'
        });
        resultsDiv.innerHTML = `<pre>${JSON.stringify(errors, null, 2)}</pre>`;
    } else {
        
    
     resultsDiv.innerHTML = 'Checking...';

     const socket = new net.Socket();
     socket.setTimeout(2000);
     socket.connect(port, host, () => {
        console.log('Port is open');
        resultsDiv.innerHTML = `<pre>${JSON.stringify([{message: 'Port is open', type: 'success'}], null, 2)}</pre>`;
        socket.end();
     });
     socket.on('timeout', () => {
        console.log('Port timeout');
        resultsDiv.innerHTML = `<pre>${JSON.stringify([{message: 'Port timeout', type: 'error', details: 'The port is not responding within the timeout period.'}], null, 2)}</pre>`;
        socket.destroy();
     });
     socket.on('error', (err) => {
        let errorMessage = 'Error: ';
        if (err instanceof AggregateError) {
            const errors = JSON.stringify([...err.errors], null, 2);
            resultsDiv.innerHTML = `<pre>${errors}</pre>`;
        } else {
            errorMessage += err.toString();
            resultsDiv.innerHTML = `<pre>${JSON.stringify([{message: errorMessage, type: 'error'}], null, 2)}</pre>`;
        }
       
        socket.destroy();
     });
    }
});



// Network Monitor
let monitorInterval;
document.getElementById('start-monitor').addEventListener('click', () => {
    console.log('Starting network monitor');
    document.getElementById('start-monitor').disabled = true;
    document.getElementById('stop-monitor').disabled = false;
    const resultsDiv = document.getElementById('monitor-results');
    resultsDiv.innerHTML = '';


    resultsDiv.innerHTML += '<div>Starting network monitor...</div>';

    monitorInterval = setInterval(() => {
        exec('ping -n 1 8.8.8.8', (error, stdout, stderr) => {
            const time = new Date().toLocaleTimeString();
            if (error) {
                console.log('Monitor ping error:', error.message);
                resultsDiv.innerHTML += `<div>${time}: Error - ${error.message}</div>`;
                return;
            }
            const match = stdout.match(/time[<>=](\d+)ms/);
            const pingTime = match ? match[1] : 'unknown';
            console.log('Monitor ping:', pingTime, 'ms');
            resultsDiv.innerHTML += `<div>${time}: Ping to 8.8.8.8 - ${pingTime}ms</div>`;
            resultsDiv.scrollTop = resultsDiv.scrollHeight;
        });
    }, 5000);
});

document.getElementById('stop-monitor').addEventListener('click', () => {
    console.log('Stopping network monitor');
    clearInterval(monitorInterval);
    document.getElementById('start-monitor').disabled = false;
    document.getElementById('stop-monitor').disabled = true;
    const resultsDiv = document.getElementById('monitor-results');
    resultsDiv.innerHTML += '<div>Stopping network monitor...</div>';
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
    setTimeout(() => {
        resultsDiv.innerHTML = '';
    }, 1000);
});

// Network Optimization
document.getElementById('optimize-btn').addEventListener('click', () => {
    console.log('Running network optimization');
    const resultsDiv = document.getElementById('optimize-results');
    resultsDiv.innerHTML = 'Optimizing...';

    // Clear DNS cache and renew IP
    exec('ipconfig /flushdns && ipconfig /release && ipconfig /renew', (error, stdout, stderr) => {
        if (error) {
            console.error('Optimization error:', error.message);
            resultsDiv.innerHTML += '\nError: ' + error.message;
            return;
        }
        console.log('Optimization completed');
        resultsDiv.innerHTML += '\nNetwork optimized: DNS cache flushed, IP renewed.';
    });
});

// Network Info
document.getElementById('get-info-btn').addEventListener('click', () => {
    console.log('Getting network info');
    const resultsDiv = document.getElementById('info-results');
    resultsDiv.innerHTML = 'Retrieving network info...';

    const interfaces = os.networkInterfaces();
    let info = '<h3>Network Interfaces:</h3>';
    for (const [name, addresses] of Object.entries(interfaces)) {
        info += `<h4>${name}:</h4>`;
        addresses.forEach(addr => {
            if (addr.family === 'IPv4') {
                info += `<div>IP: ${addr.address}</div><div>Netmask: ${addr.netmask}</div><div>MAC: ${addr.mac}</div>`;
            }
        });
    }

    // Get gateway (simplified, using route print)
    exec('route print 0.0.0.0', (error, stdout, stderr) => {
        if (!error) {
            const match = stdout.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+([\d\.]+)/);
            if (match) {
                info += `<h3>Default Gateway: ${match[1]}</h3>`;
            }
        }
        console.log('Network info retrieved');
        resultsDiv.innerHTML = info;
    });
});

// Check Connectivity
document.getElementById('check-connect-btn').addEventListener('click', () => {
    console.log('Checking connectivity');
    const statusDiv = document.getElementById('connect-status');
    statusDiv.innerHTML = '';
    statusDiv.innerHTML += 'Checking...';


    exec('ping -n 1 8.8.8.8', (error, stdout, stderr) => {
        if (stdout.includes('Reply from')) {
            console.log('Connected to internet');
            statusDiv.innerHTML += '<div class="alert success"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><use href="../tabler-icons-3.35.0/icons/outline/check.svg"/></svg> Connected to Internet</div>';
        } else {
            console.log('Not connected to internet');
            statusDiv.innerHTML += '<div class="alert error"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><use href="../tabler-icons-3.35.0/icons/outline/x.svg"/></svg> Not Connected to Internet</div>';
        }
    });
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const button = document.getElementById('theme-toggle');
    bnerHTML = document.body.classList.contains('dark-mode') ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><use href="../tabler-icons-3.35.0/icons/outline/sun-high.svg"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><use href="../tabler-icons-3.35.0/icons/outline/moon.svg"/></svg>';
    ipcRenderer.invoke('theme:toggle');
});

document.getElementById('start-btn').addEventListener('click', () => {
    document.querySelector('.welcome').style.display = 'none';
    document.getElementsByClassName('loading-screen')[0].style.display = 'block';
    setTimeout(() => {
        document.getElementsByClassName('loading-screen')[0].style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }, 100);
});

// Listen for menu switches
ipcRenderer.on('switch-tab', (event, tab) => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(tab).classList.add('active');
});





ipcRenderer.on('set-mode', (event, mode) => {
    event.preventDefault();
    console.log('Mode:', mode);
    if (mode === 'dev') {
        console.log('Developer mode is enabled');
        const welcome_content = document.getElementById('welcome-content');
        const alert = document.createElement('div');
        alert.className = 'alert success';
        alert.innerHTML = 'Developer mode is enabled';
        welcome_content.appendChild(alert);
    }
});

function openExternal(url) {
    ipcRenderer.invoke('open-external', url);
}

function cancelUpdate() {
    document.getElementById('update-card').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}