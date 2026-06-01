import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { getClassesByStudent } from '../../services/class.service';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import Card from '../../components/common/Card';

const StudentClasses = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, [userProfile?.uid]);

  const loadClasses = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const result = await getClassesByStudent(userProfile.uid);
    if (result.success) {
      setClasses(result.classes);
    }
    setLoading(false);
  };

  const handleOpenClass = (classId) => {
    navigate(`/student/classes/${classId}`);
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Lớp học của tôi</h1>
            <p className="text-gray-600 mt-1">Danh sách các lớp bạn đang tham gia</p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Chưa có lớp học nào
                </h3>
                <p className="text-gray-600">
                  Bạn chưa được thêm vào lớp nào. Liên hệ giảng viên để được thêm vào lớp.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => (
                <Card
                  key={classItem.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOpenClass(classItem.id)}
                >
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-gray-900">
                          {classItem.classCode}
                        </h3>
                        <p className="text-gray-600 truncate">{classItem.className}</p>
                        {classItem.schedule && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{classItem.schedule}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

export default StudentClasses;
