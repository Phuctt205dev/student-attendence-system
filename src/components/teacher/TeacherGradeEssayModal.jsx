import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { getAttemptWithDetails, gradeEssayAttempt } from '../../services/examAttempt.service';
import { isEssayQuestion } from '../../utils/questionTypes';

const TeacherGradeEssayModal = ({ attempt, studentName, isOpen, onClose, onGraded }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (!isOpen || !attempt?.id) return;

    const load = async () => {
      setLoading(true);
      setError('');
      const result = await getAttemptWithDetails(attempt.id);
      if (result.success) {
        setDetails(result.data);
        const initial = {};
        (result.data.questions || [])
          .filter(isEssayQuestion)
          .forEach((q) => {
            initial[q.id] = q.essayScore ?? '';
          });
        setScores(initial);
      } else {
        setError(result.error || 'Không tải được bài làm');
      }
      setLoading(false);
    };

    load();
  }, [isOpen, attempt?.id]);

  const essayQuestions = (details?.questions || []).filter(isEssayQuestion);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const result = await gradeEssayAttempt(attempt.id, scores);
    setSaving(false);

    if (result.success) {
      onGraded?.();
      onClose();
    } else {
      setError(result.error || 'Không thể lưu điểm');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chấm tự luận — ${studentName || 'Sinh viên'}`}
      size="lg"
    >
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : essayQuestions.length === 0 ? (
        <p className="text-sm text-gray-600 py-4">Bài thi này không có câu tự luận.</p>
      ) : (
        <div className="space-y-6">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {essayQuestions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Câu {index + 1}. {question.questionText}
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Bài làm của sinh viên</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {question.studentAnswer?.trim() || '(Chưa trả lời)'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Điểm (tối đa {question.maxPoints ?? question.points ?? 1})
                </label>
                <input
                  type="number"
                  min={0}
                  max={question.maxPoints ?? question.points ?? 1}
                  step={0.5}
                  value={scores[question.id] ?? ''}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [question.id]: e.target.value }))
                  }
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu điểm tự luận'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TeacherGradeEssayModal;
