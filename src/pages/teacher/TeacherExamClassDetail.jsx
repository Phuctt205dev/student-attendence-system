import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TeacherLayout from '../../layouts/TeacherLayout';
import Button from '../../components/common/Button';
import TeacherExamClassDetailContent from '../../components/teacher/TeacherExamClassDetailContent';
import { getExamDataForClass } from '../../services/exam.service';

const TeacherExamClassDetail = () => {
  const { classId, examInstanceId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!classId || !examInstanceId) return;

      setLoading(true);
      setError('');
      const result = await getExamDataForClass(classId, examInstanceId);
      if (result.success) {
        setExam(result.data);
      } else {
        setError(result.error || 'Không tải được bài thi');
      }
      setLoading(false);
    };

    load();
  }, [classId, examInstanceId]);

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(`/teacher/classes/${classId}`)}
                className="icon-nav-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chi tiết bài thi</h1>
                <p className="text-gray-600 text-sm mt-0.5">Theo dõi điểm và chấm tự luận</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="!bg-white !text-gray-800 !border !border-gray-300 shadow-sm"
              onClick={() => navigate(`/teacher/classes/${classId}`)}
            >
              Quay lại lớp
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : exam ? (
            <TeacherExamClassDetailContent exam={exam} classId={classId} />
          ) : (
            !error && <p className="text-gray-600">Không tìm thấy bài thi.</p>
          )}
        </main>
      </div>
    </TeacherLayout>
  );
};

export default TeacherExamClassDetail;
