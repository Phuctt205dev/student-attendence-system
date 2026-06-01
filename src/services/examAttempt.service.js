import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
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

// Start exam attempt (scoped per class)
export const startExamAttempt = async (studentId, examId, classId) => {
  try {
    if (!classId) {
      return { success: false, error: 'Class ID is required' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      where('examId', '==', examId),
      where('classId', '==', classId),
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
      examId,
      classId,
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
        examId,
        classId,
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
      isCorrect: false // Will be calculated on submit
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

    // Get exam to fetch questions
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

    // Calculate score
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

    // Calculate duration
    const submittedAt = new Date();
    const startedAtDate = startedAt?.toDate?.() || new Date(startedAt);
    const duration = Math.round((submittedAt - startedAtDate) / (1000 * 60)); // minutes

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
    } else {
      return {
        success: false,
        error: 'Attempt not found'
      };
    }
  } catch (error) {
    console.error('Error getting attempt:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get student's attempt for exam in a specific class
export const getStudentExamAttempt = async (studentId, examId, classId) => {
  try {
    if (!classId) {
      return { success: false, error: 'Class ID is required' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      where('examId', '==', examId),
      where('classId', '==', classId)
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

// Get all attempts for an exam
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

export const getExamAttemptsForClass = async (examId, classId) => {
  const result = await getExamAttempts(examId);
  if (!result.success) return result;

  const data = (result.data || []).filter((attempt) => attempt.classId === classId);

  return { success: true, data };
};

export const countCorrectAnswers = (attempt) => {
  if (!attempt?.answers) return 0;
  return Object.values(attempt.answers).filter((answer) => answer?.isCorrect).length;
};

// Get student's all exam attempts
export const getStudentExamAttempts = async (studentId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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

    // Get exam
    const examSnap = await getDoc(doc(db, 'exams', examId));
    if (!examSnap.exists()) {
      return {
        success: false,
        error: 'Exam not found'
      };
    }

    const examData = examSnap.data();
    const questionRefs = examData.questionIds || [];

    // Get questions with answers
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
