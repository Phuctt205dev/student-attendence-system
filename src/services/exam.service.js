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
import {
  getRandomQuestionsFromTopics,
  calculateTotalPoints,
  calculatePassingScore
} from './subject.service';

// Create exam with topic-based question selection
export const createExam = async (examData) => {
  try {
    const {
      teacherId,
      title,
      description,
      classIds,
      durationMinutes,
      subjectId,
      topicIds,
      questionCount
    } = examData;

    if (!subjectId || !topicIds || topicIds.length === 0) {
      return {
        success: false,
        error: 'Please select subject and at least one topic'
      };
    }

    if (!questionCount || questionCount < 1) {
      return {
        success: false,
        error: 'Please specify at least one question'
      };
    }

    // Get random questions from selected topics
    const questionsResult = await getRandomQuestionsFromTopics(
      subjectId,
      topicIds,
      questionCount
    );

    if (!questionsResult.success) {
      return questionsResult;
    }

    const selectedQuestions = questionsResult.data;

    if (selectedQuestions.length === 0) {
      return {
        success: false,
        error: `No questions found in selected topics. Available: ${questionsResult.totalAvailable}`
      };
    }

    if (selectedQuestions.length < questionCount) {
      return {
        success: false,
        error: `Not enough questions. Requested: ${questionCount}, Available: ${selectedQuestions.length}`
      };
    }

    // Calculate total points from questions
    const totalPoints = calculateTotalPoints(selectedQuestions);
    const passingScore = calculatePassingScore(totalPoints);
    const questionIds = selectedQuestions.map((q) => ({
      id: q.id,
      points: q.points || 1
    }));

    // Create exam document
    const docRef = await addDoc(collection(db, 'exams'), {
      title,
      description: description || '',
      teacherId,
      classIds: Array.isArray(classIds) ? classIds : [classIds],
      durationMinutes: parseInt(durationMinutes),
      subjectId,
      topicIds,
      questionIds,
      totalQuestions: selectedQuestions.length,
      totalPoints,
      passingScore,
      status: 'draft',
      startTime: null,
      endTime: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        title,
        description,
        totalQuestions: selectedQuestions.length,
        totalPoints,
        passingScore
      }
    };
  } catch (error) {
    console.error('Error creating exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update exam (only for draft exams)
export const updateExam = async (examId, examData) => {
  try {
    const exam = await getDoc(doc(db, 'exams', examId));
    if (!exam.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    if (exam.data().status === 'published') {
      return { success: false, error: 'Cannot edit published exam' };
    }

    const updateData = {
      title: examData.title,
      description: examData.description || '',
      durationMinutes: examData.durationMinutes,
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, 'exams', examId), updateData);

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error updating exam:', error);
    return { success: false, error: error.message };
  }
};

// Publish exam
export const publishExam = async (examId, startTime, endTime) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status: 'published',
      startTime,
      endTime,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error publishing exam:', error);
    return { success: false, error: error.message };
  }
};

// Close exam
export const closeExam = async (examId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status: 'closed',
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error closing exam:', error);
    return { success: false, error: error.message };
  }
};

// Delete exam (only draft exams)
export const deleteExam = async (examId) => {
  try {
    const exam = await getDoc(doc(db, 'exams', examId));

    if (!exam.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    if (exam.data().status !== 'draft') {
      return { success: false, error: 'Can only delete draft exams' };
    }

    const q = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );
    const attempts = await getDocs(q);

    if (attempts.size > 0) {
      return { success: false, error: 'Cannot delete exam with student submissions' };
    }

    await deleteDoc(doc(db, 'exams', examId));

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error deleting exam:', error);
    return { success: false, error: error.message };
  }
};

// Get exam by ID
export const getExamById = async (examId) => {
  try {
    const docSnap = await getDoc(doc(db, 'exams', examId));

    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() }
      };
    } else {
      return { success: false, error: 'Exam not found' };
    }
  } catch (error) {
    console.error('Error getting exam:', error);
    return { success: false, error: error.message };
  }
};

// Get exams by teacher
export const getTeacherExams = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'exams'),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const exams = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting teacher exams:', error);
    return { success: false, error: error.message };
  }
};

// Get exams assigned to a class
export const getExamsByClass = async (classId) => {
  try {
    const q = query(
      collection(db, 'exams'),
      where('classIds', 'array-contains', classId)
    );

    const querySnapshot = await getDocs(q);
    const exams = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((exam) => exam.status === 'published' || exam.status === 'closed')
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting class exams:', error);
    return { success: false, error: error.message };
  }
};

// Get exam with questions (fetch question details from subcollections)
export const getExamWithQuestions = async (examId, subjectId) => {
  try {
    const examSnap = await getDoc(doc(db, 'exams', examId));

    if (!examSnap.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const examData = examSnap.data();
    const questions = [];

    // Fetch each question from the new hierarchical structure
    for (const qRef of examData.questionIds) {
      // Search through all topics for this question
      for (const topicId of examData.topicIds) {
        const qSnap = await getDoc(
          doc(db, 'subjects', examData.subjectId, 'topics', topicId, 'questions', qRef.id)
        );

        if (qSnap.exists()) {
          questions.push({
            id: qSnap.id,
            ...qSnap.data()
          });
          break;
        }
      }
    }

    return {
      success: true,
      data: {
        id: examSnap.id,
        ...examData,
        questions
      }
    };
  } catch (error) {
    console.error('Error getting exam with questions:', error);
    return { success: false, error: error.message };
  }
};

// Assign exam to additional classes
export const assignExamToClass = async (examId, classId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      classIds: arrayUnion(classId),
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error assigning exam:', error);
    return { success: false, error: error.message };
  }
};

// Remove exam from class
export const removeExamFromClass = async (examId, classId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      classIds: arrayRemove(classId),
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error removing exam from class:', error);
    return { success: false, error: error.message };
  }
};

// Get exam statistics
export const getExamStatistics = async (examId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map((doc) => doc.data());

    const totalAttempts = attempts.length;
    const submittedAttempts = attempts.filter((a) => a.status !== 'in-progress');
    const scores = submittedAttempts.map((a) => a.score);

    const exam = await getExamById(examId);

    const stats = {
      totalAttempts,
      submittedAttempts: submittedAttempts.length,
      avgScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      passedCount: submittedAttempts.filter(
        (a) => a.score >= (exam.data?.passingScore || 50)
      ).length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting exam statistics:', error);
    return { success: false, error: error.message };
  }
};
