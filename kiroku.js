const form = document.getElementById('kiroku-form');
const recordList = document.getElementById('record-list');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const totalCountEl = document.getElementById('total-count');
const pullEstimateEl = document.getElementById('pull-estimate');
const chart = document.getElementById('chart');
const exportButton = document.getElementById('export-button');
const importInput = document.getElementById('import-input');

const SINGLE_PULL_COST = 300;
const TEN_PULL_COST = 3000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const savedRecords = localStorage.getItem('records');
let records = [];

if (savedRecords) {
    try {
        records = JSON.parse(savedRecords);
    } catch (error) {
        localStorage.removeItem('records');
    }
}

let editingRecord = null;

function saveRecords() {
    localStorage.setItem('records', JSON.stringify(records));
}

function createRecordElement(recordData) {
    const record = document.createElement('div');
    record.className = 'record';

    const dateP = document.createElement('p');
    dateP.textContent = `日付：${recordData.date}`;

    const countP = document.createElement('p');
    countP.textContent = `廻珠数：${recordData.count}`;

    const noteP = document.createElement('p');
    noteP.textContent = `備考：${recordData.note}`;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', function() {
        if (!confirm('この記録を削除しますか？')) {
            return;
        }

        const index = records.indexOf(recordData);
        records.splice(index, 1);
        saveRecords();
        if (editingRecord === recordData) {
            exitEditMode();
        }
        renderRecords();
    });

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'edit-button';
    editButton.textContent = '編集';
    editButton.addEventListener('click', function() {
        enterEditMode(recordData);
    });

    record.append(dateP, countP, noteP, deleteButton, editButton);
    return record;
}

function renderRecords() {
    recordList.innerHTML = '';
    records.forEach(function(recordData) {
        recordList.appendChild(createRecordElement(recordData));
    });
    renderStats();
    renderChart();
}

function renderStats() {
    const total = records.reduce(function(sum, recordData) {
        const count = Number(recordData.count);
        return sum + (Number.isFinite(count) ? count : 0);
    }, 0);

    const singlePulls = Math.floor(total / SINGLE_PULL_COST);
    const tenPulls = Math.floor(total / TEN_PULL_COST);

    totalCountEl.textContent = `累計獲得数：${total}個`;
    pullEstimateEl.textContent = `ガチャ換算：単発${singlePulls}回分 / 10連${tenPulls}回分`;
}

function renderChart() {
    while (chart.firstChild) {
        chart.removeChild(chart.firstChild);
    }

    const sorted = records
        .slice()
        .sort(function(a, b) {
            return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        });

    let cumulative = 0;
    const points = sorted.map(function(recordData) {
        const count = Number(recordData.count);
        cumulative += Number.isFinite(count) ? count : 0;
        return { date: recordData.date, total: cumulative };
    });

    if (points.length === 0) {
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', '300');
        text.setAttribute('y', '100');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#999');
        text.textContent = '記録がありません';
        chart.appendChild(text);
        return;
    }

    const paddingX = 20;
    const paddingY = 20;
    const width = 600;
    const height = 200;
    const maxTotal = points[points.length - 1].total || 1;

    const coords = points.map(function(point, index) {
        const x = points.length === 1
            ? width / 2
            : paddingX + (index * (width - paddingX * 2)) / (points.length - 1);
        const y = height - paddingY - (point.total / maxTotal) * (height - paddingY * 2);
        return { x: x, y: y };
    });

    const polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('points', coords.map(function(c) { return `${c.x},${c.y}`; }).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#8b4513');
    polyline.setAttribute('stroke-width', '2');
    chart.appendChild(polyline);

    coords.forEach(function(c) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', c.x);
        circle.setAttribute('cy', c.y);
        circle.setAttribute('r', '3');
        circle.setAttribute('fill', '#8b4513');
        chart.appendChild(circle);
    });
}

function enterEditMode(recordData) {
    editingRecord = recordData;
    form.elements['date'].value = recordData.date;
    form.elements['count'].value = recordData.count;
    form.elements['notes'].value = recordData.note;
    submitButton.textContent = '更新する';
    cancelEditButton.hidden = false;
    form.elements['date'].focus();
}

function exitEditMode() {
    editingRecord = null;
    form.reset();
    submitButton.textContent = '記録する';
    cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener('click', exitEditMode);

exportButton.addEventListener('click', function() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `廻珠記録_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
});

importInput.addEventListener('change', function() {
    const file = importInput.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function() {
        let imported;
        try {
            imported = JSON.parse(reader.result);
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
            importInput.value = '';
            return;
        }

        if (!Array.isArray(imported)) {
            alert('ファイルの形式が正しくありません。');
            importInput.value = '';
            return;
        }

        const validRecords = imported.filter(function(item) {
            return item && typeof item === 'object' && 'date' in item && 'count' in item;
        }).map(function(item) {
            return { date: item.date, count: item.count, note: item.note || '' };
        });

        records = records.concat(validRecords);
        saveRecords();
        renderRecords();
        importInput.value = '';
        alert(`${validRecords.length}件の記録をインポートしました！`);
    };
    reader.readAsText(file);
});

renderRecords();

// フォーム送信
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const date = form.elements['date'].value;
    const count = form.elements['count'].value;
    const note = form.elements['notes'].value;

    if (editingRecord) {
        editingRecord.date = date;
        editingRecord.count = count;
        editingRecord.note = note;
        saveRecords();
        exitEditMode();
        renderRecords();
        alert('記録を更新しました！');
    } else {
        records.push({ date: date, count: count, note: note });
        saveRecords();
        renderRecords();
        form.reset();
        alert('フォームが送信されました！');
    }
});
