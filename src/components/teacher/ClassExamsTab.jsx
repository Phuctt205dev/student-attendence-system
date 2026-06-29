import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getExamsByClassForTeacher,
  getExamsBySubject,
  getExamWithQuestions,
  setClassExamVisibility,
  setClassExamSchedule,
  assignExamToClass,
  removeExamFromClass,
  saveClassExamPrintVersions,
  getClassExamPrintVersions
} from '../../services/exam.service';
import { getSubjectById, getTeacherSubjects } from '../../services/subject.service';
import Button from '../common/Button';
import Modal from '../common/Modal';
import {
  BookOpen,
  Plus,
  Lock,
  Unlock,
  Calendar,
  Trash2,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {
  buildExamQuestionsTextForDocx,
  buildExamPrintVersionRecord,
  getExamDocxTemplateFileName,
  shuffleExamQuestionsForVersion
} from '../../utils/buildExamDocxContent';

const DEFAULT_PRINT_VERSION_NAMES = ['1', '2', '3', '4'];
const MAX_PRINT_VERSION_COUNT = 4;

const toLocalInputValue = (dateValue) => {
  if (!dateValue) return '';
  const date = dateValue?.toDate?.() || new Date(dateValue);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const ClassExamsTab = ({ classId, teacherId, onError, onSuccess }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [scheduleExam, setScheduleExam] = useState(null);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [docxExam, setDocxExam] = useState(null);
  const [docxFaculty, setDocxFaculty] = useState('');
  const [docxCodeBase, setDocxCodeBase] = useState('');
  const [docxVersionCount, setDocxVersionCount] = useState(1);
  const [docxVersionNames, setDocxVersionNames] = useState(DEFAULT_PRINT_VERSION_NAMES);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxMode, setDocxMode] = useState('form');
  const [savedPrintVersions, setSavedPrintVersions] = useState([]);
  const [selectedPrintVersion, setSelectedPrintVersion] = useState(null);
  const [savedVersionsLoading, setSavedVersionsLoading] = useState(false);

  const loadExams = useCallback(async () => {
    if (!classId || !teacherId) return;

    setLoading(true);
    const result = await getExamsByClassForTeacher(classId, teacherId);
    if (result.success) {
      setExams(result.data || []);
    } else if (onError) {
      onError(result.error || 'Không thể tải danh sách bài thi');
    }
    setLoading(false);
  }, [classId, teacherId, onError]);

  const loadSubjects = useCallback(async () => {
    if (!teacherId) return;
    const subjectsResult = await getTeacherSubjects(teacherId);
    if (subjectsResult.success) {
      setSubjects(subjectsResult.data || []);
    }
  }, [teacherId]);

  const loadExamsForSubject = useCallback(async (subjectId) => {
    if (!classId || !teacherId || !subjectId) {
      setAvailableExams([]);
      return;
    }

    setAvailableLoading(true);
    const result = await getExamsBySubject(subjectId, teacherId);
    if (result.success) {
      const assignedResult = await getExamsByClassForTeacher(classId, teacherId);
      const assignedSourceIds = new Set(
        (assignedResult.success ? assignedResult.data || [] : []).map(
          (e) => e.sourceExamId || e.id
        )
      );
      const notInClass = (result.data || []).filter((exam) => !assignedSourceIds.has(exam.id));
      setAvailableExams(notInClass);
    } else if (onError) {
      onError(result.error || 'Không thể tải bài thi');
    }
    setAvailableLoading(false);
  }, [classId, teacherId, onError]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const openScheduleModal = (exam) => {
    setScheduleExam(exam);
    setScheduleStart(toLocalInputValue(exam.startTime));
    setScheduleEnd(toLocalInputValue(exam.endTime));
    setScheduleError('');
  };

  const handleSaveSchedule = async () => {
    if (!scheduleExam) return;

    const startDate = scheduleStart ? new Date(scheduleStart) : null;
    const endDate = scheduleEnd ? new Date(scheduleEnd) : null;

    if (startDate && endDate && endDate <= startDate) {
      setScheduleError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const result = await setClassExamSchedule(
      scheduleExam.id,
      classId,
      startDate,
      endDate
    );

    if (result.success) {
      setScheduleExam(null);
      setScheduleStart('');
      setScheduleEnd('');
      setScheduleError('');
      if (onSuccess) onSuccess('Đã lưu thời gian bài thi cho lớp này');
      loadExams();
    } else {
      setScheduleError(result.error || 'Không thể lưu lịch thi');
    }
  };

  const handleToggleVisibility = async (exam) => {
    const nextVisibility = exam.visibility === 'public' ? 'private' : 'public';
    const now = new Date();
    const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);

    if (nextVisibility === 'public' && endTime && endTime <= now) {
      if (onError) onError('Không thể mở bài thi vì thời gian kết thúc đã qua');
      return;
    }

    const result = await setClassExamVisibility(exam.id, classId, nextVisibility);
    if (result.success) {
      if (onSuccess) {
        onSuccess(nextVisibility === 'public' ? 'Đã mở bài thi cho lớp' : 'Đã khóa bài thi cho lớp');
      }
      loadExams();
    } else if (onError) {
      onError(result.error || 'Không thể cập nhật trạng thái');
    }
  };

  const handleAssignExam = async (examId) => {
    setAssigningId(examId);
    const result = await assignExamToClass(examId, classId);
    if (result.success) {
      if (onSuccess) onSuccess('Đã gán bài thi vào lớp');
      await loadExams();
      if (selectedSubjectId) await loadExamsForSubject(selectedSubjectId);
    } else if (onError) {
      onError(result.error || 'Không thể gán bài thi');
    }
    setAssigningId(null);
  };

  const handleRemoveExam = async (exam) => {
    if (!window.confirm(`Gỡ bài thi "${exam.title}" khỏi lớp này?`)) return;

    const result = await removeExamFromClass(classId, exam.id);
    if (result.success) {
      if (onSuccess) onSuccess('Đã gỡ bài thi khỏi lớp');
      loadExams();
    } else if (onError) {
      onError(result.error || 'Không thể gỡ bài thi');
    }
  };

  const handleOpenAddModal = () => {
    setSelectedSubjectId('');
    setAvailableExams([]);
    setShowAddModal(true);
    loadSubjects();
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    loadExamsForSubject(subjectId);
  };

  const hashToSeed = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 1;
  };

  const resetDocxExportForm = () => {
    setDocxExam(null);
    setDocxFaculty('');
    setDocxCodeBase('');
    setDocxVersionCount(1);
    setDocxVersionNames(DEFAULT_PRINT_VERSION_NAMES);
    setDocxMode('form');
    setSavedPrintVersions([]);
    setSelectedPrintVersion(null);
    setSavedVersionsLoading(false);
  };

  const openDocxExportModal = async (exam) => {
    setDocxExam(exam);
    setDocxFaculty('');
    setDocxCodeBase('');
    setDocxVersionCount(1);
    setDocxVersionNames(DEFAULT_PRINT_VERSION_NAMES);
    setDocxMode('form');
    setSavedPrintVersions([]);
    setSelectedPrintVersion(null);
    setSavedVersionsLoading(true);

    const result = await getClassExamPrintVersions(classId, exam.id);
    if (result.success) {
      const versions = result.data || [];
      setSavedPrintVersions(versions);
      if (versions.length > 0) {
        setSelectedPrintVersion(versions[0]);
        setDocxMode('saved');
      }
    } else if (onError) {
      onError(result.error || 'Không thể tải danh sách mã đề đã xuất');
    }

    setSavedVersionsLoading(false);
  };

  const handleVersionCountChange = (event) => {
    const nextCount = Math.min(
      MAX_PRINT_VERSION_COUNT,
      Math.max(1, Number(event.target.value) || 1)
    );
    setDocxVersionCount(nextCount);
  };

  const handleVersionNameChange = (index, value) => {
    setDocxVersionNames((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  };

  const getSelectedVersionNames = () => {
    const names = docxVersionNames
      .slice(0, docxVersionCount)
      .map((name, index) => String(name || '').trim() || String(index + 1));
    const uniqueNames = new Set(names.map((name) => name.toLowerCase()));

    if (uniqueNames.size !== names.length) {
      return { success: false, error: 'Tên mã đề không được trùng nhau' };
    }

    return { success: true, names };
  };

  const toSafeFileNamePart = (value, fallback) => {
    const text = String(value || '').trim() || fallback;
    return text.replace(/[<>:"/\\|?*]/g, '-');
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPrintVersionFiles = async (printVersions, downloadBaseName) => {
    if (printVersions.length === 1) {
      downloadBlob(
        printVersions[0].blob,
        `de-thi-${downloadBaseName}-ma-${toSafeFileNamePart(
          printVersions[0].versionName,
          '1'
        )}.docx`
      );
      return;
    }

    const outputZip = new PizZip();
    for (const version of printVersions) {
      const buffer = await version.blob.arrayBuffer();
      outputZip.file(
        `de-thi-${downloadBaseName}-ma-${toSafeFileNamePart(
          version.versionName,
          String(version.order || 1)
        )}.docx`,
        buffer
      );
    }
    const zipBlob = outputZip.generate({ type: 'blob' });
    downloadBlob(zipBlob, `de-thi-${downloadBaseName}-${printVersions.length}-ma-de.zip`);
  };

  const buildDocxBlobFromTemplate = (
    templateBuffer,
    versionQuestions,
    codeLabel,
    subjectName,
    durationText,
    facultyName = docxFaculty
  ) => {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    });

    doc.setData({
      QUESTIONS: buildExamQuestionsTextForDocx(versionQuestions),
      EXAM_CODE: codeLabel,
      SUBJECT: subjectName,
      FACULTY: facultyName,
      DURATION: durationText
    });
    doc.render();

    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  };

  const getDocxBuildData = async () => {
    const sourceExamId = docxExam.sourceExamId || docxExam.examId || docxExam.id;
    const result = await getExamWithQuestions(sourceExamId, classId, docxExam.id);

    if (!result.success) {
      throw new Error(result.error || 'Không thể tải bài thi');
    }

    const questions = Array.isArray(result.data.questions) ? result.data.questions : [];
    if (questions.length === 0) {
      throw new Error('Bài thi chưa có câu hỏi');
    }

    let subjectName = '';
    if (result.data?.subjectId) {
      const subjectResult = await getSubjectById(result.data.subjectId);
      if (subjectResult.success) {
        subjectName = subjectResult.data?.name || '';
      }
    }

    const templateFile = getExamDocxTemplateFileName(questions);
    const templateUrl = `${import.meta.env.BASE_URL}templates/${templateFile}`;
    const templateResponse = await fetch(templateUrl);

    if (!templateResponse.ok) {
      throw new Error(
        templateFile === 'dethimauTL.docx'
          ? 'Không tìm thấy mẫu dethimauTL.docx trong public/templates/'
          : 'Không tìm thấy mẫu dethimau.docx trong public/templates/'
      );
    }

    return {
      sourceExamId,
      examData: result.data,
      questions,
      subjectName,
      templateFile,
      templateBuffer: await templateResponse.arrayBuffer(),
      durationText: result.data?.durationMinutes ? `${result.data.durationMinutes} phút` : ''
    };
  };

  const getQuestionsForSavedVersion = (version, questions) => {
    const questionById = new Map(
      questions.map((question) => [String(question.id), question])
    );
    const mappedQuestions = (version?.questionMap || [])
      .map((item) => questionById.get(String(item.questionId)))
      .filter(Boolean);

    return mappedQuestions.length > 0 ? mappedQuestions : questions;
  };

  const handleExportDocx = async () => {
    if (!docxExam) return;

    setDocxLoading(true);
    let exportSucceeded = false;

    try {
      const sourceExamId = docxExam.sourceExamId || docxExam.examId || docxExam.id;
      const result = await getExamWithQuestions(sourceExamId, classId, docxExam.id);

      if (!result.success) {
        if (onError) onError(result.error || 'Không thể tải bài thi');
        setDocxLoading(false);
        return;
      }

      const questions = Array.isArray(result.data.questions) ? result.data.questions : [];
      if (questions.length === 0) {
        if (onError) onError('Bài thi chưa có câu hỏi');
        setDocxLoading(false);
        return;
      }

      const versionNamesResult = getSelectedVersionNames();
      if (!versionNamesResult.success) {
        if (onError) onError(versionNamesResult.error);
        setDocxLoading(false);
        return;
      }

      let subjectName = '';
      if (result.data?.subjectId) {
        const subjectResult = await getSubjectById(result.data.subjectId);
        if (subjectResult.success) {
          subjectName = subjectResult.data?.name || '';
        }
      }

      const templateFile = getExamDocxTemplateFileName(questions);
      const templateUrl = `${import.meta.env.BASE_URL}templates/${templateFile}`;
      const templateResponse = await fetch(templateUrl);

      if (!templateResponse.ok) {
        throw new Error(
          templateFile === 'dethimauTL.docx'
            ? 'Không tìm thấy mẫu dethimauTL.docx trong public/templates/'
            : 'Không tìm thấy mẫu dethimau.docx trong public/templates/'
        );
      }

      const templateBuffer = await templateResponse.arrayBuffer();
      const baseCode = String(docxCodeBase || '').trim();

      const buildDocxBlob = (versionQuestions, codeLabel) => {
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{{', end: '}}' }
        });

        doc.setData({
          QUESTIONS: buildExamQuestionsTextForDocx(versionQuestions),
          EXAM_CODE: codeLabel,
          SUBJECT: subjectName,
          FACULTY: docxFaculty,
          DURATION: result.data?.durationMinutes ? `${result.data.durationMinutes} phút` : ''
        });
        doc.render();

        return doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      };

      const printVersions = versionNamesResult.names.map((versionName, index) => {
        const seed = hashToSeed(
          `${classId}-${docxExam.id}-${sourceExamId}-${versionName}-${index + 1}`
        );
        const versionQuestions = shuffleExamQuestionsForVersion(
          questions,
          seed,
          `essay-${classId}-${docxExam.id}-${versionName}`
        );
        const codeLabel = baseCode ? `${baseCode}-${versionName}` : versionName;

        return {
          versionName,
          codeLabel,
          questions: versionQuestions,
          blob: buildDocxBlob(versionQuestions, codeLabel),
          record: {
            ...buildExamPrintVersionRecord({
              examId: sourceExamId,
              sourceExamId,
              classId,
              classExamInstanceId: docxExam.id,
              versionName,
              codeLabel,
              questions: versionQuestions
            }),
            faculty: docxFaculty
          }
        };
      });

      const saveResult = await saveClassExamPrintVersions(
        classId,
        docxExam.id,
        printVersions.map((version) => version.record)
      );

      if (!saveResult.success) {
        if (onError) onError(saveResult.error || 'Không thể lưu đáp án mã đề cho lớp');
        setDocxLoading(false);
        return;
      }

      const downloadBaseName = toSafeFileNamePart(
        baseCode || `${docxExam.title || 'de-thi'}-${docxExam.id.slice(0, 6)}`,
        'de-thi'
      );

      if (printVersions.length === 1) {
        const url = URL.createObjectURL(printVersions[0].blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `de-thi-${downloadBaseName}-ma-${toSafeFileNamePart(
          printVersions[0].versionName,
          '1'
        )}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const outputZip = new PizZip();
        for (const version of printVersions) {
          const buffer = await version.blob.arrayBuffer();
          outputZip.file(
            `de-thi-${downloadBaseName}-ma-${toSafeFileNamePart(
              version.versionName,
              String(version.record.order || 1)
            )}.docx`,
            buffer
          );
        }
        const zipBlob = outputZip.generate({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipLink = document.createElement('a');
        zipLink.href = zipUrl;
        zipLink.download = `de-thi-${downloadBaseName}-${printVersions.length}-ma-de.zip`;
        document.body.appendChild(zipLink);
        zipLink.click();
        document.body.removeChild(zipLink);
        URL.revokeObjectURL(zipUrl);
      }

      const templateNote =
        templateFile === 'dethimauTL.docx' ? ' (mẫu tự luận)' : '';
      const exportNote =
        printVersions.length > 1
          ? ` Đã tạo ZIP gồm ${printVersions.length} file Word và lưu đáp án mã đề riêng cho lớp.`
          : ' Đã lưu đáp án mã đề riêng cho lớp.';

      if (onSuccess) onSuccess(`Xuất file Word thành công${templateNote}!${exportNote}`);
      exportSucceeded = true;
      await loadExams();
    } catch (err) {
      console.error('Lỗi xuất file Word cho lớp:', err);
      if (onError) onError('Lỗi xuất file: ' + (err?.message || String(err)));
    } finally {
      setDocxLoading(false);
      if (exportSucceeded) {
        resetDocxExportForm();
      }
    }
  };

  const handleDownloadSavedDocx = async () => {
    if (!docxExam || savedPrintVersions.length === 0) return;

    setDocxLoading(true);
    try {
      const buildData = await getDocxBuildData();
      const downloadBaseName = toSafeFileNamePart(
        `${docxExam.title || 'de-thi'}-${docxExam.id.slice(0, 6)}`,
        'de-thi'
      );

      const printVersions = savedPrintVersions.map((version, index) => {
        const versionQuestions = getQuestionsForSavedVersion(version, buildData.questions);
        const codeLabel =
          version.codeLabel || version.versionName || version.id || String(index + 1);

        return {
          versionName: version.versionName || version.id || String(index + 1),
          order: version.order || index + 1,
          blob: buildDocxBlobFromTemplate(
            buildData.templateBuffer,
            versionQuestions,
            codeLabel,
            buildData.subjectName,
            buildData.durationText,
            version.faculty || ''
          )
        };
      });

      await downloadPrintVersionFiles(printVersions, downloadBaseName);
      if (onSuccess) {
        onSuccess(
          savedPrintVersions.length > 1
            ? `Đã tải ZIP gồm ${savedPrintVersions.length} file Word.`
            : 'Đã tải file Word.'
        );
      }
    } catch (err) {
      console.error('Lỗi tải lại file Word:', err);
      if (onError) onError('Lỗi tải đề thi: ' + (err?.message || String(err)));
    } finally {
      setDocxLoading(false);
    }
  };

  const getSortedAnswerEntries = (version) => {
    const answerKey = version?.answerKey || {};
    return Object.entries(answerKey).sort(
      ([a], [b]) => (Number(a) || 0) - (Number(b) || 0)
    );
  };

  const getQuestionPoint = (version, questionNumber) => {
    const item = (version?.questionMap || []).find(
      (question) =>
        question.section === 'mcq' &&
        Number(question.questionNumber) === Number(questionNumber)
    );
    return item?.points ?? 1;
  };

  const openReExportForm = () => {
    const names = savedPrintVersions.length > 0
      ? savedPrintVersions
          .slice(0, MAX_PRINT_VERSION_COUNT)
          .map((version, index) => version.versionName || String(index + 1))
      : DEFAULT_PRINT_VERSION_NAMES;

    setDocxVersionCount(Math.min(Math.max(names.length, 1), MAX_PRINT_VERSION_COUNT));
    setDocxVersionNames(DEFAULT_PRINT_VERSION_NAMES.map((fallback, index) => names[index] || fallback));
    setSelectedPrintVersion(null);
    setDocxMode('form');
  };

  const getVisibilityBadge = (visibility) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        visibility === 'public'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {visibility === 'public' ? 'Đang mở' : 'Đã khóa'}
    </span>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900">Bài thi của lớp ({exams.length})</h4>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
        >
          Thêm bài thi
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Tạo bài thi tại mục Môn học, sau đó gán vào lớp và quản lý khóa / thời gian tại đây.
      </p>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Chưa có bài thi nào trong lớp</p>
          <p className="text-sm mt-1">Nhấn &quot;Thêm bài thi&quot; để gán từ môn học</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const startTime = exam.startTime?.toDate?.() || (exam.startTime ? new Date(exam.startTime) : null);
            const endTime = exam.endTime?.toDate?.() || (exam.endTime ? new Date(exam.endTime) : null);
            const isLocked = endTime && new Date() > endTime;

            return (
              <div
                key={exam.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:bg-white hover:border-primary-200 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/teacher/classes/${classId}/exams/${exam.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/teacher/classes/${classId}/exams/${exam.id}`);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      {getVisibilityBadge(exam.visibility)}
                      {isLocked && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Hết hạn
                        </span>
                      )}
                    </div>

                    {exam.description && (
                      <p className="text-sm text-gray-600 mb-2">{exam.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span><strong>{exam.totalQuestions}</strong> câu</span>
                      <span><strong>{exam.durationMinutes}</strong> phút</span>
                    </div>

                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      {startTime && (
                        <div>Bắt đầu: {format(startTime, 'dd/MM/yyyy HH:mm')}</div>
                      )}
                      {endTime && (
                        <div>Kết thúc: {format(endTime, 'dd/MM/yyyy HH:mm')}</div>
                      )}
                      <div>
                        Tạo{' '}
                        {formatDistanceToNow(
                          exam.createdAt?.toDate?.() || new Date(),
                          { addSuffix: true }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-nowrap">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<FileText className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDocxExportModal(exam);
                      }}
                    >
                      Xuất Word
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={
                        exam.visibility === 'public' ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(exam);
                      }}
                    >
                      {exam.visibility === 'public' ? 'Khóa' : 'Mở'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Calendar className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openScheduleModal(exam);
                      }}
                    >
                      Đặt thời gian
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExam(exam);
                      }}
                    >
                      Gỡ khỏi lớp
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSubjectId('');
          setAvailableExams([]);
        }}
        title="Thêm bài thi vào lớp"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bước 1: Chọn môn học
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSubjectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bước 2: Chọn bài thi
              </label>
              {availableLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
                </div>
              ) : availableExams.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Không còn bài thi nào của môn này để gán</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                        <p className="text-xs text-gray-500">
                          {exam.totalQuestions} câu · {exam.durationMinutes} phút
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={assigningId === exam.id}
                        onClick={() => handleAssignExam(exam.id)}
                      >
                        {assigningId === exam.id ? 'Đang gán...' : 'Gán'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!docxExam}
        onClose={resetDocxExportForm}
        title="Xuất file Word bài thi của lớp"
        size="lg"
      >
        <div className="space-y-4">
          {docxExam && (
            <p className="text-sm text-gray-600">
              Bài thi: <span className="font-medium text-gray-900">{docxExam.title}</span>
            </p>
          )}

          {savedVersionsLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Đang tải mã đề đã lưu...</p>
            </div>
          ) : docxMode === 'saved' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    Đã xuất {savedPrintVersions.length} mã đề
                  </p>
                  <p className="text-xs text-gray-500">
                    Bấm vào từng mã đề để xem đáp án đã lưu trên Firebase.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    icon={<Download className="w-4 h-4" />}
                    onClick={handleDownloadSavedDocx}
                    disabled={docxLoading || savedPrintVersions.length === 0}
                  >
                    {docxLoading ? 'Đang tải...' : 'Tải đề thi'}
                  </Button>
                  <Button variant="primary" onClick={openReExportForm} disabled={docxLoading}>
                    Xuất lại
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
                <div className="space-y-2">
                  {savedPrintVersions.map((version) => (
                    <button
                      type="button"
                      key={version.id}
                      onClick={() => setSelectedPrintVersion(version)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedPrintVersion?.id === version.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">
                        Mã đề {version.versionName || version.id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {version.mcqCount || 0} TN · {version.essayCount || 0} TL
                      </p>
                    </button>
                  ))}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 min-h-[220px]">
                  {selectedPrintVersion ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Đáp án mã đề {selectedPrintVersion.versionName || selectedPrintVersion.id}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Mã hiển thị: {selectedPrintVersion.codeLabel || selectedPrintVersion.versionName || '—'}
                        </p>
                      </div>

                      {getSortedAnswerEntries(selectedPrintVersion).length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Mã đề này không có đáp án trắc nghiệm.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {getSortedAnswerEntries(selectedPrintVersion).map(([questionNumber, answer]) => (
                            <div
                              key={questionNumber}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-gray-600">Câu {questionNumber}</span>
                                <span className="text-base font-bold text-primary-700">{answer}</span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                {getQuestionPoint(selectedPrintVersion, questionNumber)} điểm
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-500">
                      Chọn một mã đề để xem đáp án.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {savedPrintVersions.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Xuất lại sẽ ghi đè bộ mã đề và đáp án đã lưu trước đó cho bài thi trong lớp này.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khoa
                </label>
                <input
                  type="text"
                  value={docxFaculty}
                  onChange={(event) => setDocxFaculty(event.target.value)}
                  placeholder="Mang may tinh & Truyen thong"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã đề (cơ bản)
                </label>
                <input
                  type="text"
                  value={docxCodeBase}
                  onChange={(event) => setDocxCodeBase(event.target.value)}
                  placeholder="VD: 123456"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nếu nhập mã cơ bản, hệ thống sẽ ghép với tên mã đề, ví dụ 123456-1.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số lượng mã đề
                </label>
                <select
                  value={docxVersionCount}
                  onChange={handleVersionCountChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {DEFAULT_PRINT_VERSION_NAMES.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {index + 1} mã đề
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên mã đề
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docxVersionNames.slice(0, docxVersionCount).map((name, index) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Mã đề {index + 1}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                          handleVersionNameChange(index, event.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cấu hình này chỉ áp dụng cho bài thi trong lớp hiện tại; các lớp khác có thể có bộ mã đề riêng.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={
                    savedPrintVersions.length > 0
                      ? () => setDocxMode('saved')
                      : resetDocxExportForm
                  }
                  disabled={docxLoading}
                >
                  {savedPrintVersions.length > 0 ? 'Quay lại' : 'Hủy'}
                </Button>
                <Button variant="primary" onClick={handleExportDocx} disabled={docxLoading}>
                  {docxLoading ? 'Đang tạo...' : 'Tạo file Word'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!scheduleExam}
        onClose={() => {
          setScheduleExam(null);
          setScheduleStart('');
          setScheduleEnd('');
          setScheduleError('');
        }}
        title="Thiết lập thời gian (lớp này)"
        size="sm"
      >
        <div className="space-y-4">
          {scheduleExam && (
            <p className="text-sm text-gray-600">
              Bài thi: <span className="font-medium text-gray-900">{scheduleExam.title}</span>
            </p>
          )}
          {scheduleError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {scheduleError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bắt đầu</label>
            <input
              type="datetime-local"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kết thúc</label>
            <input
              type="datetime-local"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setScheduleExam(null);
                setScheduleStart('');
                setScheduleEnd('');
                setScheduleError('');
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveSchedule}>
              Lưu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassExamsTab;
