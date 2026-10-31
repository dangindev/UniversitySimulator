import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import type { Practice } from "@university-simulator/content";
import { api } from "./api";

type Submission = {
  id: string;
  status: string;
  result?: {
    passed: number;
    total: number;
    feedback: string;
    output?: string;
    compileErrors?: string;
    tests?: {
      index: number;
      public: boolean;
      status: string;
      input?: string;
      expected?: string;
      actual?: string;
      diagnostic?: string;
    }[];
  };
};
const pending = (submission: Submission) =>
  ["queued", "running"].includes(submission.status);
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value?: string) => {
  try {
    value === undefined
      ? localStorage.removeItem(key)
      : localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
const statuses: Record<string, string> = {
  queued: "Bài đã lưu, đang xếp hàng",
  running: "Đang chạy bộ kiểm thử",
  passed: "Đạt toàn bộ kiểm thử",
  failed: "Còn ca kiểm thử cần sửa",
  error: "Bộ chạy gặp sự cố — chưa ghi điểm trượt",
  "wrong-answer": "Kết quả chưa đúng",
  "runtime-error": "Lỗi khi chạy",
  "time-limit": "Vượt thời gian",
  "output-limit": "Vượt giới hạn đầu ra",
};

export default function PracticePanel({
  exercise,
  courseId,
  userId,
  semester,
  onError,
  onUpdated,
}: {
  exercise: Practice;
  courseId: string;
  userId: string;
  semester: number;
  onError: (message: string) => void;
  onUpdated: () => void;
}) {
  const draftKey = `usim.code-draft.${userId}.${exercise.id}`;
  const submissionKey = `usim.last-submission.${userId}.${semester}.${exercise.id}`;
  const [source, setSource] = useState(
    () => read(draftKey) ?? exercise.starterCode,
  );
  const [undo, setUndo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [message, setMessage] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (source.length <= 32000) setSaved(write(draftKey, source));
    else setSaved(false);
  }, [source, draftKey]);

  async function monitor(id: string, initial?: Submission) {
    if (!mounted.current) return;
    const ticket = ++generation.current;
    setBusy(true);
    setMessage("");
    try {
      let submission =
        initial ??
        (await api<{ submission: Submission }>(`/submissions/${id}`))
          .submission;
      for (let i = 0; i < 180 && ticket === generation.current; i++) {
        setResult(submission);
        if (!pending(submission)) {
          onUpdated();
          return;
        }
        await new Promise<void>((resolve) => {
          pollTimer.current = setTimeout(resolve, 1000);
        });
        if (ticket !== generation.current) return;
        submission = (
          await api<{ submission: Submission }>(`/submissions/${id}`)
        ).submission;
      }
      if (ticket === generation.current)
        setMessage(
          "Bài vẫn được lưu ở máy chủ. Bạn có thể quay lại hoặc kiểm tra trạng thái sau.",
        );
    } catch (error) {
      if (ticket === generation.current)
        setMessage(
          `${(error as Error).message} Mã và mã bài nộp vẫn được giữ; kiểm tra lại trạng thái trước khi nộp mới.`,
        );
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const id = read(submissionKey);
    if (id) void monitor(id);
    return () => {
      mounted.current = false;
      generation.current++;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [submissionKey]);

  async function submit() {
    setBusy(true);
    setMessage("");
    const snapshot = source;
    const requestGeneration = generation.current;
    try {
      const data = await api<{ submission: Submission }>("/practice", "POST", {
        courseId,
        exerciseId: exercise.id,
        language: exercise.language,
        source: snapshot,
      });
      write(submissionKey, data.submission.id);
      if (!mounted.current || requestGeneration !== generation.current) return;
      await monitor(data.submission.id, data.submission);
    } catch (error) {
      if (mounted.current && requestGeneration === generation.current) {
        setMessage((error as Error).message);
        onError((error as Error).message);
      }
    } finally {
      if (mounted.current && requestGeneration === generation.current)
        setBusy(false);
    }
  }

  return (
    <section className="practice-panel" aria-busy={busy}>
      <div className="card-heading">
        <h3>
          <Terminal size={19} />
          {exercise.title || "Phòng thực hành"}
        </h3>
        <span className="badge blue">
          {exercise.language === "cpp"
            ? "C++20"
            : exercise.language === "python"
              ? "Python 3"
              : exercise.language}
        </span>
      </div>
      <p className="practice-prompt">{exercise.prompt}</p>
      {exercise.rubric && (
        <details className="practice-rubric">
          <summary>Tiêu chí cần đạt</summary>
          <strong>Được bộ kiểm thử xác minh</strong>
          <ul>
            {exercise.rubric.machineChecked.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
          <strong>Bạn tự đối chiếu</strong>
          <ul>
            {exercise.rubric.selfCheck.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
          <p>
            Bộ chấm không tự xác nhận cách đặt tên, cấu trúc hàm hay chất lượng
            giải thích nếu chỉ kiểm tra đầu vào/đầu ra.
          </p>
        </details>
      )}
      <div className="code-title">
        <span>Mã nguồn của bạn</span>
        <small>
          {saved
            ? "Bản nháp đã lưu trên trình duyệt này"
            : source.length > 32000
              ? "Bản nháp vượt 32.000 ký tự, chưa lưu cục bộ"
              : "Chưa lưu được bản nháp; hãy sao chép mã trước khi rời trang"}
        </small>
      </div>
      <label className="sr-only" htmlFor={exercise.id}>
        Mã nguồn: {exercise.title || exercise.id}
      </label>
      <textarea
        className="code-editor"
        id={exercise.id}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        rows={13}
      />
      <div className="draft-actions">
        <small>{source.length.toLocaleString("vi-VN")} / 32.000 ký tự</small>
        <button
          className="text-button"
          onClick={() => {
            setUndo(source);
            setSource(exercise.starterCode);
          }}
          disabled={busy}
        >
          <RotateCcw size={14} />
          Mã khởi đầu
        </button>
        {undo !== null && (
          <button
            className="text-button"
            onClick={() => {
              setSource(undo);
              setUndo(null);
            }}
          >
            Hoàn tác
          </button>
        )}
      </div>
      <details className="practice-public-tests" open>
        <summary>{exercise.publicTests.length} ca kiểm thử công khai</summary>
        <div className="public-tests">
          {exercise.publicTests.map((test, index) => (
            <div key={index}>
              <strong>Ca {index + 1}</strong>
              {test.note && <p>{test.note}</p>}
              <span>Đầu vào</span>
              <pre>{test.input || "(rỗng)"}</pre>
              <span>Kết quả mong đợi</span>
              <pre>{test.output}</pre>
            </div>
          ))}
        </div>
      </details>
      <div className="practice-actions">
        <button
          className="primary"
          onClick={() => void submit()}
          disabled={
            busy ||
            !source.trim() ||
            source.length > 32000 ||
            !["cpp", "python", "javascript", "sql"].includes(exercise.language)
          }
        >
          <Play size={15} />
          {busy ? "Đang kiểm chứng…" : "Nộp & chạy kiểm thử"}
        </button>
        <button
          className="text-button"
          onClick={() =>
            setHintCount((count) => Math.min(exercise.hints.length, count + 1))
          }
          disabled={hintCount === exercise.hints.length}
        >
          <CircleHelp size={16} />
          {hintCount
            ? `Gợi ý tiếp (${hintCount}/${exercise.hints.length})`
            : "Mở gợi ý đầu tiên"}
        </button>
      </div>
      {hintCount > 0 && (
        <ol className="hint-list">
          {exercise.hints.slice(0, hintCount).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
      )}
      {result && (
        <div className={`execution-result ${result.status}`} role="status">
          <strong>
            {result.status === "passed" && <CheckCircle2 size={17} />}
            {statuses[result.status] || result.status}
          </strong>
          {result.result && (
            <>
              <p>
                <b>
                  {result.result.passed}/{result.result.total}
                </b>{" "}
                ca đạt. {result.result.feedback}
              </p>
              {result.result.compileErrors && (
                <pre>{result.result.compileErrors}</pre>
              )}
              {result.result.tests
                ?.filter((test) => test.public)
                .map((test) => (
                  <details key={test.index}>
                    <summary>
                      Ca {test.index} · {statuses[test.status] || test.status}
                    </summary>
                    {test.actual !== undefined && (
                      <>
                        <span>Kết quả nhận được</span>
                        <pre>{test.actual || "(không có đầu ra)"}</pre>
                      </>
                    )}
                    {test.diagnostic && <pre>{test.diagnostic}</pre>}
                  </details>
                ))}
              {result.result.output && (
                <details>
                  <summary>Đầu ra một ca công khai</summary>
                  <pre>{result.result.output}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
      {message && (
        <p className="practice-message" role="status">
          {message}
        </p>
      )}
      {!busy && read(submissionKey) && (
        <button
          className="text-button"
          onClick={() => void monitor(read(submissionKey)!)}
        >
          Kiểm tra lại bài nộp gần nhất
        </button>
      )}
      <small className="muted">
        Máy chủ ghi nhận điểm từ bộ kiểm thử. Bản nháp chỉ lưu trên máy này; nội
        dung sửa sau khi nộp cần được nộp lại. Bài luyện và gợi ý là công khai.
      </small>
    </section>
  );
}
