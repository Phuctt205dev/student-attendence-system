import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSubjectById,
  getSubjectTopics,
  createTopic,
  updateTopic,
  deleteTopic
} from '../../services/subject.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { ChevronLeft, Plus, Edit2, Trash2, BookOpen, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import TopicForm from '../../components/teacher/TopicForm';

const SubjectDetail = () => {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (subjectId) {
      loadSubjectAndTopics();
    }
  }, [subjectId]);


  const loadSubjectAndTopics = async () => {
    setLoading(true);

    // Load subject
    const subjectResult = await getSubjectById(subjectId);
    if (!subjectResult.success) {
      setError(subjectResult.error || 'Failed to load subject');
      setLoading(false);
      return;
    }

    setSubject(subjectResult.data);

    // Load topics
    const topicsResult = await getSubjectTopics(subjectId);
    if (topicsResult.success) {
      setTopics(topicsResult.data);
      setError('');
    } else {
      setError(topicsResult.error || 'Failed to load topics');
    }

    setLoading(false);
  };

  const handleOpenCreateTopicModal = () => {
    setEditingTopic(null);
    setShowTopicModal(true);
  };

  const handleOpenEditTopicModal = (topic) => {
    setEditingTopic(topic);
    setShowTopicModal(true);
  };

  const handleSubmitTopic = async (data) => {
    try {
      setSubmitting(true);
      let result;

      if (editingTopic) {
        result = await updateTopic(subjectId, editingTopic.id, data);
      } else {
        result = await createTopic(subjectId, data);
      }

      if (result.success) {
        setSuccess(editingTopic ? 'Topic updated!' : 'Topic created!');
        setShowTopicModal(false);
        loadSubjectAndTopics();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Error saving topic');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    const result = await deleteTopic(subjectId, topicId);
    if (result.success) {
      setSuccess('Topic deleted!');
      loadSubjectAndTopics();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete topic');
    }
  };

  const handleOpenTopicDetail = (topicId) => {
    navigate(`/teacher/subjects/${subjectId}/topics/${topicId}`);
  };

  const handleGoToExams = () => {
    navigate(`/teacher/subjects/${subjectId}/exams`);
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/teacher/subjects')}
                  className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {loading ? 'Loading...' : subject?.name}
                  </h1>
                  {subject?.description && (
                    <p className="text-gray-600 mt-1">{subject.description}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={handleGoToExams}
                >
                  Bài thi
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateTopicModal}
                >
                  Thêm chủ đề
                </Button>
              </div>
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
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Topics Section */}
          <div className="mb-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : topics.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có chủ đề</h3>
                  <p className="text-gray-600 mb-6">Hãy tạo chủ đề đầu tiên</p>
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleOpenCreateTopicModal}
                  >
                    Tạo chủ đề
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <Card
                    key={topic.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleOpenTopicDetail(topic.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
                          {topic.description && (
                            <p className="text-gray-600 mt-1">{topic.description}</p>
                          )}
                          <div className="mt-3 text-sm text-gray-500">
                            <span className="font-semibold text-gray-900">{topic.questionCount || 0}</span> câu hỏi
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenEditTopicModal(topic);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteTopic(topic.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </main>

        {/* Topic Modal */}
        <Modal
          isOpen={showTopicModal}
          onClose={() => {
            setShowTopicModal(false);
            setEditingTopic(null);
          }}
          title={editingTopic ? 'Chỉnh sửa chủ đề' : 'Tạo chủ đề'}
          size="md"
        >
          <TopicForm
            initialData={editingTopic}
            onSubmit={handleSubmitTopic}
            onCancel={() => {
              setShowTopicModal(false);
              setEditingTopic(null);
            }}
            loading={submitting}
          />
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default SubjectDetail;
