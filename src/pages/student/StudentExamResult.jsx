import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StudentLayout from '../../layouts/StudentLayout';
import { getStudentExamAttempt, getAttemptWithDetails } from '../../services/examAttempt.service';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

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

  const score = attempt?.score ?? 0;
  const totalScore = attempt?.totalScore ?? details?.exam?.totalPoints ?? 0;
  const percentage = totalScore ? Math.round((score / totalScore) * 100) : 0;

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
                  <div>
                    <p className="text-sm text-gray-600">Điểm của bạn</p>
                    <p className="text-2xl font-bold text-gray-900">{score} / {totalScore}</p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                </div>
              </Card>

              {details?.questions?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Chi tiết câu hỏi</h3>
                  <div className="space-y-4">
                    {details.questions.map((question, index) => (
                      <div key={question.id} className="border-b border-gray-100 pb-4">
                        <p className="text-sm font-semibold text-gray-900">{index + 1}. {question.questionText}</p>
                        <p className="text-sm text-gray-600 mt-1">Đáp án của bạn: {question.studentAnswer || 'Chưa trả lời'}</p>
                        <p className={`text-sm mt-1 ${question.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {question.isCorrect ? 'Đúng' : 'Sai'}
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
