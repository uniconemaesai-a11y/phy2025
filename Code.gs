
// @ts-nocheck
// =======================================================
//  CLASSROOM MANAGEMENT SYSTEM - MASTER BACKEND
//  Version: Full Production (All Systems)
//  Features: Auto-Schema, Full CRUD, Telegram Alerts, Quiz System
// =======================================================

// --- 1. CONFIGURATION (การตั้งค่า) ---

// 1.1 ID ของ Google Sheet (เปลี่ยนเป็น ID ของไฟล์คุณ)
const SPREADSHEET_ID = '192jkPyqJHzlvaTqsI_zYW1z6exjoLBopwAz3NbGyxvc'; 

// 1.2 ตั้งค่า TELEGRAM (ใส่ Token และ Chat ID ของคุณ)
const TELEGRAM_BOT_TOKEN = '8331424730:AAFSQohH5QXg380flhcLyW_xupp8eppGyro';
const TELEGRAM_CHAT_ID = '-1003596963057';

// --- 2. DATABASE SCHEMAS (โครงสร้างฐานข้อมูล) ---
// ระบบจะสร้าง Sheet เหล่านี้ให้เองถ้ายงไม่มี
const SHEET_SCHEMAS = {
  'Users': ['id', 'username', 'password', 'name', 'role', 'classroom'],
  'Students': ['id', 'studentId', 'name', 'gradeLevel', 'classroom'],
  'Assignments': ['id', 'title', 'type', 'gradeLevel', 'maxScore', 'dueDate', 'classrooms', 'status'],
  'Scores': ['assignmentId', 'studentId', 'score', 'status', 'feedback'],
  'Attendance': ['id', 'studentId', 'date', 'status', 'reason'],
  'HealthRecords': ['id', 'studentId', 'date', 'weight', 'height', 'bmi', 'interpretation'],
  'Announcements': ['id', 'title', 'content', 'gradeLevel', 'date', 'type'],
  'Quizzes': ['id', 'title', 'unit', 'gradeLevel', 'questions', 'timeLimit', 'totalScore', 'status', 'createdDate'],
  'QuizResults': ['id', 'studentId', 'quizId', 'score', 'totalScore', 'submittedAt', 'answers']
};

// --- 3. MAIN HANDLERS (ส่วนรับคำสั่ง API) ---

function doGet(e) {
  return ContentService.createTextOutput("Health & PE Score System API is active.");
}

function doPost(e) {
  // รับข้อมูล JSON จาก Frontend (React)
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput("No Content");
  }

  const contents = JSON.parse(e.postData.contents);
  return handleRequest(e, contents);
}

// --- 4. REQUEST CONTROLLER (ตัวจัดการคำสั่ง) ---

function handleRequest(e, data) {
  const lock = LockService.getScriptLock();
  // รอคิวได้นานสุด 30 วินาที เพื่อป้องกันข้อมูลชนกัน
  if (!lock.tryLock(30000)) { 
     return createJSONOutput({ status: 'error', message: 'Server is busy, please try again.' });
  }

  try {
    const action = data.action;
    const payload = data.payload;
    let result = {};

    // ตรวจสอบและสร้างฐานข้อมูลอัตโนมัติ (ถ้ายังไม่มี)
    ensureDatabaseStructure(); 

    // ===========================
    //      ROUTING LOGIC
    // ===========================

    // --- AUTHENTICATION ---
    if (action === 'login') {
      result = loginUser(data.username, data.password, data.role);
    
    // --- DATA FETCHING ---
    } else if (action === 'getData') {
      result = getAllData();
    
    // --- ASSIGNMENTS (จัดการชิ้นงาน) ---
    } else if (action === 'addAssignment') {
      result = addData('Assignments', payload);
      sendTelegramMessage(`📢 <b>สั่งงานใหม่</b>\n📚 ${payload.title}\nระดับ: ป.${payload.gradeLevel}\nกำหนดส่ง: ${payload.dueDate}`);
    
    } else if (action === 'deleteAssignment') {
      result = deleteData('Assignments', data.id);
    
    // --- SCORES (จัดการคะแนน) ---
    } else if (action === 'updateScore') {
      result = updateScoreData(payload);
    
    } else if (action === 'updateScoreBulk') {
      if (Array.isArray(payload)) {
         payload.forEach(score => updateScoreData(score));
         result = { status: 'success', message: 'Bulk update complete' };
      }

    // --- STUDENTS (จัดการนักเรียน) ---
    } else if (action === 'addStudent') {
      result = addData('Students', payload);
      sendTelegramMessage(`🆕 <b>เพิ่มนักเรียนใหม่:</b> ${payload.name}\nรหัส: ${payload.studentId}\nห้อง: ${payload.classroom}`);
    
    } else if (action === 'updateStudent') {
      result = updateStudentData(payload);
    
    } else if (action === 'deleteStudent') {
      result = deleteData('Students', data.id);

    // --- ATTENDANCE (เช็คชื่อ) ---
    } else if (action === 'markAttendance') {
      result = markAttendanceData(payload);
      // แจ้งเตือนเฉพาะกรณีขาดเรียน
      if (payload.status === 'missing') {
          sendTelegramMessage(`❌ <b>แจ้งขาดเรียน:</b> ${payload.studentId}\nวันที่: ${payload.date}`);
      }
    
    } else if (action === 'markAttendanceBulk') {
      result = markAttendanceBulk(payload);

    // --- HEALTH (ข้อมูลสุขภาพ) ---
    } else if (action === 'updateHealthRecord') {
      result = updateHealthRecord(payload);
      // แจ้งเตือนหากผลประเมินมีความเสี่ยง
      if (['เริ่มอ้วน', 'อ้วน', 'ผอม'].includes(payload.interpretation)) {
          sendTelegramMessage(`🏥 <b>แจ้งเตือนสุขภาพ:</b> ${payload.studentId}\nผล: ${payload.interpretation} (BMI: ${payload.bmi})`);
      }

    // --- ANNOUNCEMENTS (ประกาศ) ---
    } else if (action === 'addAnnouncement') {
      result = addData('Announcements', payload);
      if (payload.type === 'urgent') {
          sendTelegramMessage(`🔥 <b>ประกาศด่วน:</b> ${payload.title}\n${payload.content}`);
      }

    // --- QUIZZES (ระบบข้อสอบ) ---
    } else if (action === 'addQuiz') {
      
      // แปลง questions object/array เป็น string ก่อนบันทึก
      let questionsString = "[]";
      if (payload.questions) {
          if (typeof payload.questions === 'object') {
              questionsString = JSON.stringify(payload.questions);
          } else {
              questionsString = String(payload.questions);
          }
      }

      const quizData = {
          id: payload.id,
          title: payload.title,
          unit: payload.unit,
          gradeLevel: payload.gradeLevel,
          questions: questionsString,
          timeLimit: payload.timeLimit,
          totalScore: payload.totalScore,
          status: payload.status || 'published',
          createdDate: payload.createdDate || new Date().toISOString().split('T')[0]
      };

      result = addData('Quizzes', quizData);
      sendTelegramMessage(`📝 <b>ข้อสอบใหม่:</b> ${payload.title}\nระดับ: ป.${payload.gradeLevel} (${payload.totalScore} คะแนน)`);
    
    } else if (action === 'deleteQuiz') {
      result = deleteData('Quizzes', data.id);

    // --- QUIZ RESULTS (ส่งคำตอบ) ---
    } else if (action === 'submitQuiz') {
      // แปลงคำตอบเป็น string JSON
      const resultData = {
          ...payload,
          answers: JSON.stringify(payload.answers || {})
      };
      result = addData('QuizResults', resultData);
      
      // คำนวณผลและแจ้งเตือน
      let emoji = '✅';
      let statusMsg = '';
      const score = Number(payload.score);
      const total = Number(payload.totalScore);
      const percent = (score / total) * 100;

      if (score === total) {
          emoji = '🏆';
          statusMsg = ' (สุดยอด! เต็ม)';
      } else if (percent < 50) {
          emoji = '⚠️';
          statusMsg = ' (ต้องพยายามอีกนิด)';
      }

      sendTelegramMessage(`${emoji} <b>นักเรียนส่งข้อสอบ:</b> ${payload.studentId}\nวิชา: ${payload.quizId}\nได้คะแนน: ${score} / ${total}${statusMsg}`);
    }

    return createJSONOutput(result);

  } catch (error) {
    try {
       sendTelegramMessage(`☠️ <b>System Error:</b> ${error.toString()}`);
    } catch(e) {}
    return createJSONOutput({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- 5. CORE DATABASE FUNCTIONS (ฟังก์ชันจัดการ Sheet) ---

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// สร้าง Sheet และ Header ให้อัตโนมัติ
function ensureDatabaseStructure() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SHEET_SCHEMAS[sheetName]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, SHEET_SCHEMAS[sheetName].length).setFontWeight("bold").setBackground("#efefef");
    }
  });
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (SHEET_SCHEMAS[name]) {
        sheet.appendRow(SHEET_SCHEMAS[name]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, SHEET_SCHEMAS[name].length).setFontWeight("bold");
    }
  }
  return sheet;
}

function getDataFromSheet(sheetName) {
  const sheet = getSheet(sheetName);
  if (sheet.getLastRow() < 2) return [];

  const range = sheet.getDataRange();
  const values = range.getValues();            
  const displayValues = range.getDisplayValues(); 

  const headers = values[0];
  
  const result = [];
  for (let i = 1; i < values.length; i++) {
    let obj = {};
    const row = values[i];
    const displayRow = displayValues[i];

    headers.forEach((header, index) => {
      let value = row[index];
      
      // บังคับให้ Classroom เป็น String เสมอ (ป้องกัน 5/1 กลายเป็นวันที่)
      if (header === 'classroom' || header === 'classrooms') {
         value = displayRow[index];
         if (typeof value === 'string' && value.startsWith("'")) {
             value = value.substring(1);
         }
      }

      // ถ้าค่าเป็น JSON String ให้แปลงกลับเป็น Object
      if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
         try { value = JSON.parse(value); } catch(e) {}
      }
      obj[header] = value;
    });
    result.push(obj);
  }
  return result;
}

function addData(sheetName, payload) {
  const sheet = getSheet(sheetName);
  const schema = SHEET_SCHEMAS[sheetName];

  if (!schema) return { status: 'error', message: 'Schema not defined' };
  
  // Header Check
  if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, schema.length).setFontWeight("bold");
  }

  const row = schema.map(key => {
    let cellData = payload[key];
    
    if (key === 'classroom') {
        cellData = "'" + cellData; // Force String
    }

    if (cellData && (typeof cellData === 'object' || Array.isArray(cellData))) {
       return JSON.stringify(cellData);
    }
    return cellData !== undefined ? cellData : '';
  });
  
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  
  return { status: 'success', id: payload.id };
}

function deleteData(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { 
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

// --- 6. BUSINESS LOGIC FUNCTIONS ---

function getAllData() {
  const response = { status: 'success' };
  Object.keys(SHEET_SCHEMAS).forEach(key => {
     if (key !== 'Users') { 
        const keyName = key.charAt(0).toLowerCase() + key.slice(1);
        response[keyName] = getDataFromSheet(key);
     }
  });
  return response;
}

function loginUser(username, password, role) {
  if (role === 'TEACHER') {
    const users = getDataFromSheet('Users');
    const user = users.find(u => String(u.username) === String(username));

    if (user && String(user.password) === String(password) && user.role === 'TEACHER') {
      const { password, ...safeUser } = user;
      sendTelegramMessage(`🔐 <b>Login (ครู):</b> ${safeUser.name}`);
      return { status: 'success', user: safeUser };
    }
    return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านครูไม่ถูกต้อง' };

  } else {
    const students = getDataFromSheet('Students');
    const student = students.find(s => String(s.studentId) === String(username));

    if (student) {
      const studentUser = { ...student, role: 'STUDENT' };
      sendTelegramMessage(`🎓 <b>นักเรียนเข้าใช้งาน:</b> ${student.name} (${student.classroom})`);
      return { status: 'success', user: studentUser };
    }
    return { status: 'error', message: 'ไม่พบรหัสนักเรียนนี้' };
  }
}

function updateStudentData(payload) {
  const sheet = getSheet('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
     if (String(data[i][0]) === String(payload.id)) {
        headers.forEach((h, idx) => { 
           if (payload[h] !== undefined) {
              let val = payload[h];
              if (h === 'classroom') val = "'" + val; 
              sheet.getRange(i + 1, idx + 1).setValue(val);
           }
        });
        return { status: 'success' };
     }
  }
  return { status: 'error', message: 'Student not found' };
}

function updateScoreData(payload) {
  const sheet = getSheet('Scores');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let rowIndex = -1;
  // ค้นหาแถวที่ตรงกับ (assignmentId + studentId)
  for(let i=1; i<data.length; i++) {
    if (String(data[i][headers.indexOf('assignmentId')]) === String(payload.assignmentId) &&
        String(data[i][headers.indexOf('studentId')]) === String(payload.studentId)) {
        rowIndex = i + 1; break;
    }
  }

  if (rowIndex > 0) {
    headers.forEach((h, i) => { if (payload[h] !== undefined) sheet.getRange(rowIndex, i + 1).setValue(payload[h]); });
  } else {
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  }
  return { status: 'success' };
}

function markAttendanceData(payload) {
  const sheet = getSheet('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let rowIndex = -1;
  
  for(let i=1; i<data.length; i++) {
     if (String(data[i][headers.indexOf('studentId')]) === String(payload.studentId) &&
         String(data[i][headers.indexOf('date')]) === String(payload.date)) {
         rowIndex = i + 1; break;
     }
  }
  
  if (rowIndex > 0) {
    headers.forEach((h, i) => { if (payload[h] !== undefined) sheet.getRange(rowIndex, i + 1).setValue(payload[h]); });
  } else {
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  }
  return { status: 'success' };
}

function markAttendanceBulk(payloadArray) {
  const sheet = getSheet('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const indexMap = new Map();
  const sIdx = headers.indexOf('studentId');
  const dIdx = headers.indexOf('date');
  
  // Map Existing Rows
  for(let i=1; i<data.length; i++) indexMap.set(String(data[i][sIdx]) + "_" + String(data[i][dIdx]), i + 1);

  payloadArray.forEach(p => {
     const key = String(p.studentId) + "_" + String(p.date);
     if (indexMap.has(key)) {
       const r = indexMap.get(key);
       headers.forEach((h, i) => { if (p[h] !== undefined) sheet.getRange(r, i + 1).setValue(p[h]); });
     } else {
       sheet.appendRow(headers.map(h => p[h] !== undefined ? p[h] : ''));
     }
  });

  if (payloadArray.length > 0) {
     const pCount = payloadArray.filter(p => String(p.status).toLowerCase().includes('present')).length;
     const lCount = payloadArray.filter(p => String(p.status).toLowerCase().includes('late')).length;
     const mCount = payloadArray.length - pCount - lCount;

     // ดึงข้อมูลห้องเรียนมาแสดงใน Telegram
     let classroomInfo = "";
     try {
        const students = getDataFromSheet('Students');
        const sampleId = String(payloadArray[0].studentId);
        const student = students.find(s => String(s.id) === sampleId || String(s.studentId) === sampleId);
        if (student && student.classroom) {
             classroomInfo = `\n🏫 <b>ห้อง: ${student.classroom.replace(/^'/, '')}</b>`;
        }
     } catch(e) {}

     sendTelegramMessage(`⏱ <b>เช็คชื่อ (${payloadArray[0].date})</b>${classroomInfo}\n✅ มา: ${pCount}\n⚠️ สาย: ${lCount}\n❌ ขาด: ${mCount}`);
  }
  return { status: 'success' };
}

function updateHealthRecord(payload) {
  const sheet = getSheet('HealthRecords');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let rowIndex = -1;
  
  for(let i=1; i<data.length; i++) {
     if (String(data[i][headers.indexOf('studentId')]) === String(payload.studentId) &&
         String(data[i][headers.indexOf('date')]) === String(payload.date)) {
         rowIndex = i + 1; break;
     }
  }
  
  if (rowIndex > 0) {
    headers.forEach((h, i) => { if (payload[h] !== undefined) sheet.getRange(rowIndex, i + 1).setValue(payload[h]); });
  } else {
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  }
  return { status: 'success' };
}

// --- 7. TELEGRAM HELPER ---

function sendTelegramMessage(text, targetChatId) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const chatId = targetChatId || TELEGRAM_CHAT_ID;
  if (!chatId) return;

  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify({ 'chat_id': chatId, 'text': text, 'parse_mode': 'HTML' }),
      'muteHttpExceptions': true
    });
  } catch (e) {
    Logger.log("Telegram Error: " + e.toString());
  }
}
