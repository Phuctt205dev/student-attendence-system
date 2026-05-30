import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSubjectById,
  getSubjectTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../../services/subject.service';
import { getExamWithQuestions, getExamsBySubject, setExamVisibility, setExamSchedule } from '../../services/exam.service';
import { getClassesByTeacher } from '../../services/class.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { ChevronLeft, Plus, Edit2, Trash2, BookOpen, AlertCircle, CheckCircle, Eye, FileText, Lock, Unlock, Calendar } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import TopicForm from '../../components/teacher/TopicForm';
import QuestionForm from '../../components/teacher/QuestionForm';
import ExamCreationModal from '../../components/teacher/ExamCreationModal';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
} from 'docx';

const SubjectDetail = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [lastQuestionPoints, setLastQuestionPoints] = useState(1);

  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [classMap, setClassMap] = useState({});
  const [scheduleExam, setScheduleExam] = useState(null);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const [pdfExam, setPdfExam] = useState(null);
  const [pdfFaculty, setPdfFaculty] = useState('');
  const [pdfCodeBase, setPdfCodeBase] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (subjectId) {
      loadSubjectAndTopics();
    }
  }, [subjectId]);

  useEffect(() => {
    if (subjectId && userProfile?.uid) {
      loadSubjectExams();
      loadTeacherClasses();
    }
  }, [subjectId, userProfile?.uid]);

  const loadSubjectAndTopics = async () => {
    setLoading(true);

    // Load subject
    const subjectResult = await getSubjectById(subjectId);
    if (!subjectResult.success) {
      setError(subjectResult.error || 'Failed to load subject');
      setLoading(false);
      return;
    }

    setSubject(subjectResult.data);

    // Load topics
    const topicsResult = await getSubjectTopics(subjectId);
    if (topicsResult.success) {
      setTopics(topicsResult.data);
      setError('');
    } else {
      setError(topicsResult.error || 'Failed to load topics');
    }

    setLoading(false);
  };

  const handleOpenCreateTopicModal = () => {
    setEditingTopic(null);
    setShowTopicModal(true);
  };

  const handleOpenEditTopicModal = (topic) => {
    setEditingTopic(topic);
    setShowTopicModal(true);
  };

  const handleSubmitTopic = async (data) => {
    try {
      setSubmitting(true);
      let result;

      if (editingTopic) {
        result = await updateTopic(subjectId, editingTopic.id, data);
      } else {
        result = await createTopic(subjectId, data);
      }

      if (result.success) {
        setSuccess(editingTopic ? 'Topic updated!' : 'Topic created!');
        setShowTopicModal(false);
        loadSubjectAndTopics();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Error saving topic');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    const result = await deleteTopic(subjectId, topicId);
    if (result.success) {
      setSuccess('Topic deleted!');
      loadSubjectAndTopics();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete topic');
    }
  };

  const handleViewQuestions = async (topic) => {
    setSelectedTopic(topic);
    setQuestionsLoading(true);

    const result = await getTopicQuestions(subjectId, topic.id);
    if (result.success) {
      setQuestions(result.data);
    } else {
      setError(result.error || 'Failed to load questions');
    }

    setQuestionsLoading(false);
    setShowQuestionsModal(true);
  };

  const handleOpenCreateQuestionModal = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestionModal = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSubmitQuestion = async (data) => {
    try {
      setSubmitting(true);
      let result;

      if (editingQuestion) {
        result = await updateQuestion(subjectId, selectedTopic.id, editingQuestion.id, data);
      } else {
        result = await createQuestion(subjectId, selectedTopic.id, {
          ...data,
          createdBy: userProfile?.uid
        });
      }

      if (result.success) {
        setSuccess(editingQuestion ? 'Question updated!' : 'Question created!');
        setLastQuestionPoints(data.points || 1);
        setShowQuestionModal(false);
        setEditingQuestion(null);

        // Reload questions in modal
        const questionsResult = await getTopicQuestions(subjectId, selectedTopic.id);
        if (questionsResult.success) {
          setQuestions(questionsResult.data);
        }

        // Reload topics to update questionCount on topic card
        const topicsResult = await getSubjectTopics(subjectId);
        if (topicsResult.success) {
          setTopics(topicsResult.data);
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Error saving question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    const result = await deleteQuestion(subjectId, selectedTopic.id, questionId);
    if (result.success) {
      setSuccess('Question deleted!');

      // Reload questions in modal
      const questionsResult = await getTopicQuestions(subjectId, selectedTopic.id);
      if (questionsResult.success) {
        setQuestions(questionsResult.data);
      }

      // Reload topics to update questionCount on topic card
      const topicsResult = await getSubjectTopics(subjectId);
      if (topicsResult.success) {
        setTopics(topicsResult.data);
      }

      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete question');
    }
  };

  const handleToggleTopicSelection = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleOpenExamModal = () => {
    if (selectedTopicIds.length === 0) {
      setError('Vui lòng chọn ít nhất một chủ đề');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setShowExamModal(true);
  };

  const handleExamCreated = (examData) => {
    setSuccess('Bài thi được tạo thành công!');
    setShowExamModal(false);
    setSelectedTopicIds([]);
    loadSubjectExams();
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadSubjectExams = async () => {
    setExamsLoading(true);
    const result = await getExamsBySubject(subjectId, userProfile?.uid);
    if (result.success) {
      setExams(result.data || []);
    } else {
      setError(result.error || 'Failed to load exams');
    }
    setExamsLoading(false);
  };

  const loadTeacherClasses = async () => {
    const result = await getClassesByTeacher(userProfile?.uid);
    if (!result.success) return;

    const nextMap = (result.classes || []).reduce((acc, cls) => {
      acc[cls.id] = cls.className || cls.name;
      return acc;
    }, {});

    setClassMap(nextMap);
  };

  const getStatusBadge = (visibility) => {
    const styles = {
      private: 'bg-gray-100 text-gray-800',
      public: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      private: 'Private',
      public: 'Public'
    };

    const nextVisibility = visibility || 'private';

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[nextVisibility] || styles.private}`}>
        {labels[nextVisibility] || 'Private'}
      </span>
    );
  };

  const toLocalInputValue = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue?.toDate?.() || new Date(dateValue);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const openScheduleModal = (exam) => {
    setScheduleExam(exam);
    setScheduleStart(toLocalInputValue(exam.startTime));
    setScheduleEnd(toLocalInputValue(exam.endTime));
    setScheduleError('');
  };

  const handleSaveSchedule = async () => {
    if (!scheduleExam) return;

    const startDate = scheduleStart ? new Date(scheduleStart) : null;
    const endDate = scheduleEnd ? new Date(scheduleEnd) : null;

    if (startDate && endDate && endDate <= startDate) {
      setScheduleError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const result = await setExamSchedule(scheduleExam.id, startDate, endDate);
    if (result.success) {
      setScheduleExam(null);
      setScheduleStart('');
      setScheduleEnd('');
      setScheduleError('');
      loadSubjectExams();
    } else {
      setScheduleError(result.error || 'Không thể lưu lịch thi');
    }
  };

  const handleToggleVisibility = async (exam) => {
    const nextVisibility = exam.visibility === 'public' ? 'private' : 'public';
    const now = new Date();
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (nextVisibility === 'public' && endTime && endTime <= now) {
      setError('Không thể mở bài thi vì thời gian kết thúc đã qua');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const result = await setExamVisibility(exam.id, nextVisibility);
    if (result.success) {
      loadSubjectExams();
    } else {
      setError(result.error || 'Không thể cập nhật trạng thái');
      setTimeout(() => setError(''), 3000);
    }
  };

  const hashToSeed = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 1;
  };

  const createSeededRandom = (seed) => {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  };

  const shuffleWithSeed = (items, seedValue) => {
    const result = [...items];
    const rand = createSeededRandom(seedValue);
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const buildExamDocxChildren = ({ examData, questions, subjectName, facultyName, codeLabel }) => {
    // Build question paragraphs
    const questionParagraphs = [];
    
    questions.forEach((question, index) => {
      // Question text
      questionParagraphs.push(
        new Paragraph({
          text: `Câu ${index + 1}: ${question.questionText}`,
          bold: true,
          spacing: { after: 100, before: 150 },
        })
      );

      // Answer options
      ['A', 'B', 'C', 'D']
        .filter((key) => question.options?.[key] !== undefined)
        .forEach((key) => {
          questionParagraphs.push(
            new Paragraph({
              text: `${key}. ${question.options?.[key]}`,
              spacing: { after: 50 },
              indent: { left: 400 },
            })
          );
        });

      questionParagraphs.push(
        new Paragraph({
          text: '',
          spacing: { after: 150 },
        })
      );
    });

    // Header section - School + Exam Info
    const headerTable = new Table({
      rows: [
        new TableRow({
          cells: [
            // Left: School info
            new TableCell({
              children: [
                new Paragraph({
                  text: 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN',
                  bold: true,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: `KHOA ${facultyName || ''}`,
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE },
                bottom: { style: BorderStyle.SINGLE },
                left: { style: BorderStyle.SINGLE },
                right: { style: BorderStyle.SINGLE },
              },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 200, bottom: 200, left: 100, right: 100 },
            }),
            // Center: Exam info
            new TableCell({
              children: [
                new Paragraph({
                  text: 'ĐỀ THI CUỐI HỌC KỲ ... (20.. - 20..)',
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  size: 28,
                }),
                new Paragraph({
                  text: `Môn học: ${subjectName}`,
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                }),
                new Paragraph({
                  text: `Thời gian làm bài: ${examData?.durationMinutes ? examData.durationMinutes + ' phút' : ''}`,
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE },
                bottom: { style: BorderStyle.SINGLE },
                left: { style: BorderStyle.SINGLE },
                right: { style: BorderStyle.SINGLE },
              },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 200, bottom: 200, left: 100, right: 100 },
            }),
            // Right: Code
            new TableCell({
              children: [
                new Paragraph({
                  text: 'Mã đề thi',
                  alignment: AlignmentType.CENTER,
                  bold: true,
                  spacing: { after: 150 },
                }),
                new Paragraph({
                  text: codeLabel,
                  alignment: AlignmentType.CENTER,
                  bold: true,
                  size: 40,
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE },
                bottom: { style: BorderStyle.SINGLE },
                left: { style: BorderStyle.SINGLE },
                right: { style: BorderStyle.SINGLE },
              },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 200, bottom: 200, left: 100, right: 100 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: 'pct' },
    });

    // Student info section
    const studentInfoTable = new Table({
      rows: [
        new TableRow({
          cells: [
            new TableCell({
              children: [new Paragraph('Họ, tên SV: ...................................................')],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [new Paragraph('Mã SV: ...................................................')],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [new Paragraph('STT: ...................................................')],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: 'pct' },
    });

    return [
      headerTable,
      new Paragraph({ text: '', spacing: { after: 200 } }),
      studentInfoTable,
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({
        text: 'A. TRẮC NGHIỆM',
        bold: true,
        size: 26,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '_'.repeat(100),
        spacing: { after: 200 },
      }),
      ...questionParagraphs,
      new Paragraph({ text: '', spacing: { after: 300 } }),
      new Paragraph({
        text: '[Phiếu trả lời trắc nghiệm - OMR sẽ được thêm vào đây]',
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({
        text: 'Thí sinh lưu ý:',
        bold: true,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• Giữ cho phiếu phẳng, không bôi bẩn, làm rách, không lấy xóa.',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• Tô đen hoàn toàn vào các ô vuông, dùng bút chì HB.',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• Không được ghi chú và các ô vuông khác ngoài phần trả lời.',
        spacing: { after: 100 },
      }),
    ];
  };

  const getOmrImageBuffer = async () => {
    const response = await fetch('/omr-template.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Không thể đọc ảnh OMR'));
      reader.readAsDataURL(blob);
    });
  };

  const handleExportDoc = async () => {
    if (!pdfExam) return;
    setPdfLoading(true);
    setError('');

    try {
      const result = await getExamWithQuestions(pdfExam.id);
      if (!result.success) {
        setError(result.error || 'Không thể tải bài thi');
        setPdfLoading(false);
        return;
      }

      const questions = result.data.questions || [];
      const subjectName = subject?.name || '';
      const baseCode = pdfCodeBase || pdfExam.id.slice(0, 6).toUpperCase();

      let omrImageBuffer = null;
      try {
        const response = await fetch('/omr-template.png');
        const blob = await response.blob();
        omrImageBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes);
          };
          reader.onerror = () => reject(new Error('Không thể đọc ảnh OMR'));
          reader.readAsDataURL(blob);
        });
      } catch (imageError) {
        console.warn('Không thể tải ảnh OMR:', imageError.message);
      }

      const seedA = hashToSeed(`${pdfExam.id}-A`);
      const seedB = hashToSeed(`${pdfExam.id}-B`);
      const versionA = shuffleWithSeed(questions, seedA);
      const versionB = shuffleWithSeed(questions, seedB);

      // Build version A children
      const childrenA = buildExamDocxChildren({
        examData: result.data,
        questions: versionA,
        subjectName,
        facultyName: pdfFaculty,
        codeLabel: `${baseCode}-A`,
      });

      // Build version B children
      const childrenB = buildExamDocxChildren({
        examData: result.data,
        questions: versionB,
        subjectName,
        facultyName: pdfFaculty,
        codeLabel: `${baseCode}-B`,
      });

      // Create documents (docx auto-creates sections from plain objects)
      const docA = new Document({
        sections: [
          {
            children: childrenA,
          },
        ],
      });

      const docB = new Document({
        sections: [
          {
            children: childrenB,
          },
        ],
      });

      // Download version A
      const blobA = await Packer.toBlob(docA);
      const urlA = URL.createObjectURL(blobA);
      const linkA = document.createElement('a');
      linkA.href = urlA;
      linkA.download = `de-thi-${baseCode}-A.docx`;
      document.body.appendChild(linkA);
      linkA.click();
      document.body.removeChild(linkA);
      URL.revokeObjectURL(urlA);

      // Small delay before second download
      await new Promise(resolve => setTimeout(resolve, 500));

      // Download version B
      const blobB = await Packer.toBlob(docB);
      const urlB = URL.createObjectURL(blobB);
      const linkB = document.createElement('a');
      linkB.href = urlB;
      linkB.download = `de-thi-${baseCode}-B.docx`;
      document.body.appendChild(linkB);
      linkB.click();
      document.body.removeChild(linkB);
      URL.revokeObjectURL(urlB);

      setSuccess('Xuất file Word thành công! Đã tạo 2 mã đề A và B.');
    } catch (err) {
      console.error('Lỗi xuất file:', err);
      setError('Lỗi xuất file: ' + (err.message || 'Unknown error'));
    } finally {
      setPdfLoading(false);
      setPdfExam(null);
    }
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/teacher/subjects')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {loading ? 'Loading...' : subject?.name}
                </h1>
                {subject?.description && (
                  <p className="text-gray-600 mt-1">{subject.description}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Topics Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Chủ đề</h2>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={handleOpenExamModal}
                  disabled={selectedTopicIds.length === 0}
                >
                  Tạo bài thi ({selectedTopicIds.length})
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateTopicModal}
                >
                  Thêm chủ đề
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : topics.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có chủ đề</h3>
                  <p className="text-gray-600 mb-6">Hãy tạo chủ đề đầu tiên</p>
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleOpenCreateTopicModal}
                  >
                    Tạo chủ đề
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <Card key={topic.id} className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedTopicIds.includes(topic.id)}
                          onChange={() => handleToggleTopicSelection(topic.id)}
                          className="w-5 h-5 mt-1 rounded border-gray-300 cursor-pointer"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
                          {topic.description && (
                            <p className="text-gray-600 mt-1">{topic.description}</p>
                          )}
                          <div className="mt-3 text-sm text-gray-500">
                            <span className="font-semibold text-gray-900">{topic.questionCount || 0}</span> câu hỏi
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleViewQuestions(topic)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View questions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditTopicModal(topic)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Exams Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bài thi</h2>
            </div>

            {examsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : exams.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có bài thi</h3>
                  <p className="text-gray-600">Bài thi mới tạo sẽ xuất hiện ở đây</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => {
                  const classNames = (exam.classIds || [])
                    .map((id) => classMap[id])
                    .filter(Boolean);

                  const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
                  const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
                  const isLocked = endTime && new Date() > endTime;

                  return (
                    <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                            {getStatusBadge(exam.visibility)}
                            {isLocked && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                                Đã khóa
                              </span>
                            )}
                          </div>

                          {exam.description && (
                            <p className="text-gray-600 text-sm mb-3">{exam.description}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                            <div className="text-gray-600">
                              <span className="font-medium">{exam.totalQuestions}</span> câu hỏi
                            </div>
                            <div className="text-gray-600">
                              <span className="font-medium">{exam.durationMinutes}</span> phút
                            </div>
                            <div className="text-gray-600 md:col-span-2">
                              {classNames.length > 0
                                ? classNames.join(', ')
                                : 'Chưa gán lớp'}
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            {startTime && endTime && (
                              <>
                                <div>
                                  Bắt đầu: {format(startTime, 'MMM dd, yyyy HH:mm')}
                                </div>
                                <div>
                                  Kết thúc: {format(endTime, 'MMM dd, yyyy HH:mm')}
                                </div>
                              </>
                            )}
                            <div>
                              Tạo {formatDistanceToNow(exam.createdAt?.toDate?.() || new Date(), {
                                addSuffix: true
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={exam.visibility === 'public' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            onClick={() => handleToggleVisibility(exam)}
                          >
                            {exam.visibility === 'public' ? 'Khóa' : 'Mở'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Calendar className="w-4 h-4" />}
                            onClick={() => openScheduleModal(exam)}
                          >
                            Đặt thời gian
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setPdfExam(exam);
                              setPdfCodeBase('');
                              setPdfFaculty('');
                            }}
                          >
                            Xuất Word
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Topic Modal */}
        <Modal
          isOpen={showTopicModal}
          onClose={() => {
            setShowTopicModal(false);
            setEditingTopic(null);
          }}
          title={editingTopic ? 'Chỉnh sửa chủ đề' : 'Tạo chủ đề'}
          size="md"
        >
          <TopicForm
            initialData={editingTopic}
            onSubmit={handleSubmitTopic}
            onCancel={() => {
              setShowTopicModal(false);
              setEditingTopic(null);
            }}
            loading={submitting}
          />
        </Modal>

        {/* Questions Modal */}
        <Modal
          isOpen={showQuestionsModal}
          onClose={() => {
            setShowQuestionsModal(false);
            setSelectedTopic(null);
            setQuestions([]);
            setEditingQuestion(null);
          }}
          title={selectedTopic ? `${selectedTopic.name} - Câu hỏi` : 'Câu hỏi'}
          size="lg"
        >
          {questionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Chưa có câu hỏi nào</p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateQuestionModal}
              >
                Thêm câu hỏi
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((question) => (
                  <Card key={question.id} className="p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{question.questionText}</p>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <div>
                            <span className="font-semibold">A:</span> {question.options?.A}
                          </div>
                          <div>
                            <span className="font-semibold">B:</span> {question.options?.B}
                          </div>
                          <div>
                            <span className="font-semibold">C:</span> {question.options?.C}
                          </div>
                          <div>
                            <span className="font-semibold">D:</span> {question.options?.D}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-3 text-xs text-gray-600">
                          <span>
                            <span className="font-semibold">Đáp án:</span> {question.correctAnswer}
                          </span>
                          <span>
                            <span className="font-semibold">Điểm:</span> {question.points}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditQuestionModal(question)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuestionsModal(false);
                    setSelectedTopic(null);
                    setQuestions([]);
                    setEditingQuestion(null);
                  }}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateQuestionModal}
                >
                  Thêm câu hỏi
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Question Modal */}
        <Modal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi'}
          size="md"
        >
          {selectedTopic && (
            <QuestionForm
              initialData={editingQuestion}
              lastQuestionPoints={lastQuestionPoints}
              onSubmit={handleSubmitQuestion}
              onCancel={() => {
                setShowQuestionModal(false);
                setEditingQuestion(null);
              }}
              loading={submitting}
            />
          )}
        </Modal>

        {/* Exam Creation Modal */}
        <Modal
          isOpen={showExamModal}
          onClose={() => {
            setShowExamModal(false);
          }}
          title={`Tạo bài thi từ ${selectedTopicIds.length} chủ đề`}
          size="md"
        >
          {selectedTopicIds.length > 0 && subject && (
            <ExamCreationModal
              subject={subject}
              topicIds={selectedTopicIds}
              topicNames={topics
                .filter((t) => selectedTopicIds.includes(t.id))
                .map((t) => t.name)}
              availableQuestionCount={topics
                .filter((t) => selectedTopicIds.includes(t.id))
                .reduce((sum, t) => sum + (t.questionCount || 0), 0)}
              teacherId={userProfile?.uid}
              onSuccess={handleExamCreated}
              onCancel={() => {
                setShowExamModal(false);
              }}
            />
          )}
        </Modal>

        {/* Schedule Modal */}
        <Modal
          isOpen={!!scheduleExam}
          onClose={() => {
            setScheduleExam(null);
            setScheduleStart('');
            setScheduleEnd('');
            setScheduleError('');
          }}
          title="Thiết lập thời gian"
          size="sm"
        >
          <div className="space-y-4">
            {scheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {scheduleError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bắt đầu
              </label>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(event) => setScheduleStart(event.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kết thúc
              </label>
              <input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(event) => setScheduleEnd(event.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setScheduleExam(null);
                  setScheduleStart('');
                  setScheduleEnd('');
                  setScheduleError('');
                }}
              >
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveSchedule}>
                Lưu
              </Button>
            </div>
          </div>
        </Modal>

        {/* PDF Export Modal */}
        <Modal
          isOpen={!!pdfExam}
          onClose={() => {
            setPdfExam(null);
            setPdfFaculty('');
            setPdfCodeBase('');
          }}
          title="Xuất file Word bài thi"
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khoa
              </label>
              <input
                type="text"
                value={pdfFaculty}
                onChange={(event) => setPdfFaculty(event.target.value)}
                placeholder="Mang may tinh & Truyen thong"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã đề (cơ bản)
              </label>
              <input
                type="text"
                value={pdfCodeBase}
                onChange={(event) => setPdfCodeBase(event.target.value)}
                placeholder="VD: 123456"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự tạo 2 mã đề: A và B.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPdfExam(null);
                  setPdfFaculty('');
                  setPdfCodeBase('');
                }}
              >
                Hủy
              </Button>
              <Button variant="primary" onClick={handleExportDoc} disabled={pdfLoading}>
                {pdfLoading ? 'Đang tạo...' : 'Tạo file Word'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default SubjectDetail;
