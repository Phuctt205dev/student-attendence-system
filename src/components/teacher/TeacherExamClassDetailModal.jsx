import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { getClassStudents } from '../../services/class.service';
import { getExamAttemptsForClass, countCorrectAnswers } from '../../services/examAttempt.service';

const TeacherExamClassDetailModal = ({ exam, classId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [attemptMap, setAttemptMap] = useState({});

  const loadData = useCallback(async () => {
    if (!exam?.id || !classId) return;

    setLoading(true);
    const [studentsResult, attemptsResult] = await Promise.all([
      getClassStudents(classId),
      getExamAttemptsForClass(exam.id)
    ]);

    if (studentsResult.success) {
      setStudents(studentsResult.students || []);
    }

    if (attemptsResult.success) {
      const map = {};
      (attemptsResult.data || []).forEach((attempt) => {
        const prev = map[attempt.studentId];
        const isSubmitted = attempt.status === 'submitted' || attempt.status === 'graded';
        const prevSubmitted = prev && (prev.status === 'submitted' || prev.status === 'graded');

        if (!prev || (isSubmitted && !prevSubmitted)) {
          map[attempt.studentId] = attempt;
        }
      });
      setAttemptMap(map);
    }

    setLoading(false);
  }, [exam?.id, classId]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  const totalQuestions = exam?.totalQuestions || 0;
  const submittedAttempts = Object.values(attemptMap).filter(
    (a) => a.status === 'submitted' || a.status === 'graded'
  );
  const avgScore =
    submittedAttempts.length > 0
      ? (
          submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
          submittedAttempts.length
        ).toFixed(1)
      : '—';

  const getAttemptLabel = (attempt) => {
    if (!attempt) return { text: 'Chưa làm', className: 'text-gray-500' };
    if (attempt.status === 'in-progress') return { text: 'Đang làm', className: 'text-blue-600' };
    return { text: 'Đã nộp', className: 'text-green-600' };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài thi" size="lg">
      {exam && (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
            {exam.description && (
              <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span><strong>{totalQuestions}</strong> câu hỏi</span>
              <span><strong>{exam.durationMinutes}</strong> phút</span>
              <span>Điểm đạt: <strong>{exam.passingScore ?? '—'}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Sinh viên trong lớp</p>
              <p className="text-xl font-bold text-blue-600">{students.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Đã nộp bài</p>
              <p className="text-xl font-bold text-green-600">{submittedAttempts.length}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Điểm TB</p>
              <p className="text-xl font-bold text-purple-600">{avgScore}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Chưa làm</p>
              <p className="text-xl font-bold text-gray-700">
                {students.length - submittedAttempts.length}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Danh sách điểm</h4>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Lớp chưa có sinh viên</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">MSSV</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Họ tên</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Trạng thái</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Đúng / Tổng</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const attempt = attemptMap[student.uid];
                      const status = getAttemptLabel(attempt);
                      const correct = attempt ? countCorrectAnswers(attempt) : 0;
                      const score = attempt?.score ?? '—';
                      const totalScore = attempt?.totalScore || exam.totalPoints || totalQuestions;

                      return (
                        <tr key={student.uid} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">{student.studentId || '—'}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{student.fullName}</td>
                          <td className={`px-3 py-2 ${status.className}`}>{status.text}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {attempt && (attempt.status === 'submitted' || attempt.status === 'graded')
                              ? `${correct} / ${totalQuestions}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-900">
                            {attempt && (attempt.status === 'submitted' || attempt.status === 'graded')
                              ? `${score} / ${totalScore}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TeacherExamClassDetailModal;
