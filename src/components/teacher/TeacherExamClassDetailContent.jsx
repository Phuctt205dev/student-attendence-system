import { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '../common/Button';
import { getClassStudents } from '../../services/class.service';
import { getExamAttemptsForClass } from '../../services/examAttempt.service';
import TeacherGradeEssayModal from './TeacherGradeEssayModal';
import {
  formatScale10,
  getAttemptScoreBreakdown,
  getPassingScale10
} from '../../utils/examScoring';

const TeacherExamClassDetailContent = ({ exam, classId }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [attemptMap, setAttemptMap] = useState({});
  const [gradingStudent, setGradingStudent] = useState(null);

  const loadData = useCallback(async () => {
    if (!exam?.id || !classId) return;

    setLoading(true);
    const [studentsResult, attemptsResult] = await Promise.all([
      getClassStudents(classId),
      getExamAttemptsForClass(exam.id, classId)
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
    loadData();
  }, [loadData]);

  const totalQuestions = exam?.totalQuestions || 0;
  const passingScale10 = getPassingScale10(exam);

  const submittedAttempts = useMemo(
    () =>
      Object.values(attemptMap).filter(
        (a) => a.status === 'submitted' || a.status === 'graded'
      ),
    [attemptMap]
  );

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const idA = String(a.studentId || '').trim();
      const idB = String(b.studentId || '').trim();
      const numA = parseInt(idA, 10);
      const numB = parseInt(idB, 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && idA === String(numA) && idB === String(numB)) {
        return numA - numB;
      }
      return idA.localeCompare(idB, 'vi', { numeric: true, sensitivity: 'base' });
    });
  }, [students]);

  const avgScale10 = useMemo(() => {
    const scales = submittedAttempts
      .map((a) => getAttemptScoreBreakdown(a, exam).scale10)
      .filter((v) => v !== null);
    if (scales.length === 0) return null;
    const sum = scales.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scales.length) * 10) / 10;
  }, [submittedAttempts, exam]);

  const getAttemptLabel = (attempt) => {
    if (!attempt) return { text: 'Chưa làm', className: 'text-gray-500' };
    if (attempt.status === 'in-progress') return { text: 'Đang làm', className: 'text-blue-600' };
    if (attempt.essayPending) {
      return { text: 'Đã nộp — chờ chấm TL', className: 'text-amber-700' };
    }
    return { text: 'Đã nộp', className: 'text-green-600' };
  };

  if (!exam) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{exam.title}</h2>
        {exam.description && (
          <p className="text-gray-600 mt-1">{exam.description}</p>
        )}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
          <span>
            <strong>{totalQuestions}</strong> câu hỏi
          </span>
          <span>
            <strong>{exam.durationMinutes}</strong> phút
          </span>
          <span>
            Điểm đạt:{' '}
            <strong>
              {passingScale10 !== null ? `${passingScale10.toFixed(1)} / 10` : '—'}
            </strong>
          </span>
          <span>
            Tổng điểm bài: <strong>{exam.totalPoints ?? '—'}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">Sinh viên trong lớp</p>
          <p className="text-2xl font-bold text-blue-600">{students.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">Đã nộp bài</p>
          <p className="text-2xl font-bold text-green-600">{submittedAttempts.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">Điểm TB (thang 10)</p>
          <p className="text-2xl font-bold text-purple-600">
            {avgScale10 !== null ? avgScale10.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600">Chưa làm</p>
          <p className="text-2xl font-bold text-gray-700">
            {students.length - submittedAttempts.length}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Danh sách điểm</h3>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Lớp chưa có sinh viên</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">MSSV</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Họ tên</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Trạng thái</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Trắc nghiệm</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Tự luận</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Điểm (thang 10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedStudents.map((student) => {
                  const attempt = attemptMap[student.uid];
                  const status = getAttemptLabel(attempt);
                  const breakdown = getAttemptScoreBreakdown(attempt, exam);
                  const canGradeEssay =
                    breakdown.isSubmitted && breakdown.essayPending;

                  let mcqCell = '—';
                  let essayCell = '—';
                  let scaleCell = '—';

                  if (breakdown.isSubmitted) {
                    mcqCell =
                      breakdown.mcqTotal > 0
                        ? `${breakdown.mcqScore}/${breakdown.mcqTotal} điểm`
                        : '—';

                    if (breakdown.essayTotal > 0) {
                      if (breakdown.essayPending) {
                        essayCell = 'pending';
                      } else {
                        essayCell = `${breakdown.essayScore ?? 0}/${breakdown.essayTotal}`;
                      }
                    } else {
                      essayCell = '—';
                    }

                    if (breakdown.essayPending && breakdown.essayTotal > 0) {
                      const partial = formatScale10(breakdown.mcqScore, breakdown.totalRaw);
                      scaleCell =
                        partial !== '—' ? `${partial}/10 (tạm — chưa TL)` : '—';
                    } else {
                      scaleCell =
                        breakdown.scale10 !== null
                          ? `${breakdown.scale10.toFixed(1)}/10`
                          : '—';
                    }
                  }

                  return (
                    <tr key={student.uid} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600">{student.studentId || '—'}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{student.fullName}</td>
                      <td className={`px-3 py-2 ${status.className}`}>{status.text}</td>
                      <td className="px-3 py-2 text-gray-700">{mcqCell}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {essayCell === 'pending' ? (
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-amber-700 text-xs">Chờ chấm</span>
                            {canGradeEssay && (
                              <Button
                                variant="outline"
                                className="text-xs py-1 px-2"
                                onClick={() =>
                                  setGradingStudent({ attempt, name: student.fullName })
                                }
                              >
                                Chấm điểm
                              </Button>
                            )}
                          </div>
                        ) : (
                          essayCell
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{scaleCell}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TeacherGradeEssayModal
        isOpen={Boolean(gradingStudent)}
        attempt={gradingStudent?.attempt}
        studentName={gradingStudent?.name}
        onClose={() => setGradingStudent(null)}
        onGraded={loadData}
      />
    </div>
  );
};

export default TeacherExamClassDetailContent;
