import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../common/Input';
import Button from '../common/Button';

const QuestionForm = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      questionText: initialData?.questionText || '',
      optionA: initialData?.options?.A || '',
      optionB: initialData?.options?.B || '',
      optionC: initialData?.options?.C || '',
      optionD: initialData?.options?.D || '',
      correctAnswer: initialData?.correctAnswer || 'A',
      difficulty: initialData?.difficulty || 'easy',
      subject: initialData?.subject || '',
      topic: initialData?.topic || ''
    }
  });

  const correctAnswer = watch('correctAnswer');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        {['A', 'B', 'C', 'D'].map(option => (
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
                <span className="text-green-600 text-sm font-medium">Correct</span>
              )}
            </div>
            {errors[`option${option}`] && (
              <p className="text-red-600 text-sm mt-1">
                {errors[`option${option}`].message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty *
        </label>
        <select
          {...register('difficulty', { required: 'Difficulty is required' })}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        {errors.difficulty && (
          <p className="text-red-600 text-sm mt-1">{errors.difficulty.message}</p>
        )}
      </div>

      {/* Subject & Topic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <input
            type="text"
            {...register('subject', {
              required: 'Subject is required',
              minLength: {
                value: 2,
                message: 'Subject must be at least 2 characters'
              }
            })}
            placeholder="e.g., React, Database"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.subject && (
            <p className="text-red-600 text-sm mt-1">{errors.subject.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic *
          </label>
          <input
            type="text"
            {...register('topic', {
              required: 'Topic is required',
              minLength: {
                value: 2,
                message: 'Topic must be at least 2 characters'
              }
            })}
            placeholder="e.g., Hooks, Routing"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.topic && (
            <p className="text-red-600 text-sm mt-1">{errors.topic.message}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {initialData ? 'Update Question' : 'Create Question'}
        </Button>
      </div>
    </form>
  );
};

export default QuestionForm;
