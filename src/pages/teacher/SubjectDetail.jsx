import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSubjectById,
  getSubjectTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../../services/subject.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { ChevronLeft, Plus, Edit2, Trash2, BookOpen, AlertCircle, CheckCircle, Eye, FileText } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import TopicForm from '../../components/teacher/TopicForm';
import QuestionForm from '../../components/teacher/QuestionForm';
import ExamCreationModal from '../../components/teacher/ExamCreationModal';

const SubjectDetail = () => {
  const { userProfile } = useAuth();
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

  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [lastQuestionPoints, setLastQuestionPoints] = useState(1);

  const [showExamModal, setShowExamModal] = useState(false);
  const [examTopicContext, setExamTopicContext] = useState(null);

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

  const handleViewQuestions = async (topic) => {
    setSelectedTopic(topic);
    setQuestionsLoading(true);

    const result = await getTopicQuestions(subjectId, topic.id);
    if (result.success) {
      setQuestions(result.data);
    } else {
      setError(result.error || 'Failed to load questions');
    }

    setQuestionsLoading(false);
    setShowQuestionsModal(true);
  };

  const handleOpenCreateQuestionModal = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestionModal = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSubmitQuestion = async (data) => {
    try {
      setSubmitting(true);
      let result;

      if (editingQuestion) {
        result = await updateQuestion(subjectId, selectedTopic.id, editingQuestion.id, data);
      } else {
        result = await createQuestion(subjectId, selectedTopic.id, {
          ...data,
          createdBy: userProfile?.uid
        });
      }

      if (result.success) {
        setSuccess(editingQuestion ? 'Question updated!' : 'Question created!');
        setLastQuestionPoints(data.points || 1);
        setShowQuestionModal(false);
        setEditingQuestion(null);

        // Reload questions in modal
        const questionsResult = await getTopicQuestions(subjectId, selectedTopic.id);
        if (questionsResult.success) {
          setQuestions(questionsResult.data);
        }

        // Reload topics to update questionCount on topic card
        const topicsResult = await getSubjectTopics(subjectId);
        if (topicsResult.success) {
          setTopics(topicsResult.data);
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Error saving question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    const result = await deleteQuestion(subjectId, selectedTopic.id, questionId);
    if (result.success) {
      setSuccess('Question deleted!');

      // Reload questions in modal
      const questionsResult = await getTopicQuestions(subjectId, selectedTopic.id);
      if (questionsResult.success) {
        setQuestions(questionsResult.data);
      }

      // Reload topics to update questionCount on topic card
      const topicsResult = await getSubjectTopics(subjectId);
      if (topicsResult.success) {
        setTopics(topicsResult.data);
      }

      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete question');
    }
  };

  const handleOpenExamModal = (topic) => {
    setExamTopicContext(topic);
    setShowExamModal(true);
  };

  const handleExamCreated = (examData) => {
    setSuccess('Bài thi được tạo thành công!');
    setShowExamModal(false);
    setExamTopicContext(null);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/teacher/subjects')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Chủ đề</h2>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateTopicModal}
              >
                Thêm chủ đề
              </Button>
            </div>

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
                  <Card key={topic.id} className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
                        {topic.description && (
                          <p className="text-gray-600 mt-1">{topic.description}</p>
                        )}
                        <div className="mt-3 text-sm text-gray-500">
                          <span className="font-semibold text-gray-900">{topic.questionCount || 0}</span> câu hỏi
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4 items-center">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<FileText className="w-3 h-3" />}
                          onClick={() => handleOpenExamModal(topic)}
                        >
                          Tạo bài thi
                        </Button>
                        <button
                          onClick={() => handleViewQuestions(topic)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View questions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditTopicModal(topic)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
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

        {/* Questions Modal */}
        <Modal
          isOpen={showQuestionsModal}
          onClose={() => {
            setShowQuestionsModal(false);
            setSelectedTopic(null);
            setQuestions([]);
            setEditingQuestion(null);
          }}
          title={selectedTopic ? `${selectedTopic.name} - Câu hỏi` : 'Câu hỏi'}
          size="lg"
        >
          {questionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Chưa có câu hỏi nào</p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateQuestionModal}
              >
                Thêm câu hỏi
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((question) => (
                  <Card key={question.id} className="p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{question.questionText}</p>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <div>
                            <span className="font-semibold">A:</span> {question.options?.A}
                          </div>
                          <div>
                            <span className="font-semibold">B:</span> {question.options?.B}
                          </div>
                          <div>
                            <span className="font-semibold">C:</span> {question.options?.C}
                          </div>
                          <div>
                            <span className="font-semibold">D:</span> {question.options?.D}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-3 text-xs text-gray-600">
                          <span>
                            <span className="font-semibold">Đáp án:</span> {question.correctAnswer}
                          </span>
                          <span>
                            <span className="font-semibold">Điểm:</span> {question.points}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditQuestionModal(question)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuestionsModal(false);
                    setSelectedTopic(null);
                    setQuestions([]);
                    setEditingQuestion(null);
                  }}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateQuestionModal}
                >
                  Thêm câu hỏi
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Question Modal */}
        <Modal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi'}
          size="md"
        >
          {selectedTopic && (
            <QuestionForm
              initialData={editingQuestion}
              lastQuestionPoints={lastQuestionPoints}
              onSubmit={handleSubmitQuestion}
              onCancel={() => {
                setShowQuestionModal(false);
                setEditingQuestion(null);
              }}
              loading={submitting}
            />
          )}
        </Modal>

        {/* Exam Creation Modal */}
        <Modal
          isOpen={showExamModal}
          onClose={() => {
            setShowExamModal(false);
            setExamTopicContext(null);
          }}
          title={`Tạo bài thi - ${examTopicContext?.name}`}
          size="md"
        >
          {examTopicContext && subject && (
            <ExamCreationModal
              subject={subject}
              topic={examTopicContext}
              availableQuestionCount={examTopicContext.questionCount || 0}
              teacherId={userProfile?.uid}
              onSuccess={handleExamCreated}
              onCancel={() => {
                setShowExamModal(false);
                setExamTopicContext(null);
              }}
            />
          )}
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default SubjectDetail;
