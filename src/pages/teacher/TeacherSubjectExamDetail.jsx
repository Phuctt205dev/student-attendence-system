import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TeacherLayout from '../../layouts/TeacherLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { getExamWithQuestions } from '../../services/exam.service';
import { getSubjectById } from '../../services/subject.service';
import {
  partitionQuestionsByType,
  getQuestionTypeLabel,
  isEssayQuestion,
  getQuestionMaxPoints
} from '../../utils/questionTypes';
import { getPassingScale10 } from '../../utils/examScoring';

const TeacherSubjectExamDetail = () => {
  const { subjectId, examId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!subjectId || !examId) return;

      setLoading(true);
      setError('');

      const [subjectResult, examResult] = await Promise.all([
        getSubjectById(subjectId),
        getExamWithQuestions(examId)
      ]);

      if (subjectResult.success) {
        setSubject(subjectResult.data);
      }

      if (examResult.success) {
        setExam(examResult.data);
        setQuestions(examResult.data.questions || []);
      } else {
        setError(examResult.error || 'Không tải được bài thi');
      }

      setLoading(false);
    };

    load();
  }, [subjectId, examId]);

  const { mcqQuestions, essayQuestions } = useMemo(
    () => partitionQuestionsByType(questions),
    [questions]
  );

  const totalMcqPoints = mcqQuestions.reduce(
    (sum, q) => sum + getQuestionMaxPoints(q, null),
    0
  );
  const totalEssayPoints = essayQuestions.reduce(
    (sum, q) => sum + getQuestionMaxPoints(q, null),
    0
  );

  const renderQuestion = (question, index) => {
    const points = getQuestionMaxPoints(question, null);

    return (
      <div
        key={question.id}
        className="border border-gray-100 rounded-lg p-4 bg-white"
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500">Câu {index + 1}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isEssayQuestion(question)
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {getQuestionTypeLabel(question)}
          </span>
          <span className="text-xs font-semibold text-gray-700">{points} điểm</span>
        </div>
        <p className="text-sm text-gray-900">{question.questionText}</p>
        {!isEssayQuestion(question) && question.options && (
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {Object.entries(question.options)
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div key={key}>
                  <span className="font-semibold">{key}.</span> {value}
                  {question.correctAnswer === key && (
                    <span className="ml-2 text-green-600 font-medium">(đáp án đúng)</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  const passingScale10 = exam ? getPassingScale10(exam) : null;

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(`/teacher/subjects/${subjectId}/exams`)}
                className="icon-nav-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {exam?.title || 'Chi tiết bài thi'}
                </h1>
                <p className="text-sm text-gray-600">{subject?.name}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="!bg-white !text-gray-800 !border !border-gray-300 shadow-sm"
              onClick={() => navigate(`/teacher/subjects/${subjectId}/exams`)}
            >
              Quay lại
            </Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : exam ? (
            <>
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Số câu</p>
                    <p className="font-semibold text-gray-900">{exam.totalQuestions}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Thời lượng</p>
                    <p className="font-semibold text-gray-900">{exam.durationMinutes} phút</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tổng điểm</p>
                    <p className="font-semibold text-gray-900">{exam.totalPoints}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Điểm đạt (thang 10)</p>
                    <p className="font-semibold text-gray-900">
                      {passingScale10 !== null ? `${passingScale10.toFixed(1)} / 10` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm">
                  <span className="text-blue-700">
                    Trắc nghiệm: {mcqQuestions.length} câu · {totalMcqPoints} điểm
                  </span>
                  <span className="text-amber-800">
                    Tự luận: {essayQuestions.length} câu · {totalEssayPoints} điểm
                  </span>
                </div>
              </Card>

              {mcqQuestions.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-blue-800 mb-3">
                    Phần I — Trắc nghiệm
                  </h2>
                  <div className="space-y-3">
                    {mcqQuestions.map((q, i) => renderQuestion(q, i))}
                  </div>
                </div>
              )}

              {essayQuestions.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-amber-900 mb-3">
                    Phần II — Tự luận
                  </h2>
                  <div className="space-y-3">
                    {essayQuestions.map((q, i) => renderQuestion(q, i))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </TeacherLayout>
  );
};

export default TeacherSubjectExamDetail;
