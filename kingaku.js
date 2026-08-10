const form = document.getElementById('kingaku-form');
const recordList = document.getElementById('record-list');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const totalAmountEl = document.getElementById('total-amount');
const monthAmountEl = document.getElementById('month-amount');
const chart = document.getElementById('chart');
const exportButton = document.getElementById('export-button');
const importInput = document.getElementById('import-input');

const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'kingakuRecords';

function getTodayDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatYen(amount) {
    const value = Number(amount);
    return `¥${(Number.isFinite(value) ? value : 0).toLocaleString('ja-JP')}`;
}

const savedRecords = localStorage.getItem(STORAGE_KEY);
let records = [];

if (savedRecords) {
    try {
        records = JSON.parse(savedRecords);
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
    }
}

let editingRecord = null;

function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function createRecordElement(recordData) {
    const record = document.createElement('div');
    record.className = 'record';

    const main = document.createElement('div');
    main.className = 'record-main';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'record-date';
    dateSpan.textContent = recordData.date;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'record-count';
    amountSpan.textContent = formatYen(recordData.amount);

    main.append(dateSpan, amountSpan);

    const noteP = document.createElement('p');
    noteP.className = 'record-note';
    noteP.textContent = recordData.note;

    const actions = document.createElement('div');
    actions.className = 'record-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'edit-button';
    editButton.textContent = '編集';
    editButton.addEventListener('click', function() {
        enterEditMode(recordData);
    });

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

    actions.append(editButton, deleteButton);
    record.append(main, noteP, actions);
    return record;
}

function renderRecords() {
    recordList.innerHTML = '';

    if (records.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-message';
        empty.textContent = 'まだ記録がありません。上のフォームから記録してみましょう。';
        recordList.appendChild(empty);
    } else {
        records.forEach(function(recordData) {
            recordList.appendChild(createRecordElement(recordData));
        });
    }

    renderStats();
    renderChart();
}

function getSortedCumulativePoints() {
    const sorted = records.slice().sort(function(a, b) {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });

    let cumulative = 0;
    return sorted.map(function(recordData) {
        const amount = Number(recordData.amount);
        cumulative += Number.isFinite(amount) ? amount : 0;
        return { date: recordData.date, total: cumulative };
    });
}

function renderStats() {
    const total = records.reduce(function(sum, recordData) {
        const amount = Number(recordData.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const currentMonthPrefix = getTodayDateString().slice(0, 7);
    const monthTotal = records.reduce(function(sum, recordData) {
        if (typeof recordData.date !== 'string' || !recordData.date.startsWith(currentMonthPrefix)) {
            return sum;
        }
        const amount = Number(recordData.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    totalAmountEl.textContent = formatYen(total);
    monthAmountEl.textContent = formatYen(monthTotal);
}

function renderChart() {
    while (chart.firstChild) {
        chart.removeChild(chart.firstChild);
    }

    const points = getSortedCumulativePoints();

    if (points.length === 0) {
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', '300');
        text.setAttribute('y', '110');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'chart-empty');
        text.textContent = '記録がありません';
        chart.appendChild(text);
        return;
    }

    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const maxTotal = points[points.length - 1].total || 1;

    const coords = points.map(function(point, index) {
        const x = points.length === 1
            ? paddingLeft + plotWidth / 2
            : paddingLeft + (index * plotWidth) / (points.length - 1);
        const y = paddingTop + plotHeight - (point.total / maxTotal) * plotHeight;
        return { x: x, y: y, point: point };
    });

    [0, 0.5, 1].forEach(function(ratio) {
        const y = paddingTop + plotHeight - ratio * plotHeight;

        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', paddingLeft);
        line.setAttribute('x2', width - paddingRight);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'chart-axis');
        chart.appendChild(line);

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', paddingLeft - 8);
        label.setAttribute('y', y + 4);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('class', 'chart-axis-label');
        label.textContent = formatYen(Math.round(maxTotal * ratio));
        chart.appendChild(label);
    });

    const areaPoints = [`${coords[0].x},${paddingTop + plotHeight}`]
        .concat(coords.map(function(c) { return `${c.x},${c.y}`; }))
        .concat([`${coords[coords.length - 1].x},${paddingTop + plotHeight}`]);
    const area = document.createElementNS(SVG_NS, 'polygon');
    area.setAttribute('points', areaPoints.join(' '));
    area.setAttribute('fill', 'rgba(139, 69, 19, 0.08)');
    area.setAttribute('stroke', 'none');
    chart.appendChild(area);

    const polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('points', coords.map(function(c) { return `${c.x},${c.y}`; }).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#8b4513');
    polyline.setAttribute('stroke-width', '2');
    chart.appendChild(polyline);

    coords.forEach(function(c, index) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', c.x);
        circle.setAttribute('cy', c.y);
        circle.setAttribute('r', '3.5');
        circle.setAttribute('fill', '#8b4513');
        circle.appendChild(makeTitle(`${c.point.date}：累計${formatYen(c.point.total)}`));
        chart.appendChild(circle);

        if (index === 0 || index === coords.length - 1) {
            const dateLabel = document.createElementNS(SVG_NS, 'text');
            dateLabel.setAttribute('x', c.x);
            dateLabel.setAttribute('y', height - 8);
            dateLabel.setAttribute('text-anchor', index === 0 ? 'start' : 'end');
            dateLabel.setAttribute('class', 'chart-axis-label');
            dateLabel.textContent = c.point.date;
            chart.appendChild(dateLabel);
        }
    });
}

function makeTitle(text) {
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = text;
    return title;
}

function enterEditMode(recordData) {
    editingRecord = recordData;
    form.elements['date'].value = recordData.date;
    form.elements['amount'].value = recordData.amount;
    form.elements['notes'].value = recordData.note;
    submitButton.textContent = '更新する';
    cancelEditButton.hidden = false;
    form.elements['date'].focus();
}

function exitEditMode() {
    editingRecord = null;
    form.reset();
    form.elements['date'].value = getTodayDateString();
    submitButton.textContent = '記録する';
    cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener('click', exitEditMode);

exportButton.addEventListener('click', function() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `課金額記録_${new Date().toISOString().slice(0, 10)}.json`;
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
            return item && typeof item === 'object' && 'date' in item && 'amount' in item;
        }).map(function(item) {
            return { date: item.date, amount: item.amount, note: item.note || '' };
        });

        records = records.concat(validRecords);
        saveRecords();
        renderRecords();
        importInput.value = '';
        alert(`${validRecords.length}件の記録をインポートしました！`);
    };
    reader.readAsText(file);
});

form.elements['date'].value = getTodayDateString();
renderRecords();

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const date = form.elements['date'].value;
    const amount = form.elements['amount'].value;
    const note = form.elements['notes'].value;

    if (editingRecord) {
        editingRecord.date = date;
        editingRecord.amount = amount;
        editingRecord.note = note;
        saveRecords();
        exitEditMode();
        renderRecords();
        alert('記録を更新しました！');
    } else {
        records.push({ date: date, amount: amount, note: note });
        saveRecords();
        renderRecords();
        form.reset();
        form.elements['date'].value = getTodayDateString();
        alert('フォームが送信されました！');
    }
});
