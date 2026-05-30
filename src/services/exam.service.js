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
  getQuestionsByDifficultyAndTeacher,
  getQuestionById
} from './questionBank.service';

// Create exam (with automatic question selection)
export const createExam = async (examData) => {
  try {
    const { teacherId, classIds, durationMinutes, questionDistribution } = examData;

    // Validate question distribution
    const { easy = 0, medium = 0, hard = 0 } = questionDistribution;
    const totalQuestions = easy + medium + hard;

    if (totalQuestions === 0) {
      return {
        success: false,
        error: 'Please specify at least one question'
      };
    }

    // Select questions randomly from each difficulty
    const selectedQuestions = [];

    // Get easy questions
    if (easy > 0) {
      const easyQs = await getQuestionsByDifficultyAndTeacher('easy', teacherId);
      if (easyQs.success && easyQs.data.length > 0) {
        selectedQuestions.push(...easyQs.data.slice(0, easy));
      } else if (easyQs.data.length < easy) {
        return {
          success: false,
          error: `Not enough easy questions. Available: ${easyQs.data.length}, Required: ${easy}`
        };
      }
    }

    // Get medium questions
    if (medium > 0) {
      const mediumQs = await getQuestionsByDifficultyAndTeacher('medium', teacherId);
      if (mediumQs.success && mediumQs.data.length > 0) {
        selectedQuestions.push(...mediumQs.data.slice(0, medium));
      } else if (mediumQs.data.length < medium) {
        return {
          success: false,
          error: `Not enough medium questions. Available: ${mediumQs.data.length}, Required: ${medium}`
        };
      }
    }

    // Get hard questions
    if (hard > 0) {
      const hardQs = await getQuestionsByDifficultyAndTeacher('hard', teacherId);
      if (hardQs.success && hardQs.data.length > 0) {
        selectedQuestions.push(...hardQs.data.slice(0, hard));
      } else if (hardQs.data.length < hard) {
        return {
          success: false,
          error: `Not enough hard questions. Available: ${hardQs.data.length}, Required: ${hard}`
        };
      }
    }

    // Shuffle selected questions
    const shuffledQuestions = shuffleArray(selectedQuestions);
    const questionIds = shuffledQuestions.map(q => q.id);

    // Create exam document
    const docRef = await addDoc(collection(db, 'exams'), {
      title: examData.title,
      description: examData.description || '',
      teacherId,
      classIds: Array.isArray(classIds) ? classIds : [classIds],
      durationMinutes,
      totalQuestions,
      status: 'draft',
      questionIds,
      questionDistribution: {
        easy,
        medium,
        hard
      },
      totalPoints: totalQuestions * 2.5, // 2.5 points per question = 100 total
      passingScore: Math.ceil(totalQuestions * 1.25), // 50% passing
      startTime: examData.startTime || null,
      endTime: examData.endTime || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        ...examData,
        questionIds,
        totalQuestions,
        totalPoints: totalQuestions * 2.5
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

// Update exam
export const updateExam = async (examId, examData) => {
  try {
    // Don't allow updating questions if exam is published
    const exam = await getDoc(doc(db, 'exams', examId));
    if (exam.exists() && exam.data().status === 'published') {
      return {
        success: false,
        error: 'Cannot edit published exam'
      };
    }

    const updateData = {
      title: examData.title,
      description: examData.description || '',
      durationMinutes: examData.durationMinutes,
      updatedAt: serverTimestamp()
    };

    // Optional fields
    if (examData.startTime !== undefined) {
      updateData.startTime = examData.startTime;
    }
    if (examData.endTime !== undefined) {
      updateData.endTime = examData.endTime;
    }

    await updateDoc(doc(db, 'exams', examId), updateData);

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error updating exam:', error);
    return {
      success: false,
      error: error.message
    };
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

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error publishing exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Close exam
export const closeExam = async (examId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status: 'closed',
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error closing exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete exam
export const deleteExam = async (examId) => {
  try {
    // Check if exam has any attempts
    const q = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );
    const attempts = await getDocs(q);

    if (attempts.size > 0) {
      return {
        success: false,
        error: 'Cannot delete exam with student submissions'
      };
    }

    await deleteDoc(doc(db, 'exams', examId));

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error deleting exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get exam by ID
export const getExamById = async (examId) => {
  try {
    const docSnap = await getDoc(doc(db, 'exams', examId));

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
        error: 'Exam not found'
      };
    }
  } catch (error) {
    console.error('Error getting exam:', error);
    return {
      success: false,
      error: error.message
    };
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
    const exams = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: exams
    };
  } catch (error) {
    console.error('Error getting teacher exams:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get exams assigned to a class
export const getExamsByClass = async (classId) => {
  try {
    const q = query(
      collection(db, 'exams'),
      where('classIds', 'array-contains', classId),
      where('status', 'in', ['published', 'closed']),
      orderBy('startTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const exams = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: exams
    };
  } catch (error) {
    console.error('Error getting class exams:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get exam with questions
export const getExamWithQuestions = async (examId) => {
  try {
    const examSnap = await getDoc(doc(db, 'exams', examId));

    if (!examSnap.exists()) {
      return {
        success: false,
        error: 'Exam not found'
      };
    }

    const examData = examSnap.data();
    const questions = [];

    // Fetch each question
    for (const questionId of examData.questionIds) {
      const qSnap = await getDoc(doc(db, 'questions', questionId));
      if (qSnap.exists()) {
        questions.push({
          id: qSnap.id,
          ...qSnap.data()
        });
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
    return {
      success: false,
      error: error.message
    };
  }
};

// Assign exam to additional classes
export const assignExamToClass = async (examId, classId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      classIds: arrayUnion(classId),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error assigning exam:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Remove exam from class
export const removeExamFromClass = async (examId, classId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      classIds: arrayRemove(classId),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: { id: examId }
    };
  } catch (error) {
    console.error('Error removing exam from class:', error);
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

// Get exam statistics
export const getExamStatistics = async (examId) => {
  try {
    const q = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = querySnapshot.docs.map(doc => doc.data());

    const totalAttempts = attempts.length;
    const submittedAttempts = attempts.filter(a => a.status !== 'in-progress');
    const scores = submittedAttempts.map(a => a.score);

    const stats = {
      totalAttempts,
      submittedAttempts: submittedAttempts.length,
      avgScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      passedCount: submittedAttempts.filter(a => {
        const exam = getExamById(examId);
        return a.score >= (exam.data?.passingScore || 50);
      }).length
    };

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error('Error getting exam statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
