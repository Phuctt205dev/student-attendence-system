import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TeacherLayout from '../../layouts/TeacherLayout';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsByTeacher,
  getTeacherSubjects,
  getQuestionsBySubject,
  getQuestionsByDifficulty
} from '../../services/questionBank.service';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import QuestionForm from '../../components/teacher/QuestionForm';
import { formatDistanceToNow } from 'date-fns';

const TeacherQuestionBank = () => {
  const { userProfile } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [subjects, setSubjects] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0
  });

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
    loadSubjects();
  }, [userProfile?.uid]);

  const loadQuestions = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const result = await getQuestionsByTeacher(userProfile.uid);

    if (result.success) {
      setQuestions(result.data);

      // Calculate stats
      const easyCount = result.data.filter(q => q.difficulty === 'easy').length;
      const mediumCount = result.data.filter(q => q.difficulty === 'medium').length;
      const hardCount = result.data.filter(q => q.difficulty === 'hard').length;

      setStats({
        total: result.data.length,
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount
      });

      setError('');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const loadSubjects = async () => {
    if (!userProfile?.uid) return;

    const result = await getTeacherSubjects(userProfile.uid);
    if (result.success) {
      setSubjects(result.data);
    }
  };

  const handleCreateQuestion = async (formData) => {
    const result = await createQuestion({
      ...formData,
      createdBy: userProfile.uid
    });

    if (result.success) {
      setSuccess('Question created successfully!');
      setShowQuestionModal(false);
      loadQuestions();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleUpdateQuestion = async (formData) => {
    const result = await updateQuestion(editingQuestion.id, formData);

    if (result.success) {
      setSuccess('Question updated successfully!');
      setEditingQuestion(null);
      setShowQuestionModal(false);
      loadQuestions();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const result = await deleteQuestion(questionId);

      if (result.success) {
        setSuccess('Question deleted successfully!');
        loadQuestions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    }
  };

  // Apply filters
  const getFilteredQuestions = () => {
    let filtered = questions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.questionText.toLowerCase().includes(term) ||
        (q.topic && q.topic.toLowerCase().includes(term)) ||
        (q.subject && q.subject.toLowerCase().includes(term))
      );
    }

    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    return filtered;
  };

  const filteredQuestions = getFilteredQuestions();

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
                <p className="text-gray-600 mt-1">Create and manage exam questions</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
              >
                Add Question
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Questions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div>
                <p className="text-gray-600 text-sm">Easy</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.easy}</p>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div>
                <p className="text-gray-600 text-sm">Medium</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.medium}</p>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div>
                <p className="text-gray-600 text-sm">Hard</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.hard}</p>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </Card>

          {/* Questions List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">
                {questions.length === 0 ? 'No questions yet' : 'No questions match your filters'}
              </p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
              >
                Create First Question
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(question => (
                <Card key={question.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          {question.questionText}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            question.difficulty === 'easy'
                              ? 'bg-green-100 text-green-800'
                              : question.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {question.difficulty}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div>
                          <span className="font-medium">A:</span> {question.options.A}
                        </div>
                        <div>
                          <span className="font-medium">B:</span> {question.options.B}
                        </div>
                        <div>
                          <span className="font-medium">C:</span> {question.options.C}
                        </div>
                        <div>
                          <span className="font-medium">D:</span> {question.options.D}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Answer: <strong>{question.correctAnswer}</strong></span>
                        <span>Subject: <strong>{question.subject}</strong></span>
                        <span>Topic: <strong>{question.topic}</strong></span>
                        <span>
                          Created{' '}
                          {formatDistanceToNow(question.createdAt?.toDate?.() || new Date(), {
                            addSuffix: true
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit2 className="w-4 h-4" />}
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowQuestionModal(true);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4 text-red-600" />}
                        onClick={() => handleDeleteQuestion(question.id)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Question Modal */}
        <Modal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Edit Question' : 'Create Question'}
        >
          <QuestionForm
            initialData={editingQuestion}
            onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
            onCancel={() => {
              setShowQuestionModal(false);
              setEditingQuestion(null);
            }}
          />
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default TeacherQuestionBank;
