import { useState, useRef } from 'react';
import { Upload, AlertCircle, FileText, Download, FilePlus2 } from 'lucide-react';
import Button from '../common/Button';
import { extractQuestionsFromFile } from '../../services/aiQuestion.service';
import { createQuestion } from '../../services/subject.service';

const ACCEPT = '.pdf,.docx,.doc,.txt,.md';

const saveQuestionsToTopic = async ({
  questions,
  subjectId,
  topicId,
  createdBy,
  defaultPoints,
  onProgress
}) => {
  let saved = 0;
  const savedIds = [];
  const failures = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    onProgress?.(`Đang lưu câu hỏi ${i + 1}/${questions.length}...`);

    const payload = {
      questionText: q.questionText,
      points: q.points || defaultPoints,
      createdBy,
      type: q.type === 'essay' ? 'essay' : 'mcq'
    };

    if (payload.type === 'essay') {
      payload.options = null;
      payload.correctAnswer = null;
    } else {
      payload.options = q.options;
      payload.correctAnswer = q.correctAnswer;
    }

    const result = await createQuestion(subjectId, topicId, payload);

    if (result.success) {
      saved += 1;
      savedIds.push(result.data.id);
    } else {
      failures.push(result.error);
    }
  }

  return { saved, savedIds, failures, total: questions.length };
};

const ExtractQuestionsFromFileModal = ({
  subjectId,
  topicId,
  createdBy,
  onSuccess,
  onCreateExam,
  onCancel
}) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [defaultPoints, setDefaultPoints] = useState(1);
  const [step, setStep] = useState('form');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const runExtract = async () => {
    if (!file) {
      setError('Vui lòng chọn file (PDF, DOCX hoặc TXT)');
      return null;
    }

    setError('');
    setStep('extracting');
    setProgress('Đang đọc file và trích xuất câu hỏi...');

    const extResult = await extractQuestionsFromFile({
      file,
      defaultPoints
    });

    if (!extResult.success) {
      setError(extResult.error);
      setStep('form');
      return null;
    }

    return extResult.data.questions;
  };

  const handleExtractAndSave = async () => {
    const questions = await runExtract();
    if (!questions) return;

    setStep('saving');
    setProgress(`Đang lưu ${questions.length} câu hỏi vào chủ đề...`);

    const { saved, failures, total } = await saveQuestionsToTopic({
      questions,
      subjectId,
      topicId,
      createdBy,
      defaultPoints,
      onProgress: setProgress
    });

    if (saved === 0) {
      setError(failures[0] || 'Không lưu được câu hỏi nào');
      setStep('form');
      return;
    }

    onSuccess({
      saved,
      total,
      failed: failures.length
    });
  };

  const handleExtractAndCreateExam = async () => {
    const questions = await runExtract();
    if (!questions) return;

    setStep('saving');
    setProgress(`Đang lưu ${questions.length} câu hỏi và tạo bài thi...`);

    const { saved, savedIds, failures, total } = await saveQuestionsToTopic({
      questions,
      subjectId,
      topicId,
      createdBy,
      defaultPoints,
      onProgress: setProgress
    });

    if (saved === 0) {
      setError(failures[0] || 'Không lưu được câu hỏi nào');
      setStep('form');
      return;
    }

    if (onCreateExam) {
      onCreateExam({
        saved,
        total,
        failed: failures.length,
        questionIds: savedIds
      });
    } else {
      onSuccess({
        saved,
        total,
        failed: failures.length
      });
    }
  };

  if (step === 'extracting' || step === 'saving') {
    return (
      <div className="py-10 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{progress}</p>
        <p className="text-sm text-gray-500 mt-2">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700 mb-1">Chọn hoặc kéo thả tài liệu</p>
        <p className="text-xs text-gray-500">PDF, DOCX, TXT (tối đa 10MB)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) {
              setFile(selected);
              setError('');
            }
          }}
        />
      </div>

      {file && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-blue-900">{file.name}</p>
            <p className="text-xs text-blue-700">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Điểm mặc định / câu
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={defaultPoints}
          onChange={(e) => setDefaultPoints(Number(e.target.value))}
          className="input-field"
        />
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 font-medium mb-1">Lưu ý định dạng file:</p>
        <pre className="text-xs mt-2 bg-white/50 p-2 rounded text-yellow-900 font-mono whitespace-pre-wrap">
{`trắc nghiệm
câu 1: Nội dung câu hỏi...
A. Đáp án A
B. Đáp án B (in đậm = đúng)
C. Đáp án C
D. Đáp án D

tự luận
câu 1: Nội dung câu tự luận...`}
        </pre>
        <ul className="text-xs text-yellow-800 mt-2 space-y-1 list-disc list-inside">
          <li>Tiêu đề <strong>trắc nghiệm</strong> / <strong>tự luận</strong> để phân loại phần.</li>
          <li>Có đáp án A–D bên dưới → câu trắc nghiệm; không có đáp án → câu tự luận.</li>
          <li>Đáp án <strong>in đậm</strong> trong Word/PDF là đáp án đúng (file TXT có thể dùng * trước đáp án).</li>
        </ul>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          variant="outline"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExtractAndSave}
          disabled={!file}
        >
          Trích xuất & Lưu
        </Button>
        <Button
          variant="primary"
          icon={<FilePlus2 className="w-4 h-4" />}
          onClick={handleExtractAndCreateExam}
          disabled={!file}
        >
          Trích xuất & Tạo bài thi
        </Button>
      </div>
    </div>
  );
};

export default ExtractQuestionsFromFileModal;
