import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import { AlertCircle } from 'lucide-react';
import { QUESTION_TYPE_ESSAY, QUESTION_TYPE_MCQ } from '../../utils/questionTypes';

const QuestionForm = ({ initialData, onSubmit, onCancel, lastQuestionPoints = 1, loading = false }) => {
  const initialType =
    initialData?.type === QUESTION_TYPE_ESSAY ? QUESTION_TYPE_ESSAY : QUESTION_TYPE_MCQ;

  const [questionType, setQuestionType] = useState(initialType);
  const isEditing = Boolean(initialData?.id);

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
  const correctAnswer = watch('correctAnswer');
  const isMcq = questionType === QUESTION_TYPE_MCQ;

  const handleTypeChange = (nextType) => {
    if (isEditing) return;
    setQuestionType(nextType);
  };

  const onSubmitForm = async (data) => {
    try {
      setError('');

      const questionData = {
        type: questionType,
        questionText: data.questionText,
        points: parseInt(data.points, 10) || 1
      };

      if (isMcq) {
        questionData.options = {
          A: data.optionA,
          B: data.optionB,
          C: data.optionC,
          D: data.optionD
        };
        questionData.correctAnswer = data.correctAnswer;
      } else {
        questionData.options = null;
        questionData.correctAnswer = null;
      }

      if (onSubmit) {
        const result = await onSubmit(questionData);
        if (!result || !result.success) {
          setError(result?.error || 'Error saving question');
        }
      }
    } catch (err) {
      setError(err.message || 'Error saving question');
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

      <div className="flex items-center justify-between gap-4 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          disabled={isEditing}
          onClick={() => handleTypeChange(QUESTION_TYPE_MCQ)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            isMcq
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          Trắc nghiệm
        </button>
        <button
          type="button"
          disabled={isEditing}
          onClick={() => handleTypeChange(QUESTION_TYPE_ESSAY)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            !isMcq
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          Tự luận
        </button>
      </div>
      {isEditing && (
        <p className="text-xs text-gray-500 -mt-2">
          Không thể đổi loại câu hỏi khi chỉnh sửa.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nội dung câu hỏi *
        </label>
        <textarea
          {...register('questionText', {
            required: 'Vui lòng nhập câu hỏi',
            minLength: {
              value: 10,
              message: 'Câu hỏi phải có ít nhất 10 ký tự'
            }
          })}
          rows="4"
          placeholder={isMcq ? 'Nhập câu hỏi trắc nghiệm...' : 'Nhập đề bài tự luận...'}
          className="input-field"
        />
        {errors.questionText && (
          <p className="text-red-600 text-sm mt-1">{errors.questionText.message}</p>
        )}
      </div>

      {isMcq && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Các đáp án *</p>

          {['A', 'B', 'C', 'D'].map((option) => (
            <div key={option}>
              <label className="block text-sm text-gray-600 mb-1">Đáp án {option}</label>
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
                    required: `Vui lòng nhập đáp án ${option}`,
                    minLength: {
                      value: 2,
                      message: 'Đáp án phải có ít nhất 2 ký tự'
                    }
                  })}
                  placeholder={`Nhập đáp án ${option}...`}
                  className="input-field flex-1"
                />
                {correctAnswer === option && (
                  <span className="text-green-600 text-sm font-medium">✓ Đúng</span>
                )}
              </div>
              {errors[`option${option}`] && (
                <p className="text-red-600 text-sm mt-1">{errors[`option${option}`].message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isMcq && (
        <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Câu tự luận do giáo viên chấm điểm sau khi sinh viên nộp bài. Sinh viên sẽ trả lời bằng văn bản khi làm bài thi.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Điểm *
        </label>
        <input
          type="number"
          {...register('points', {
            required: 'Vui lòng nhập điểm',
            min: {
              value: 1,
              message: 'Điểm tối thiểu là 1'
            },
            max: {
              value: 100,
              message: 'Điểm tối đa là 100'
            }
          })}
          min="1"
          max="100"
          className="input-field"
        />
        {errors.points && (
          <p className="text-red-600 text-sm mt-1">{errors.points.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo câu hỏi'}
        </Button>
      </div>
    </form>
  );
};

export default QuestionForm;
