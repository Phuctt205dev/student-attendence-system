import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Create new class (tương thích với app mobile)
export const createClass = async (classData) => {
  try {
    const classRef = await addDoc(collection(db, 'classes'), {
      name: classData.className,
      teacherId: classData.teacherId,
      classCode: classData.classCode,
      description: classData.description || '',
      schedule: classData.schedule || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, classId: classRef.id };
  } catch (error) {
    console.error('Error creating class:', error);
    return { success: false, error: error.message };
  }
};

// Get all classes
export const getAllClasses = async () => {
  try {
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, classes };
  } catch (error) {
    console.error('Error getting classes:', error);
    return { success: false, error: error.message };
  }
};

// Get class by ID
export const getClassById = async (classId) => {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));

    if (classDoc.exists()) {
      return {
        success: true,
        class: { id: classDoc.id, ...classDoc.data() }
      };
    } else {
      return { success: false, error: 'Class not found' };
    }
  } catch (error) {
    console.error('Error getting class:', error);
    return { success: false, error: error.message };
  }
};

// Get classes by teacher ID (với số lượng sinh viên từ subcollection)
export const getClassesByTeacher = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId)
    );

    const classesSnapshot = await getDocs(q);
    const classes = await Promise.all(classesSnapshot.docs.map(async (classDoc) => {
      const classData = classDoc.data();

      // Đếm số sinh viên từ subcollection
      const studentsSnapshot = await getDocs(collection(db, 'classes', classDoc.id, 'students'));

      return {
        id: classDoc.id,
        ...classData,
        className: classData.name, // Map 'name' thành 'className' để tương thích với UI
        studentCount: studentsSnapshot.size
      };
    }));

    // Sort by createdAt on client side
    classes.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return { success: true, classes };
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return { success: false, error: error.message };
  }
};

// Get classes by student ID (tìm trong subcollection students)
export const getClassesByStudent = async (studentId) => {
  try {
    // Lấy tất cả các lớp
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classes = [];

    // Kiểm tra từng lớp xem có chứa sinh viên không
    for (const classDoc of classesSnapshot.docs) {
      const studentDoc = await getDoc(doc(db, 'classes', classDoc.id, 'students', studentId));
      if (studentDoc.exists()) {
        const classData = classDoc.data();
        classes.push({
          id: classDoc.id,
          ...classData,
          className: classData.name
        });
      }
    }

    return { success: true, classes };
  } catch (error) {
    console.error('Error getting student classes:', error);
    return { success: false, error: error.message };
  }
};

// Update class
export const updateClass = async (classId, updates) => {
  try {
    await updateDoc(doc(db, 'classes', classId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating class:', error);
    return { success: false, error: error.message };
  }
};

// Delete class
export const deleteClass = async (classId) => {
  try {
    await deleteDoc(doc(db, 'classes', classId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { success: false, error: error.message };
  }
};

// Enroll student in class (thêm vào subcollection students)
export const enrollStudent = async (classId, studentData) => {
  try {
    // Thêm student vào subcollection với UID làm ID
    await setDoc(doc(db, 'classes', classId, 'students', studentData.uid), {
      name: studentData.fullName,
      studentCode: studentData.studentId || '',
      email: studentData.email,
      photoUrl: studentData.photoUrl || '',
      faceEmbedding: studentData.faceEmbedding || [],
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { success: false, error: error.message };
  }
};

// Remove student from class (xóa khỏi subcollection)
export const removeStudent = async (classId, studentId) => {
  try {
    await deleteDoc(doc(db, 'classes', classId, 'students', studentId));
    return { success: true };
  } catch (error) {
    console.error('Error removing student:', error);
    return { success: false, error: error.message };
  }
};

// Get student count for a class (từ subcollection)
export const getClassStudentCount = async (classId) => {
  try {
    const studentsSnapshot = await getDocs(collection(db, 'classes', classId, 'students'));
    return { success: true, count: studentsSnapshot.size };
  } catch (error) {
    console.error('Error getting student count:', error);
    return { success: false, error: error.message };
  }
};

// Find user by email
export const findUserByEmail = async (email) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    );

    const usersSnapshot = await getDocs(q);

    if (usersSnapshot.empty) {
      return { success: false, error: 'Không tìm thấy người dùng với email này' };
    }

    const userDoc = usersSnapshot.docs[0];
    return {
      success: true,
      user: {
        uid: userDoc.id,
        ...userDoc.data()
      }
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return { success: false, error: error.message };
  }
};

// Enroll student by email (cập nhật để sử dụng subcollection)
export const enrollStudentByEmail = async (classId, studentEmail) => {
  try {
    // Find student by email
    const userResult = await findUserByEmail(studentEmail);

    if (!userResult.success) {
      return userResult;
    }

    const user = userResult.user;

    // Check if user is a student
    if (user.role !== 'student') {
      return { success: false, error: 'Người dùng này không phải là sinh viên' };
    }

    // Check if student is already enrolled
    const studentDoc = await getDoc(doc(db, 'classes', classId, 'students', user.uid));
    if (studentDoc.exists()) {
      return { success: false, error: 'Sinh viên đã được thêm vào lớp này rồi' };
    }

    // Enroll student using enrollStudent function
    const result = await enrollStudent(classId, user);

    if (result.success) {
      return { success: true, student: user };
    } else {
      return result;
    }
  } catch (error) {
    console.error('Error enrolling student by email:', error);
    return { success: false, error: error.message };
  }
};

// Get enrolled students details for a class (từ subcollection)
export const getClassStudents = async (classId) => {
  try {
    // Lấy tất cả students từ subcollection
    const studentsSnapshot = await getDocs(collection(db, 'classes', classId, 'students'));

    const students = studentsSnapshot.docs.map(doc => {
      const studentData = doc.data();
      return {
        uid: doc.id,
        fullName: studentData.name,
        studentId: studentData.studentCode,
        email: studentData.email,
        photoUrl: studentData.photoUrl || '',
        faceEmbedding: studentData.faceEmbedding || []
      };
    });

    return { success: true, students };
  } catch (error) {
    console.error('Error getting class students:', error);
    return { success: false, error: error.message };
  }
};
