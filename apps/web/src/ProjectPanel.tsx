import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FolderCheck,
  Play,
} from "lucide-react";
import { api } from "./api";

export interface ProjectExercise {
  id: string;
  courseId: string;
  title: string;
  language: string;
  prompt: string;
  projectStage?: number;
}
export default function ProjectPanel({
  courseId,
  exercises,
  onError,
  onUpdated,
}: {
  courseId: string;
  exercises: ProjectExercise[];
  onError: (message: string) => void;
  onUpdated: () => void;
}) {
  const available = exercises.filter(
    (exercise) => exercise.courseId === courseId && exercise.projectStage,
  );
  const [exerciseId, setExerciseId] = useState("");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const exercise =
    available.find((item) => item.id === exerciseId) || available[0];
  async function submit() {
    if (!exercise) return;
    setBusy(true);
    try {
      const response = await api(`/projects/${courseId}/submit`, "POST", {
        exerciseId: exercise.id,
        language: exercise.language,
        source,
      });
      let submission = response.submission;
      if (mounted.current) setResult(submission);
      for (
        let i = 0;
        mounted.current &&
        i < 200 &&
        ["queued", "running"].includes(submission.status);
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        submission = (await api(`/submissions/${submission.id}`)).submission;
        if (mounted.current) setResult(submission);
      }
      if (mounted.current) onUpdated();
    } catch (error) {
      if (mounted.current) onError((error as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="practice-panel">
      <div className="card-heading">
        <h3>
          <FolderCheck size={19} />
          Bàn giao sản phẩm
        </h3>
        <span className="badge sand">Các mốc 20% · 30% · 50%</span>
      </div>
      <p>
        Thực tập và đồ án được ghi nhận qua sản phẩm có kiểm chứng. Bài thi chọn
        đáp án không cấp tín chỉ thay cho đồ án.
      </p>
      {exercise ? (
        <>
          <label>
            Mốc sản phẩm
            <select
              value={exercise.id}
              onChange={(event) => {
                setExerciseId(event.target.value);
                setSource("");
                setResult(null);
              }}
            >
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  Mốc {item.projectStage}: {item.title}
                </option>
              ))}
            </select>
          </label>
          <p>{exercise.prompt}</p>
          <span className="badge blue">
            <Code2 size={13} />
            {exercise.language}
          </span>
          <label htmlFor={`project-${courseId}`} className="sr-only">
            Mã nguồn sản phẩm
          </label>
          <textarea
            id={`project-${courseId}`}
            className="code-editor"
            rows={15}
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Mã nguồn sản phẩm của bạn…"
          />
          <button
            className="primary"
            disabled={busy || !source.trim()}
            onClick={() => void submit()}
          >
            <Play size={15} />
            {busy ? "Đang kiểm chứng…" : "Nộp sản phẩm"}
            <ArrowRight size={15} />
          </button>
          {result && (
            <div className="execution-result" role="status">
              <strong>
                {result.status === "passed"
                  ? "Sản phẩm đạt bộ kiểm chứng"
                  : result.status === "failed"
                    ? "Sản phẩm cần chỉnh sửa"
                    : result.status === "error"
                      ? "Lỗi hệ thống thực thi; không tính trượt"
                      : "Bài nộp đã lưu và đang xử lý"}
              </strong>
              <p>{result.result?.feedback}</p>
            </div>
          )}
        </>
      ) : (
        <div className="setup-note">
          <CheckCircle2 size={20} />
          <div>
            <strong>Bộ nghiệm thu sản phẩm chưa được nạp</strong>
            <p>
              Đề tài, các mốc, dữ liệu kiểm chứng và tiêu chí chấm cần được
              duyệt trước khi mở phần bàn giao.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
