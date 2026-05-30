import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getTeacherSubjects, createSubject, updateSubject, deleteSubject } from '../../services/subject.service';
import TeacherLayout from '../../layouts/TeacherLayout';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SubjectForm from '../../components/teacher/SubjectForm';

const TeacherSubjects = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, [userProfile?.uid]);

  const loadSubjects = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);

    const result = await getTeacherSubjects(userProfile.uid);
    if (result.success) {
      setSubjects(result.data);
      setError('');
    } else {
      setError(result.error || 'Failed to load subjects');
    }

    setLoading(false);
  };

  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setShowSubjectModal(true);
  };

  const handleOpenEditModal = (subject) => {
    setEditingSubject(subject);
    setShowSubjectModal(true);
  };

  const handleSubmitSubject = async (data) => {
    try {
      setSubmitting(true);
      let result;

      if (editingSubject) {
        result = await updateSubject(editingSubject.id, data);
      } else {
        result = await createSubject(userProfile.uid, data);
      }

      if (result.success) {
        setSuccess(editingSubject ? 'Subject updated!' : 'Subject created!');
        setShowSubjectModal(false);
        loadSubjects();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Error saving subject');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;

    const result = await deleteSubject(subjectId);
    if (result.success) {
      setSuccess('Subject deleted!');
      loadSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete subject');
    }
  };

  return (
    <TeacherLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Môn học</h1>
                <p className="text-gray-600 mt-1">Quản lý môn học, chủ đề và câu hỏi</p>
              </div>
              <Button
                variant="primary"
                icon={<Plus className="w-5 h-5" />}
                onClick={handleOpenCreateModal}
              >
                Thêm môn học
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
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : subjects.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có môn học</h3>
                <p className="text-gray-600 mb-6">Hãy tạo môn học đầu tiên của bạn</p>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateModal}
                >
                  Tạo môn học
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/teacher/subjects/${subject.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(subject);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(subject.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{subject.name}</h3>
                  {subject.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{subject.description}</p>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-900">{subject.topicCount || 0}</span> chủ đề
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Subject Modal */}
        <Modal
          isOpen={showSubjectModal}
          onClose={() => {
            setShowSubjectModal(false);
            setEditingSubject(null);
          }}
          title={editingSubject ? 'Chỉnh sửa môn học' : 'Tạo môn học'}
          size="md"
        >
          <SubjectForm
            initialData={editingSubject}
            onSubmit={handleSubmitSubject}
            onCancel={() => {
              setShowSubjectModal(false);
              setEditingSubject(null);
            }}
            loading={submitting}
          />
        </Modal>
      </div>
    </TeacherLayout>
  );
};

export default TeacherSubjects;
