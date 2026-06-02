import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import { AlertCircle, Plus } from 'lucide-react';
import { getClassesByTeacher } from '../../services/class.service';
import { createExam } from '../../services/exam.service';

const ExamCreationModal = ({
  subject,
  selectedQuestionIds,
  topics,
  availableQuestionCount = 0,
  teacherId,
  onSuccess,
  onCancel,
  loading = false
}) => {
  // Get topic names for title
  const topicNames = Array.from(new Set(selectedQuestionIds.map(qId => {
    for (const topic of topics) {
      if (topic.questions.some(q => q.id === qId)) {
        return topic.name;
      }
    }
    return '';
  }))).filter(Boolean);

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm({
    defaultValues: {
      title: `${subject?.name} - ${topicNames.length > 0 ? topicNames.join(', ') : 'Bài thi mới'}`,
      description: '',
      durationMinutes: 60,
      classIds: []
    }
  });

  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedClassIds = watch('classIds') || [];

  const toggleClassSelection = (classId) => {
    const current = getValues('classIds') || [];
    const next = current.includes(classId)
      ? current.filter((id) => id !== classId)
      : [...current, classId];
    setValue('classIds', next, { shouldDirty: true });
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const result = await getClassesByTeacher(teacherId);
      if (result.success) {
        setClasses(result.classes || []);
      } else {
        setError('Failed to load classes');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setClassesLoading(false);
    }
  };

  const onSubmitForm = async (data) => {
    try {
      setError('');
      setSubmitting(true);

      const selectedClassIds = Array.isArray(data.classIds)
        ? data.classIds
        : data.classIds
          ? [data.classIds]
          : [];

      const examData = {
        teacherId,
        title: data.title,
        description: data.description,
        classIds: selectedClassIds,
        durationMinutes: parseInt(data.durationMinutes),
        subjectId: subject.id,
        selectedQuestionIds: selectedQuestionIds
      };

      const result = await createExam(examData);

      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setError(result.error || 'Error creating exam');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Exam Info Section */}
      <div className="border-b pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Thông tin bài thi</h3>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tiêu đề *
          </label>
          <input
            type="text"
            {...register('title', {
              required: 'Title is required',
              minLength: { value: 5, message: 'Title must be at least 5 characters' }
            })}
            placeholder="Exam title"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mô tả
          </label>
          <textarea
            {...register('description')}
            rows="2"
            placeholder="Exam description (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </div>

      {/* Question & Duration */}
      <div className="border-b pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Thông tin bài thi</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số lượng câu hỏi
          </label>
          <p className="text-lg font-semibold text-primary-600">
            {availableQuestionCount} câu hỏi
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thời gian (phút) *
          </label>
          <input
            type="number"
            {...register('durationMinutes', {
              required: 'Duration is required',
              min: { value: 5, message: 'Minimum 5 minutes' },
              max: { value: 480, message: 'Maximum 480 minutes' }
            })}
            min="5"
            max="480"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.durationMinutes && (
            <p className="text-red-600 text-sm mt-1">{errors.durationMinutes.message}</p>
          )}
        </div>
      </div>

      {/* Class Selection (optional — assign & schedule in class detail) */}
      <div className="border-b pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Gán lớp (tùy chọn)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Các lớp được chọn sẽ được gán ngay khi tạo bài thi
        </p>

        {classesLoading ? (
          <p className="text-sm text-gray-600">Đang tải lớp học...</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-gray-600">Không có lớp nào</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {classes.map((cls) => (
              <label key={cls.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(cls.id)}
                  onChange={() => toggleClassSelection(cls.id)}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-900">{cls.className || cls.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Xem trước</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            <span className="font-medium">Tên:</span> {watch('title')}
          </p>
          <p>
            <span className="font-medium">Câu hỏi:</span> {availableQuestionCount} câu
          </p>
          <p>
            <span className="font-medium">Thời gian:</span> {watch('durationMinutes')} phút
          </p>
          <p>
            <span className="font-medium">Lớp:</span> {(watch('classIds') || []).length > 0 ? (watch('classIds').length + ' lớp') : 'Không chọn'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Hủy
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={submitting}
          icon={<Plus className="w-4 h-4" />}
        >
          {submitting ? 'Đang tạo...' : 'Tạo bài thi'}
        </Button>
      </div>
    </form>
  );
};

export default ExamCreationModal;
