import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import { AlertCircle, Plus } from 'lucide-react';
import { getClassesByTeacher } from '../../services/class.service';
import { createExam } from '../../services/exam.service';

const ExamCreationModal = ({
  subject,
  topic,
  availableQuestionCount = 0,
  teacherId,
  onSuccess,
  onCancel,
  loading = false
}) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      title: `${subject?.name} - ${topic?.name}`,
      description: '',
      durationMinutes: 60,
      questionCount: Math.min(availableQuestionCount, 10),
      classIds: []
    }
  });

  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const questionCount = watch('questionCount');
  const classIds = watch('classIds') || [];

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

      const examData = {
        teacherId,
        title: data.title,
        description: data.description,
        classIds: data.classIds,
        durationMinutes: parseInt(data.durationMinutes),
        subjectId: subject.id,
        topicIds: [topic.id],
        questionCount: parseInt(data.questionCount)
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

      {/* Question Selection */}
      <div className="border-b pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Chọn câu hỏi</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số lượng câu hỏi *
            </label>
            <input
              type="number"
              {...register('questionCount', {
                required: 'Question count is required',
                min: { value: 1, message: 'At least 1 question required' },
                max: {
                  value: availableQuestionCount,
                  message: `Maximum ${availableQuestionCount} questions available`
                }
              })}
              min="1"
              max={availableQuestionCount}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.questionCount && (
              <p className="text-red-600 text-sm mt-1">{errors.questionCount.message}</p>
            )}
          </div>

          <div>
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

        <p className="text-xs text-gray-600 mt-3">
          Có sẵn: <span className="font-semibold">{availableQuestionCount}</span> câu hỏi
        </p>
      </div>

      {/* Class Selection */}
      <div className="border-b pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Chọn lớp</h3>

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
                  value={cls.id}
                  {...register('classIds')}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-900">{cls.className || cls.name}</span>
              </label>
            ))}
          </div>
        )}
        {classIds.length === 0 && (
          <p className="text-xs text-orange-600 mt-2">⚠ Chọn ít nhất một lớp</p>
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
            <span className="font-medium">Câu hỏi:</span> {questionCount} câu
          </p>
          <p>
            <span className="font-medium">Thời gian:</span> {watch('durationMinutes')} phút
          </p>
          <p>
            <span className="font-medium">Lớp:</span> {classIds.length > 0 ? classIds.length + ' lớp' : 'Không chọn'}
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
          disabled={submitting || classIds.length === 0}
          icon={<Plus className="w-4 h-4" />}
        >
          {submitting ? 'Đang tạo...' : 'Tạo bài thi'}
        </Button>
      </div>
    </form>
  );
};

export default ExamCreationModal;
