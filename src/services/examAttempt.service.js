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
import {
  isEssayQuestion,
  sortQuestionsByType,
  getQuestionMaxPoints
} from '../utils/questionTypes';

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
      where('classId', '==', classId),
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

// Update answer — MCQ: { selected }, essay: { textAnswer }
export const updateAnswer = async (attemptId, questionId, answerPayload) => {
  try {
    const attemptRef = doc(db, 'examAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return {
        success: false,
        error: 'Attempt not found'
      };
    }

    const prev = attemptSnap.data().answers?.[questionId] || {};
    const answers = attemptSnap.data().answers || {};

    if (typeof answerPayload === 'string') {
      answers[questionId] = { ...prev, selected: answerPayload, isCorrect: false };
    } else if (answerPayload?.textAnswer !== undefined) {
      answers[questionId] = {
        ...prev,
        textAnswer: answerPayload.textAnswer,
        isCorrect: false
      };
    } else {
      answers[questionId] = { ...prev, ...answerPayload, isCorrect: false };
    }

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

    let mcqEarned = 0;
    let mcqTotal = 0;
    let essayTotal = 0;
    let hasEssay = false;
    const updatedAnswers = { ...answers };

    for (const questionRef of questionRefs) {
      const questionId = questionRef.id || questionRef;
      const question = await getQuestionFromExam(examData, questionId);
      if (!question) continue;

      const points = getQuestionMaxPoints(question, questionRef);

      if (isEssayQuestion(question)) {
        hasEssay = true;
        essayTotal += points;
        if (updatedAnswers[questionId]) {
          updatedAnswers[questionId].pendingGrade = true;
        }
        continue;
      }

      mcqTotal += points;
      if (!answers[questionId]?.selected) continue;

      const isCorrect = answers[questionId].selected === question.correctAnswer;
      updatedAnswers[questionId] = {
        ...updatedAnswers[questionId],
        isCorrect
      };

      if (isCorrect) {
        mcqEarned += points;
      }
    }

    const fullTotal = mcqTotal + essayTotal;
    const mcqScore = Math.round(mcqEarned * 100) / 100;
    const submittedAt = new Date();
    const startedAtDate = startedAt?.toDate?.() || new Date(startedAt);
    const duration = Math.round((submittedAt - startedAtDate) / (1000 * 60));

    const updatePayload = {
      answers: updatedAnswers,
      mcqScore,
      mcqTotalPoints: mcqTotal,
      essayTotalPoints: essayTotal,
      essayScore: hasEssay ? null : 0,
      score: mcqScore,
      totalScore: fullTotal,
      essayPending: hasEssay,
      submittedAt: serverTimestamp(),
      duration,
      status: hasEssay ? 'submitted' : 'graded',
      gradedAt: hasEssay ? null : serverTimestamp()
    };

    await updateDoc(attemptRef, updatePayload);

    return {
      success: true,
      data: {
        id: attemptId,
        score: mcqScore,
        totalScore: fullTotal,
        mcqScore,
        mcqTotalPoints: mcqTotal,
        essayPending: hasEssay,
        percentage: mcqTotal ? Math.round((mcqEarned / mcqTotal) * 100) : 0
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

// Get student's attempt for one class assignment (scoped by class + instance)
export const getStudentExamAttempt = async (
  studentId,
  classExamInstanceId,
  classId,
  sourceExamId = null
) => {
  try {
    if (!classExamInstanceId || !classId) {
      return { success: false, error: 'Class and exam instance are required' };
    }

    const byInstance = query(
      collection(db, 'examAttempts'),
      where('studentId', '==', studentId),
      where('classId', '==', classId),
      where('classExamInstanceId', '==', classExamInstanceId)
    );

    let querySnapshot = await getDocs(byInstance);

    // Legacy attempts (examId + classId only, no classExamInstanceId)
    if (querySnapshot.size === 0 && sourceExamId) {
      const legacyQ = query(
        collection(db, 'examAttempts'),
        where('studentId', '==', studentId),
        where('classId', '==', classId),
        where('examId', '==', sourceExamId)
      );
      querySnapshot = await getDocs(legacyQ);
    }

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

export const getExamAttemptsForClass = async (classExamInstanceId, classId) => {
  try {
    if (!classExamInstanceId || !classId) {
      return { success: false, error: 'Class and exam instance are required' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('classId', '==', classId),
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

      const answer = answers[questionId] || {};
      questionsWithAnswers.push({
        id: questionId,
        ...question,
        maxPoints: getQuestionMaxPoints(question, questionRef),
        studentAnswer: isEssayQuestion(question)
          ? answer.textAnswer || null
          : answer.selected || null,
        essayScore: answer.essayScore ?? null,
        isCorrect: answer.isCorrect || false,
        pendingGrade: answer.pendingGrade || false
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
        questions: sortQuestionsByType(questionsWithAnswers)
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

export const gradeEssayAttempt = async (attemptId, essayScores) => {
  try {
    const attemptRef = doc(db, 'examAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return { success: false, error: 'Attempt not found' };
    }

    const attemptData = attemptSnap.data();
    const examSnap = await getDoc(doc(db, 'exams', attemptData.examId));
    if (!examSnap.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const examData = examSnap.data();
    const answers = { ...attemptData.answers };
    let essayEarned = 0;

    for (const questionRef of examData.questionIds || []) {
      const questionId = questionRef.id || questionRef;
      const question = await getQuestionFromExam(examData, questionId);
      if (!question || !isEssayQuestion(question)) continue;

      const maxPoints = getQuestionMaxPoints(question, questionRef);
      const raw = essayScores[questionId];
      const earned = Math.min(Math.max(Number(raw) || 0, 0), maxPoints);

      answers[questionId] = {
        ...(answers[questionId] || {}),
        essayScore: earned,
        pendingGrade: false,
        graded: true
      };
      essayEarned += earned;
    }

    const mcqScore = attemptData.mcqScore ?? attemptData.score ?? 0;
    const mcqTotal = attemptData.mcqTotalPoints ?? 0;
    const essayTotal = attemptData.essayTotalPoints ?? 0;
    const totalScore = mcqTotal + essayTotal;
    const finalScore = Math.round((mcqScore + essayEarned) * 100) / 100;

    await updateDoc(attemptRef, {
      answers,
      essayScore: Math.round(essayEarned * 100) / 100,
      score: finalScore,
      totalScore,
      essayPending: false,
      status: 'graded',
      gradedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { score: finalScore, totalScore, essayScore: essayEarned }
    };
  } catch (error) {
    console.error('Error grading essay attempt:', error);
    return { success: false, error: error.message };
  }
};
