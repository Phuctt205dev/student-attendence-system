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
  arrayRemove
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
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );

    const classesSnapshot = await getDocs(q);
    const classes = classesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
