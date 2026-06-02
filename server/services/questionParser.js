
/** Insert line breaks when DOCX/PDF text is flattened into one line */
const normalizePlainTextLayout = (plainText) => {
  const lineCount = plainText.split(/\r?\n/).filter((l) => l.trim()).length;
  if (lineCount >= 4) {
    return plainText.replace(/\r\n/g, '\n');
  }

  let text = plainText.replace(/\r\n/g, '\n').trim();

  text = text.replace(
    /\s*((?:trắc nghiệm|tự luận|trac nghiem|tu luan))\s*/gi,
    '\n$1\n'
  );
  text = text.replace(/\s*((?:câu|question)\s*\d+\s*[:.)])/gi, '\n$1');
  text = text.replace(/(?<![A-Za-zÀ-ỹ])([A-D])([.)]\s*)/gi, '\n$1$2');

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

const normalizeForMatch = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const getSectionType = (line) => {
  const n = normalizeForMatch(line);
  if (n === 'trac nghiem' || n.startsWith('phan trac nghiem') || n === 'multiple choice') {
    return 'mcq';
  }
  if (n === 'tu luan' || n.startsWith('phan tu luan') || n === 'essay') {
    return 'essay';
  }
  return null;
};

const isQuestionStart = (line) =>
  /^(?:câu|question)\s*\d+/i.test(line.replace(/^\uFEFF/, ''));

const parseQuestionHeader = (line) => {
  const match = line.match(/^(?:câu|question)\s*\d+\s*[:.\-)]?\s*(.*)$/i);
  return match ? match[1].trim() : line.replace(/^(?:câu|question)\s*\d+/i, '').trim();
};

const parseOptionLine = (line, lines, index) => {
  const withText = line.match(/^(\*+)?([A-D])(?:[\.\):]\s*|\s+)(.+)$/i);
  if (withText) {
    return {
      letter: withText[2].toUpperCase(),
      text: withText[3].trim(),
      markedCorrect: Boolean(withText[1]),
      skipNext: 0
    };
  }

  const letterOnly = line.match(/^(\*+)?([A-D])$/i);
  if (letterOnly) {
    const next = lines[index + 1]?.trim() || '';
    if (next && !isQuestionStart(next) && !getSectionType(next) && !/^[A-D](?:[\.\):]|\s|$)/i.test(next)) {
      return {
        letter: letterOnly[2].toUpperCase(),
        text: next.replace(/^\*+/, '').trim(),
        markedCorrect: Boolean(letterOnly[1]),
        skipNext: 1
      };
    }
    return {
      letter: letterOnly[2].toUpperCase(),
      text: letterOnly[2].toUpperCase(),
      markedCorrect: Boolean(letterOnly[1]),
      skipNext: 0
    };
  }

  return null;
};

const isLineBold = (lineStart, lineEnd, boldRanges) => {
  if (!boldRanges?.length || lineStart >= lineEnd) return false;
  return boldRanges.some((range) => range.start < lineEnd && range.end > lineStart);
};

const buildLineMeta = (plainText, boldRanges) => {
  const rawLines = plainText.split(/\r?\n/);
  let offset = 0;
  const meta = [];

  for (const raw of rawLines) {
    const start = offset;
    const end = offset + raw.length;
    meta.push({
      raw,
      trimmed: raw.trim(),
      start,
      end,
      isBold: isLineBold(start, end, boldRanges)
    });
    offset = end + 1;
  }

  return meta;
};

const finalizeQuestion = (draft, defaultPoints) => {
  if (!draft?.questionText?.trim()) return null;

  const optionLetters = ['A', 'B', 'C', 'D'].filter((letter) => draft.options[letter]?.trim());
  const hasOptions = optionLetters.length >= 2;

  if (hasOptions) {
    const options = {};
    optionLetters.forEach((letter) => {
      options[letter] = draft.options[letter].trim();
    });
    ['A', 'B', 'C', 'D'].forEach((letter) => {
      if (!options[letter]) options[letter] = '';
    });

    let correctAnswer = draft.correctAnswer || 'A';
    if (!optionLetters.includes(correctAnswer)) {
      correctAnswer = optionLetters[0] || 'A';
    }

    return {
      type: 'mcq',
      questionText: draft.questionText.trim(),
      options,
      correctAnswer,
      points: defaultPoints
    };
  }

  return {
    type: 'essay',
    questionText: draft.questionText.trim(),
    points: defaultPoints
  };
};

export const extractQuestionsRegex = (extractedResult, defaultPoints = 1) => {
  const plainText = normalizePlainTextLayout(extractedResult.plainText || '');
  const boldRanges = extractedResult.boldRanges || [];
  const lineMeta = buildLineMeta(plainText, boldRanges).filter((m) => m.trimmed.length > 0);
  const lines = lineMeta.map((m) => m.trimmed);

  const questions = [];
  let sectionType = null;
  let current = null;
  let skipUntil = -1;

  const flushCurrent = () => {
    if (!current) return;
    const finalized = finalizeQuestion(current, defaultPoints);
    if (finalized) questions.push(finalized);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;

    const line = lines[i];
    const meta = lineMeta[i];

    const section = getSectionType(line);
    if (section) {
      flushCurrent();
      sectionType = section;
      continue;
    }

    if (isQuestionStart(line)) {
      flushCurrent();
      current = {
        questionText: parseQuestionHeader(line),
        options: {},
        correctAnswer: 'A'
      };
      continue;
    }

    if (!current) continue;

    const option = parseOptionLine(line, lines, i);
    if (option) {
      current.options[option.letter] = option.text;
      if (option.markedCorrect || meta?.isBold) {
        current.correctAnswer = option.letter;
      }
      skipUntil = i + 1 + option.skipNext;
      continue;
    }

    if (Object.keys(current.options).length === 0) {
      current.questionText = `${current.questionText} ${line}`.trim();
    }
  }

  flushCurrent();
  return questions;
};
