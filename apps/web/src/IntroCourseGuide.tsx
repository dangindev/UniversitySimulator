import { BookOpen, CheckCircle2, Flag, GraduationCap } from "lucide-react";
import {
  introProject,
  introSyllabus,
  type Lesson,
  type LearningTrack,
} from "@university-simulator/content";

export interface IntroPracticeAssessment {
  score: number;
  completed: number;
  required: number;
  verifiedExerciseIds: string[];
  finalRequiredIds: string[];
  missingFinalExerciseIds: string[];
  projectScore?: number;
}

export default function IntroCourseGuide({
  track,
  lessons,
  completedLessons,
  assessment,
  onSelectLesson,
}: {
  track: LearningTrack;
  lessons: Lesson[];
  completedLessons: string[];
  assessment?: IntroPracticeAssessment;
  onSelectLesson: (id: string) => void;
}) {
  const verified = new Set(assessment?.verifiedExerciseIds || []);
  const practiceCount = lessons.reduce(
    (sum, lesson) => sum + (lesson.practice?.length || 0),
    0,
  );
  const missing = new Set(assessment?.missingFinalExerciseIds || []);
  return (
    <section className="intro-course-guide">
      <div className="intro-guide-title">
        <div>
          <span className="section-kicker">
            CS101 · 4 TÍN CHỈ · {track === "cpp" ? "C++" : "PYTHON"}
          </span>
          <h2>Một lộ trình, từ ý tưởng đến chương trình</h2>
        </div>
        <span className="badge sand">M1 · Thử nghiệm nội bộ</span>
      </div>
      <p>{introSyllabus.learningSequence}</p>
      <div className="intro-progress-grid">
        <div>
          <BookOpen size={18} />
          <strong>
            {
              lessons.filter((lesson) => completedLessons.includes(lesson.id))
                .length
            }
            /{lessons.length}
          </strong>
          <span>Checkpoint đã hiểu</span>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <strong>
            {assessment?.completed ?? 0}/{assessment?.required ?? practiceCount}
          </strong>
          <span>Bài code đạt mọi ca</span>
        </div>
        <div>
          <GraduationCap size={18} />
          <strong>{(assessment?.score ?? 0).toFixed(2)}/10</strong>
          <span>Điểm thực hành máy chủ</span>
        </div>
      </div>
      <details className="course-syllabus">
        <summary>Đề cương, chuẩn đầu ra và cách đánh giá</summary>
        <p>{introSyllabus.estimatedWorkload}</p>
        <ol className="course-outcomes">
          {introSyllabus.outcomes.map((outcome) => (
            <li key={outcome.id}>
              <strong>
                {outcome.id} · {outcome.title}
              </strong>
              <p>{outcome.description}</p>
            </li>
          ))}
        </ol>
        <div className="grading-policy">
          <strong>
            Điểm môn: chuyên cần 10% · thực hành 30% · giữa kỳ 20% · cuối kỳ 40%
          </strong>
          <p>
            Điểm thực hành là trung bình kết quả tốt nhất của toàn bộ bài code
            bắt buộc; bài chưa làm tính 0. Checkpoint dùng để học và điểm danh,
            không thay điểm code. Qua môn cần tổng từ 5/10, cuối kỳ từ 4/10 và
            đạt tiêu chí code trong đề thi.
          </p>
          <p>
            Giữa kỳ mở từ tuần 8; cuối kỳ từ tuần 16. Cuối kỳ yêu cầu hoàn thành
            nhóm bài nền tảng và ba mốc tích hợp trước. Có một lượt thi lại cuối
            kỳ với đề khác. Đề thử nội bộ vẫn dùng đồng hồ máy chủ, tự lưu và
            tắt gợi ý.
          </p>
        </div>
        <p>{introSyllabus.assessmentBoundary}</p>
        <p className="muted">
          Nội dung còn chờ duyệt học thuật độc lập và thử với người mới.
        </p>
      </details>
      <details className="intro-project-guide">
        <summary>
          <Flag size={16} />
          {introProject.title} · ba mốc ứng dụng
        </summary>
        <p>{introProject.description}</p>
        <div className="project-milestones">
          {introProject.milestones.map((stage) => {
            const lesson = lessons.find((lesson) =>
              lesson.practice?.some((practice) =>
                practice.id.endsWith(stage.exerciseSuffix),
              ),
            );
            const exercise = lesson?.practice?.find((practice) =>
              practice.id.endsWith(stage.exerciseSuffix),
            );
            return (
              <div className="project-milestone" key={stage.id}>
                <div className="card-heading">
                  <h3>{stage.title}</h3>
                  <span
                    className={`badge ${exercise && verified.has(exercise.id) ? "green" : "sand"}`}
                  >
                    {exercise && verified.has(exercise.id)
                      ? "Đã kiểm chứng"
                      : `${stage.weight}% mốc tích hợp`}
                  </span>
                </div>
                <strong>Máy kiểm tra</strong>
                <ul>
                  {stage.machineChecked.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <strong>Tự đối chiếu</strong>
                <ul>
                  {stage.selfCheck.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {lesson && (
                  <button
                    className="secondary"
                    onClick={() => onSelectLesson(lesson.id)}
                  >
                    Mở bài bàn giao
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {assessment?.projectScore !== undefined && (
          <p>
            Điểm tổng hợp ba mốc (20%–30%–50%):{" "}
            <strong>{assessment.projectScore.toFixed(2)}/10</strong>.
          </p>
        )}
        <p className="muted">
          {introProject.note} Điểm thực hành toàn môn vẫn tính trên tất cả bài
          code; điểm tổng hợp ba mốc giúp bạn đối chiếu sản phẩm.
        </p>
      </details>
      {assessment && missing.size > 0 && (
        <details className="exam-prerequisites">
          <summary>Còn {missing.size} bài code để mở thi cuối kỳ</summary>
          <ul>
            {lessons.flatMap((lesson) =>
              (lesson.practice || [])
                .filter((practice) => missing.has(practice.id))
                .map((practice) => (
                  <li key={practice.id}>
                    <button
                      className="text-button"
                      onClick={() => onSelectLesson(lesson.id)}
                    >
                      {practice.title || lesson.title}
                    </button>
                  </li>
                )),
            )}
          </ul>
        </details>
      )}
    </section>
  );
}
