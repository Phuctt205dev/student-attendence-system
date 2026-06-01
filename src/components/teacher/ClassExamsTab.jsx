import { useState, useEffect, useCallback } from 'react';
import {
  getExamsByClassForTeacher,
  getExamsBySubject,
  setClassExamVisibility,
  setClassExamSchedule,
  assignExamToClass,
  removeExamFromClass
} from '../../services/exam.service';
import { getTeacherSubjects } from '../../services/subject.service';
import Button from '../common/Button';
import Modal from '../common/Modal';
import TeacherExamClassDetailModal from './TeacherExamClassDetailModal';
import {
  BookOpen,
  Plus,
  Lock,
  Unlock,
  Calendar,
  Trash2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const toLocalInputValue = (dateValue) => {
  if (!dateValue) return '';
  const date = dateValue?.toDate?.() || new Date(dateValue);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const ClassExamsTab = ({ classId, teacherId, onError, onSuccess }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [detailExam, setDetailExam] = useState(null);

  const [scheduleExam, setScheduleExam] = useState(null);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const loadExams = useCallback(async () => {
    if (!classId || !teacherId) return;

    setLoading(true);
    const result = await getExamsByClassForTeacher(classId, teacherId);
    if (result.success) {
      setExams(result.data || []);
    } else if (onError) {
      onError(result.error || 'Không thể tải danh sách bài thi');
    }
    setLoading(false);
  }, [classId, teacherId, onError]);

  const loadSubjects = useCallback(async () => {
    if (!teacherId) return;
    const subjectsResult = await getTeacherSubjects(teacherId);
    if (subjectsResult.success) {
      setSubjects(subjectsResult.data || []);
    }
  }, [teacherId]);

  const loadExamsForSubject = useCallback(async (subjectId) => {
    if (!classId || !teacherId || !subjectId) {
      setAvailableExams([]);
      return;
    }

    setAvailableLoading(true);
    const result = await getExamsBySubject(subjectId, teacherId);
    if (result.success) {
      const notInClass = (result.data || []).filter(
        (exam) => !(exam.classIds || []).includes(classId)
      );
      setAvailableExams(notInClass);
    } else if (onError) {
      onError(result.error || 'Không thể tải bài thi');
    }
    setAvailableLoading(false);
  }, [classId, teacherId, onError]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

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

    const result = await setClassExamSchedule(
      scheduleExam.id,
      classId,
      startDate,
      endDate
    );

    if (result.success) {
      setScheduleExam(null);
      setScheduleStart('');
      setScheduleEnd('');
      setScheduleError('');
      if (onSuccess) onSuccess('Đã lưu thời gian bài thi cho lớp này');
      loadExams();
    } else {
      setScheduleError(result.error || 'Không thể lưu lịch thi');
    }
  };

  const handleToggleVisibility = async (exam) => {
    const nextVisibility = exam.visibility === 'public' ? 'private' : 'public';
    const now = new Date();
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (nextVisibility === 'public' && endTime && endTime <= now) {
      if (onError) onError('Không thể mở bài thi vì thời gian kết thúc đã qua');
      return;
    }

    const result = await setClassExamVisibility(exam.id, classId, nextVisibility);
    if (result.success) {
      if (onSuccess) {
        onSuccess(nextVisibility === 'public' ? 'Đã mở bài thi cho lớp' : 'Đã khóa bài thi cho lớp');
      }
      loadExams();
    } else if (onError) {
      onError(result.error || 'Không thể cập nhật trạng thái');
    }
  };

  const handleAssignExam = async (examId) => {
    setAssigningId(examId);
    const result = await assignExamToClass(examId, classId);
    if (result.success) {
      if (onSuccess) onSuccess('Đã gán bài thi vào lớp');
      await loadExams();
      if (selectedSubjectId) await loadExamsForSubject(selectedSubjectId);
    } else if (onError) {
      onError(result.error || 'Không thể gán bài thi');
    }
    setAssigningId(null);
  };

  const handleRemoveExam = async (exam) => {
    if (!window.confirm(`Gỡ bài thi "${exam.title}" khỏi lớp này?`)) return;

    const result = await removeExamFromClass(exam.id, classId);
    if (result.success) {
      if (onSuccess) onSuccess('Đã gỡ bài thi khỏi lớp');
      loadExams();
    } else if (onError) {
      onError(result.error || 'Không thể gỡ bài thi');
    }
  };

  const handleOpenAddModal = () => {
    setSelectedSubjectId('');
    setAvailableExams([]);
    setShowAddModal(true);
    loadSubjects();
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    loadExamsForSubject(subjectId);
  };

  const getVisibilityBadge = (visibility) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        visibility === 'public'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {visibility === 'public' ? 'Đang mở' : 'Đã khóa'}
    </span>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900">Bài thi của lớp ({exams.length})</h4>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
        >
          Thêm bài thi
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Tạo bài thi tại mục Môn học, sau đó gán vào lớp và quản lý khóa / thời gian tại đây.
      </p>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Chưa có bài thi nào trong lớp</p>
          <p className="text-sm mt-1">Nhấn &quot;Thêm bài thi&quot; để gán từ môn học</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
            const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
            const isLocked = endTime && new Date() > endTime;

            return (
              <div
                key={exam.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      {getVisibilityBadge(exam.visibility)}
                      {isLocked && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Hết hạn
                        </span>
                      )}
                    </div>

                    {exam.description && (
                      <p className="text-sm text-gray-600 mb-2">{exam.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span><strong>{exam.totalQuestions}</strong> câu</span>
                      <span><strong>{exam.durationMinutes}</strong> phút</span>
                    </div>

                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      {startTime && (
                        <div>Bắt đầu: {format(startTime, 'dd/MM/yyyy HH:mm')}</div>
                      )}
                      {endTime && (
                        <div>Kết thúc: {format(endTime, 'dd/MM/yyyy HH:mm')}</div>
                      )}
                      <div>
                        Tạo{' '}
                        {formatDistanceToNow(
                          exam.createdAt?.toDate?.() || new Date(),
                          { addSuffix: true }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => setDetailExam(exam)}
                    >
                      Chi tiết
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={
                        exam.visibility === 'public' ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )
                      }
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
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveExam(exam)}
                    >
                      Gỡ khỏi lớp
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSubjectId('');
          setAvailableExams([]);
        }}
        title="Thêm bài thi vào lớp"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bước 1: Chọn môn học
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSubjectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bước 2: Chọn bài thi
              </label>
              {availableLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
                </div>
              ) : availableExams.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Không còn bài thi nào của môn này để gán</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                        <p className="text-xs text-gray-500">
                          {exam.totalQuestions} câu · {exam.durationMinutes} phút
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={assigningId === exam.id}
                        onClick={() => handleAssignExam(exam.id)}
                      >
                        {assigningId === exam.id ? 'Đang gán...' : 'Gán'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <TeacherExamClassDetailModal
        exam={detailExam}
        classId={classId}
        isOpen={!!detailExam}
        onClose={() => setDetailExam(null)}
      />

      <Modal
        isOpen={!!scheduleExam}
        onClose={() => {
          setScheduleExam(null);
          setScheduleStart('');
          setScheduleEnd('');
          setScheduleError('');
        }}
        title="Thiết lập thời gian (lớp này)"
        size="sm"
      >
        <div className="space-y-4">
          {scheduleExam && (
            <p className="text-sm text-gray-600">
              Bài thi: <span className="font-medium text-gray-900">{scheduleExam.title}</span>
            </p>
          )}
          {scheduleError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {scheduleError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bắt đầu</label>
            <input
              type="datetime-local"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kết thúc</label>
            <input
              type="datetime-local"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
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
    </div>
  );
};

export default ClassExamsTab;
