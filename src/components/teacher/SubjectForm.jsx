import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import { AlertCircle } from 'lucide-react';

const SubjectForm = ({ initialData, onSubmit, onCancel, loading = false }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || ''
    }
  });

  const [error, setError] = useState('');

  const onSubmitForm = async (data) => {
    try {
      setError('');
      if (onSubmit) {
        const result = await onSubmit(data);
        if (!result.success) {
          setError(result.error || 'Error saving subject');
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject Name *
        </label>
        <input
          type="text"
          {...register('name', {
            required: 'Subject name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters'
            }
          })}
          placeholder="e.g., React, Database Design"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          {...register('description')}
          rows="3"
          placeholder="Add description..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

export default SubjectForm;
