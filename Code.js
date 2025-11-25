function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Web App 入口
 * - 使用 Index.html 作為模板
 * - 把 getAllData() 的結果塞進 template.initialData
 */
function doGet() {
  const t = HtmlService.createTemplateFromFile('index'); // 注意大小寫要跟檔名一致

  // 把所有資料一次塞進去，前端用 window.INITIAL_DATA 接
  t.initialData = getAllData();

  return t
    .evaluate()
    .setTitle('我的旅遊行程')
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    );
}

/* =========================================
   資料讀取功能（照原生版邏輯，但一次回傳）
   ========================================= */

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. events 分頁 (行程)
  const eventSheet = ss.getSheetByName('events');
  let events = [];
  if (eventSheet) {
    const rows = eventSheet.getDataRange().getDisplayValues();
    // A=id, B=day_title, C=time, D=title, E=place, F=note, G=move_time, H=date_label
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue; // 跳過空 ID
      events.push({
        id: rows[i][0],
        day_title: rows[i][1],
        time: rows[i][2],
        title: rows[i][3],
        place: rows[i][4],
        note: rows[i][5],
        move_time: rows[i][6],
        date_label: rows[i][7],
      });
    }
  }

  // 2. packing 分頁 (行李清單)
  const packSheet = ss.getSheetByName('packing');
  let packing = [];
  if (packSheet) {
    const rows = packSheet.getDataRange().getDisplayValues();
    // A=id, B=category, C=item, D=checked
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      packing.push({
        id: rows[i][0],
        category: rows[i][1],
        item: rows[i][2],
        checked: rows[i][3] === 'TRUE',
      });
    }
  }

  // 3. expenses 分頁 (記帳)
  const expSheet = ss.getSheetByName('expenses');
  let expenses = [];
  if (expSheet) {
    const rows = expSheet.getDataRange().getDisplayValues();
    // A=id, B=date, C=title, D=amount
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      expenses.push({
        id: rows[i][0],
        date: rows[i][1],
        title: rows[i][2],
        amount: parseFloat(rows[i][3]) || 0,
      });
    }
  }

  // 4. flights 分頁 (航班)
  const fltSheet = ss.getSheetByName('flights');
  let flights = [];
  if (fltSheet) {
    const rowsF = fltSheet.getDataRange().getDisplayValues();
    // A=id, B=date, C=segment, D=flight_no, E=time, F=note
    for (let i = 1; i < rowsF.length; i++) {
      if (!rowsF[i][0]) continue;
      flights.push({
        id: rowsF[i][0],
        date: rowsF[i][1],
        segment: rowsF[i][2],
        flight_no: rowsF[i][3],
        time: rowsF[i][4],
        note: rowsF[i][5],
      });
    }
  }

  // 5. landmarks 分頁 (地標)
  const lmSheet = ss.getSheetByName('landmarks');
  let landmarks = [];
  if (lmSheet) {
    const rowsL = lmSheet.getDataRange().getDisplayValues();
    // A=name, B=lat, C=type, D=lng, E=note
    for (let i = 1; i < rowsL.length; i++) {
      if (!rowsL[i][0]) continue;
      landmarks.push({
        id: i,                  // 用列號當 id 就好，前端只拿來辨識
        name: rowsL[i][0],      // 地點名稱
        lat: rowsL[i][1],       // 緯度
        type: rowsL[i][2],      // 類型
        lng: rowsL[i][3],       // 經度
        note: rowsL[i][4],      // 備註
      });
    }
  }

  return {
    events: events,
    packing: packing,
    expenses: expenses,
    flights: flights,
    landmarks: landmarks,
    success: true,
  };
}

/* =========================================
   行程編輯（跟原生版一致）
   ========================================= */

function saveEventData(id, title, time, place, note) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('events');
    const data = sheet.getDataRange().getDisplayValues();

    // 尋找對應 ID 的列
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // D=Title(Col 4), C=Time(Col 3), E=Place(Col 5), F=Note(Col 6)
        sheet.getRange(i + 1, 4).setValue(title);
        sheet.getRange(i + 1, 3).setValue(time);
        sheet.getRange(i + 1, 5).setValue(place);
        sheet.getRange(i + 1, 6).setValue(note);
        return { success: true };
      }
    }
    return { success: false, error: 'ID not found' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/* =========================================
   行李清單勾選
   ========================================= */

function togglePackingStatus(id, checked) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('packing');
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // D=Checked (Col 4)
        sheet.getRange(i + 1, 4).setValue(checked ? 'TRUE' : 'FALSE');
        return { success: true };
      }
    }
    return { success: false, error: 'ID not found' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/* =========================================
   新增記帳
   ========================================= */

function addExpenseItem(title, amount) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('expenses');
    if (!sheet) return { success: false, error: 'Sheet not found' };

    const id = new Date().getTime();
    const date = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm'
    );

    // A=id, B=date, C=title, D=amount
    sheet.appendRow([id, date, title, amount]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}