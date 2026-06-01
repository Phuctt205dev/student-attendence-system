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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const getQuestionFromExam = async (examData, questionId) => {
  const subjectId = examData.subjectId;
  const topicIds = examData.topicIds || [];

  for (const topicId of topicIds) {
    const qSnap = await getDoc(
      doc(db, 'subjects', subjectId, 'topics', topicId, 'questions', questionId)
    );

    if (qSnap.exists()) {
      return { id: qSnap.id, ...qSnap.data() };
    }
  }

  return null;
};

// Start exam attempt — scoped per class exam instance
export const startExamAttempt = async (
  studentId,
  sourceExamId,
  classId,
  classExamInstanceId
) => {
  try {
    if (!classId || !classExamInstanceId) {
      return { success: false, error: 'Class exam instance is required' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      where('classExamInstanceId', '==', classExamInstanceId),
      where('status', '==', 'in-progress')
    );

    const existing = await getDocs(q);
    if (existing.size > 0) {
      const existingAttempt = existing.docs[0];
      return {
        success: true,
        data: {
          id: existingAttempt.id,
          ...existingAttempt.data()
        }
      };
    }

    const docRef = await addDoc(collection(db, 'examAttempts'), {
      studentId,
      examId: sourceExamId,
      classId,
      classExamInstanceId,
      startedAt: serverTimestamp(),
      submittedAt: null,
      answers: {},
      score: 0,
      totalScore: 0,
      duration: 0,
      status: 'in-progress',
      gradedAt: null
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        studentId,
        examId: sourceExamId,
        classId,
        classExamInstanceId,
        startedAt: new Date(),
        status: 'in-progress'
      }
    };
  } catch (error) {
    console.error('Error starting exam attempt:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update answer (student selecting an option)
export const updateAnswer = async (attemptId, questionId, selectedAnswer) => {
  try {
    const attemptRef = doc(db, 'examAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return {
        success: false,
        error: 'Attempt not found'
      };
    }

    const answers = attemptSnap.data().answers || {};
    answers[questionId] = {
      selected: selectedAnswer,
      isCorrect: false
    };

    await updateDoc(attemptRef, {
      answers,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: {
        id: attemptId,
        answers
      }
    };
  } catch (error) {
    console.error('Error updating answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Submit exam
export const submitExamAttempt = async (attemptId) => {
  try {
    const attemptRef = doc(db, 'examAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return {
        success: false,
        error: 'Attempt not found'
      };
    }

    const attemptData = attemptSnap.data();
    const { examId, answers, startedAt } = attemptData;

    const examSnap = await getDoc(doc(db, 'exams', examId));
    if (!examSnap.exists()) {
      return {
        success: false,
        error: 'Exam not found'
      };
    }

    const examData = examSnap.data();
    const questionRefs = examData.questionIds || [];
    let totalPoints = examData.totalPoints || 0;

    let earnedPoints = 0;
    const updatedAnswers = { ...answers };

    for (const questionRef of questionRefs) {
      const questionId = questionRef.id || questionRef;
      if (!answers[questionId]) continue;

      const question = await getQuestionFromExam(examData, questionId);
      if (!question) continue;

      const isCorrect = answers[questionId].selected === question.correctAnswer;
      updatedAnswers[questionId].isCorrect = isCorrect;

      if (isCorrect) {
        const points = questionRef.points ?? question.points ?? 1;
        earnedPoints += points;
      }
    }

    if (!totalPoints) {
      totalPoints = questionRefs.reduce((sum, ref) => sum + (ref.points ?? 1), 0);
    }

    const submittedAt = new Date();
    const startedAtDate = startedAt?.toDate?.() || new Date(startedAt);
    const duration = Math.round((submittedAt - startedAtDate) / (1000 * 60));

    await updateDoc(attemptRef, {
      answers: updatedAnswers,
      score: Math.round(earnedPoints * 100) / 100,
      totalScore: totalPoints,
      submittedAt: serverTimestamp(),
      duration,
      status: 'submitted',
      gradedAt: serverTimestamp()
    });

    return {
      success: true,
      data: {
        id: attemptId,
        score: Math.round(earnedPoints * 100) / 100,
        totalScore: totalPoints,
        percentage: Math.round((earnedPoints / totalPoints) * 100)
      }
    };
  } catch (error) {
    console.error('Error submitting exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get attempt by ID
export const getAttemptById = async (attemptId) => {
  try {
    const docSnap = await getDoc(doc(db, 'examAttempts', attemptId));

    if (docSnap.exists()) {
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...docSnap.data()
        }
      };
    }

    return {
      success: false,
      error: 'Attempt not found'
    };
  } catch (error) {
    console.error('Error getting attempt:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get student's attempt for a class exam instance
export const getStudentExamAttempt = async (studentId, classExamInstanceId) => {
  try {
    if (!classExamInstanceId) {
      return { success: false, error: 'Class exam instance is required' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      where('classExamInstanceId', '==', classExamInstanceId)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.size === 0) {
      return { success: false, error: 'No attempt found' };
    }

    const attempts = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    attempts.sort((a, b) => {
      const aTime = a.submittedAt?.seconds || a.startedAt?.seconds || 0;
      const bTime = b.submittedAt?.seconds || b.startedAt?.seconds || 0;
      return bTime - aTime;
    });

    return { success: true, data: attempts[0] };
  } catch (error) {
    console.error('Error getting student exam attempt:', error);
    return { success: false, error: error.message };
  }
};

// Get all attempts for an exam (by source exam id — teacher overview)
export const getExamAttempts = async (examId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    attempts.sort((a, b) => {
      const aTime = a.submittedAt?.seconds || a.startedAt?.seconds || 0;
      const bTime = b.submittedAt?.seconds || b.startedAt?.seconds || 0;
      return bTime - aTime;
    });

    return {
      success: true,
      data: attempts
    };
  } catch (error) {
    console.error('Error getting exam attempts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getExamAttemptsForClass = async (classExamInstanceId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('classExamInstanceId', '==', classExamInstanceId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    attempts.sort((a, b) => {
      const aTime = a.submittedAt?.seconds || a.startedAt?.seconds || 0;
      const bTime = b.submittedAt?.seconds || b.startedAt?.seconds || 0;
      return bTime - aTime;
    });

    return { success: true, data: attempts };
  } catch (error) {
    console.error('Error getting class exam attempts:', error);
    return { success: false, error: error.message };
  }
};

// Get student's all exam attempts
export const getStudentExamAttempts = async (studentId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    attempts.sort((a, b) => {
      const aTime = a.submittedAt?.seconds || 0;
      const bTime = b.submittedAt?.seconds || 0;
      return bTime - aTime;
    });

    return {
      success: true,
      data: attempts
    };
  } catch (error) {
    console.error('Error getting student attempts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get attempt with questions and answers
export const getAttemptWithDetails = async (attemptId) => {
  try {
    const attemptSnap = await getDoc(doc(db, 'examAttempts', attemptId));

    if (!attemptSnap.exists()) {
      return {
        success: false,
        error: 'Attempt not found'
      };
    }

    const attemptData = attemptSnap.data();
    const { examId, answers } = attemptData;

    const examSnap = await getDoc(doc(db, 'exams', examId));
    if (!examSnap.exists()) {
      return {
        success: false,
        error: 'Exam not found'
      };
    }

    const examData = examSnap.data();
    const questionRefs = examData.questionIds || [];

    const questionsWithAnswers = [];
    for (const questionRef of questionRefs) {
      const questionId = questionRef.id || questionRef;
      const question = await getQuestionFromExam(examData, questionId);
      if (!question) continue;

      questionsWithAnswers.push({
        id: questionId,
        ...question,
        studentAnswer: answers[questionId]?.selected || null,
        isCorrect: answers[questionId]?.isCorrect || false
      });
    }

    return {
      success: true,
      data: {
        id: attemptSnap.id,
        ...attemptData,
        exam: {
          id: examSnap.id,
          ...examData
        },
        questions: questionsWithAnswers
      }
    };
  } catch (error) {
    console.error('Error getting attempt with details:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const countCorrectAnswers = (attempt) => {
  if (!attempt?.answers) return 0;
  return Object.values(attempt.answers).filter((answer) => answer?.isCorrect).length;
};
