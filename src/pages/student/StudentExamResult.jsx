import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StudentLayout from '../../layouts/StudentLayout';
import { getStudentExamAttempt, getAttemptWithDetails } from '../../services/examAttempt.service';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { isEssayQuestion } from '../../utils/questionTypes';
import { formatScale10, getAttemptScoreBreakdown } from '../../utils/examScoring';

const StudentExamResult = () => {
  const { userProfile } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classId = location.state?.classId;
  const classExamInstanceId = location.state?.classExamInstanceId;

  const [attempt, setAttempt] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (!userProfile?.uid || !examId) return;

      setLoading(true);
      if (!classId || !classExamInstanceId) {
        setError('Thiếu thông tin lớp. Vui lòng mở kết quả từ trang lớp học.');
        setLoading(false);
        return;
      }

      const attemptResult = await getStudentExamAttempt(
        userProfile.uid,
        classExamInstanceId,
        classId,
        examId
      );
      if (!attemptResult.success) {
        setError(attemptResult.error || 'Không tìm thấy kết quả');
        setLoading(false);
        return;
      }

      setAttempt(attemptResult.data);
      const detailsResult = await getAttemptWithDetails(attemptResult.data.id);
      if (detailsResult.success) {
        setDetails(detailsResult.data);
      }

      setLoading(false);
    };

    loadResult();
  }, [userProfile?.uid, examId, classId, classExamInstanceId]);

  const breakdown = getAttemptScoreBreakdown(attempt, details?.exam);
  const { mcqScore, mcqTotal, essayScore, essayTotal, essayPending, totalRaw } = breakdown;

  const mcqQuestions = details?.questions?.filter((q) => !isEssayQuestion(q)) || [];
  const essayQuestions = details?.questions?.filter(isEssayQuestion) || [];

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Kết quả bài thi</h1>
            <Button
              variant="outline"
              onClick={() =>
                classId
                  ? navigate(`/student/classes/${classId}`)
                  : navigate('/student/exams')
              }
            >
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
          ) : !attempt ? (
            <Card className="p-6">
              <p className="text-gray-600">Chưa có kết quả cho bài thi này.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div className="space-y-1">
                    {mcqTotal > 0 && (
                      <p className="text-sm text-gray-600">
                        Điểm trắc nghiệm:{' '}
                        <span className="font-bold text-gray-900">
                          {mcqScore} / {mcqTotal}
                        </span>
                      </p>
                    )}
                    {essayTotal > 0 && (
                      <p className="text-sm text-gray-600">
                        Điểm tự luận:{' '}
                        {essayPending ? (
                          <span className="font-medium text-amber-700">Chờ giáo viên chấm</span>
                        ) : (
                          <span className="font-bold text-gray-900">
                            {essayScore ?? 0} / {essayTotal}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900">
                      Điểm tổng (thang 10):{' '}
                      {essayPending && essayTotal > 0
                        ? `${formatScale10(mcqScore, totalRaw)}/10 (tạm — chưa tính tự luận)`
                        : `${formatScale10(breakdown.earned, totalRaw)}/10`}
                    </p>
                  </div>
                </div>
              </Card>

              {mcqQuestions.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Phần I — Trắc nghiệm</h3>
                  <div className="space-y-4">
                    {mcqQuestions.map((question, index) => (
                      <div key={question.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {index + 1}. {question.questionText}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Đáp án của bạn: {question.studentAnswer || 'Chưa trả lời'}
                        </p>
                        <p
                          className={`text-sm mt-1 ${question.isCorrect ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {question.isCorrect ? 'Đúng' : 'Sai'}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {essayQuestions.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Phần II — Tự luận</h3>
                  <div className="space-y-4">
                    {essayQuestions.map((question, index) => (
                      <div key={question.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {index + 1}. {question.questionText}
                        </p>
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                          Bài làm: {question.studentAnswer?.trim() || 'Chưa trả lời'}
                        </p>
                        <p className="text-sm mt-1 text-gray-600">
                          {essayPending || question.pendingGrade ? (
                            <span className="text-amber-700">Chờ giáo viên chấm điểm</span>
                          ) : (
                            <span>
                              Điểm: {question.essayScore ?? 0} / {question.maxPoints ?? question.points}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentExamResult;
