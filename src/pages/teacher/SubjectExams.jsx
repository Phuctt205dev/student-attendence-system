import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubjectById, getSubjectTopics } from '../../services/subject.service';
import { getExamWithQuestions, getExamsBySubject, setExamVisibility, setExamSchedule } from '../../services/exam.service';
import { getClassesByTeacher } from '../../services/class.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { ChevronLeft, Plus, BookOpen, AlertCircle, CheckCircle, Lock, Unlock, Calendar } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ExamCreationModal from '../../components/teacher/ExamCreationModal';
import { format, formatDistanceToNow } from 'date-fns';
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

  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);

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
      setTopics(topicsResult.data);
      setError('');
    } else {
      setError(topicsResult.error || 'Failed to load topics');
    }

    setLoading(false);
  }, [subjectId]);

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
                  className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
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
              <h2 className="text-xl font-semibold text-gray-900">Chọn chủ đề</h2>
              <span className="text-sm text-gray-500">
                Đã chọn {selectedTopicIds.length}/{topics.length}
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
                    <div className="flex items-start gap-3">
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
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Danh sách bài thi</h2>
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
