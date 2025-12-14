// =======================================================
//  CLASSROOM MANAGEMENT SYSTEM - FULL BACKEND (MERGED)
// =======================================================

// Declare Google Apps Script globals to resolve TypeScript errors
declare var LockService: any;
declare var UrlFetchApp: any;
declare var Logger: any;
declare var ContentService: any;
declare var SpreadsheetApp: any;

// --- 1. CONFIGURATION ---
const SPREADSHEET_ID = '192jkPyqJHzlvaTqsI_zYW1z6exjoLBopwAz3NbGyxvc';

// *** ตั้งค่า TELEGRAM ***
const TELEGRAM_BOT_TOKEN = '8331424730:AAFSQohH5QXg380flhcLyW_xupp8eppGyro';
const TELEGRAM_CHAT_ID = '-1003596963057'; // ID กลุ่ม

// --- 2. DATABASE SCHEMAS (โครงสร้างตาราง) ---
// เพิ่มส่วนนี้เพื่อรองรับการสร้างตารางอัตโนมัติและจัดการ JSON
const SHEET_SCHEMAS: Record<string, string[]> = {
  'Users': ['id', 'username', 'password', 'name', 'role', 'classroom'],
  'Students': ['id', 'studentId', 'name', 'gradeLevel', 'classroom'],
  'Assignments': ['id', 'title', 'type', 'gradeLevel', 'maxScore', 'dueDate', 'classrooms', 'status'],
  'Scores': ['assignmentId', 'studentId', 'score', 'status', 'feedback'],
  'Attendance': ['id', 'studentId', 'date', 'status', 'reason'],
  'HealthRecords': ['id', 'studentId', 'date', 'weight', 'height', 'bmi', 'interpretation'],
  // ส่วนของระบบข้อสอบ (Quiz System) ที่เพิ่มเข้ามา
  'Quizzes': ['id', 'title', 'unit', 'gradeLevel', 'questions', 'timeLimit', 'totalScore', 'status', 'createdDate'],
  'QuizResults': ['id', 'studentId', 'quizId', 'score', 'totalScore', 'submittedAt', 'answers']
};

// --- 3. MAIN HANDLER ---

function doPost(e: any) {
  return handleRequest(e);
}

function handleRequest(e: any) {
  const lock = LockService.getScriptLock();
  // รอคิวสูงสุด 10 วินาที
  if (!lock.tryLock(10000)) {
     return createJSONOutput({ status: 'error', message: 'Server is busy, please try again.' });
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;
    
    let result = {};

    // *** AUTO-SETUP: ตรวจสอบและสร้างตารางทุกครั้งที่มีการเรียกใช้งาน ***
    ensureDatabaseStructure(); 

    // ===========================
    //      ROUTING LOGIC
    // ===========================

    // --- AUTHENTICATION ---
    if (action === 'login') {
      result = loginUser(data.username, data.password, data.role);
    
    // --- GET ALL DATA ---
    } else if (action === 'getData') {
      result = getAllData();
    
    // --- ASSIGNMENTS ---
    } else if (action === 'addAssignment') {
      result = addData('Assignments', payload);
      sendTelegramMessage(`📢 <b>สั่งงานใหม่</b>\n\n📚 <b>วิชา:</b> ${payload.title}\n🎯 <b>ระดับชั้น:</b> ${payload.gradeLevel}\n📅 <b>กำหนดส่ง:</b> ${payload.dueDate}\n💯 <b>คะแนนเต็ม:</b> ${payload.maxScore}`);
    
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
      sendTelegramMessage(`👤 <b>นักเรียนใหม่</b>\nID: ${payload.studentId}\nชื่อ: ${payload.name}\nห้อง: ${payload.classroom}`);
    
    } else if (action === 'updateStudent') {
      result = updateStudentData(payload);
    
    } else if (action === 'deleteStudent') {
      result = deleteData('Students', data.id);

    // --- ATTENDANCE ---
    } else if (action === 'markAttendance') {
      result = markAttendanceData(payload);
    
    } else if (action === 'markAttendanceBulk') {
      result = markAttendanceBulk(payload); // มีการแจ้งเตือน Telegram ภายในฟังก์ชันนี้

    // --- HEALTH ---
    } else if (action === 'updateHealthRecord') {
      result = updateHealthRecord(payload);
      sendTelegramMessage(`🏥 <b>บันทึกข้อมูลสุขภาพ</b>\n\nID: ${payload.studentId}\nน้ำหนัก: ${payload.weight} กก.\nส่วนสูง: ${payload.height} ซม.\nผล: ${payload.interpretation}`);

    // --- QUIZZES (ระบบข้อสอบ - เพิ่มใหม่) ---
    } else if (action === 'addQuiz') {
      // payload.questions จะถูกแปลงเป็น JSON string อัตโนมัติในฟังก์ชัน addData
      result = addData('Quizzes', payload);
      sendTelegramMessage(`📝 <b>แบบทดสอบใหม่</b>\n${payload.title}\nหน่วย: ${payload.unit}\nเวลา: ${payload.timeLimit} นาที`);
    
    } else if (action === 'deleteQuiz') {
      result = deleteData('Quizzes', data.id);

    // --- QUIZ RESULTS (ผลสอบ - เพิ่มใหม่) ---
    } else if (action === 'submitQuiz') {
      result = addData('QuizResults', payload);
      sendTelegramMessage(`✅ <b>ส่งข้อสอบแล้ว</b>\nStudent: ${payload.studentId}\nQuiz: ${payload.quizId}\nScore: ${payload.score} / ${payload.totalScore}`);
    }

    return createJSONOutput(result);

  } catch (error: any) {
    // แจ้งเตือน Error
    try {
      sendTelegramMessage(`❌ <b>System Error:</b>\n${error.toString()}`);
    } catch(e) {}
    
    return createJSONOutput({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- 4. TELEGRAM HELPER ---
function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    UrlFetchApp.fetch(url, {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify({
        'chat_id': TELEGRAM_CHAT_ID,
        'text': text,
        'parse_mode': 'HTML'
      }),
      'muteHttpExceptions': true
    });
  } catch (e: any) {
    Logger.log("Failed to send Telegram: " + e.toString());
  }
}

// --- 5. DATABASE FUNCTIONS (CORE) ---

function createJSONOutput(data: any) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันตรวจสอบโครงสร้าง Database (Auto Setup - มาจาก Code 2)
function ensureDatabaseStructure() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(SHEET_SCHEMAS[sheetName]); // สร้าง Header
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, SHEET_SCHEMAS[sheetName].length).setFontWeight("bold");
    }
  });
}

function getSheet(name: string) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  // ถ้าไม่มี Sheet ให้สร้างใหม่โดยอิงจาก Schema (ปรับปรุงจาก Code 1)
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (SHEET_SCHEMAS[name]) {
       sheet.appendRow(SHEET_SCHEMAS[name]);
    }
  }
  return sheet;
}

// อัปเกรดให้รองรับ JSON Parsing (รวมความสามารถ Code 1 และ 2)
function getDataFromSheet(sheetName: string) {
  const sheet = getSheet(sheetName);
  if (sheet.getLastRow() < 2) return []; // ถ้าไม่มีข้อมูล

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row: any[]) => {
    let obj: any = {};
    headers.forEach((header: string, index: number) => {
      let value = row[index];
      
      // *** JSON Parsing Logic ***
      // ถ้าข้อมูลเป็น String ที่หน้าตาเหมือน JSON (เช่น questions หรือ answers) ให้แปลงเป็น Object
      if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
         try { 
           value = JSON.parse(value); 
         } catch(e) {
           // ถ้า Parse ไม่ได้ ให้ใช้ค่าเดิม
         }
      }
      
      obj[header] = value;
    });
    return obj;
  });
}

// อัปเกรดให้รองรับ JSON Stringify (รวมความสามารถ Code 1 และ 2)
function addData(sheetName: string, payload: any) {
  const sheet = getSheet(sheetName);
  // ใช้ Header จริงจาก Sheet เพื่อความถูกต้อง
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map((header: string) => {
    let cellData = payload[header];
    
    // *** JSON Stringify Logic ***
    // ถ้าข้อมูลเป็น Object หรือ Array ให้แปลงเป็น String ก่อนบันทึก
    if (cellData && (typeof cellData === 'object' || Array.isArray(cellData))) {
       return JSON.stringify(cellData);
    }
    
    return cellData !== undefined ? cellData : '';
  });
  
  sheet.appendRow(row);
  return { status: 'success', id: payload.id }; // return id กลับไปด้วยถ้ามี
}

function deleteData(sheetName: string, id: string) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { // Col 0 is ID
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

// --- 6. BUSINESS LOGIC FUNCTIONS ---

// ปรับปรุงให้ดึงข้อมูลครบทุกตารางตาม Schema (รวม Quiz)
function getAllData() {
  const response: any = { status: 'success' };
  
  Object.keys(SHEET_SCHEMAS).forEach(key => {
     if (key !== 'Users') { 
        // แปลงชื่อ Key เป็น CamelCase (เช่น QuizResults -> quizResults)
        const keyName = key.charAt(0).toLowerCase() + key.slice(1);
        response[keyName] = getDataFromSheet(key);
     }
  });
  
  return response;
}

function loginUser(username: string, password: string, role: string) {
  if (role === 'TEACHER') {
    const users = getDataFromSheet('Users');
    const user = users.find((u: any) => String(u.username) === String(username));

    if (user) {
      if (user.role !== 'TEACHER') return { status: 'error', message: 'บทบาทไม่ถูกต้อง' };
      if (String(user.password) === String(password)) {
        const { password, ...safeUser } = user;
        sendTelegramMessage(`🔐 <b>Login Alert:</b> ครู ${safeUser.name} เข้าสู่ระบบ`);
        return { status: 'success', user: safeUser };
      }
    }
  } else if (role === 'STUDENT') {
    // *** Updated Logic: Check Students Sheet for Student Login ***
    const students = getDataFromSheet('Students');
    // username passed from frontend is the studentId (e.g., 1782)
    const student = students.find((s: any) => String(s.studentId) === String(username));
    
    if (student) {
       // Create a session user object
       const user = {
         id: student.id,
         username: student.studentId,
         name: student.name,
         role: 'STUDENT',
         gradeLevel: Number(student.gradeLevel),
         classroom: student.classroom
       };
       return { status: 'success', user: user };
    }
  }
  
  return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

function updateScoreData(payload: any) {
  const sheet = getSheet('Scores');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let rowIndex = -1;
  // ใช้ studentId และ assignmentId เป็น key คู่
  for(let i=1; i<data.length; i++) {
    if (String(data[i][headers.indexOf('assignmentId')]) === String(payload.assignmentId) &&
        String(data[i][headers.indexOf('studentId')]) === String(payload.studentId)) {
        rowIndex = i + 1;
        break;
    }
  }

  if (rowIndex > 0) {
    headers.forEach((header: string, colIndex: number) => {
      if (payload[header] !== undefined) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(payload[header]);
      }
    });
  } else {
    const newRow = headers.map((header: string) => payload[header] !== undefined ? payload[header] : '');
    sheet.appendRow(newRow);
  }
  return { status: 'success' };
}

function updateStudentData(payload: any) {
  const sheet = getSheet('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
     if (String(data[i][0]) === String(payload.id)) {
        headers.forEach((header: string, colIndex: number) => {
           if (payload[header] !== undefined) {
              sheet.getRange(i + 1, colIndex + 1).setValue(payload[header]);
           }
        });
        return { status: 'success' };
     }
  }
  return { status: 'error' };
}

function markAttendanceData(payload: any) {
  const sheet = getSheet('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let rowIndex = -1;
  for(let i=1; i<data.length; i++) {
     if (String(data[i][headers.indexOf('studentId')]) === String(payload.studentId) &&
         String(data[i][headers.indexOf('date')]) === String(payload.date)) {
         rowIndex = i + 1;
         break;
     }
  }
  
  if (rowIndex > 0) {
    headers.forEach((header: string, colIndex: number) => {
      if (payload[header] !== undefined) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(payload[header]);
      }
    });
  } else {
    const newRow = headers.map((header: string) => payload[header] !== undefined ? payload[header] : '');
    sheet.appendRow(newRow);
  }
  return { status: 'success' };
}

function markAttendanceBulk(payloadArray: any[]) {
  const sheet = getSheet('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // สร้าง Map Index เพื่อความเร็ว
  const indexMap = new Map();
  const studentIdIdx = headers.indexOf('studentId');
  const dateIdx = headers.indexOf('date');
  
  for(let i=1; i<data.length; i++) {
     const key = String(data[i][studentIdIdx]) + "_" + String(data[i][dateIdx]);
     indexMap.set(key, i + 1);
  }

  payloadArray.forEach(payload => {
     const key = String(payload.studentId) + "_" + String(payload.date);
     
     if (indexMap.has(key)) {
       const rowNum = indexMap.get(key);
       headers.forEach((header: string, colIndex: number) => {
          if (payload[header] !== undefined) {
             sheet.getRange(rowNum, colIndex + 1).setValue(payload[header]);
          }
       });
     } else {
       const newRow = headers.map((header: string) => payload[header] !== undefined ? payload[header] : '');
       sheet.appendRow(newRow);
     }
  });

  // แจ้งเตือน Telegram
  if (payloadArray && payloadArray.length > 0) {
    const date = payloadArray[0].date;
    
    // ค้นหาชื่อห้อง
    let classroom = "ไม่ระบุ";
    try {
      const allStudents: any[] = getDataFromSheet('Students');
      const sampleStudent = allStudents.find((s: any) => String(s.studentId) === String(payloadArray[0].studentId));
      if (sampleStudent && sampleStudent.classroom) {
        classroom = sampleStudent.classroom;
      }
    } catch (e) {}

    const presentCount = payloadArray.filter(p => String(p.status).toLowerCase().includes('present')).length;
    const lateCount = payloadArray.filter(p => String(p.status).toLowerCase().includes('late')).length;
    const absentCount = payloadArray.length - presentCount - lateCount;
    
    sendTelegramMessage(
      `⏱ <b>บันทึกเวลาเรียน (สรุป)</b>\n\n` +
      `🏫 <b>ห้อง:</b> ${classroom}\n` +
      `📅 <b>วันที่:</b> ${date}\n` +
      `✅ <b>มาเรียน:</b> ${presentCount} คน\n` +
      `⚠️ <b>สาย:</b> ${lateCount} คน\n` +
      `❌ <b>ขาด/ลา:</b> ${absentCount} คน\n\n` +
      `(บันทึกทั้งหมด ${payloadArray.length} คน)`
    );
  }
  
  return { status: 'success' };
}

function updateHealthRecord(payload: any) {
  const sheet = getSheet('HealthRecords');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let rowIndex = -1;
  for(let i=1; i<data.length; i++) {
     if (String(data[i][headers.indexOf('studentId')]) === String(payload.studentId) &&
         String(data[i][headers.indexOf('date')]) === String(payload.date)) {
         rowIndex = i + 1;
         break;
     }
  }

  if (rowIndex > 0) {
    headers.forEach((header: string, colIndex: number) => {
      if (payload[header] !== undefined) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(payload[header]);
      }
    });
  } else {
    const newRow = headers.map((header: string) => payload[header] !== undefined ? payload[header] : '');
    sheet.appendRow(newRow);
  }
  return { status: 'success' };
}
