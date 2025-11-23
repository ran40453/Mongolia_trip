// Code.gs

const CONFIG = {
  sheetNames: {
    events: 'events',
    landmarks: 'landmarks',
    flights: 'flights',   // 你之後可以在同一份 Sheet 新增
    packing: 'packing',   // 物品清單
    expenses: 'expenses', // 花費紀錄
  }
};

// 主入口：發 HTML
function doGet(e) {
  const tpl = HtmlService.createTemplateFromFile('index');
  // 可預先載入資料，也可以前端再 call
  tpl.initialData = getInitialData();
  return tpl.evaluate()
    .setTitle('內蒙行程')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// include 用來把 css/js partials 插進 index.html
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 一次把所有分頁資料丟給前端
function getInitialData() {
  return {
    events: getEvents(),
    landmarks: getLandmarks(),
    flights: getFlights(),
    packing: getPacking(),
    expenses: getExpenses(),
  };
}

// 讀 events 表：每列都是一個行程節點
function getEvents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.events);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0];
  const rows = values.slice(1);

  const idx = (name) => header.indexOf(name);

  const res = rows.map((row, i) => ({
    rowIndex: i + 2, // 真實 row，之後更新用
    dayIndex: row[idx('day_index')],
    date: row[idx('date')],
    dateLabel: row[idx('date_label')],
    dayTitle: row[idx('day_title')],
    seq: row[idx('seq')],
    time: row[idx('time')],
    title: row[idx('title')],
    place: row[idx('place')],
    moveTime: row[idx('move_time')],
    note: row[idx('note')],
  }));

  return res;
}

function getLandmarks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.landmarks);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0];
  const rows = values.slice(1);
  const idx = (name) => header.indexOf(name);

  return rows.map((row, i) => ({
    rowIndex: i + 2,
    name: row[idx('名稱')],
    type: row[idx('類型')],
    lat: row[idx('緯度')],
    lng: row[idx('經度')],
    memo: row[idx('備註')],
  }));
}

// 航班：你可以在 Sheet 新增 flights 分頁，欄位例如：date, from, to, flight_no, time, note
function getFlights() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.flights);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const rows = values.slice(1);
  const idx = (name) => header.indexOf(name);

  return rows.map((row, i) => ({
    rowIndex: i + 2,
    date: row[idx('date')],
    segment: row[idx('segment')],   // ex: TPE → PEK
    flightNo: row[idx('flight_no')],
    time: row[idx('time')],         // ex: 18:45–22:20
    note: row[idx('note')],
  }));
}

// 物品清單：packing 表建議欄位：category, item, required(是/否), packed(是/否), memo
function getPacking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.packing);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const rows = values.slice(1);
  const idx = (name) => header.indexOf(name);

  return rows.map((row, i) => ({
    rowIndex: i + 2,
    category: row[idx('category')],
    item: row[idx('item')],
    required: row[idx('required')],
    packed: row[idx('packed')],
    memo: row[idx('memo')],
  }));
}

// 花費：expenses 建議欄位：date, category, desc, amount, currency, paid_by, memo
function getExpenses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.expenses);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const rows = values.slice(1);
  const idx = (name) => header.indexOf(name);

  return rows.map((row, i) => ({
    rowIndex: i + 2,
    date: row[idx('date')],
    category: row[idx('category')],
    desc: row[idx('desc')],
    amount: row[idx('amount')],
    currency: row[idx('currency')],
    paidBy: row[idx('paid_by')],
    memo: row[idx('memo')],
  }));
}

/**
 * 更新單一行程節點（在手機上編輯）
 * data = { rowIndex, time, title, place, moveTime, note }
 */
function updateEvent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.events);
  if (!sh) throw new Error('events sheet not found');

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  const colTime = header.indexOf('time') + 1;
  const colTitle = header.indexOf('title') + 1;
  const colPlace = header.indexOf('place') + 1;
  const colMove = header.indexOf('move_time') + 1;
  const colNote = header.indexOf('note') + 1;

  const r = data.rowIndex;
  if (r < 2) throw new Error('invalid row index');

  if (data.time !== undefined) sh.getRange(r, colTime).setValue(data.time);
  if (data.title !== undefined) sh.getRange(r, colTitle).setValue(data.title);
  if (data.place !== undefined) sh.getRange(r, colPlace).setValue(data.place);
  if (data.moveTime !== undefined) sh.getRange(r, colMove).setValue(data.moveTime);
  if (data.note !== undefined) sh.getRange(r, colNote).setValue(data.note);

  return true;
}

/**
 * 更新物品清單勾選狀態（packed）
 */
function updatePackingItem(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.packing);
  if (!sh) throw new Error('packing sheet not found');

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const colPacked = header.indexOf('packed') + 1;
  const r = data.rowIndex;
  if (r < 2) throw new Error('invalid row index');

  sh.getRange(r, colPacked).setValue(data.packed);
  return true;
}

/**
 * 新增一筆花費
 */
function addExpense(expense) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.sheetNames.expenses);
  if (!sh) throw new Error('expenses sheet not found');

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const cols = ['date', 'category', 'desc', 'amount', 'currency', 'paid_by', 'memo'];

  const row = cols.map(col => expense[col] || '');
  sh.appendRow(row);
  return true;
}