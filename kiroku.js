const form = document.getElementById('kiroku-form');
const recordList = document.getElementById('record-list');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const totalCountEl = document.getElementById('total-count');
const singlePullCountEl = document.getElementById('single-pull-count');
const tenPullCountEl = document.getElementById('ten-pull-count');
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

    const main = document.createElement('div');
    main.className = 'record-main';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'record-date';
    dateSpan.textContent = recordData.date;

    const countSpan = document.createElement('span');
    countSpan.className = 'record-count';
    countSpan.textContent = `廻珠数：${recordData.count}`;

    main.append(dateSpan, countSpan);

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

function renderStats() {
    const total = records.reduce(function(sum, recordData) {
        const count = Number(recordData.count);
        return sum + (Number.isFinite(count) ? count : 0);
    }, 0);

    totalCountEl.textContent = `${total}個`;
    singlePullCountEl.textContent = `${Math.floor(total / SINGLE_PULL_COST)}回`;
    tenPullCountEl.textContent = `${Math.floor(total / TEN_PULL_COST)}回`;
}

function getSortedCumulativePoints() {
    const sorted = records.slice().sort(function(a, b) {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });

    let cumulative = 0;
    return sorted.map(function(recordData) {
        const count = Number(recordData.count);
        cumulative += Number.isFinite(count) ? count : 0;
        return { date: recordData.date, total: cumulative };
    });
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
    const paddingLeft = 50;
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

    // 横方向のグリッド線とY軸ラベル(0%・50%・100%)
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
        label.textContent = Math.round(maxTotal * ratio);
        chart.appendChild(label);
    });

    // 塗りつぶし(累計の推移を面で見せる)
    const areaPoints = [`${coords[0].x},${paddingTop + plotHeight}`]
        .concat(coords.map(function(c) { return `${c.x},${c.y}`; }))
        .concat([`${coords[coords.length - 1].x},${paddingTop + plotHeight}`]);
    const area = document.createElementNS(SVG_NS, 'polygon');
    area.setAttribute('points', areaPoints.join(' '));
    area.setAttribute('fill', 'rgba(139, 69, 19, 0.15)');
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
        circle.appendChild(makeTitle(`${c.point.date}：累計${c.point.total}個`));
        chart.appendChild(circle);

        // 日付ラベルは最初と最後の点のみ表示(重なり防止)
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
