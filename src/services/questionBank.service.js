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
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Create a new question
export const createQuestion = async (questionData) => {
  try {
    const docRef = await addDoc(collection(db, 'questions'), {
      questionText: questionData.questionText,
      type: 'mcq',
      options: {
        A: questionData.optionA,
        B: questionData.optionB,
        C: questionData.optionC,
        D: questionData.optionD
      },
      correctAnswer: questionData.correctAnswer,
      difficulty: questionData.difficulty,
      subject: questionData.subject,
      topic: questionData.topic,
      createdBy: questionData.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        ...questionData
      }
    };
  } catch (error) {
    console.error('Error creating question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update question
export const updateQuestion = async (questionId, questionData) => {
  try {
    await updateDoc(doc(db, 'questions', questionId), {
      questionText: questionData.questionText,
      options: {
        A: questionData.optionA,
        B: questionData.optionB,
        C: questionData.optionC,
        D: questionData.optionD
      },
      correctAnswer: questionData.correctAnswer,
      difficulty: questionData.difficulty,
      subject: questionData.subject,
      topic: questionData.topic,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { id: questionId }
    };
  } catch (error) {
    console.error('Error updating question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Soft delete question
export const deleteQuestion = async (questionId) => {
  try {
    await updateDoc(doc(db, 'questions', questionId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { id: questionId }
    };
  } catch (error) {
    console.error('Error deleting question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get question by ID
export const getQuestionById = async (questionId) => {
  try {
    const docSnap = await getDoc(doc(db, 'questions', questionId));

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...data
        }
      };
    } else {
      return {
        success: false,
        error: 'Question not found'
      };
    }
  } catch (error) {
    console.error('Error getting question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get questions by teacher (creator)
export const getQuestionsByTeacher = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: questions
    };
  } catch (error) {
    console.error('Error getting teacher questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get questions by subject
export const getQuestionsBySubject = async (subject, teacherId) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('subject', '==', subject),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: questions
    };
  } catch (error) {
    console.error('Error getting questions by subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get questions by difficulty
export const getQuestionsByDifficulty = async (difficulty, teacherId) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('difficulty', '==', difficulty),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: questions
    };
  } catch (error) {
    console.error('Error getting questions by difficulty:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Search questions by text
export const searchQuestions = async (searchTerm, teacherId) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const q = query(
      collection(db, 'questions'),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const searchLower = searchTerm.toLowerCase();

    const filtered = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(question => {
        const questionTextMatch = question.questionText
          .toLowerCase()
          .includes(searchLower);
        const topicMatch = (question.topic || '')
          .toLowerCase()
          .includes(searchLower);
        const subjectMatch = (question.subject || '')
          .toLowerCase()
          .includes(searchLower);

        return questionTextMatch || topicMatch || subjectMatch;
      });

    return {
      success: true,
      data: filtered
    };
  } catch (error) {
    console.error('Error searching questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get questions by difficulty level for exam generation
export const getQuestionsByDifficultyAndTeacher = async (difficulty, teacherId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('difficulty', '==', difficulty),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Shuffle array for random selection
    return {
      success: true,
      data: shuffleArray(questions)
    };
  } catch (error) {
    console.error('Error getting questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to shuffle array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get all subjects created by teacher
export const getTeacherSubjects = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const subjects = new Set();

    querySnapshot.docs.forEach(doc => {
      if (doc.data().subject) {
        subjects.add(doc.data().subject);
      }
    });

    return {
      success: true,
      data: Array.from(subjects).sort()
    };
  } catch (error) {
    console.error('Error getting teacher subjects:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get total questions count
export const getQuestionCount = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'questions'),
      where('createdBy', '==', teacherId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);

    return {
      success: true,
      data: querySnapshot.size
    };
  } catch (error) {
    console.error('Error getting question count:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
