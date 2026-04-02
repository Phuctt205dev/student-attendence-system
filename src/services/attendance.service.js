import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

// Create attendance session (tương thích với app mobile)
export const createAttendanceSession = async (classId, sessionData) => {
  try {
    // Lấy thông tin lớp
    const classDoc = await getDoc(doc(db, 'classes', classId));

    if (!classDoc.exists()) {
      return { success: false, error: 'Class not found' };
    }

    const classInfo = classDoc.data();

    const sessionRef = await addDoc(collection(db, 'attendanceSessions'), {
      classId,
      className: classInfo.name,
      teacherId: classInfo.teacherId,
      date: serverTimestamp(),
      sessionNumber: sessionData.sessionNumber,
      totalStudents: 0, // Sẽ được cập nhật khi có điểm danh
      presentCount: 0,  // Sẽ được cập nhật khi có điểm danh
      lateCount: 0,     // Số sinh viên trễ
      sessionStartTime: serverTimestamp(), // Thời gian bắt đầu buổi điểm danh
      lateThreshold: sessionData.lateThreshold || 15, // Ngưỡng tính trễ (phút), mặc định 15
      createdAt: serverTimestamp()
    });

    return { success: true, attendanceId: sessionRef.id };
  } catch (error) {
    console.error('Error creating attendance session:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance sessions for a class
export const getAttendancesByClass = async (classId) => {
  try {
    const q = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId)
    );

    const attendancesSnapshot = await getDocs(q);
    const attendances = await Promise.all(attendancesSnapshot.docs.map(async (sessionDoc) => {
      const sessionData = sessionDoc.data();

      // Đếm số records từ subcollection
      const recordsSnapshot = await getDocs(collection(db, 'attendanceSessions', sessionDoc.id, 'records'));
      const presentCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'PRESENT').length;
      const lateCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'LATE').length;

      return {
        id: sessionDoc.id,
        ...sessionData,
        recordCount: recordsSnapshot.size,
        presentCount,
        lateCount
      };
    }));

    // Sort by date descending (newest first) on client side
    attendances.sort((a, b) => {
      const dateA = a.date?.seconds || 0;
      const dateB = b.date?.seconds || 0;
      return dateB - dateA;
    });

    return { success: true, attendances };
  } catch (error) {
    console.error('Error getting attendances:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance session by ID
export const getAttendanceById = async (attendanceId) => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendanceSessions', attendanceId));

    if (attendanceDoc.exists()) {
      return {
        success: true,
        attendance: { id: attendanceDoc.id, ...attendanceDoc.data() }
      };
    } else {
      return { success: false, error: 'Attendance session not found' };
    }
  } catch (error) {
    console.error('Error getting attendance:', error);
    return { success: false, error: error.message };
  }
};

// Mark attendance for a student (được gọi từ app mobile)
export const markAttendance = async (sessionId, studentData) => {
  try {
    const sessionDoc = await getDoc(doc(db, 'attendanceSessions', sessionId));

    if (!sessionDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    // Kiểm tra xem sinh viên đã điểm danh chưa
    const studentDoc = await getDoc(doc(db, 'attendanceSessions', sessionId, 'records', studentData.studentId));

    if (studentDoc.exists()) {
      return { success: false, error: 'Student already checked in' };
    }

    const sessionInfo = sessionDoc.data();
    const sessionStartTime = sessionInfo.sessionStartTime?.toDate() || sessionInfo.date?.toDate();
    const lateThreshold = sessionInfo.lateThreshold || 15;
    const checkInTime = new Date();
    
    // Tính số phút chênh lệch
    const timeDiffMinutes = Math.floor((checkInTime - sessionStartTime) / (1000 * 60));
    const isLate = timeDiffMinutes > lateThreshold;
    const status = isLate ? 'LATE' : (studentData.status || 'PRESENT');

    // Thêm record vào subcollection
    await setDoc(doc(db, 'attendanceSessions', sessionId, 'records', studentData.studentId), {
      studentId: studentData.studentId,
      studentName: studentData.studentName,
      studentCode: studentData.studentCode || '',
      status: status,
      timestamp: serverTimestamp(),
      lateMinutes: isLate ? timeDiffMinutes : 0,
      method: studentData.method || 'face', // 'face' cho nhận diện khuôn mặt, 'qr' cho QR code
      confidence: studentData.confidence || null // Độ chính xác của nhận diện khuôn mặt
    });

    // Cập nhật presentCount và lateCount trong session
    const recordsSnapshot = await getDocs(collection(db, 'attendanceSessions', sessionId, 'records'));
    const presentCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'PRESENT').length;
    const lateCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'LATE').length;

    await updateDoc(doc(db, 'attendanceSessions', sessionId), {
      presentCount,
      lateCount,
      totalStudents: recordsSnapshot.size
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }
};

// Batch update manual attendance (từ web)
export const batchUpdateManualAttendance = async (sessionId, studentRecords) => {
  try {
    const sessionDoc = await getDoc(doc(db, 'attendanceSessions', sessionId));

    if (!sessionDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    // Cập nhật từng record
    const promises = studentRecords.map(async ({ studentId, studentName, studentCode, status, note }) => {
      await setDoc(doc(db, 'attendanceSessions', sessionId, 'records', studentId), {
        studentId,
        studentName,
        studentCode: studentCode || '',
        status: status === 'present' ? 'PRESENT' : status === 'late' ? 'LATE' : 'ABSENT',
        timestamp: serverTimestamp(),
        method: 'manual',
        note: note || '',
        lateMinutes: status === 'late' ? 0 : 0 // Cho manual, không tính phút trễ
      }, { merge: true });
    });

    await Promise.all(promises);

    // Cập nhật presentCount và lateCount trong session
    const recordsSnapshot = await getDocs(collection(db, 'attendanceSessions', sessionId, 'records'));
    const presentCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'PRESENT').length;
    const lateCount = recordsSnapshot.docs.filter(doc => doc.data().status === 'LATE').length;

    await updateDoc(doc(db, 'attendanceSessions', sessionId), {
      presentCount,
      lateCount,
      totalStudents: recordsSnapshot.size
    });

    return { success: true };
  } catch (error) {
    console.error('Error batch updating attendance:', error);
    return { success: false, error: error.message };
  }
};

// Get student's attendance history
export const getStudentAttendanceHistory = async (studentId, classId = null) => {
  try {
    let q;
    if (classId) {
      q = query(
        collection(db, 'attendanceSessions'),
        where('classId', '==', classId)
      );
    } else {
      q = query(collection(db, 'attendanceSessions'));
    }

    const sessionsSnapshot = await getDocs(q);
    const studentAttendances = [];

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      const recordDoc = await getDoc(doc(db, 'attendanceSessions', sessionDoc.id, 'records', studentId));

      if (recordDoc.exists()) {
        studentAttendances.push({
          id: sessionDoc.id,
          classId: sessionData.classId,
          className: sessionData.className,
          date: sessionData.date,
          sessionNumber: sessionData.sessionNumber,
          ...recordDoc.data()
        });
      }
    }

    studentAttendances.sort((a, b) => {
      const dateA = a.date?.seconds || 0;
      const dateB = b.date?.seconds || 0;
      return dateB - dateA;
    });

    return { success: true, attendances: studentAttendances };
  } catch (error) {
    console.error('Error getting student attendance history:', error);
    return { success: false, error: error.message };
  }
};

// Validate QR code
export const validateQRCode = async (qrData) => {
  try {
    const { attendanceId } = JSON.parse(qrData);

    const attendanceDoc = await getDoc(doc(db, 'attendanceSessions', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Invalid QR code' };
    }

    const data = attendanceDoc.data();

    if (data.qrCodeExpiry) {
      const expiry = data.qrCodeExpiry.toDate();
      const now = new Date();
      if (now > expiry) {
        return { success: false, error: 'QR code has expired' };
      }
    }

    return { success: true, attendanceId, classId: data.classId };
  } catch (error) {
    console.error('Error validating QR code:', error);
    return { success: false, error: 'Invalid QR code format' };
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (studentId, classId) => {
  try {
    const q = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId)
    );

    const sessionsSnapshot = await getDocs(q);
    let present = 0;
    let late = 0;
    let absent = 0;
    let total = 0;

    for (const sessionDoc of sessionsSnapshot.docs) {
      total++;
      const recordDoc = await getDoc(doc(db, 'attendanceSessions', sessionDoc.id, 'records', studentId));

      if (recordDoc.exists()) {
        const status = recordDoc.data().status;
        if (status === 'PRESENT') {
          present++;
        } else if (status === 'LATE') {
          late++;
        } else {
          absent++;
        }
      } else {
        absent++;
      }
    }

    return {
      success: true,
      stats: {
        total,
        present,
        late,
        absent,
        attendanceRate: total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0
      }
    };
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    return { success: false, error: error.message };
  }
};

// Delete attendance session
export const deleteAttendanceSession = async (attendanceId) => {
  try {
    // Xóa tất cả records trước
    const recordsSnapshot = await getDocs(collection(db, 'attendanceSessions', attendanceId, 'records'));
    const deletePromises = recordsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Xóa session
    await deleteDoc(doc(db, 'attendanceSessions', attendanceId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting attendance session:', error);
    return { success: false, error: error.message };
  }
};

// Generate QR code for attendance session
export const generateQRCode = async (attendanceId, expiryMinutes = 10) => {
  try {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);

    const qrData = JSON.stringify({
      attendanceId,
      timestamp: Date.now()
    });

    await updateDoc(doc(db, 'attendanceSessions', attendanceId), {
      qrCode: qrData,
      qrCodeExpiry: Timestamp.fromDate(expiryDate)
    });

    return { success: true, qrData, expiryTime: expiryDate };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance session with student details
export const getAttendanceDetails = async (attendanceId, classId) => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendanceSessions', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    const attendanceData = attendanceDoc.data();

    // Lấy danh sách sinh viên từ subcollection của class
    const studentsSnapshot = await getDocs(collection(db, 'classes', classId, 'students'));

    const studentsData = await Promise.all(studentsSnapshot.docs.map(async (studentDoc) => {
      const studentData = studentDoc.data();

      // Kiểm tra attendance record
      const recordDoc = await getDoc(doc(db, 'attendanceSessions', attendanceId, 'records', studentDoc.id));

      let status = 'absent';
      let lateMinutes = 0;
      
      if (recordDoc.exists()) {
        const recordStatus = recordDoc.data().status;
        if (recordStatus === 'PRESENT') {
          status = 'present';
        } else if (recordStatus === 'LATE') {
          status = 'late';
          lateMinutes = recordDoc.data().lateMinutes || 0;
        } else {
          status = 'absent';
        }
      }

      return {
        uid: studentDoc.id,
        fullName: studentData.name,
        email: studentData.email,
        studentId: studentData.studentCode,
        status: status,
        timestamp: recordDoc.exists() ? recordDoc.data().timestamp : null,
        lateMinutes: lateMinutes,
        checkInTime: recordDoc.exists() ? recordDoc.data().timestamp : null,
        method: recordDoc.exists() ? recordDoc.data().method : null
      };
    }));

    return {
      success: true,
      attendance: { id: attendanceDoc.id, ...attendanceData },
      students: studentsData
    };
  } catch (error) {
    console.error('Error getting attendance details:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to real-time attendance updates
export const subscribeToAttendanceRecords = (sessionId, callback) => {
  const recordsRef = collection(db, 'attendanceSessions', sessionId, 'records');

  const unsubscribe = onSnapshot(recordsRef, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    callback(records);
  }, (error) => {
    console.error('Error subscribing to attendance records:', error);
  });

  return unsubscribe;
};

// Subscribe to real-time attendance session updates
export const subscribeToAttendanceSession = (sessionId, callback) => {
  const sessionRef = doc(db, 'attendanceSessions', sessionId);

  const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        id: snapshot.id,
        ...snapshot.data()
      });
    }
  }, (error) => {
    console.error('Error subscribing to attendance session:', error);
  });

  return unsubscribe;
};
