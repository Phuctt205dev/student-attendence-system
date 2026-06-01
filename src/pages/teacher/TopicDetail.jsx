import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSubjectById,
  getTopic,
  getTopicQuestions,
  getTopicAttachments,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  uploadTopicAttachment
} from '../../services/subject.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import QuestionForm from '../../components/teacher/QuestionForm';
import GenerateQuestionsFromFileModal from '../../components/teacher/GenerateQuestionsFromFileModal';

const TopicDetail = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { subjectId, topicId } = useParams();

  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastQuestionPoints, setLastQuestionPoints] = useState(1);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);

  const fileInputRef = useRef(null);

  const loadAttachments = useCallback(async () => {
    if (!subjectId || !topicId) return;
    setAttachmentsLoading(true);
    const result = await getTopicAttachments(subjectId, topicId);
    if (result.success) {
      setAttachments(result.data || []);
    } else {
      setError(result.error || 'Failed to load attachments');
    }
    setAttachmentsLoading(false);
  }, [subjectId, topicId]);

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
      loadAttachments();
    }
  }, [subjectId, topicId, loadTopicData, loadAttachments]);

  const isAllowedAttachment = (file) => {
    const name = file?.name?.toLowerCase() || '';
    return name.endsWith('.pdf') || name.endsWith('.docx');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const handlePickAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!isAllowedAttachment(file)) {
      setError('Chỉ hỗ trợ tệp PDF hoặc DOCX');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploadingAttachment(true);
    setError('');

    const result = await uploadTopicAttachment(subjectId, topicId, file, userProfile?.uid);
    if (result.success) {
      setSuccess('Đã đính kèm tệp');
      loadAttachments();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Không thể đính kèm tệp');
    }

    setUploadingAttachment(false);
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/teacher/subjects/${subjectId}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
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
                  variant="success"
                  icon={<Paperclip className="w-4 h-4" />}
                  onClick={handlePickAttachment}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? 'Đang tải...' : 'Đính kèm tệp'}
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
            {topic?.description && (
              <p className="text-gray-600 mt-3">{topic.description}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleAttachmentSelected}
            />
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
                  onClick={() => setAttachmentsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Tệp đính kèm</h3>
                    <span className="text-sm text-gray-500">({attachments.length})</span>
                  </div>
                  {attachmentsOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {attachmentsOpen && (
                  <div className="px-6 pb-6">
                    {attachmentsLoading ? (
                      <p className="text-sm text-gray-600">Đang tải tệp...</p>
                    ) : attachments.length === 0 ? (
                      <div className="text-sm text-gray-600">Chưa có tệp đính kèm</div>
                    ) : (
                      <div className="space-y-3">
                        {attachments.map((file) => {
                          const isPdf = (file.name || '').toLowerCase().endsWith('.pdf');
                          return (
                          <div
                            key={file.id}
                            className="flex flex-wrap items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-primary-700 hover:underline"
                                >
                                  {file.name}
                                </a>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              {isPdf ? 'PDF' : 'DOCX'}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>

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
