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
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Create new class
export const createClass = async (classData) => {
  try {
    const classRef = await addDoc(collection(db, 'classes'), {
      ...classData,
      students: [],
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

// Get classes by teacher ID
export const getClassesByTeacher = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId)
    );

    const classesSnapshot = await getDocs(q);
    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
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

// Get classes by student ID
export const getClassesByStudent = async (studentId) => {
  try {
    const q = query(
      collection(db, 'classes'),
      where('students', 'array-contains', studentId)
    );

    const classesSnapshot = await getDocs(q);
    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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

// Enroll student in class
export const enrollStudent = async (classId, studentId) => {
  try {
    await updateDoc(doc(db, 'classes', classId), {
      students: arrayUnion(studentId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { success: false, error: error.message };
  }
};

// Remove student from class
export const removeStudent = async (classId, studentId) => {
  try {
    await updateDoc(doc(db, 'classes', classId), {
      students: arrayRemove(studentId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing student:', error);
    return { success: false, error: error.message };
  }
};

// Get student count for a class
export const getClassStudentCount = async (classId) => {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (classDoc.exists()) {
      const students = classDoc.data().students || [];
      return { success: true, count: students.length };
    }
    return { success: false, error: 'Class not found' };
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

// Enroll student by email
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
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (classDoc.exists()) {
      const students = classDoc.data().students || [];
      if (students.includes(user.uid)) {
        return { success: false, error: 'Sinh viên đã được thêm vào lớp này rồi' };
      }
    }

    // Enroll student
    await updateDoc(doc(db, 'classes', classId), {
      students: arrayUnion(user.uid),
      updatedAt: serverTimestamp()
    });

    return { success: true, student: user };
  } catch (error) {
    console.error('Error enrolling student by email:', error);
    return { success: false, error: error.message };
  }
};

// Get enrolled students details for a class
export const getClassStudents = async (classId) => {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));

    if (!classDoc.exists()) {
      return { success: false, error: 'Lớp không tồn tại' };
    }

    const studentIds = classDoc.data().students || [];

    if (studentIds.length === 0) {
      return { success: true, students: [] };
    }

    // Get all student details
    const studentPromises = studentIds.map(async (studentId) => {
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (studentDoc.exists()) {
        return {
          uid: studentDoc.id,
          ...studentDoc.data()
        };
      }
      return null;
    });

    const students = (await Promise.all(studentPromises)).filter(s => s !== null);

    return { success: true, students };
  } catch (error) {
    console.error('Error getting class students:', error);
    return { success: false, error: error.message };
  }
};
