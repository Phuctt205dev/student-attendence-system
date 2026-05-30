import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import {
  createExam,
  updateExam
} from '../../services/exam.service';
import Button from '../common/Button';
import Card from '../common/Card';
import { AlertCircle } from 'lucide-react';

const ExamForm = ({ initialData, classes, onSuccess, onCancel }) => {
  console.log('ExamForm rendering with classes:', classes);
  const { userProfile } = useAuth();
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      classIds: initialData?.classIds || [],
      durationMinutes: initialData?.durationMinutes || 60,
      easyCount: initialData?.questionDistribution?.easy || 10,
      mediumCount: initialData?.questionDistribution?.medium || 10,
      hardCount: initialData?.questionDistribution?.hard || 5
    }
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const easyCount = watch('easyCount');
  const mediumCount = watch('mediumCount');
  const hardCount = watch('hardCount');
  const totalQuestions = parseInt(easyCount) + parseInt(mediumCount) + parseInt(hardCount);

  const onSubmit = async (data) => {
    if (totalQuestions === 0) {
      setError('Please specify at least one question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const examData = {
        title: data.title,
        description: data.description,
        classIds: data.classIds.length > 0 ? data.classIds : classes[0]?.id,
        durationMinutes: parseInt(data.durationMinutes),
        teacherId: userProfile.uid,
        questionDistribution: {
          easy: parseInt(data.easyCount),
          medium: parseInt(data.mediumCount),
          hard: parseInt(data.hardCount)
        }
      };

      let result;
      if (initialData) {
        result = await updateExam(initialData.id, examData);
      } else {
        result = await createExam(examData);
      }

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exam Title *
        </label>
        <input
          type="text"
          {...register('title', {
            required: 'Title is required',
            minLength: {
              value: 5,
              message: 'Title must be at least 5 characters'
            }
          })}
          placeholder="e.g., Final Exam - React Fundamentals"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.title && (
          <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          {...register('description')}
          rows="3"
          placeholder="Add exam instructions or description..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Classes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign to Classes
        </label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {classes.length === 0 ? (
            <p className="text-gray-500 text-sm">No classes available</p>
          ) : (
            classes.map(classItem => (
              <label key={classItem.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('classIds')}
                  value={classItem.id}
                  className="w-4 h-4 rounded border-gray-200 cursor-pointer"
                />
                <span className="text-gray-700 text-sm">
                  {classItem.classCode} - {classItem.className}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration (minutes) *
        </label>
        <input
          type="number"
          {...register('durationMinutes', {
            required: 'Duration is required',
            min: {
              value: 5,
              message: 'Duration must be at least 5 minutes'
            },
            max: {
              value: 480,
              message: 'Duration cannot exceed 480 minutes'
            }
          })}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.durationMinutes && (
          <p className="text-red-600 text-sm mt-1">{errors.durationMinutes.message}</p>
        )}
      </div>

      {/* Question Distribution */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Question Distribution
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Easy Questions
            </label>
            <input
              type="number"
              {...register('easyCount', {
                required: true,
                min: 0
              })}
              min="0"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Medium Questions
            </label>
            <input
              type="number"
              {...register('mediumCount', {
                required: true,
                min: 0
              })}
              min="0"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Hard Questions
            </label>
            <input
              type="number"
              {...register('hardCount', {
                required: true,
                min: 0
              })}
              min="0"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Questions:</span>
            <span className="text-2xl font-bold text-primary-600">{totalQuestions}</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {totalQuestions} × 2.5 points = {(totalQuestions * 2.5).toFixed(1)} total points
          </p>
        </div>
      </Card>

      {/* Info */}
      <Card className="bg-gray-50 border-gray-200">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Passing Score:</strong> {Math.ceil(totalQuestions * 1.25)} points (50%)
          </p>
          <p className="text-xs text-gray-500">
            Questions will be randomly selected from your question bank and shuffled.
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={loading || totalQuestions === 0}
        >
          {loading ? 'Creating...' : initialData ? 'Update Exam' : 'Create Exam'}
        </Button>
      </div>
    </form>
  );
};

export default ExamForm;
