const form = document.getElementById('kiroku-form');
const recordList = document.getElementById('record-list');

const savedRecords = localStorage.getItem('records');
let records = [];

if (savedRecords) {
    try {
        records = JSON.parse(savedRecords);
    } catch (error) {
        localStorage.removeItem('records');
    }
}

// 保存されている記録を表示
records.forEach(function(recordData) {
    const record = document.createElement('div');
    record.className = 'record';

    record.innerHTML = `
        <p>日付：${recordData.date}</p>
        <p>廻珠数：${recordData.count}</p>
        <p>備考：${recordData.note}</p>
        <button class="delete-button">削除</button>
        <button class="edit-button">編集</button>
    `;

    recordList.appendChild(record);

    const deleteButton = record.querySelector('.delete-button');

    deleteButton.addEventListener('click', function() {
        record.remove();

        const index = records.indexOf(recordData);
        records.splice(index, 1);

        localStorage.setItem('records', JSON.stringify(records));
    });
});


// フォーム送信
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const date = form.elements['date'].value;
    const count = form.elements['count'].value;
    const note = form.elements['notes'].value;

    const recordData = {
        date: date,
        count: count,
        note: note
    };

    records.push(recordData);

    const record = document.createElement('div');
    record.className = 'record';

    record.innerHTML = `
        <p>日付：${date}</p>
        <p>廻珠数：${count}</p>
        <p>備考：${note}</p>
        <button class="delete-button">削除</button>
        <button class="edit-button">編集</button>
    `;

    recordList.appendChild(record);

    const deleteButton = record.querySelector('.delete-button');
    const editButton = record.querySelector('.edit-button');

    deleteButton.addEventListener('click', function() {
        record.remove();

        const index = records.indexOf(recordData);
        records.splice(index, 1);

        localStorage.setItem('records', JSON.stringify(records));
    });

    form.reset();

    localStorage.setItem('records', JSON.stringify(records));

    alert('フォームが送信されました！');
});