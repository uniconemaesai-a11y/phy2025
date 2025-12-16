
// @ts-nocheck
// =======================================================
//  CLASSROOM MANAGEMENT SYSTEM - MASTER BACKEND
//  Version: Final Production (JS)
//  Updated: Telegram Notification with Classroom info
// =======================================================

// --- 1. CONFIGURATION (ตั้งค่า) ---
const SPREADSHEET_ID = '192jkPyqJHzlvaTqsI_zYW1z6exjoLBopwAz3NbGyxvc'; 

// *** ตั้งค่า TELEGRAM (สำหรับส่งแจ้งเตือนเท่านั้น) ***
const TELEGRAM_BOT_TOKEN = '8331424730:AAFSQohH5QXg380flhcLyW_xupp8eppGyro';
const TELEGRAM_CHAT_ID = '-1003596963057'; // Default Channel ID for notifications

// --- 2. DATABASE SCHEMAS (โครงสร้างตาราง) ---
// ชื่อคอลัมน์ต้องตรงกับหัวตารางใน Google Sheets เป๊ะๆ
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

// --- 3. MAIN HANDLER (ส่วนรับคำสั่งจากหน้าเว็บ) ---

function doGet(e) {
  return ContentService.createTextOutput("Health & PE Score System API is running.");
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput("No Content");
  }

  const contents = JSON.parse(e.postData.contents);

  // รับ Request จาก React App เท่านั้น (ยกเลิกการรับ Webhook จาก Telegram)
  return handleRequest(e, contents);
}

// --- APP REQUEST LOGIC ---

function handleRequest(e, data) {
  const lock = LockService.getScriptLock();
  // รอคิวได้นานสุด 30 วินาที ป้องกันการชนกันของข้อมูล
  if (!lock.tryLock(30000)) { 
     return createJSONOutput({ status: 'error', message: 'Server is busy, please try again.' });
  }

  try {
    const action = data.action;
    const payload = data.payload;
    
    let result = {};

    ensureDatabaseStructure(); 

    // ===========================
    //      ROUTING LOGIC
    // ===========================

    if (action === 'login') {
      result = loginUser(data.username, data.password, data.role);
    
    } else if (action === 'getData') {
      result = getAllData();
    
    // --- ASSIGNMENTS ---
    } else if (action === 'addAssignment') {
      result = addData('Assignments', payload);
      sendTelegramMessage(`📢 <b>สั่งงานใหม่</b>\n📚 ${payload.title}\nระดับ: ป.${payload.gradeLevel}`);
    
    } else if (action === 'deleteAssignment') {
      result = deleteData('Assignments', data.id);
    
    // --- SCORES ---
    } else if (action === 'updateScore') {
      result = updateScoreData(payload);
    
    } else if (action === 'updateScoreBulk') {
      if (Array.isArray(payload)) {
         payload.forEach(score => updateScoreData(score));
         result = { status: 'success', message: 'Bulk update complete' };
      }

    // --- STUDENTS ---
    } else if (action === 'addStudent') {
      result = addData('Students', payload);
      // New Student Notification
      sendTelegramMessage(`🆕 <b>นักเรียนใหม่:</b> ${payload.name}\nรหัส: ${payload.studentId}\nชั้น: ป.${payload.gradeLevel} ห้อง ${payload.classroom}`);
    
    } else if (action === 'updateStudent') {
      result = updateStudentData(payload);
    
    } else if (action === 'deleteStudent') {
      result = deleteData('Students', data.id);

    // --- ATTENDANCE ---
    } else if (action === 'markAttendance') {
      result = markAttendanceData(payload);
      // Individual Absence Notification
      if (payload.status === 'missing') {
          sendTelegramMessage(`❌ <b>แจ้งขาดเรียน:</b> ${payload.studentId}\nวันที่: ${payload.date}`);
      }
    
    } else if (action === 'markAttendanceBulk') {
      result = markAttendanceBulk(payload);

    // --- HEALTH ---
    } else if (action === 'updateHealthRecord') {
      result = updateHealthRecord(payload);
      // Health Alert Notification
      if (['เริ่มอ้วน', 'อ้วน', 'ผอม'].includes(payload.interpretation)) {
          sendTelegramMessage(`🏥 <b>แจ้งเตือนสุขภาพ:</b> ${payload.studentId}\nผลการประเมิน: ${payload.interpretation}\nBMI: ${payload.bmi}`);
      }

    // --- ANNOUNCEMENTS ---
    } else if (action === 'addAnnouncement') {
      result = addData('Announcements', payload);
      if (payload.type === 'urgent') {
          sendTelegramMessage(`🔥 <b>ประกาศด่วน:</b> ${payload.title}\n${payload.content}`);
      }

    // --- QUIZZES (แก้ไขระบบบันทึกข้อสอบให้รัดกุมที่สุด) ---
    } else if (action === 'addQuiz') {
      
      // 1. ตรวจสอบและแปลง questions เป็น String ให้ชัวร์ที่สุด
      let questionsString = "[]";
      if (payload.questions) {
          if (typeof payload.questions === 'object') {
              questionsString = JSON.stringify(payload.questions);
          } else {
              questionsString = String(payload.questions);
          }
      }

      // 2. เตรียม Object ข้อมูลให้ตรงกับ Schema เป๊ะๆ
      const quizData = {
          id: payload.id,
          title: payload.title,
          unit: payload.unit,
          gradeLevel: payload.gradeLevel,
          questions: questionsString, // บังคับใส่ string
          timeLimit: payload.timeLimit,
          totalScore: payload.totalScore,
          status: payload.status || 'published',
          createdDate: payload.createdDate || new Date().toISOString().split('T')[0]
      };

      result = addData('Quizzes', quizData);
      sendTelegramMessage(`📝 <b>ข้อสอบใหม่:</b> ${payload.title}\nระดับ: ป.${payload.gradeLevel}`);
    
    } else if (action === 'deleteQuiz') {
      result = deleteData('Quizzes', data.id);

    // --- QUIZ RESULTS (ส่งคำตอบ) ---
    } else if (action === 'submitQuiz') {
      // แปลง answers เป็น string ก่อนบันทึก
      const resultData = {
          ...payload,
          answers: JSON.stringify(payload.answers || {})
      };
      result = addData('QuizResults', resultData);
      
      // Advanced Quiz Result Notification
      let emoji = '✅';
      let statusMsg = '';
      const score = Number(payload.score);
      const total = Number(payload.totalScore);
      const percent = (score / total) * 100;

      if (score === total) {
          emoji = '🏆';
          statusMsg = ' (คะแนนเต็ม!)';
      } else if (percent < 50) {
          emoji = '⚠️';
          statusMsg = ' (ควรปรับปรุง)';
      }

      sendTelegramMessage(`${emoji} <b>ส่งข้อสอบ:</b> ${payload.studentId}\nวิชา: ${payload.quizId}\nได้: ${score} / ${total}${statusMsg}`);
    }

    return createJSONOutput(result);

  } catch (error) {
    try {
       sendTelegramMessage(`❌ <b>System Error:</b> ${error.toString()}`);
    } catch(e) {}
    return createJSONOutput({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- 4. CORE DATABASE FUNCTIONS ---

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

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
      sheet.getRange(1, 1, 1, SHEET_SCHEMAS[sheetName].length).setFontWeight("bold");
    }
  });
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // ถ้าสร้าง Sheet ใหม่ ให้ใส่ Header ตาม Schema ทันที
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
      
      // บังคับให้ Classroom เป็น String เสมอ (ป้องกัน Excel แปลงเป็นวันที่)
      if (header === 'classroom' || header === 'classrooms') {
         value = displayRow[index];
         if (typeof value === 'string' && value.startsWith("'")) {
             value = value.substring(1);
         }
      }

      // ตรวจสอบว่าค่าในเซลล์เป็น JSON String หรือไม่ ถ้าใช่ให้แปลงกลับเป็น Object
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

  if (!schema) return { status: 'error', message: 'Schema not defined for ' + sheetName };
  
  // ถ้ายังไม่มี Header ให้สร้างก่อน
  if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, schema.length).setFontWeight("bold");
  }

  // เตรียมข้อมูลทีละคอลัมน์ตามลำดับ Schema
  const row = schema.map(key => {
    let cellData = payload[key];
    
    if (key === 'classroom') {
        cellData = "'" + cellData; // ใส่ ' นำหน้าเพื่อบังคับเป็น Text
    }

    // ถ้าข้อมูลเป็น Object หรือ Array และยังไม่ได้เป็น String ให้แปลงเป็น JSON String
    if (cellData && (typeof cellData === 'object' || Array.isArray(cellData))) {
       return JSON.stringify(cellData);
    }
    return cellData !== undefined ? cellData : '';
  });
  
  sheet.appendRow(row);
  SpreadsheetApp.flush(); // บังคับให้เขียนลง Sheet ทันที
  
  return { status: 'success', id: payload.id };
}

function deleteData(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  // วนลูปหา ID เพื่อลบแถวนั้น
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { 
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

// --- BUSINESS LOGIC ---

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
      // Telegram Notification for Student Login
      sendTelegramMessage(`🎓 <b>เข้าใช้งานระบบ:</b> ${student.name}\n🆔 รหัส: ${student.studentId}\n🏫 ชั้น: ป.${student.gradeLevel} ห้อง ${student.classroom}`);
      return { status: 'success', user: studentUser };
    }
    return { status: 'error', message: 'ไม่พบรหัสนักเรียนนี้ในระบบ' };
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

     // ค้นหาห้องเรียนจากนักเรียนคนแรกใน list
     let classroomInfo = "";
     try {
        const students = getDataFromSheet('Students');
        const sampleId = String(payloadArray[0].studentId);
        // หาข้อมูลนักเรียนจาก id
        const student = students.find(s => String(s.id) === sampleId || String(s.studentId) === sampleId);
        if (student && student.classroom) {
             // ลบ ' ออกถ้ามี
             classroomInfo = `\n🏫 <b>ห้อง: ${student.classroom.replace(/^'/, '')}</b>`;
        }
     } catch(e) {
        // กรณีหาไม่เจอหรือไม่สามารถดึงข้อมูลได้ ให้ข้ามการแสดงห้อง
     }

     sendTelegramMessage(`⏱ <b>สรุปเวลาเรียน (${payloadArray[0].date})</b>${classroomInfo}\n✅ มา: ${pCount}\n⚠️ สาย: ${lCount}\n❌ ขาด: ${mCount}`);
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

// ปรับปรุงฟังก์ชันส่งข้อความให้รองรับ targetChatId
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
