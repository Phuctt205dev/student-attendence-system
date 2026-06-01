import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import {
  getStudentExamAttempt,
  getAttemptWithDetails,
  countCorrectAnswers
} from '../../services/examAttempt.service';
import { format } from 'date-fns';
import { PlayCircle, ChevronRight } from 'lucide-react';

const StudentExamDetailModal = ({ exam, classId, studentId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [details, setDetails] = useState(null);

  const loadAttempt = useCallback(async () => {
    if (!exam?.id || !studentId) return;

    setLoading(true);
    if (!classId) {
      setLoading(false);
      return;
    }

    const attemptResult = await getStudentExamAttempt(studentId, exam.id);

    if (attemptResult.success) {
      setAttempt(attemptResult.data);
      if (attemptResult.data.status === 'submitted' || attemptResult.data.status === 'graded') {
        const detailsResult = await getAttemptWithDetails(attemptResult.data.id);
        if (detailsResult.success) setDetails(detailsResult.data);
      } else {
        setDetails(null);
      }
    } else {
      setAttempt(null);
      setDetails(null);
    }

    setLoading(false);
  }, [exam?.id, studentId]);

  useEffect(() => {
    if (isOpen) loadAttempt();
  }, [isOpen, loadAttempt]);

  const totalQuestions = exam?.totalQuestions || 0;
  const correctCount = attempt ? countCorrectAnswers(attempt) : 0;
  const score = attempt?.score ?? 0;
  const totalScore = attempt?.totalScore || exam?.totalPoints || totalQuestions;
  const hasSubmitted = attempt?.status === 'submitted' || attempt?.status === 'graded';

  const startTime = exam?.startTime?.toDate?.() || (exam?.startTime ? new Date(exam.startTime) : null);
  const endTime = exam?.endTime?.toDate?.() || (exam?.endTime ? new Date(exam.endTime) : null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài thi" size="md">
      {exam && (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
            {exam.description && (
              <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
              <span>{exam.durationMinutes} phút</span>
              <span>{totalQuestions} câu</span>
            </div>
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              {startTime && <div>Bắt đầu: {format(startTime, 'dd/MM/yyyy HH:mm')}</div>}
              {endTime && <div>Kết thúc: {format(endTime, 'dd/MM/yyyy HH:mm')}</div>}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Trạng thái</p>
                  <p className="font-semibold text-gray-900">
                    {!attempt
                      ? 'Chưa làm'
                      : attempt.status === 'in-progress'
                        ? 'Đang làm'
                        : 'Đã nộp'}
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Câu đúng / Tổng</p>
                  <p className="font-semibold text-blue-700">
                    {hasSubmitted ? `${correctCount} / ${totalQuestions}` : '—'}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg col-span-2">
                  <p className="text-xs text-gray-600">Điểm</p>
                  <p className="text-xl font-bold text-green-700">
                    {hasSubmitted ? `${score} / ${totalScore}` : '—'}
                  </p>
                  {hasSubmitted && totalScore > 0 && (
                    <p className="text-sm text-gray-500">
                      {Math.round((score / totalScore) * 100)}%
                    </p>
                  )}
                </div>
              </div>

              {details?.questions?.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Tóm tắt câu hỏi</p>
                  <div className="space-y-2">
                    {details.questions.map((q, index) => (
                      <div key={q.id} className="text-xs flex justify-between gap-2">
                        <span className="text-gray-700 truncate">Câu {index + 1}</span>
                        <span className={q.isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {q.isCorrect ? 'Đúng' : 'Sai'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {attempt?.status === 'in-progress' && (
                  <Button
                    variant="primary"
                    icon={<PlayCircle className="w-4 h-4" />}
                    onClick={() => {
                      onClose();
                      navigate(`/student/exams/${exam.sourceExamId || exam.examId}/take`, {
                        state: { classId, classExamInstanceId: exam.id }
                      });
                    }}
                  >
                    Tiếp tục làm bài
                  </Button>
                )}
                {hasSubmitted && (
                  <Button
                    variant="primary"
                    icon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => {
                      onClose();
                      navigate(`/student/exams/${exam.sourceExamId || exam.examId}/result`, {
                        state: { classId, classExamInstanceId: exam.id }
                      });
                    }}
                  >
                    Xem chi tiết đầy đủ
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default StudentExamDetailModal;
