const voteForm = document.getElementById('voteForm');
const startBtn = document.getElementById('startBtn');
const logsContainer = document.getElementById('logs');
const logCountBadge = document.getElementById('logCount');
const clearLogsBtn = document.getElementById('clearLogs');
const siteList = document.getElementById('siteList');
const siteModal = document.getElementById('siteModal');
const showAddModalBtn = document.getElementById('showAddModal');
const closeModalBtn = document.getElementById('closeModal');
const addSiteForm = document.getElementById('addSiteForm');
const selectedSiteNameEl = document.getElementById('selectedSiteName');
const selectedSiteIdInput = document.getElementById('selectedSiteId');
const iterationsInput = document.getElementById('iterations');

let logCount = 0;
let sites = [];

// Initialize
fetchSites();

// Connect to Log Stream
const eventSource = new EventSource('/api/logs');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    appendLog(data.message);
};

async function fetchSites() {
    try {
        const response = await fetch('/api/sites');
        sites = await response.json();
        renderSites();
    } catch (err) {
        appendLog(`Error fetching sites: ${err.message}`, 'error');
    }
}

function renderSites() {
    if (sites.length === 0) {
        siteList.innerHTML = '<p class="muted">No sites saved.</p>';
        return;
    }

    siteList.innerHTML = '';
    sites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'site-item';
        if (selectedSiteIdInput.value === site._id) item.classList.add('active');

        item.innerHTML = `
            <span>${site.name}</span>
            <span class="delete-site" data-id="${site._id}">&times;</span>
        `;

        item.onclick = (e) => {
            if (e.target.classList.contains('delete-site')) {
                deleteSite(site._id);
            } else {
                selectSite(site);
            }
        };

        siteList.appendChild(item);
    });
}

function selectSite(site) {
    selectedSiteIdInput.value = site._id;
    selectedSiteNameEl.textContent = `Target: ${site.name}`;
    iterationsInput.value = site.defaultIterations || 1;

    // UI Update
    document.querySelectorAll('.site-item').forEach(el => el.classList.remove('active'));
    renderSites();
    appendLog(`> Switched to configuration: ${site.name}`, 'muted');
}

async function deleteSite(id) {
    if (!confirm('Are you sure you want to delete this site configuration?')) return;
    try {
        await fetch(`/api/sites/${id}`, { method: 'DELETE' });
        if (selectedSiteIdInput.value === id) {
            selectedSiteIdInput.value = '';
            selectedSiteNameEl.textContent = 'Select a faculty to begin.';
        }
        fetchSites();
    } catch (err) {
        appendLog(`Error deleting site: ${err.message}`, 'error');
    }
}

// Voting Logic
voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('studentID').value;
    const choiceIndex = document.getElementById('choiceIndex').value;
    const siteId = selectedSiteIdInput.value;
    const iterations = iterationsInput.value;

    if (!siteId) {
        alert('Please select a faculty site from the sidebar first.');
        return;
    }

    setLoading(true);
    appendLog(`> Launching campaign for ID: ${id}...`, 'muted');

    try {
        const response = await fetch('/api/start-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, choiceIndex, siteId, iterations })
        });

        const result = await response.json();
        if (result.success) {
            appendLog(`> ${result.message}`, 'success');
        } else {
            appendLog(`> Error: ${result.error}`, 'error');
            setLoading(false);
        }
    } catch (error) {
        appendLog(`> Network Error: ${error.message}`, 'error');
        setLoading(false);
    }
});

// Modal Logic
showAddModalBtn.onclick = () => siteModal.style.display = 'flex';
closeModalBtn.onclick = () => siteModal.style.display = 'none';
window.onclick = (e) => { if (e.target == siteModal) siteModal.style.display = 'none'; };

addSiteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('newName').value,
        loginUrl: document.getElementById('newLoginUrl').value,
        voteUrl: document.getElementById('newVoteUrl').value,
        defaultIterations: document.getElementById('newIterations').value
    };

    try {
        const response = await fetch('/api/sites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            siteModal.style.display = 'none';
            addSiteForm.reset();
            fetchSites();
        }
    } catch (err) {
        alert(`Failed to save site: ${err.message}`);
    }
});

// Utility
function appendLog(message, type = '') {
    const line = document.createElement('div');
    line.className = 'line';
    if (type) line.classList.add(type);

    if (message.includes('successfully') || message.includes('complete')) line.classList.add('success');
    if (message.includes('Error') || message.includes('failed')) line.classList.add('error');

    line.textContent = message;
    logsContainer.appendChild(line);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    logCount++;
    logCountBadge.textContent = `${logCount} logs`;
}

function setLoading(isLoading) {
    if (isLoading) {
        startBtn.disabled = true;
        startBtn.querySelector('.spinner').style.display = 'block';
    } else {
        startBtn.disabled = false;
        startBtn.querySelector('.spinner').style.display = 'none';
    }
}

clearLogsBtn.onclick = () => {
    logsContainer.innerHTML = '<div class="line muted">> Logs cleared. Ready...</div>';
    logCount = 0;
    logCountBadge.textContent = '0 logs';
};
