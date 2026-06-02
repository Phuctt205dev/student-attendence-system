import { useState, useRef } from 'react';
import { Upload, AlertCircle, FileText, Download } from 'lucide-react';
import Button from '../common/Button';
import { extractQuestionsFromFile } from '../../services/aiQuestion.service';
import { createQuestion } from '../../services/subject.service';

const ACCEPT = '.pdf,.docx,.doc,.txt,.md';

const ExtractQuestionsFromFileModal = ({
  subjectId,
  topicId,
  createdBy,
  onSuccess,
  onCancel
}) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [defaultPoints, setDefaultPoints] = useState(1);
  const [step, setStep] = useState('form');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleExtractAndSave = async () => {
    if (!file) {
      setError('Vui lòng chọn file (PDF, DOCX hoặc TXT)');
      return;
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
      return;
    }

    const { questions, totalQuestions } = extResult.data;
    setStep('saving');
    setProgress(`Đang lưu ${totalQuestions} câu hỏi vào chủ đề...`);

    let saved = 0;
    const failures = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setProgress(`Đang lưu câu hỏi ${i + 1}/${questions.length}...`);

      const result = await createQuestion(subjectId, topicId, {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || defaultPoints,
        createdBy
      });

      if (result.success) {
        saved += 1;
      } else {
        failures.push(result.error);
      }
    }

    if (saved === 0) {
      setError(failures[0] || 'Không lưu được câu hỏi nào');
      setStep('form');
      return;
    }

    onSuccess({
      saved,
      total: questions.length,
      failed: failures.length
    });
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
          onChange={handleFileChange}
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
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 font-medium mb-1">Lưu ý định dạng file:</p>
        <p className="text-xs text-yellow-700">
          File cần tuân thủ cấu trúc sau để hệ thống nhận diện chính xác:
        </p>
        <pre className="text-xs mt-2 bg-white/50 p-2 rounded text-yellow-900 font-mono">
          Câu 1: Nội dung câu hỏi...{'\n'}
          A. Đáp án 1{'\n'}
          *B. Đáp án đúng{'\n'}
          C. Đáp án 3{'\n'}
          D. Đáp án 4
        </pre>
        <p className="text-xs text-yellow-700 mt-2">
          * Đặt dấu * trước đáp án đúng để hệ thống tự động nhận diện! Nếu không có, mặc định sẽ là A.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          variant="primary"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExtractAndSave}
          disabled={!file}
        >
          Trích xuất & Lưu
        </Button>
      </div>
    </div>
  );
};

export default ExtractQuestionsFromFileModal;
