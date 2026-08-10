const form = document.getElementById('ap-form');
const currentApEl = document.getElementById('current-ap');
const countdownEl = document.getElementById('countdown');
const fullTimeEl = document.getElementById('full-time');
const statusMessageEl = document.getElementById('status-message');

const AP_RECOVERY_MINUTES = 3;
const STORAGE_KEY = 'apState';

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.ap === 'number' && typeof parsed.maxAp === 'number' && typeof parsed.timestamp === 'number') {
            return parsed;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        alert('保存に失敗しました。ブラウザのプライベートモードや、ストレージの空き容量をご確認ください。');
    }
}

let state = loadState();

if (state) {
    form.elements['maxAp'].value = state.maxAp;
}

function estimateCurrentAp(currentState, now) {
    const elapsedMinutes = (now - currentState.timestamp) / 60000;
    const recovered = Math.floor(elapsedMinutes / AP_RECOVERY_MINUTES);
    return Math.min(currentState.maxAp, currentState.ap + recovered);
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClock(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function render() {
    if (!state) {
        currentApEl.textContent = '-';
        countdownEl.textContent = '-';
        fullTimeEl.textContent = '-';
        statusMessageEl.textContent = '左のフォームに現在のAPと最大APを入力してください。';
        statusMessageEl.hidden = false;
        return;
    }

    statusMessageEl.hidden = true;

    const now = Date.now();
    const current = estimateCurrentAp(state, now);
    currentApEl.textContent = `${current} / ${state.maxAp}`;

    if (current >= state.maxAp) {
        countdownEl.textContent = '満タン';
        fullTimeEl.textContent = '-';
        return;
    }

    const remaining = state.maxAp - current;
    const elapsedMinutes = (now - state.timestamp) / 60000;
    const recoveredSoFar = Math.floor(elapsedMinutes / AP_RECOVERY_MINUTES);
    const minutesIntoCurrentPoint = elapsedMinutes - recoveredSoFar * AP_RECOVERY_MINUTES;
    const minutesToNextPoint = AP_RECOVERY_MINUTES - minutesIntoCurrentPoint;
    const minutesToFull = minutesToNextPoint + (remaining - 1) * AP_RECOVERY_MINUTES;
    const fullTime = new Date(now + minutesToFull * 60000);

    countdownEl.textContent = formatDuration(minutesToFull * 60);
    fullTimeEl.textContent = formatClock(fullTime);
}

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const ap = Number(form.elements['currentAp'].value);
    const maxAp = Number(form.elements['maxAp'].value);

    if (ap > maxAp) {
        alert('現在のAPが最大APを超えています。入力内容を確認してください。');
        return;
    }

    state = { ap: ap, maxAp: maxAp, timestamp: Date.now() };
    saveState(state);
    render();
});

render();
setInterval(render, 1000);
