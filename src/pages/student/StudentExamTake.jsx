import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StudentLayout from '../../layouts/StudentLayout';
import {
  getExamWithQuestions,
  canStudentTakeClassExam
} from '../../services/exam.service';
import {
  getStudentExamAttempt,
  startExamAttempt,
  updateAnswer,
  submitExamAttempt
} from '../../services/examAttempt.service';
import { AlertCircle, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { format, isAfter, isBefore } from 'date-fns';
import { isEssayQuestion, partitionQuestionsByType } from '../../utils/questionTypes';

const StudentExamTake = () => {
  const { userProfile } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const classId = location.state?.classId || null;
  const classExamInstanceId = location.state?.classExamInstanceId || null;

  const { mcqQuestions, essayQuestions } = useMemo(
    () => partitionQuestionsByType(questions),
    [questions]
  );

  const startTime = exam?.startTime?.toDate?.() || (exam?.startTime ? new Date(exam.startTime) : null);
  const endTime = exam?.endTime?.toDate?.() || (exam?.endTime ? new Date(exam.endTime) : null);

  const examStatus = useMemo(() => {
    const now = new Date();
    if (startTime && isBefore(now, startTime)) {
      return { status: 'upcoming', message: 'Bài thi chưa bắt đầu.' };
    }
    if (endTime && isAfter(now, endTime)) {
      return { status: 'closed', message: 'Bài thi đã kết thúc.' };
    }
    return { status: 'active', message: '' };
  }, [startTime, endTime]);

  useEffect(() => {
    const loadExam = async () => {
      if (!userProfile?.uid || !examId) return;

      setLoading(true);
      setError('');

      if (!classId || !classExamInstanceId) {
        setError('Thiếu thông tin lớp học. Vui lòng vào bài thi từ trang lớp học.');
        setLoading(false);
        return;
      }

      const examResult = await getExamWithQuestions(examId, classId, classExamInstanceId);
      if (!examResult.success) {
        setError(examResult.error || 'Không tải được bài thi');
        setLoading(false);
        return;
      }

      const examData = examResult.data;
      const access = canStudentTakeClassExam(examData, classId);

      setExam(examData);
      setQuestions(examData.questions || []);

      const attemptResult = await getStudentExamAttempt(
        userProfile.uid,
        classExamInstanceId,
        classId,
        examId
      );
      if (attemptResult.success) {
        setAttempt(attemptResult.data);
        setAnswers(attemptResult.data.answers || {});
      } else if (access.allowed) {
        const startResult = await startExamAttempt(
          userProfile.uid,
          examId,
          classId,
          classExamInstanceId
        );
        if (startResult.success) {
          setAttempt(startResult.data);
        } else {
          setError(startResult.error || 'Không thể bắt đầu bài thi');
        }
      } else if (!access.allowed) {
        setError(access.message);
      }

      setLoading(false);
    };

    loadExam();
  }, [userProfile?.uid, examId, classId, classExamInstanceId]);

  const handleSelectAnswer = async (questionId, selected) => {
    if (!attempt?.id) return;

    const nextAnswers = {
      ...answers,
      [questionId]: { ...answers[questionId], selected }
    };

    setAnswers(nextAnswers);
    await updateAnswer(attempt.id, questionId, { selected });
  };

  const handleEssayAnswer = async (questionId, textAnswer) => {
    if (!attempt?.id) return;

    const nextAnswers = {
      ...answers,
      [questionId]: { ...answers[questionId], textAnswer }
    };

    setAnswers(nextAnswers);
    await updateAnswer(attempt.id, questionId, { textAnswer });
  };

  const handleSubmit = async () => {
    if (!attempt?.id) return;

    setSubmitting(true);
    const result = await submitExamAttempt(attempt.id);
    setSubmitting(false);

    if (result.success) {
      navigate(`/student/exams/${examId}/result`, {
        state: { classId, classExamInstanceId }
      });
    } else {
      setError(result.error || 'Không thể nộp bài');
    }
  };

  const currentQuestion = questions[currentIndex];
  const isCurrentEssay = currentQuestion && isEssayQuestion(currentQuestion);

  const isQuestionAnswered = (question) => {
    const a = answers[question.id];
    if (isEssayQuestion(question)) {
      return Boolean(a?.textAnswer?.trim());
    }
    return Boolean(a?.selected);
  };

  const sectionLabel = useMemo(() => {
    if (!currentQuestion) return '';
    if (isEssayQuestion(currentQuestion)) {
      const idx = essayQuestions.findIndex((q) => q.id === currentQuestion.id);
      return `Phần II — Tự luận (câu ${idx + 1}/${essayQuestions.length})`;
    }
    const idx = mcqQuestions.findIndex((q) => q.id === currentQuestion.id);
    return `Phần I — Trắc nghiệm (câu ${idx + 1}/${mcqQuestions.length})`;
  }, [currentQuestion, mcqQuestions, essayQuestions]);

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam?.title || 'Bài thi'}</h1>
              {exam?.description && (
                <p className="text-gray-600 mt-1">{exam.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => navigate('/student/exams')}>
              Quay lại
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : attempt?.status?.includes('submitted') || attempt?.status === 'graded' ? (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-semibold">Bạn đã nộp bài.</p>
                  <p className="text-sm text-gray-600">Xem lại kết quả của bạn.</p>
                </div>
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(`/student/exams/${examId}/result`, {
                      state: { classId, classExamInstanceId }
                    })
                  }
                >
                  Xem kết quả
                </Button>
              </div>
            </Card>
          ) : examStatus.status !== 'active' ? (
            <Card className="p-6">
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5" />
                <p>{examStatus.message}</p>
              </div>
            </Card>
          ) : !currentQuestion ? (
            <Card className="p-6">
              <p className="text-gray-600">Không có câu hỏi trong bài thi này.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-primary-700">{sectionLabel}</p>
                    <p className="text-sm text-gray-500">
                      Câu {currentIndex + 1} / {questions.length}
                    </p>
                  </div>
                  {endTime && (
                    <p className="text-sm text-gray-500 mb-4">
                      Kết thúc: {format(endTime, 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {currentQuestion.questionText}
                  </h2>

                  {isCurrentEssay ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Câu trả lời của bạn
                      </label>
                      <textarea
                        rows={10}
                        value={answers[currentQuestion.id]?.textAnswer || ''}
                        onChange={(e) => handleEssayAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Nhập câu trả lời tự luận..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Phần tự luận sẽ do giáo viên chấm điểm sau khi bạn nộp bài.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {['A', 'B', 'C', 'D']
                        .filter((key) => currentQuestion.options?.[key] !== undefined)
                        .map((key) => (
                          <label
                            key={key}
                            className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${answers[currentQuestion.id]?.selected === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={key}
                              checked={answers[currentQuestion.id]?.selected === key}
                              onChange={() => handleSelectAnswer(currentQuestion.id, key)}
                              className="mt-0.5"
                            />
                            <span className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-700">
                              {key}
                            </span>
                            <span className="text-gray-900">{currentQuestion.options?.[key]}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </Card>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    icon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  >
                    Trước
                  </Button>
                  {currentIndex === questions.length - 1 ? (
                    <Button
                      variant="primary"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? 'Đang nộp...' : 'Nộp bài'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                    >
                      Tiếp
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Tóm tắt</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>
                      Trắc nghiệm:{' '}
                      <span className="font-medium text-gray-900">{mcqQuestions.length} câu</span>
                    </div>
                    {essayQuestions.length > 0 && (
                      <div>
                        Tự luận:{' '}
                        <span className="font-medium text-gray-900">{essayQuestions.length} câu</span>
                      </div>
                    )}
                    <div>
                      Thời lượng:{' '}
                      <span className="font-medium text-gray-900">{exam?.durationMinutes} phút</span>
                    </div>
                  </div>
                </Card>

                {mcqQuestions.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Phần I — Trắc nghiệm</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {mcqQuestions.map((question) => {
                        const globalIndex = questions.findIndex((q) => q.id === question.id);
                        const answered = isQuestionAnswered(question);
                        return (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => setCurrentIndex(globalIndex)}
                            className={`h-9 rounded-lg text-sm font-medium border ${globalIndex === currentIndex ? 'border-primary-500 text-primary-600' : answered ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-600'}`}
                          >
                            {mcqQuestions.indexOf(question) + 1}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {essayQuestions.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Phần II — Tự luận</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {essayQuestions.map((question) => {
                        const globalIndex = questions.findIndex((q) => q.id === question.id);
                        const answered = isQuestionAnswered(question);
                        return (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => setCurrentIndex(globalIndex)}
                            className={`h-9 rounded-lg text-sm font-medium border ${globalIndex === currentIndex ? 'border-primary-500 text-primary-600' : answered ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-600'}`}
                          >
                            {essayQuestions.indexOf(question) + 1}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentExamTake;
