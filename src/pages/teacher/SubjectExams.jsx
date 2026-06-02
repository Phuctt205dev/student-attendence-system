import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubjectById, getSubjectTopics, getTopicQuestions } from '../../services/subject.service';
import {
  getExamWithQuestions,
  getExamsBySubject,
  assignExamToClass,
  deleteExam
} from '../../services/exam.service';
import { getClassesByTeacher } from '../../services/class.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { ArrowLeft, Plus, BookOpen, AlertCircle, CheckCircle, Users, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ExamCreationModal from '../../components/teacher/ExamCreationModal';
import { formatDistanceToNow } from 'date-fns';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const SubjectExams = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedTopicIds, setExpandedTopicIds] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [showExamModal, setShowExamModal] = useState(false);

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [classMap, setClassMap] = useState({});
  const [pdfExam, setPdfExam] = useState(null);
  const [pdfFaculty, setPdfFaculty] = useState('');
  const [pdfCodeBase, setPdfCodeBase] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [assignExam, setAssignExam] = useState(null);
  const [assigningClassId, setAssigningClassId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadSubjectAndTopics = useCallback(async () => {
    setLoading(true);

    const subjectResult = await getSubjectById(subjectId);
    if (!subjectResult.success) {
      setError(subjectResult.error || 'Failed to load subject');
      setLoading(false);
      return;
    }

    setSubject(subjectResult.data);

    const topicsResult = await getSubjectTopics(subjectId);
    if (topicsResult.success) {
      // For each topic, load its questions
      const topicsWithQuestions = await Promise.all(
        topicsResult.data.map(async (topic) => {
          const questionsResult = await getTopicQuestions(subjectId, topic.id);
          if (questionsResult.success) {
            return {
              ...topic,
              questions: questionsResult.data
            };
          }
          return { ...topic, questions: [] };
        })
      );
      setTopics(topicsWithQuestions);
      setError('');
    } else {
      setError(topicsResult.error || 'Failed to load topics');
    }

    setLoading(false);
  }, [subjectId]);

  const toggleTopicExpansion = (topicId) => {
    setExpandedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const toggleAllQuestionsInTopic = (topic) => {
    const questionIds = (topic.questions || []).map(q => q.id);
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      const allSelected = questionIds.every(id => next.has(id));
      
      questionIds.forEach(id => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      
      return next;
    });
  };

  const isAllQuestionsSelectedInTopic = (topic) => {
    const questionIds = (topic.questions || []).map(q => q.id);
    if (questionIds.length === 0) return false;
    return questionIds.every(id => selectedQuestionIds.has(id));
  };

  const handleOpenExamModal = () => {
    if (selectedQuestionIds.size === 0) {
      setError('Vui lòng chọn ít nhất một câu hỏi');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setShowExamModal(true);
  };

  const handleExamCreated = () => {
    setSuccess('Bài thi được tạo thành công!');
    setShowExamModal(false);
    setSelectedTopicIds([]);
    loadSubjectExams();
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadSubjectExams = useCallback(async () => {
    setExamsLoading(true);
    const result = await getExamsBySubject(subjectId, userProfile?.uid);
    if (result.success) {
      setExams(result.data || []);
    } else {
      setError(result.error || 'Failed to load exams');
    }
    setExamsLoading(false);
  }, [subjectId, userProfile?.uid]);

  const loadTeacherClasses = useCallback(async () => {
    const result = await getClassesByTeacher(userProfile?.uid);
    if (!result.success) return;

    const nextMap = (result.classes || []).reduce((acc, cls) => {
      acc[cls.id] = cls.className || cls.name;
      return acc;
    }, {});

    setClassMap(nextMap);
  }, [userProfile?.uid]);

  const handleAssignToClass = async () => {
    if (!assignExam || !assigningClassId) return;

    setAssigning(true);
    const result = await assignExamToClass(assignExam.id, assigningClassId);
    if (result.success) {
      setSuccess('Đã gán bài thi vào lớp');
      setAssignExam(null);
      setAssigningClassId('');
      loadSubjectExams();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Không thể gán lớp');
      setTimeout(() => setError(''), 3000);
    }
    setAssigning(false);
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Xóa bài thi "${exam.title}"? Hành động không thể hoàn tác.`)) return;

    setDeletingId(exam.id);
    const result = await deleteExam(exam.id);
    if (result.success) {
      setSuccess(
        result.data?.detached
          ? 'Đã xóa khỏi môn học. Bài thi tại các lớp đã gán vẫn giữ nguyên.'
          : 'Đã xóa bài thi'
      );
      loadSubjectExams();
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(result.error || 'Không thể xóa bài thi');
      setTimeout(() => setError(''), 3000);
    }
    setDeletingId(null);
  };

  const getUnassignedClasses = (exam) => {
    const assigned = new Set(exam.classIds || []);
    return Object.entries(classMap).filter(([id]) => !assigned.has(id));
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

  const buildQuestionsText = (questions) => {
    return questions
      .map((question, index) => {
        const options = ['A', 'B', 'C', 'D']
          .filter((key) => question.options?.[key] !== undefined)
          .map((key) => `${key}. ${question.options?.[key]}`)
          .join('\n');

        return `Câu ${index + 1}: ${question.questionText}\n${options}`.trim();
      })
      .join('\n\n');
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

      const questions = Array.isArray(result.data.questions) ? result.data.questions : [];
      const subjectName = subject?.name || '';
      const baseCode = pdfCodeBase || pdfExam.id.slice(0, 6).toUpperCase();

      const seedA = hashToSeed(`${pdfExam.id}-A`);
      const versionA = shuffleWithSeed(questions, seedA);

      const templateUrl = `${import.meta.env.BASE_URL}templates/dethimau.docx`;
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }
      const templateBuffer = await templateResponse.arrayBuffer();

      const buildDocxBlob = (versionQuestions, codeLabel) => {
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{{', end: '}}' }
        });
        doc.setData({
          QUESTIONS: buildQuestionsText(versionQuestions),
          EXAM_CODE: codeLabel,
          SUBJECT: subjectName,
          FACULTY: pdfFaculty,
          DURATION: result.data?.durationMinutes ? `${result.data.durationMinutes} phút` : ''
        });
        doc.render();
        return doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      };

      const blobA = buildDocxBlob(versionA, `${baseCode}-A`);
      const urlA = URL.createObjectURL(blobA);
      const linkA = document.createElement('a');
      linkA.href = urlA;
      linkA.download = `de-thi-${baseCode}.docx`;
      document.body.appendChild(linkA);
      linkA.click();
      document.body.removeChild(linkA);
      URL.revokeObjectURL(urlA);

      setSuccess('Xuất file Word thành công! Đã tạo 2 mã đề A và B.');
    } catch (err) {
      console.error('Lỗi xuất file:', err);
      if (err?.stack) {
        console.error(err.stack);
      }
      setError('Lỗi xuất file: ' + (err?.message || String(err)));
    } finally {
      setPdfLoading(false);
      setPdfExam(null);
    }
  };

  useEffect(() => {
    if (subjectId) {
      loadSubjectAndTopics();
    }
  }, [subjectId, loadSubjectAndTopics]);

  useEffect(() => {
    if (subjectId && userProfile?.uid) {
      loadSubjectExams();
      loadTeacherClasses();
    }
  }, [subjectId, userProfile?.uid, loadSubjectExams, loadTeacherClasses]);

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                onClick={() => navigate(`/teacher/subjects/${subjectId}`)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Bài thi</h1>
                  <p className="text-gray-600 mt-1">{subject?.name}</p>
                </div>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenExamModal}
                disabled={selectedTopicIds.length === 0}
              >
                Tạo bài thi
              </Button>
            </div>
          </div>
        </header>

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

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Chọn câu hỏi</h2>
                <span className="text-sm text-gray-500">
                  Đã chọn {selectedQuestionIds.size} câu hỏi
                </span>
              </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : topics.length === 0 ? (
              <Card>
                <div className="text-center py-10">
                  <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có chủ đề</h3>
                  <p className="text-gray-600">Vui lòng tạo chủ đề trước khi tạo bài thi</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <Card key={topic.id} className="hover:shadow-lg transition-shadow">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleTopicExpansion(topic.id)}
                    >
                      <div
                        className="w-5 h-5 mt-1 rounded border-gray-300 cursor-pointer flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllQuestionsInTopic(topic);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isAllQuestionsSelectedInTopic(topic)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleAllQuestionsInTopic(topic);
                          }}
                          className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
                            {topic.description && (
                              <p className="text-gray-600 mt-1">{topic.description}</p>
                            )}
                            <div className="mt-3 text-sm text-gray-500">
                              <span className="font-semibold text-gray-900">
                                {topic.questions.length}
                              </span> câu hỏi
                            </div>
                          </div>
                          <div>
                            {expandedTopicIds.includes(topic.id) ? (
                              <ChevronUp className="w-6 h-6 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {expandedTopicIds.includes(topic.id) && topic.questions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {topic.questions.map((question) => (
                          <div
                            key={question.id}
                            className="flex items-start gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.has(question.id)}
                              onChange={() => toggleQuestionSelection(question.id)}
                              className="w-4 h-4 mt-0.5 rounded border-gray-300 cursor-pointer"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {question.questionText}
                              </p>
                              {question.options && Object.keys(question.options).length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {Object.entries(question.options).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      {key}. {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Danh sách bài thi</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Mở khóa và đặt thời gian cho từng lớp tại Chi tiết lớp học → tab Bài thi.
            </p>

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

                  return (
                    <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                            {getStatusBadge(exam.visibility)}
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

                          <div className="text-xs text-gray-500">
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
                            icon={<Users className="w-4 h-4" />}
                            onClick={() => {
                              setAssignExam(exam);
                              setAssigningClassId('');
                            }}
                          >
                            Gán lớp
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
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4" />}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            disabled={deletingId === exam.id}
                            onClick={() => handleDeleteExam(exam)}
                          >
                            {deletingId === exam.id ? 'Đang xóa...' : 'Xóa'}
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

        <Modal
          isOpen={showExamModal}
          onClose={() => {
            setShowExamModal(false);
          }}
          title={`Tạo bài thi với ${selectedQuestionIds.size} câu hỏi`}
          size="md"
        >
          {selectedQuestionIds.size > 0 && subject && (
            <ExamCreationModal
              subject={subject}
              selectedQuestionIds={Array.from(selectedQuestionIds)}
              topics={topics}
              availableQuestionCount={selectedQuestionIds.size}
              teacherId={userProfile?.uid}
              onSuccess={handleExamCreated}
              onCancel={() => {
                setShowExamModal(false);
              }}
            />
          )}
        </Modal>

        <Modal
          isOpen={!!assignExam}
          onClose={() => {
            setAssignExam(null);
            setAssigningClassId('');
          }}
          title="Gán bài thi vào lớp"
          size="sm"
        >
          {assignExam && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Bài thi: <span className="font-medium text-gray-900">{assignExam.title}</span>
              </p>
              {getUnassignedClasses(assignExam).length === 0 ? (
                <p className="text-sm text-gray-500">Đã gán vào tất cả lớp của bạn</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn lớp
                    </label>
                    <select
                      value={assigningClassId}
                      onChange={(e) => setAssigningClassId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {getUnassignedClasses(assignExam).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssignExam(null);
                        setAssigningClassId('');
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!assigningClassId || assigning}
                      onClick={handleAssignToClass}
                    >
                      {assigning ? 'Đang gán...' : 'Gán'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>

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

export default SubjectExams;
