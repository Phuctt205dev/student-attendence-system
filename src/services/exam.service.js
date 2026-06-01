import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
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

const normalizeExamVisibility = (exam) => {
  if (exam.visibility) {
    return exam.visibility;
  }

  if (exam.status === 'published' || exam.status === 'closed') {
    return 'public';
  }

  return 'private';
};

const toDateValue = (value) => {
  if (!value) return null;
  return value?.toDate?.() || new Date(value);
};

const isScheduleExpired = (endTime) => {
  const end = toDateValue(endTime);
  if (!end) return false;
  return new Date() > end;
};

// Per-class exam settings (visibility + schedule)
export const getClassExamSettings = (exam, classId) => {
  const perClass = exam.classSettings?.[classId];
  if (perClass) {
    return {
      visibility: perClass.visibility || 'private',
      startTime: perClass.startTime ?? null,
      endTime: perClass.endTime ?? null
    };
  }

  if ((exam.classIds || []).includes(classId)) {
    return {
      visibility: normalizeExamVisibility(exam),
      startTime: exam.startTime ?? null,
      endTime: exam.endTime ?? null
    };
  }

  return {
    visibility: 'private',
    startTime: null,
    endTime: null
  };
};

export const mergeExamForClass = (exam, classId) => {
  const settings = getClassExamSettings(exam, classId);
  return {
    ...exam,
    classId,
    visibility: settings.visibility,
    startTime: settings.startTime,
    endTime: settings.endTime
  };
};

const isExamExpired = (exam) => isScheduleExpired(exam.endTime);

const pickExamSnapshotFields = (examId, examData) => ({
  sourceExamId: examId,
  subjectId: examData.subjectId,
  teacherId: examData.teacherId,
  title: examData.title,
  description: examData.description || '',
  questionIds: examData.questionIds || [],
  topicIds: examData.topicIds || [],
  totalQuestions: examData.totalQuestions,
  durationMinutes: examData.durationMinutes,
  totalPoints: examData.totalPoints,
  passingScore: examData.passingScore,
  visibility: 'private',
  startTime: null,
  endTime: null
});

export const normalizeClassExamRecord = (record, classId) => {
  const examId = record.sourceExamId || record.id;
  const visibility = record.visibility || getClassExamSettings(record, classId).visibility;
  const startTime = record.startTime ?? getClassExamSettings(record, classId).startTime;
  const endTime = record.endTime ?? getClassExamSettings(record, classId).endTime;

  return {
    ...record,
    id: examId,
    classId,
    visibility,
    startTime,
    endTime
  };
};

export const isClassExamVisibleInList = (exam, classId) => {
  const settings = getClassExamSettings(exam, classId);
  if (settings.visibility !== 'public') return false;
  if (settings.endTime && isScheduleExpired(settings.endTime)) return false;
  return true;
};

export const canStudentTakeClassExam = (exam, classId) => {
  const settings = getClassExamSettings(exam, classId);

  if (settings.visibility !== 'public') {
    return { allowed: false, message: 'Bài thi chưa được mở cho lớp này' };
  }

  const start = toDateValue(settings.startTime);
  const end = toDateValue(settings.endTime);

  if (!start || !end) {
    return {
      allowed: false,
      message: 'Giáo viên chưa thiết lập thời gian làm bài (bắt đầu và kết thúc)'
    };
  }

  const now = new Date();
  if (now < start) {
    return { allowed: false, message: 'Bài thi chưa đến giờ bắt đầu' };
  }
  if (now > end) {
    return { allowed: false, message: 'Bài thi đã hết thời gian làm bài' };
  }

  return { allowed: true, message: '' };
};

const isClassExamActiveForStudents = (exam, classId) => isClassExamVisibleInList(exam, classId);

const getClassExamsSnapshot = async (classId) => {
  const snapshot = await getDocs(collection(db, 'classes', classId, 'classExams'));
  return snapshot.docs.map((docSnap) =>
    normalizeClassExamRecord({ id: docSnap.id, ...docSnap.data() }, classId)
  );
};

const upsertClassExamSnapshot = async (classId, examId, examData, overrides = {}) => {
  const classExamRef = doc(db, 'classes', classId, 'classExams', examId);
  const existing = await getDoc(classExamRef);
  const base = existing.exists()
    ? existing.data()
    : pickExamSnapshotFields(examId, examData);

  await setDoc(
    classExamRef,
    {
      ...base,
      ...pickExamSnapshotFields(examId, examData),
      ...overrides,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { assignedAt: serverTimestamp() })
    },
    { merge: true }
  );
};

export const getExamDataForClass = async (classId, examId) => {
  const classExamRef = doc(db, 'classes', classId, 'classExams', examId);
  const classExamSnap = await getDoc(classExamRef);

  if (classExamSnap.exists()) {
    return {
      success: true,
      data: normalizeClassExamRecord({ id: classExamSnap.id, ...classExamSnap.data() }, classId)
    };
  }

  const masterSnap = await getDoc(doc(db, 'exams', examId));
  if (masterSnap.exists() && (masterSnap.data().classIds || []).includes(classId)) {
    return {
      success: true,
      data: mergeExamForClass({ id: masterSnap.id, ...masterSnap.data() }, classId)
    };
  }

  return { success: false, error: 'Exam not found for this class' };
};

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

    const classIdsArray = Array.isArray(classIds) ? classIds : classIds ? [classIds] : [];
    const classSettings = {};
    classIdsArray.forEach((id) => {
      classSettings[id] = {
        visibility: 'private',
        startTime: null,
        endTime: null
      };
    });

    // Create exam document
    const docRef = await addDoc(collection(db, 'exams'), {
      title,
      description: description || '',
      teacherId,
      classIds: classIdsArray,
      durationMinutes: parseInt(durationMinutes),
      subjectId,
      topicIds,
      questionIds,
      totalQuestions: selectedQuestions.length,
      totalPoints,
      passingScore,
      visibility: 'private',
      classSettings,
      visibleToClassIds: [],
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

    const visibility = normalizeExamVisibility(exam.data());
    if (visibility === 'public') {
      return { success: false, error: 'Cannot edit public exam' };
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
      visibility: 'public',
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
      visibility: 'private',
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error closing exam:', error);
    return { success: false, error: error.message };
  }
};

// Delete exam from subject list (class copies in classExams are kept)
export const deleteExam = async (examId) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const exam = await getDoc(examRef);

    if (!exam.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const classIds = exam.data().classIds || [];

    if (classIds.length > 0) {
      await updateDoc(examRef, {
        hiddenFromSubject: true,
        updatedAt: serverTimestamp()
      });
      return { success: true, data: { id: examId, detached: true } };
    }

    const attemptsQuery = query(
      collection(db, 'examAttempts'),
      where('examId', '==', examId)
    );
    const attempts = await getDocs(attemptsQuery);

    if (attempts.size > 0) {
      return {
        success: false,
        error: 'Không thể xóa bài thi đã có sinh viên nộp bài'
      };
    }

    await deleteDoc(examRef);

    return { success: true, data: { id: examId, detached: false } };
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
      ...doc.data(),
      visibility: normalizeExamVisibility(doc.data())
    }));

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting teacher exams:', error);
    return { success: false, error: error.message };
  }
};

// Get exams assigned to a class (student view)
export const getExamsByClass = async (classId) => {
  try {
    let exams = await getClassExamsSnapshot(classId);

    if (exams.length === 0) {
      const legacyQuery = query(
        collection(db, 'exams'),
        where('classIds', 'array-contains', classId)
      );
      const legacySnapshot = await getDocs(legacyQuery);
      exams = legacySnapshot.docs.map((docSnap) =>
        mergeExamForClass({ id: docSnap.id, ...docSnap.data() }, classId)
      );
    }

    exams = exams
      .filter((exam) => isClassExamActiveForStudents(exam, classId))
      .sort((a, b) => {
        const aTime = a.assignedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.assignedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting class exams:', error);
    return { success: false, error: error.message };
  }
};

// Get all exams assigned to a class (teacher view)
export const getExamsByClassForTeacher = async (classId, teacherId) => {
  try {
    let exams = await getClassExamsSnapshot(classId);

    if (exams.length === 0) {
      const q = query(
        collection(db, 'exams'),
        where('classIds', 'array-contains', classId)
      );
      const querySnapshot = await getDocs(q);
      exams = querySnapshot.docs.map((docSnap) =>
        mergeExamForClass({ id: docSnap.id, ...docSnap.data() }, classId)
      );
    }

    exams = exams
      .filter((exam) => !teacherId || exam.teacherId === teacherId)
      .sort((a, b) => {
        const aTime = a.assignedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.assignedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting class exams for teacher:', error);
    return { success: false, error: error.message };
  }
};

// Exams created by teacher but not yet assigned to this class
export const getTeacherExamsNotInClass = async (teacherId, classId) => {
  try {
    const q = query(
      collection(db, 'exams'),
      where('teacherId', '==', teacherId)
    );

    const querySnapshot = await getDocs(q);
    const exams = querySnapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        visibility: normalizeExamVisibility(docSnap.data())
      }))
      .filter((exam) => !(exam.classIds || []).includes(classId))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting unassigned exams:', error);
    return { success: false, error: error.message };
  }
};

// Get exams by subject (optionally filter by teacher on client side)
export const getExamsBySubject = async (subjectId, teacherId) => {
  try {
    const q = query(
      collection(db, 'exams'),
      where('subjectId', '==', subjectId)
    );

    const querySnapshot = await getDocs(q);
    let exams = querySnapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        visibility: normalizeExamVisibility(docSnap.data())
      }))
      .filter((exam) => !exam.hiddenFromSubject);

    if (teacherId) {
      exams = exams.filter((exam) => exam.teacherId === teacherId);
    }

    exams.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return { success: true, data: exams };
  } catch (error) {
    console.error('Error getting subject exams:', error);
    return { success: false, error: error.message };
  }
};

// Set visibility (public/private) — legacy global
export const setExamVisibility = async (examId, visibility) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      visibility,
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId, visibility } };
  } catch (error) {
    console.error('Error setting exam visibility:', error);
    return { success: false, error: error.message };
  }
};

// Set exam schedule — legacy global
export const setExamSchedule = async (examId, startTime, endTime) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      startTime: startTime || null,
      endTime: endTime || null,
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error setting exam schedule:', error);
    return { success: false, error: error.message };
  }
};

// Per-class visibility (lock / unlock for one class)
export const setClassExamVisibility = async (examId, classId, visibility) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const examData = examSnap.data();
    const classSettings = { ...(examData.classSettings || {}) };
    const existing = classSettings[classId] || {};

    classSettings[classId] = {
      ...existing,
      visibility,
      startTime: existing.startTime ?? null,
      endTime: existing.endTime ?? null
    };

    const updates = {
      classSettings,
      updatedAt: serverTimestamp()
    };

    if (visibility === 'public') {
      updates.visibleToClassIds = arrayUnion(classId);
    } else {
      updates.visibleToClassIds = arrayRemove(classId);
    }

    await updateDoc(examRef, updates);

    await upsertClassExamSnapshot(classId, examId, examData, {
      visibility,
      startTime: existing.startTime ?? null,
      endTime: existing.endTime ?? null
    });

    return { success: true, data: { id: examId, classId, visibility } };
  } catch (error) {
    console.error('Error setting class exam visibility:', error);
    return { success: false, error: error.message };
  }
};

// Per-class schedule
export const setClassExamSchedule = async (examId, classId, startTime, endTime) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const examData = examSnap.data();
    const classSettings = { ...(examData.classSettings || {}) };
    const existing = classSettings[classId] || {};

    const schedule = {
      visibility: existing.visibility || 'private',
      startTime: startTime || null,
      endTime: endTime || null
    };

    classSettings[classId] = schedule;

    await updateDoc(examRef, {
      classSettings,
      updatedAt: serverTimestamp()
    });

    await upsertClassExamSnapshot(classId, examId, examData, schedule);

    return { success: true, data: { id: examId, classId } };
  } catch (error) {
    console.error('Error setting class exam schedule:', error);
    return { success: false, error: error.message };
  }
};

// Get exam with questions (fetch question details from subcollections)
export const getExamWithQuestions = async (examId, classId = null) => {
  try {
    let examData;
    let examDocId = examId;

    if (classId) {
      const classResult = await getExamDataForClass(classId, examId);
      if (!classResult.success) {
        return classResult;
      }
      examData = classResult.data;
      examDocId = examId;
    } else {
      const examSnap = await getDoc(doc(db, 'exams', examId));
      if (!examSnap.exists()) {
        return { success: false, error: 'Exam not found' };
      }
      examData = examSnap.data();
    }
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
        id: examDocId,
        ...examData,
        questions
      }
    };
  } catch (error) {
    console.error('Error getting exam with questions:', error);
    return { success: false, error: error.message };
  }
};

// Assign exam to additional classes (independent snapshot per class)
export const assignExamToClass = async (examId, classId) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      return { success: false, error: 'Exam not found' };
    }

    const examData = examSnap.data();
    const classSettings = { ...(examData.classSettings || {}) };

    classSettings[classId] = {
      visibility: 'private',
      startTime: null,
      endTime: null
    };

    await upsertClassExamSnapshot(classId, examId, examData, {
      visibility: 'private',
      startTime: null,
      endTime: null
    });

    await updateDoc(examRef, {
      classIds: arrayUnion(classId),
      classSettings,
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: examId } };
  } catch (error) {
    console.error('Error assigning exam:', error);
    return { success: false, error: error.message };
  }
};

// Remove exam from class (does not delete master exam or other classes)
export const removeExamFromClass = async (examId, classId) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (examSnap.exists()) {
      const classSettings = { ...(examSnap.data().classSettings || {}) };
      delete classSettings[classId];

      await updateDoc(examRef, {
        classIds: arrayRemove(classId),
        classSettings,
        visibleToClassIds: arrayRemove(classId),
        updatedAt: serverTimestamp()
      });
    }

    await deleteDoc(doc(db, 'classes', classId, 'classExams', examId));

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
