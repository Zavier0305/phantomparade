const form = document.getElementById('kiroku-form');
const recordList = document.getElementById('record-list');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');

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
