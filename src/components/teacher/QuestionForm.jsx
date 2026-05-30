import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import { AlertCircle } from 'lucide-react';

const QuestionForm = ({ initialData, subjectId, topicId, onSuccess, onCancel, lastQuestionPoints = 1 }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      questionText: initialData?.questionText || '',
      optionA: initialData?.options?.A || '',
      optionB: initialData?.options?.B || '',
      optionC: initialData?.options?.C || '',
      optionD: initialData?.options?.D || '',
      correctAnswer: initialData?.correctAnswer || 'A',
      points: initialData?.points || lastQuestionPoints
    }
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const correctAnswer = watch('correctAnswer');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');

      const questionData = {
        questionText: data.questionText,
        options: {
          A: data.optionA,
          B: data.optionB,
          C: data.optionC,
          D: data.optionD
        },
        correctAnswer: data.correctAnswer,
        points: parseInt(data.points) || 1,
        createdBy: localStorage.getItem('uid') // Get from auth context if available
      };

      let result;
      if (initialData) {
        result = await updateQuestion(subjectId, topicId, initialData.id, questionData);
      } else {
        result = await createQuestion(subjectId, topicId, questionData);
      }

      if (result.success) {
        // Pass back the current question's points so it becomes default for next question
        if (onSuccess) {
          onSuccess(parseInt(data.points));
        }
      } else {
        setError(result.error || 'Failed to save question');
      }
    } catch (err) {
      setError(err.message || 'Error saving question');
    } finally {
      setLoading(false);
    }
  };

  // Import functions inside component to avoid circular dependencies
  const { createQuestion, updateQuestion } = require('../../services/subject.service');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Text *
        </label>
        <textarea
          {...register('questionText', {
            required: 'Question is required',
            minLength: {
              value: 10,
              message: 'Question must be at least 10 characters'
            }
          })}
          rows="4"
          placeholder="Enter the question..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
        {errors.questionText && (
          <p className="text-red-600 text-sm mt-1">{errors.questionText.message}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-700">Options *</p>

        {['A', 'B', 'C', 'D'].map((option) => (
          <div key={option}>
            <label className="block text-sm text-gray-600 mb-1">Option {option}</label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                value={option}
                {...register('correctAnswer')}
                className="w-4 h-4 cursor-pointer"
              />
              <input
                type="text"
                {...register(`option${option}`, {
                  required: `Option ${option} is required`,
                  minLength: {
                    value: 2,
                    message: 'Option must be at least 2 characters'
                  }
                })}
                placeholder={`Enter option ${option}...`}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {correctAnswer === option && (
                <span className="text-green-600 text-sm font-medium">✓ Correct</span>
              )}
            </div>
            {errors[`option${option}`] && (
              <p className="text-red-600 text-sm mt-1">{errors[`option${option}`].message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Points */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Points *
        </label>
        <input
          type="number"
          {...register('points', {
            required: 'Points is required',
            min: {
              value: 1,
              message: 'Points must be at least 1'
            },
            max: {
              value: 100,
              message: 'Points cannot exceed 100'
            }
          })}
          min="1"
          max="100"
          placeholder="Enter points for this question"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.points && (
          <p className="text-red-600 text-sm mt-1">{errors.points.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Default will be set to this value for the next question
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Question' : 'Create Question'}
        </Button>
      </div>
    </form>
  );
};

export default QuestionForm;
