import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  getTeacherExams,
  deleteExam,
  publishExam,
  closeExam,
  getExamStatistics
} from '../../services/exam.service';
import {
  getClassesByTeacher
} from '../../services/class.service';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Send,
  Lock,
  Users,
  Clock,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ExamForm from '../../components/teacher/ExamForm';
import { formatDistanceToNow, format } from 'date-fns';

const TeacherExams = () => {
  const { userProfile } = useAuth();

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingExam, setPublishingExam] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadExams();
    loadClasses();
  }, [userProfile?.uid]);

  const loadExams = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const result = await getTeacherExams(userProfile.uid);

    if (result.success) {
      setExams(result.data);
      setError('');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const loadClasses = async () => {
    if (!userProfile?.uid) return;

    try {
      const result = await getClassesByTeacher(userProfile.uid);
      if (result.success) {
        setClasses(result.data);
      } else {
        console.error('Failed to load classes:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError(error.message);
    }
  };

  const handlePublishExam = async (examId, startTime, endTime) => {
    const result = await publishExam(examId, startTime, endTime);

    if (result.success) {
      setSuccess('Exam published successfully!');
      setShowPublishModal(false);
      setPublishingExam(null);
      loadExams();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleCloseExam = async (examId) => {
    const result = await closeExam(examId);

    if (result.success) {
      setSuccess('Exam closed successfully!');
      loadExams();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      const result = await deleteExam(examId);

      if (result.success) {
        setSuccess('Exam deleted successfully!');
        loadExams();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    }
  };

  // Filter exams
  const getFilteredExams = () => {
    if (statusFilter === 'all') return exams;
    return exams.filter(exam => exam.status === statusFilter);
  };

  const filteredExams = getFilteredExams();

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      closed: 'bg-gray-500 text-white'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isExamActive = (exam) => {
    const now = new Date();
    if (!exam.startTime || !exam.endTime) return false;

    const startTime = exam.startTime?.toDate?.() || new Date(exam.startTime);
    const endTime = exam.endTime?.toDate?.() || new Date(exam.endTime);

    return now >= startTime && now <= endTime;
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
                <p className="text-gray-600 mt-1">Create and manage exams</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => {
                  console.log('Create Exam clicked');
                  setEditingExam(null);
                  setShowExamModal(true);
                }}
              >
                Create Exam
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Status Filter */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {['all', 'draft', 'published', 'closed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Exams List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : filteredExams.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">
                {exams.length === 0 ? 'No exams yet' : 'No exams match your filters'}
              </p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingExam(null);
                  setShowExamModal(true);
                }}
              >
                Create First Exam
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredExams.map(exam => {
                const classNames = exam.classIds
                  .map(classId => classes.find(c => c.id === classId)?.className)
                  .filter(Boolean);

                const isActive = isExamActive(exam);

                return (
                  <Card
                    key={exam.id}
                    className={`hover:shadow-md transition-shadow ${
                      isActive ? 'border-2 border-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {exam.title}
                          </h3>
                          {getStatusBadge(exam.status)}
                          {isActive && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Active Now
                            </span>
                          )}
                        </div>

                        {exam.description && (
                          <p className="text-gray-600 text-sm mb-3">{exam.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>
                              {classNames.length > 0
                                ? classNames.join(', ')
                                : 'No classes assigned'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{exam.durationMinutes} mins</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{exam.totalQuestions}</span> questions
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">
                              {exam.questionDistribution.easy}E / {exam.questionDistribution.medium}
                              M / {exam.questionDistribution.hard}H
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          {exam.startTime && exam.endTime && (
                            <>
                              <div>
                                Starts: {format(exam.startTime?.toDate?.() || new Date(exam.startTime), 'MMM dd, yyyy HH:mm')}
                              </div>
                              <div>
                                Ends: {format(exam.endTime?.toDate?.() || new Date(exam.endTime), 'MMM dd, yyyy HH:mm')}
                              </div>
                            </>
                          )}
                          <div>
                            Created{' '}
                            {formatDistanceToNow(exam.createdAt?.toDate?.() || new Date(), {
                              addSuffix: true
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {exam.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Edit2 className="w-4 h-4" />}
                              onClick={() => {
                                setEditingExam(exam);
                                setShowExamModal(true);
                              }}
                              title="Edit"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send className="w-4 h-4" />}
                              onClick={() => {
                                setPublishingExam(exam);
                                setShowPublishModal(true);
                              }}
                              title="Publish"
                            />
                          </>
                        )}

                        {exam.status === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Lock className="w-4 h-4" />}
                            onClick={() => handleCloseExam(exam.id)}
                            title="Close"
                          />
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4 text-red-600" />}
                          onClick={() => handleDeleteExam(exam.id)}
                          title="Delete"
                          disabled={exam.status !== 'draft'}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Create/Edit Exam Modal */}
        <Modal
          isOpen={showExamModal}
          onClose={() => {
            setShowExamModal(false);
            setEditingExam(null);
          }}
          title={editingExam ? 'Edit Exam' : 'Create Exam'}
          size="xl"
        >
          <ExamForm
            initialData={editingExam}
            classes={classes}
            onSuccess={() => {
              setShowExamModal(false);
              setEditingExam(null);
              loadExams();
            }}
            onCancel={() => {
              setShowExamModal(false);
              setEditingExam(null);
            }}
          />
        </Modal>

        {/* Publish Exam Modal */}
        <Modal
          isOpen={showPublishModal}
          onClose={() => {
            setShowPublishModal(false);
            setPublishingExam(null);
          }}
          title="Publish Exam"
        >
          {publishingExam && (
            <PublishExamForm
              exam={publishingExam}
              onSubmit={handlePublishExam}
              onCancel={() => {
                setShowPublishModal(false);
                setPublishingExam(null);
              }}
            />
          )}
        </Modal>
      </div>
    </TeacherLayout>
  );
};

// Publish Exam Form Component
const PublishExamForm = ({ exam, onSubmit, onCancel }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      startTime: exam.startTime
        ? format(exam.startTime?.toDate?.() || new Date(exam.startTime), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: exam.endTime
        ? format(exam.endTime?.toDate?.() || new Date(exam.endTime), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(Date.now() + 90 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
    }
  });

  return (
    <form
      onSubmit={handleSubmit(data => {
        onSubmit(exam.id, new Date(data.startTime), new Date(data.endTime));
      })}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Start Time *
        </label>
        <input
          type="datetime-local"
          {...register('startTime', { required: 'Start time is required' })}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          End Time *
        </label>
        <input
          type="datetime-local"
          {...register('endTime', { required: 'End time is required' })}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Publish Exam
        </Button>
      </div>
    </form>
  );
};

export default TeacherExams;
