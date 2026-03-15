import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Create attendance session
export const createAttendanceSession = async (classId, sessionData) => {
  try {
    const attendanceRef = await addDoc(collection(db, 'attendances'), {
      classId,
      date: serverTimestamp(),
      sessionNumber: sessionData.sessionNumber,
      qrCode: sessionData.qrCode || '',
      qrCodeExpiry: sessionData.qrCodeExpiry || null,
      records: [],
      createdBy: sessionData.createdBy,
      createdAt: serverTimestamp()
    });

    return { success: true, attendanceId: attendanceRef.id };
  } catch (error) {
    console.error('Error creating attendance session:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance sessions for a class
export const getAttendancesByClass = async (classId) => {
  try {
    const q = query(
      collection(db, 'attendances'),
      where('classId', '==', classId),
      orderBy('date', 'desc')
    );

    const attendancesSnapshot = await getDocs(q);
    const attendances = attendancesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, attendances };
  } catch (error) {
    console.error('Error getting attendances:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance session by ID
export const getAttendanceById = async (attendanceId) => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));

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

// Mark attendance for a student (manual or QR)
export const markAttendance = async (attendanceId, studentData) => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    const currentRecords = attendanceDoc.data().records || [];

    // Check if student already checked in
    const existingRecord = currentRecords.find(
      record => record.studentId === studentData.studentId
    );

    if (existingRecord) {
      return { success: false, error: 'Student already checked in' };
    }

    // Add new attendance record
    const newRecord = {
      studentId: studentData.studentId,
      studentName: studentData.studentName,
      status: studentData.status || 'present',
      checkInTime: serverTimestamp(),
      method: studentData.method || 'manual',
      note: studentData.note || ''
    };

    await updateDoc(doc(db, 'attendances', attendanceId), {
      records: [...currentRecords, newRecord]
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }
};

// Update attendance status
export const updateAttendanceStatus = async (attendanceId, studentId, status, note = '') => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    const currentRecords = attendanceDoc.data().records || [];
    const updatedRecords = currentRecords.map(record => {
      if (record.studentId === studentId) {
        return { ...record, status, note };
      }
      return record;
    });

    await updateDoc(doc(db, 'attendances', attendanceId), {
      records: updatedRecords
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating attendance status:', error);
    return { success: false, error: error.message };
  }
};

// Get student's attendance history
export const getStudentAttendanceHistory = async (studentId, classId = null) => {
  try {
    let q;
    if (classId) {
      q = query(
        collection(db, 'attendances'),
        where('classId', '==', classId),
        orderBy('date', 'desc')
      );
    } else {
      q = query(collection(db, 'attendances'), orderBy('date', 'desc'));
    }

    const attendancesSnapshot = await getDocs(q);
    const studentAttendances = [];

    attendancesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const studentRecord = data.records?.find(
        record => record.studentId === studentId
      );

      if (studentRecord) {
        studentAttendances.push({
          id: doc.id,
          classId: data.classId,
          date: data.date,
          sessionNumber: data.sessionNumber,
          ...studentRecord
        });
      }
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

    const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Invalid QR code' };
    }

    const data = attendanceDoc.data();

    // Check if QR code is expired
    if (data.qrCodeExpiry) {
      const expiry = data.qrCodeExpiry.toDate();
      const now = new Date();

      if (now > expiry) {
        return { success: false, error: 'QR code has expired' };
      }
    }

    return {
      success: true,
      attendanceId,
      classId: data.classId
    };
  } catch (error) {
    console.error('Error validating QR code:', error);
    return { success: false, error: 'Invalid QR code format' };
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (studentId, classId) => {
  try {
    const q = query(
      collection(db, 'attendances'),
      where('classId', '==', classId)
    );

    const attendancesSnapshot = await getDocs(q);
    let present = 0;
    let absent = 0;
    let late = 0;
    let total = 0;

    attendancesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const studentRecord = data.records?.find(
        record => record.studentId === studentId
      );

      total++;
      if (studentRecord) {
        if (studentRecord.status === 'present') present++;
        else if (studentRecord.status === 'late') late++;
      } else {
        absent++;
      }
    });

    return {
      success: true,
      stats: {
        total,
        present,
        absent,
        late,
        attendanceRate: total > 0 ? ((present + late) / total * 100).toFixed(1) : 0
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
    await deleteDoc(doc(db, 'attendances', attendanceId));
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

    await updateDoc(doc(db, 'attendances', attendanceId), {
      qrCode: qrData,
      qrCodeExpiry: Timestamp.fromDate(expiryDate)
    });

    return {
      success: true,
      qrData,
      expiryTime: expiryDate
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { success: false, error: error.message };
  }
};

// Get attendance session with student details
export const getAttendanceDetails = async (attendanceId, classId) => {
  try {
    const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));

    if (!attendanceDoc.exists()) {
      return { success: false, error: 'Attendance session not found' };
    }

    const attendanceData = attendanceDoc.data();

    // Get all students in class
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) {
      return { success: false, error: 'Class not found' };
    }

    const classData = classDoc.data();
    const studentIds = classData.students || [];

    // Get student details
    const studentsData = [];
    for (const studentId of studentIds) {
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (studentDoc.exists()) {
        const studentInfo = studentDoc.data();
        const attendanceRecord = attendanceData.records?.find(r => r.studentId === studentId);

        studentsData.push({
          uid: studentId,
          fullName: studentInfo.fullName,
          email: studentInfo.email,
          studentId: studentInfo.studentId,
          status: attendanceRecord ? attendanceRecord.status : 'absent',
          checkInTime: attendanceRecord?.checkInTime,
          method: attendanceRecord?.method
        });
      }
    }

    return {
      success: true,
      attendance: {
        id: attendanceDoc.id,
        ...attendanceData
      },
      students: studentsData
    };
  } catch (error) {
    console.error('Error getting attendance details:', error);
    return { success: false, error: error.message };
  }
};
