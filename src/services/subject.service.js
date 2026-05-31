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
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

// ==================== SUBJECT CRUD ====================

export const createSubject = async (teacherId, subjectData) => {
  try {
    const subjectRef = await addDoc(collection(db, 'subjects'), {
      name: subjectData.name,
      description: subjectData.description || '',
      createdBy: teacherId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    });

    return { success: true, data: { id: subjectRef.id, ...subjectData } };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { success: false, error: error.message };
  }
};

export const getTeacherSubjects = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'subjects'),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const subjects = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const topicsSnapshot = await getDocs(
          query(
            collection(db, 'subjects', doc.id, 'topics'),
            where('isActive', '==', true)
          )
        );

        return {
          id: doc.id,
          ...doc.data(),
          topicCount: topicsSnapshot.size
        };
      })
    );

    return { success: true, data: subjects };
  } catch (error) {
    console.error('Error getting teacher subjects:', error);
    return { success: false, error: error.message };
  }
};

export const getSubjectById = async (subjectId) => {
  try {
    const docSnap = await getDoc(doc(db, 'subjects', subjectId));

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Subject not found' };
    }
  } catch (error) {
    console.error('Error getting subject:', error);
    return { success: false, error: error.message };
  }
};

export const updateSubject = async (subjectId, updates) => {
  try {
    await updateDoc(doc(db, 'subjects', subjectId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating subject:', error);
    return { success: false, error: error.message };
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    await updateDoc(doc(db, 'subjects', subjectId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { success: false, error: error.message };
  }
};

// ==================== TOPIC CRUD ====================

export const createTopic = async (subjectId, topicData) => {
  try {
    const topicRef = await addDoc(
      collection(db, 'subjects', subjectId, 'topics'),
      {
        name: topicData.name,
        description: topicData.description || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      }
    );

    return { success: true, data: { id: topicRef.id, ...topicData } };
  } catch (error) {
    console.error('Error creating topic:', error);
    return { success: false, error: error.message };
  }
};

export const getSubjectTopics = async (subjectId) => {
  try {
    const q = query(
      collection(db, 'subjects', subjectId, 'topics'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const topics = await Promise.all(
      snapshot.docs.map(async (topicDoc) => {
        const questionsSnapshot = await getDocs(
          query(
            collection(db, 'subjects', subjectId, 'topics', topicDoc.id, 'questions'),
            where('isActive', '==', true)
          )
        );

        return {
          id: topicDoc.id,
          ...topicDoc.data(),
          questionCount: questionsSnapshot.size
        };
      })
    );

    return { success: true, data: topics };
  } catch (error) {
    console.error('Error getting subject topics:', error);
    return { success: false, error: error.message };
  }
};

export const getTopic = async (subjectId, topicId) => {
  try {
    const topicDoc = await getDoc(
      doc(db, 'subjects', subjectId, 'topics', topicId)
    );

    if (topicDoc.exists()) {
      return { success: true, data: { id: topicDoc.id, ...topicDoc.data() } };
    } else {
      return { success: false, error: 'Topic not found' };
    }
  } catch (error) {
    console.error('Error getting topic:', error);
    return { success: false, error: error.message };
  }
};

export const updateTopic = async (subjectId, topicId, updates) => {
  try {
    await updateDoc(doc(db, 'subjects', subjectId, 'topics', topicId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating topic:', error);
    return { success: false, error: error.message };
  }
};

export const deleteTopic = async (subjectId, topicId) => {
  try {
    await updateDoc(doc(db, 'subjects', subjectId, 'topics', topicId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting topic:', error);
    return { success: false, error: error.message };
  }
};

// ==================== QUESTION CRUD ====================

export const createQuestion = async (subjectId, topicId, questionData) => {
  try {
    const questionRef = await addDoc(
      collection(db, 'subjects', subjectId, 'topics', topicId, 'questions'),
      {
        questionText: questionData.questionText,
        type: 'mcq',
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        points: questionData.points || 1,
        createdBy: questionData.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      }
    );

    return { success: true, data: { id: questionRef.id, ...questionData } };
  } catch (error) {
    console.error('Error creating question:', error);
    return { success: false, error: error.message };
  }
};

export const getTopicQuestions = async (subjectId, topicId) => {
  try {
    const q = query(
      collection(db, 'subjects', subjectId, 'topics', topicId, 'questions'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: questions };
  } catch (error) {
    console.error('Error getting topic questions:', error);
    return { success: false, error: error.message };
  }
};

export const getQuestion = async (subjectId, topicId, questionId) => {
  try {
    const questionDoc = await getDoc(
      doc(db, 'subjects', subjectId, 'topics', topicId, 'questions', questionId)
    );

    if (questionDoc.exists()) {
      return {
        success: true,
        data: { id: questionDoc.id, ...questionDoc.data() }
      };
    } else {
      return { success: false, error: 'Question not found' };
    }
  } catch (error) {
    console.error('Error getting question:', error);
    return { success: false, error: error.message };
  }
};

export const updateQuestion = async (subjectId, topicId, questionId, updates) => {
  try {
    await updateDoc(
      doc(db, 'subjects', subjectId, 'topics', topicId, 'questions', questionId),
      {
        ...updates,
        updatedAt: serverTimestamp()
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating question:', error);
    return { success: false, error: error.message };
  }
};

export const deleteQuestion = async (subjectId, topicId, questionId) => {
  try {
    await updateDoc(
      doc(db, 'subjects', subjectId, 'topics', topicId, 'questions', questionId),
      {
        isActive: false,
        updatedAt: serverTimestamp()
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting question:', error);
    return { success: false, error: error.message };
  }
};

// ==================== TOPIC ATTACHMENTS ====================

const normalizeFileName = (name) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const uploadTopicAttachment = async (subjectId, topicId, file, userId) => {
  try {
    const safeName = normalizeFileName(file.name || 'attachment');
    const filePath = `subjects/${subjectId}/topics/${topicId}/attachments/${Date.now()}_${safeName}`;
    const fileRef = storageRef(storage, filePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/octet-stream'
    });
    const url = await getDownloadURL(snapshot.ref);

    const docRef = await addDoc(
      collection(db, 'subjects', subjectId, 'topics', topicId, 'attachments'),
      {
        name: file.name,
        url,
        type: file.type || '',
        size: file.size || 0,
        storagePath: filePath,
        createdBy: userId || null,
        createdAt: serverTimestamp()
      }
    );

    return {
      success: true,
      data: {
        id: docRef.id,
        name: file.name,
        url,
        type: file.type || '',
        size: file.size || 0,
        storagePath: filePath,
        createdBy: userId || null
      }
    };
  } catch (error) {
    console.error('Error uploading topic attachment:', error);
    return { success: false, error: error.message };
  }
};

export const getTopicAttachments = async (subjectId, topicId) => {
  try {
    const q = query(
      collection(db, 'subjects', subjectId, 'topics', topicId, 'attachments'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const attachments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: attachments };
  } catch (error) {
    console.error('Error getting topic attachments:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EXAM QUESTION SELECTION ====================

export const getRandomQuestionsFromTopics = async (subjectId, topicIds, count) => {
  try {
    const questions = [];

    for (const topicId of topicIds) {
      const snapshot = await getDocs(
        collection(db, 'subjects', subjectId, 'topics', topicId, 'questions')
      );

      const topicQuestions = snapshot.docs
        .filter((doc) => doc.data().isActive)
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

      questions.push(...topicQuestions);
    }

    // Shuffle questions randomly (Fisher-Yates algorithm)
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Return only requested count
    const selectedQuestions = questions.slice(0, Math.min(count, questions.length));

    return {
      success: true,
      data: selectedQuestions,
      totalAvailable: questions.length
    };
  } catch (error) {
    console.error('Error getting random questions:', error);
    return { success: false, error: error.message };
  }
};

// Get total points from questions
export const calculateTotalPoints = (questions) => {
  return questions.reduce((sum, q) => sum + (q.points || 1), 0);
};

export const calculatePassingScore = (totalPoints) => {
  return Math.ceil(totalPoints * 0.5);
};
