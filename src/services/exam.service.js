import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
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
import { sortQuestionsByType } from '../utils/questionTypes';

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

  const linkedToClass =
    exam.classId === classId || (exam.classIds || []).includes(classId);

  // classExams snapshot stores visibility/schedule on document root
  if (linkedToClass && exam.visibility !== undefined) {
    return {
      visibility: exam.visibility || 'private',
      startTime: exam.startTime ?? null,
      endTime: exam.endTime ?? null
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
  const instanceId = record.id;
  const sourceExamId = record.sourceExamId || record.id;

  // Per-class instance: settings live only on this classExams document
  const visibility = record.visibility ?? 'private';
  const startTime = record.startTime ?? null;
  const endTime = record.endTime ?? null;

  return {
    ...record,
    id: instanceId,
    instanceId,
    sourceExamId,
    examId: sourceExamId,
    classId,
    visibility,
    startTime,
    endTime
  };
};

export const isClassExamVisibleInList = (exam, classId) => {
  const normalized = normalizeClassExamRecord(exam, classId);
  if (normalized.visibility !== 'public') return false;
  if (normalized.endTime && isScheduleExpired(normalized.endTime)) return false;
  return true;
};

export const canStudentTakeClassExam = (exam, classId) => {
  const { visibility, startTime, endTime } = normalizeClassExamRecord(exam, classId);

  if (visibility !== 'public') {
    return { allowed: false, message: 'Bài thi chưa được mở cho lớp này' };
  }

  const start = toDateValue(startTime);
  const end = toDateValue(endTime);

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

export const getExamDataForClass = async (classId, classExamInstanceId) => {
  const classExamRef = doc(db, 'classes', classId, 'classExams', classExamInstanceId);
  const classExamSnap = await getDoc(classExamRef);

  if (classExamSnap.exists()) {
    return {
      success: true,
      data: normalizeClassExamRecord({ id: classExamSnap.id, ...classExamSnap.data() }, classId)
    };
  }

  const masterSnap = await getDoc(doc(db, 'exams', classExamInstanceId));
  if (masterSnap.exists() && (masterSnap.data().classIds || []).includes(classId)) {
    return {
      success: true,
      data: mergeExamForClass({ id: masterSnap.id, ...masterSnap.data() }, classId)
    };
  }

  return { success: false, error: 'Exam not found for this class' };
};

// Create exam with topic-based or selected question ID selection
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
      questionCount,
      selectedQuestionIds
    } = examData;

    let selectedQuestions = [];
    let usedTopicIds = [];

    if (selectedQuestionIds && selectedQuestionIds.length > 0) {
      // Get selected questions from topics
      const topicsResult = await getDocs(collection(db, 'subjects', subjectId, 'topics'));
      for (const topicDoc of topicsResult.docs) {
        const topicId = topicDoc.id;
        usedTopicIds.push(topicId);
        const questionsSnap = await getDocs(collection(db, 'subjects', subjectId, 'topics', topicId, 'questions'));
        for (const questionDoc of questionsSnap.docs) {
          if (selectedQuestionIds.includes(questionDoc.id)) {
            selectedQuestions.push({
              id: questionDoc.id,
              ...questionDoc.data()
            });
          }
        }
      }
    } else {
      // Original topic-based random selection
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

      usedTopicIds = topicIds;

      const questionsResult = await getRandomQuestionsFromTopics(
        subjectId,
        topicIds,
        questionCount
      );

      if (!questionsResult.success) {
        return questionsResult;
      }

      selectedQuestions = questionsResult.data;

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
    }

    selectedQuestions = sortQuestionsByType(selectedQuestions);

    // Calculate total points from questions
    const totalPoints = calculateTotalPoints(selectedQuestions);
    const passingScore = calculatePassingScore(totalPoints);
    const questionIds = selectedQuestions.map((q) => ({
      id: q.id,
      points: q.points || 1
    }));

    const classIdsArray = Array.isArray(classIds) ? classIds : classIds ? [classIds] : [];

    // Create exam document (class assignment via assignExamToClass → classExams)
    const docRef = await addDoc(collection(db, 'exams'), {
      title,
      description: description || '',
      teacherId,
      classIds: [],
      durationMinutes: parseInt(durationMinutes),
      subjectId,
      topicIds: usedTopicIds,
      questionIds,
      totalQuestions: selectedQuestions.length,
      totalPoints,
      passingScore,
      visibility: 'private',
      classSettings: {},
      visibleToClassIds: [],
      startTime: null,
      endTime: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null
    });

    const assignWarnings = [];
    for (const classId of classIdsArray) {
      const assignResult = await assignExamToClass(docRef.id, classId);
      if (!assignResult.success) {
        assignWarnings.push(assignResult.error || `Không gán được lớp ${classId}`);
      }
    }

    return {
      success: true,
      data: {
        id: docRef.id,
        title,
        description,
        totalQuestions: selectedQuestions.length,
        totalPoints,
        passingScore,
        assignedClassCount: classIdsArray.length - assignWarnings.length,
        assignWarnings
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

const examHasClassCopies = async (sourceExamId, teacherId) => {
  if (!teacherId) return false;

  const classesSnap = await getDocs(
    query(collection(db, 'classes'), where('teacherId', '==', teacherId))
  );

  for (const classDoc of classesSnap.docs) {
    const classExamsSnap = await getDocs(
      collection(db, 'classes', classDoc.id, 'classExams')
    );
    const hasCopy = classExamsSnap.docs.some(
      (d) => (d.data().sourceExamId || d.id) === sourceExamId
    );
    if (hasCopy) return true;
  }

  return false;
};

// Xóa khỏi danh sách môn học. Bản sao trong classExams (và bài làm của lớp) được giữ nguyên.
export const deleteExam = async (examId) => {
  try {
    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      return { success: false, error: 'Không tìm thấy bài thi' };
    }

    const examData = examSnap.data();
    const classIds = examData.classIds || [];
    const hasClassCopies =
      classIds.length > 0 ||
      (await examHasClassCopies(examId, examData.teacherId));

    if (hasClassCopies) {
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
    const attemptsSnap = await getDocs(attemptsQuery);
    await Promise.all(attemptsSnap.docs.map((d) => deleteDoc(d.ref)));

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

const toSafeFirestoreId = (value, fallback) => {
  const text = String(value || '').trim() || fallback;
  return text.replace(/\//g, '_');
};

export const saveExamPrintVersions = async (examId, versions) => {
  try {
    if (!examId) {
      return { success: false, error: 'Missing exam id' };
    }

    const normalizedVersions = Array.isArray(versions) ? versions.slice(0, 4) : [];
    if (normalizedVersions.length === 0) {
      return { success: false, error: 'Missing print versions' };
    }

    const batch = writeBatch(db);
    const examRef = doc(db, 'exams', examId);

    normalizedVersions.forEach((version, index) => {
      const versionName = String(version.versionName || index + 1).trim() || String(index + 1);
      const versionRef = doc(
        db,
        'exams',
        examId,
        'printVersions',
        toSafeFirestoreId(version.docId || versionName, String(index + 1))
      );

      batch.set(
        versionRef,
        {
          examId,
          versionName,
          codeLabel: version.codeLabel || versionName,
          order: index + 1,
          questionCount: version.questionCount || 0,
          mcqCount: version.mcqCount || 0,
          essayCount: version.essayCount || 0,
          answerKey: version.answerKey || {},
          questionMap: version.questionMap || [],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    batch.update(examRef, {
      printVersionSummary: {
        versionCount: normalizedVersions.length,
        versionNames: normalizedVersions.map((version, index) =>
          String(version.versionName || index + 1).trim() || String(index + 1)
        ),
        updatedAt: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    return { success: true, data: { examId, versionCount: normalizedVersions.length } };
  } catch (error) {
    console.error('Error saving exam print versions:', error);
    return { success: false, error: error.message };
  }
};

export const saveClassExamPrintVersions = async (
  classId,
  classExamInstanceId,
  versions
) => {
  try {
    if (!classId || !classExamInstanceId) {
      return { success: false, error: 'Missing class exam id' };
    }

    const normalizedVersions = Array.isArray(versions) ? versions.slice(0, 4) : [];
    if (normalizedVersions.length === 0) {
      return { success: false, error: 'Missing print versions' };
    }

    const batch = writeBatch(db);
    const classExamRef = doc(db, 'classes', classId, 'classExams', classExamInstanceId);

    normalizedVersions.forEach((version, index) => {
      const versionName = String(version.versionName || index + 1).trim() || String(index + 1);
      const versionRef = doc(
        db,
        'classes',
        classId,
        'classExams',
        classExamInstanceId,
        'printVersions',
        toSafeFirestoreId(version.docId || versionName, String(index + 1))
      );

      batch.set(
        versionRef,
        {
          ...version,
          classId,
          classExamInstanceId,
          versionName,
          codeLabel: version.codeLabel || versionName,
          order: index + 1,
          questionCount: version.questionCount || 0,
          mcqCount: version.mcqCount || 0,
          essayCount: version.essayCount || 0,
          answerKey: version.answerKey || {},
          questionMap: version.questionMap || [],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    batch.update(classExamRef, {
      printVersionSummary: {
        versionCount: normalizedVersions.length,
        versionNames: normalizedVersions.map((version, index) =>
          String(version.versionName || index + 1).trim() || String(index + 1)
        ),
        updatedAt: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    return {
      success: true,
      data: { classId, classExamInstanceId, versionCount: normalizedVersions.length }
    };
  } catch (error) {
    console.error('Error saving class exam print versions:', error);
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

// Get exams assigned to a class (student view) — classExams subcollection only
export const getExamsByClass = async (classId) => {
  try {
    const exams = (await getClassExamsSnapshot(classId))
      .filter((exam) => isClassExamActiveForStudents(exam, classId))
      .map((exam) => normalizeClassExamRecord(exam, classId))
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

// Get all exams assigned to a class (teacher view) — classExams subcollection only
export const getExamsByClassForTeacher = async (classId, teacherId) => {
  try {
    let exams = await getClassExamsSnapshot(classId);

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
    const assignedInClass = await getClassExamsSnapshot(classId);
    const assignedSourceIds = new Set(
      assignedInClass.map((e) => e.sourceExamId || e.id)
    );

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
      .filter((exam) => !assignedSourceIds.has(exam.id))
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

// Per-class visibility (lock / unlock) — classExamInstanceId = doc id in classExams
export const setClassExamVisibility = async (classExamInstanceId, classId, visibility) => {
  try {
    const classExamRef = doc(db, 'classes', classId, 'classExams', classExamInstanceId);
    const classExamSnap = await getDoc(classExamRef);

    if (!classExamSnap.exists()) {
      return { success: false, error: 'Class exam not found' };
    }

    const instanceData = classExamSnap.data();
    const sourceExamId = instanceData.sourceExamId;
    const existingStart = instanceData.startTime ?? null;
    const existingEnd = instanceData.endTime ?? null;

    await updateDoc(classExamRef, {
      visibility,
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: classExamInstanceId, classId, visibility } };
  } catch (error) {
    console.error('Error setting class exam visibility:', error);
    return { success: false, error: error.message };
  }
};

// Per-class schedule
export const setClassExamSchedule = async (classExamInstanceId, classId, startTime, endTime) => {
  try {
    const classExamRef = doc(db, 'classes', classId, 'classExams', classExamInstanceId);
    const classExamSnap = await getDoc(classExamRef);

    if (!classExamSnap.exists()) {
      return { success: false, error: 'Class exam not found' };
    }

    const instanceData = classExamSnap.data();
    const sourceExamId = instanceData.sourceExamId;
    const visibility = instanceData.visibility || 'private';

    const schedule = {
      visibility,
      startTime: startTime || null,
      endTime: endTime || null
    };

    await updateDoc(classExamRef, {
      ...schedule,
      updatedAt: serverTimestamp()
    });

    return { success: true, data: { id: classExamInstanceId, classId } };
  } catch (error) {
    console.error('Error setting class exam schedule:', error);
    return { success: false, error: error.message };
  }
};

// Get exam with questions (fetch question details from subcollections)
export const getExamWithQuestions = async (
  sourceExamId,
  classId = null,
  classExamInstanceId = null
) => {
  try {
    let examData;
    let examDocId = sourceExamId;

    if (classId && classExamInstanceId) {
      const classResult = await getExamDataForClass(classId, classExamInstanceId);
      if (!classResult.success) {
        return classResult;
      }
      examData = classResult.data;
      examDocId = classResult.data.sourceExamId || sourceExamId;
    } else {
      const examSnap = await getDoc(doc(db, 'exams', sourceExamId));
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
        questions: sortQuestionsByType(questions)
      }
    };
  } catch (error) {
    console.error('Error getting exam with questions:', error);
    return { success: false, error: error.message };
  }
};

// Assign exam — creates a new independent instance per assignment
export const assignExamToClass = async (sourceExamId, classId) => {
  try {
    const examRef = doc(db, 'exams', sourceExamId);
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

    const instanceRef = await addDoc(collection(db, 'classes', classId, 'classExams'), {
      ...pickExamSnapshotFields(sourceExamId, examData),
      sourceExamId,
      classId,
      visibility: 'private',
      startTime: null,
      endTime: null,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(examRef, {
      classIds: arrayUnion(classId),
      classSettings,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      data: {
        id: instanceRef.id,
        instanceId: instanceRef.id,
        sourceExamId
      }
    };
  } catch (error) {
    console.error('Error assigning exam:', error);
    return { success: false, error: error.message };
  }
};

// Remove class exam instance and its attempts (fresh state if re-assigned)
export const removeExamFromClass = async (classId, classExamInstanceId) => {
  try {
    const classExamRef = doc(db, 'classes', classId, 'classExams', classExamInstanceId);
    const classExamSnap = await getDoc(classExamRef);

    if (!classExamSnap.exists()) {
      return { success: false, error: 'Class exam not found' };
    }

    const sourceExamId = classExamSnap.data().sourceExamId;

    const attemptsByInstance = query(
      collection(db, 'examAttempts'),
      where('classId', '==', classId),
      where('classExamInstanceId', '==', classExamInstanceId)
    );
    const instanceAttempts = await getDocs(attemptsByInstance);

    const deletePromises = instanceAttempts.docs.map((d) => deleteDoc(d.ref));

    if (sourceExamId) {
      const legacyAttempts = query(
        collection(db, 'examAttempts'),
        where('examId', '==', sourceExamId),
        where('classId', '==', classId)
      );
      const legacySnap = await getDocs(legacyAttempts);
      legacySnap.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
    }

    await Promise.all(deletePromises);
    await deleteDoc(classExamRef);

    const remainingSnap = await getDocs(collection(db, 'classes', classId, 'classExams'));
    const stillAssigned = remainingSnap.docs.some(
      (d) => d.data().sourceExamId === sourceExamId
    );

    if (sourceExamId && !stillAssigned) {
      const examRef = doc(db, 'exams', sourceExamId);
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
    }

    return { success: true, data: { id: classExamInstanceId, sourceExamId } };
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
