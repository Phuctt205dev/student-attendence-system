import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ═══════════════════════════════════════════════════════════════
// TAG CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get all tags for a class
export const getClassTags = async (classId) => {
  try {
    const tagsRef = collection(db, 'classes', classId, 'tags');
    const q = query(tagsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const tags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, tags };
  } catch (error) {
    console.error('Error getting class tags:', error);
    return { success: false, error: error.message };
  }
};

// Create a new tag
export const createTag = async (classId, tagData) => {
  try {
    const tagsRef = collection(db, 'classes', classId, 'tags');
    const docRef = await addDoc(tagsRef, {
      name: tagData.name,
      note: tagData.note || '',
      points: tagData.points || 0,
      color: tagData.color || null, // null = auto color based on points
      createdAt: serverTimestamp(),
      createdBy: tagData.createdBy
    });

    return { success: true, tagId: docRef.id };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { success: false, error: error.message };
  }
};

// Update a tag
export const updateTag = async (classId, tagId, tagData) => {
  try {
    const tagRef = doc(db, 'classes', classId, 'tags', tagId);
    await updateDoc(tagRef, {
      name: tagData.name,
      note: tagData.note || '',
      points: tagData.points || 0,
      color: tagData.color || null,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating tag:', error);
    return { success: false, error: error.message };
  }
};

// Delete a tag (also removes all student assignments)
export const deleteTag = async (classId, tagId) => {
  try {
    // First, remove all student-tag assignments for this tag
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(studentTagsRef, where('tagId', '==', tagId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Then delete the tag itself
    const tagRef = doc(db, 'classes', classId, 'tags', tagId);
    await deleteDoc(tagRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// STUDENT-TAG ASSIGNMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get all student-tag assignments for a class
export const getStudentTags = async (classId) => {
  try {
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const snapshot = await getDocs(studentTagsRef);
    
    const studentTags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, studentTags };
  } catch (error) {
    console.error('Error getting student tags:', error);
    return { success: false, error: error.message };
  }
};

// Get tags for a specific student
export const getTagsForStudent = async (classId, studentId) => {
  try {
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(studentTagsRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    
    const tags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, tags };
  } catch (error) {
    console.error('Error getting tags for student:', error);
    return { success: false, error: error.message };
  }
};

// Get students for a specific tag
export const getStudentsForTag = async (classId, tagId) => {
  try {
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(studentTagsRef, where('tagId', '==', tagId));
    const snapshot = await getDocs(q);
    
    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, students };
  } catch (error) {
    console.error('Error getting students for tag:', error);
    return { success: false, error: error.message };
  }
};

// Assign tag to student
export const assignTagToStudent = async (classId, studentId, tagId, assignedBy, note = '') => {
  try {
    // Check if assignment already exists
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(
      studentTagsRef, 
      where('studentId', '==', studentId),
      where('tagId', '==', tagId)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      return { success: false, error: 'Sinh viên đã được gắn thẻ này' };
    }

    const docRef = await addDoc(studentTagsRef, {
      studentId,
      tagId,
      note,
      assignedAt: serverTimestamp(),
      assignedBy
    });

    return { success: true, assignmentId: docRef.id };
  } catch (error) {
    console.error('Error assigning tag to student:', error);
    return { success: false, error: error.message };
  }
};

// Remove tag from student
export const removeTagFromStudent = async (classId, studentId, tagId) => {
  try {
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(
      studentTagsRef,
      where('studentId', '==', studentId),
      where('tagId', '==', tagId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'Không tìm thấy thẻ đã gắn' };
    }

    await deleteDoc(snapshot.docs[0].ref);
    return { success: true };
  } catch (error) {
    console.error('Error removing tag from student:', error);
    return { success: false, error: error.message };
  }
};

// Bulk assign tag to multiple students
export const assignTagToMultipleStudents = async (classId, studentIds, tagId, assignedBy) => {
  try {
    const results = await Promise.all(
      studentIds.map(studentId => 
        assignTagToStudent(classId, studentId, tagId, assignedBy)
      )
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return { 
      success: true, 
      successful, 
      failed,
      message: `Đã gắn thẻ cho ${successful} sinh viên${failed > 0 ? `, ${failed} đã có thẻ này` : ''}`
    };
  } catch (error) {
    console.error('Error bulk assigning tag:', error);
    return { success: false, error: error.message };
  }
};

// Toggle tag for student (assign if not exists, remove if exists)
export const toggleTagForStudent = async (classId, studentId, tagId, assignedBy) => {
  try {
    const studentTagsRef = collection(db, 'classes', classId, 'studentTags');
    const q = query(
      studentTagsRef,
      where('studentId', '==', studentId),
      where('tagId', '==', tagId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Assign tag
      const docRef = await addDoc(studentTagsRef, {
        studentId,
        tagId,
        note: '',
        assignedAt: serverTimestamp(),
        assignedBy
      });
      return { success: true, action: 'assigned', assignmentId: docRef.id };
    } else {
      // Remove tag
      await deleteDoc(snapshot.docs[0].ref);
      return { success: true, action: 'removed' };
    }
  } catch (error) {
    console.error('Error toggling tag for student:', error);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Available color presets
export const TAG_COLOR_PRESETS = [
  { id: 'auto', name: 'Tự động', colors: null },
  { id: 'green', name: 'Xanh lá', colors: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-500' } },
  { id: 'red', name: 'Đỏ', colors: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-500' } },
  { id: 'yellow', name: 'Vàng', colors: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' } },
  { id: 'blue', name: 'Xanh dương', colors: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' } },
  { id: 'purple', name: 'Tím', colors: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' } },
  { id: 'pink', name: 'Hồng', colors: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', dot: 'bg-pink-500' } },
  { id: 'orange', name: 'Cam', colors: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' } },
  { id: 'teal', name: 'Xanh ngọc', colors: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' } },
  { id: 'indigo', name: 'Chàm', colors: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' } },
  { id: 'gray', name: 'Xám', colors: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500' } },
];

// Get tag color based on points or custom color
export const getTagColor = (points, customColor = null) => {
  // If custom color is set, use it
  if (customColor) {
    const preset = TAG_COLOR_PRESETS.find(p => p.id === customColor);
    if (preset && preset.colors) {
      return preset.colors;
    }
  }
  
  // Auto color based on points
  if (points > 0) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      dot: 'bg-green-500'
    };
  }
  if (points < 0) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-500'
    };
  }
  return {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    dot: 'bg-yellow-500'
  };
};

// Format points display
export const formatPoints = (points) => {
  if (points > 0) return `+${points}đ`;
  if (points < 0) return `${points}đ`;
  return '0đ';
};

// Calculate total points for a student from their tags
export const calculateStudentTagPoints = (studentTags, tagsMap) => {
  return studentTags.reduce((total, st) => {
    const tag = tagsMap[st.tagId];
    return total + (tag?.points || 0);
  }, 0);
};
