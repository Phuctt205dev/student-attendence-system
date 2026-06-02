import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSubjectById,
  getTopic,
  getTopicQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../../services/subject.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import QuestionForm from '../../components/teacher/QuestionForm';
import GenerateQuestionsFromFileModal from '../../components/teacher/GenerateQuestionsFromFileModal';
import ExtractQuestionsFromFileModal from '../../components/teacher/ExtractQuestionsFromFileModal';


const TopicDetail = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { subjectId, topicId } = useParams();

  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastQuestionPoints, setLastQuestionPoints] = useState(1);
  const [questionsOpen, setQuestionsOpen] = useState(true);

  const loadTopicData = useCallback(async () => {
    setLoading(true);
    setError('');

    const subjectResult = await getSubjectById(subjectId);
    if (!subjectResult.success) {
      setError(subjectResult.error || 'Failed to load subject');
      setLoading(false);
      return;
    }
    setSubject(subjectResult.data);

    const topicResult = await getTopic(subjectId, topicId);
    if (!topicResult.success) {
      setError(topicResult.error || 'Failed to load topic');
      setLoading(false);
      return;
    }
    setTopic(topicResult.data);

    const questionsResult = await getTopicQuestions(subjectId, topicId);
    if (questionsResult.success) {
      setQuestions(questionsResult.data);
    } else {
      setError(questionsResult.error || 'Failed to load questions');
    }

    setLoading(false);
  }, [subjectId, topicId]);

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
        result = await updateQuestion(subjectId, topicId, editingQuestion.id, data);
      } else {
        result = await createQuestion(subjectId, topicId, {
          ...data,
          createdBy: userProfile?.uid
        });
      }

      if (result.success) {
        setSuccess(editingQuestion ? 'Question updated!' : 'Question created!');
        setLastQuestionPoints(data.points || 1);
        setShowQuestionModal(false);
        setEditingQuestion(null);

        const questionsResult = await getTopicQuestions(subjectId, topicId);
        if (questionsResult.success) {
          setQuestions(questionsResult.data);
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

    const result = await deleteQuestion(subjectId, topicId, questionId);
    if (result.success) {
      setSuccess('Question deleted!');

      const questionsResult = await getTopicQuestions(subjectId, topicId);
      if (questionsResult.success) {
        setQuestions(questionsResult.data);
      }

      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete question');
    }
  };

  useEffect(() => {
    if (subjectId && topicId) {
      loadTopicData();
    }
  }, [subjectId, topicId, loadTopicData]);

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                onClick={() => navigate(`/teacher/subjects/${subjectId}`)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {loading ? 'Loading...' : topic?.name}
                  </h1>
                  <p className="text-gray-600 mt-1">{subject?.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateQuestionModal}
                >
                  Thêm câu hỏi
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-primary-500 text-primary-600 hover:bg-primary-50"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>}
                  onClick={() => setShowExtractModal(true)}
                >
                  Nhập từ File
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-primary-500 text-primary-600 hover:bg-primary-50"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>}
                  onClick={() => setShowAiGenerateModal(true)}
                >
                  Tạo câu hỏi bằng AI
                </Button>

              </div>
            </div>
            {topic?.description && (
              <p className="text-gray-600 mt-3">{topic.description}</p>
            )}
          </div>
        </header>

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

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="p-0">
                <button
                  type="button"
                  onClick={() => setQuestionsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Danh sách câu hỏi</h3>
                    <span className="text-sm text-gray-500">({questions.length})</span>
                  </div>
                  {questionsOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {questionsOpen && (
                  <div className="px-6 pb-6">
                    {questions.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có câu hỏi</h3>
                        <p className="text-gray-600 mb-6">Hãy tạo câu hỏi đầu tiên</p>
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
                        {questions.map((question) => (
                          <Card key={question.id} className="p-4">
                            <div className="flex justify-between items-start gap-4">
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
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>

        <Modal
          isOpen={showAiGenerateModal}
          onClose={() => setShowAiGenerateModal(false)}
          title="Tạo câu hỏi tự động từ tệp"
          size="md"
        >
          <GenerateQuestionsFromFileModal
            subjectId={subjectId}
            topicId={topicId}
            subjectName={subject?.name}
            topicName={topic?.name}
            createdBy={userProfile?.uid}
            onCancel={() => setShowAiGenerateModal(false)}
            onSuccess={async ({ saved, total, chunksProcessed, failed }) => {
              setShowAiGenerateModal(false);
              const failNote = failed > 0 ? ` (${failed} câu lỗi)` : '';
              setSuccess(
                `Đã tạo ${saved}/${total} câu hỏi từ ${chunksProcessed} đoạn nội dung${failNote}`
              );
              const questionsResult = await getTopicQuestions(subjectId, topicId);
              if (questionsResult.success) {
                setQuestions(questionsResult.data);
              }
              setTimeout(() => setSuccess(''), 5000);
            }}
          />
        </Modal>

        <Modal
          isOpen={showExtractModal}
          onClose={() => setShowExtractModal(false)}
          title="Nhập câu hỏi từ File (Regex)"
          size="md"
        >
          <ExtractQuestionsFromFileModal
            subjectId={subjectId}
            topicId={topicId}
            createdBy={userProfile?.uid}
            onCancel={() => setShowExtractModal(false)}
            onSuccess={async ({ saved, total, failed }) => {
              setShowExtractModal(false);
              const failNote = failed > 0 ? ` (${failed} câu lỗi)` : '';
              setSuccess(`Đã trích xuất và lưu ${saved}/${total} câu hỏi${failNote}`);
              const questionsResult = await getTopicQuestions(subjectId, topicId);
              if (questionsResult.success) {
                setQuestions(questionsResult.data);
              }
              setTimeout(() => setSuccess(''), 5000);
            }}
          />
        </Modal>

        <Modal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi'}
          size="md"
        >
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
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default TopicDetail;
