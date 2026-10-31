import {
  useEffect,
  useRef,
  useState,
  useId,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Coffee,
  Compass,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Terminal,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  courses,
  programs,
  getCourse,
  getProgram,
  getProgramCourses,
  getTranscriptSummary,
  auditGraduation,
  suggestEnrollment,
  languageBridges,
  type OfficeArtifact,
  type Course,
  type GradeRecord,
} from "@university-simulator/core";
import { getLessons, type Lesson } from "@university-simulator/content";
import { api, authClient, logout, operationKey, setDevToken } from "./api";
import Campus, { type CampusLocation } from "./Campus";
import Timetable from "./Timetable";
import ProjectPanel, { type ProjectExercise } from "./ProjectPanel";
import OfficeLab from "./OfficeLab";
import { createAnswerAutosave, type AnswerAutosave } from "./answer-autosave";

type Page =
  | "overview"
  | "campus"
  | "courses"
  | "schedule"
  | "grades"
  | "life"
  | "achievements";
type Enrollment = { courseId: string; semester: number; section: string };
type Student = {
  id: string;
  displayName: string;
  major: "it" | "cs";
  track: "cpp" | "python";
  semester: number;
  week: number;
  day: number;
  energy: number;
  stress: number;
  balance: number;
  enrollments: Enrollment[];
  grades: GradeRecord[];
  completedLessons: string[];
  relationships: Record<string, number>;
  completedBridges?: string[];
  office?: { artifact: OfficeArtifact; score: number; passed: boolean };
  exams?: Exam[];
  ledger: { id: string; amount: number; activityId: string; at: string }[];
  credentials: {
    code: string;
    type: string;
    issuedAt: string;
    public: boolean;
  }[];
  placementLevel?: number;
  placementAt?: string;
  progress?: Record<
    string,
    { lessons: string[]; attendance: string[]; practice: number[] }
  >;
};
type PublicQuestion = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  kind?: "choice" | "code";
  language?: string;
  starterCode?: string;
  requiredPassRatio?: number;
};
type Exam = {
  id: string;
  semester?: number;
  courseId: string;
  kind: string;
  questions: PublicQuestion[];
  deadlineAt: string;
  serverTime?: string;
  status: string;
  answers: Record<string, string>;
  score?: number;
  savedAt?: string;
  developmentSample?: boolean;
  gradingError?: string;
  reason?: string;
  codeResult?: {
    passed: number;
    total: number;
    feedback: string;
    criterionPassed?: boolean;
    requiredPassRatio?: number;
  };
};
const navigation = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "campus", label: "Khuôn viên", icon: Compass },
  { id: "courses", label: "Học phần", icon: BookOpen },
  { id: "schedule", label: "Thời khóa biểu", icon: CalendarDays },
  { id: "grades", label: "Bảng điểm", icon: TrendingUp },
  { id: "life", label: "Đời sống", icon: Sprout },
  { id: "achievements", label: "Thành tích", icon: Award },
] as const;
const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const localProfile = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "") || "local-student";
const categoryLabels: Record<string, string> = {
  general: "Đại cương",
  foundation: "Cơ sở ngành",
  core: "Bắt buộc ngành",
  specialization: "Chuyên ngành",
  internship: "Thực tập",
  capstone: "Tốt nghiệp",
  requirement: "Kỹ năng bổ trợ",
};
const activityIds: Record<string, string> = {
  cook: "meal",
  run: "commute",
  parttime: "job",
  scholarship: "aid",
};
const activityNames: Record<string, string> = {
  job: "Ca làm thêm",
  aid: "Quỹ hỗ trợ sinh viên",
  commute: "Đường tới trường",
  meal: "Nấu bữa tối",
  rest: "Nghỉ ngơi",
  parttime: "Làm thêm",
  scholarship: "Hỗ trợ sinh viên",
  volunteer: "Tình nguyện",
  friend: "Gặp bạn bè",
  rent: "Chuyển sang phòng trọ",
  dorm: "Về ký túc xá",
  "housing-rent": "Tiền chỗ ở theo kỳ",
  cook: "Nấu ăn",
  run: "Chạy bộ",
  study: "Tự học",
  club: "Câu lạc bộ",
  date: "Gặp gỡ",
  rental: "Thuê trọ",
};
function ledgerTitle(id: string) {
  if (activityNames[id]) return activityNames[id];
  const title = getCourse(id.split(":").at(-1) || "")?.title || "học phần";
  if (id.startsWith("tuition-support-return:"))
    return `Đối soát hỗ trợ · ${title}`;
  if (id.startsWith("tuition-support:")) return `Hỗ trợ học phí · ${title}`;
  if (id.startsWith("tuition-refund:")) return `Hoàn học phí · ${title}`;
  if (id.startsWith("tuition:")) return `Học phí · ${title}`;
  return "Điều chỉnh quỹ sinh hoạt";
}
function Logo() {
  return (
    <span className="brand-symbol">
      <GraduationCap size={27} strokeWidth={1.7} />
    </span>
  );
}
function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Avatar({ name, size = "" }: { name: string; size?: string }) {
  return (
    <span className={`avatar ${size}`} aria-label={name}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path fill="#a8ba92" d="M0 0h40v40H0z" />
        <path fill="#394c36" d="M12 6h16v5h4v13H8V11h4z" />
        <path fill="#e6b794" d="M13 12h14v15H13z" />
        <path fill="#314f41" d="M7 29h26v11H7z" />
        <path fill="#faf1d9" d="M17 27h6v6h-6z" />
        <path fill="#413b32" d="M16 18h2v2h-2zm7 0h2v2h-2z" />
        <path fill="#b1725d" d="M18 23h5v2h-5z" />
      </svg>
    </span>
  );
}

export default function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [boot, setBoot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>("overview");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 720px)").matches,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [placement, setPlacement] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [minigame, setMinigame] = useState<"cook" | "run" | null>(null);
  const [help, setHelp] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationResolver = useRef<((choice: boolean) => void) | null>(null);
  function askConfirmation(message: string) {
    if (confirmationResolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      confirmationResolver.current = resolve;
      setConfirmation(message);
    });
  }
  function decideConfirmation(choice: boolean) {
    const resolve = confirmationResolver.current;
    confirmationResolver.current = null;
    setConfirmation(null);
    resolve?.(choice);
  }
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const changed = () => setIsMobile(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!isMobile || !mobileNav) return;
    sidebarRef.current?.querySelector<HTMLElement>("button")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
      if (event.key === "Tab") {
        const elements = sidebarRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href]",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      mobileMenuRef.current?.focus();
    };
  }, [isMobile, mobileNav]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, selectedCourse?.id]);
  async function refresh() {
    const data = await api("/bootstrap");
    setBoot(data);
    setStudent(data.student);
    setAuthenticated(true);
    return data;
  }
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function checkHealth() {
      try {
        const status = await api("/health");
        if (!cancelled) setHealth(status);
      } catch {
        if (!cancelled) {
          setHealth({ offline: true });
          retry = setTimeout(checkHealth, 3000);
        }
      }
    }
    void checkHealth();
    void refresh()
      .then((data) => {
        const active = data.student?.exams?.find(
          (attempt: Exam) => attempt.status === "active",
        );
        if (active)
          setExam(normalizeExam({ ...active, serverTime: data.serverTime }));
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  async function mutate(path: string, body: any, success?: string) {
    setBusy(true);
    try {
      const result = await api(path, "POST", body);
      if (result.student) setStudent(result.student);
      else await refresh();
      if (success) setToast(success);
      return result;
    } catch (error) {
      setToast((error as Error).message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: Page) {
    setPage(next);
    setMobileNav(false);
    setSelectedCourse(null);
  }
  function location(where: CampusLocation) {
    if (where === "dorm" || where === "club") navigate("life");
    else if (where === "library") navigate("courses");
    else {
      const c = getCourse(
        student?.enrollments.find((e) => e.semester === student.semester)
          ?.courseId || "intro-programming",
      );
      if (c) setSelectedCourse(c);
    }
  }
  async function startExam(courseId: string, kind: "midterm" | "final") {
    try {
      const result = await mutate("/exams", { courseId, kind });
      setExam(
        normalizeExam({
          ...(result.exam || result),
          serverTime: result.serverTime,
        }),
      );
    } catch {
      /* shown centrally */
    }
  }
  async function openExam(id: string) {
    try {
      const response = await api(`/exams/${id}`);
      setExam(
        normalizeExam({ ...response.exam, serverTime: response.serverTime }),
      );
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  const activeEnrollments =
    student?.enrollments.filter((e) => e.semester === student.semester) || [];
  const activeCourses = activeEnrollments
    .map((e) => getCourse(e.courseId))
    .filter((c): c is Course => !!c);
  const summary = getTranscriptSummary(student?.grades || []);
  if (loading)
    return (
      <div className="loading-screen">
        <Logo />
        <h1>University Simulator</h1>
        <p>Đang mở cổng trường…</p>
        <span className="loading-line" />
      </div>
    );
  if (!authenticated)
    return (
      <AuthGate
        health={health}
        onSuccess={async () => {
          await refresh();
        }}
        onError={setToast}
        toast={toast}
      />
    );
  if (!student)
    return (
      <Onboarding
        busy={busy}
        onCreate={async (values) => {
          try {
            await mutate("/students", values);
            setPlacement(true);
          } catch {
            /* retained form */
          }
        }}
        error={toast}
      />
    );
  const goal = getProgram(student.major)!;
  const pendingExam = student.exams?.find((attempt) =>
    ["active", "grading", "grading-error"].includes(attempt.status),
  );
  return (
    <div className="app-layout">
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Đóng menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        id="primary-navigation-panel"
        ref={sidebarRef}
        className={`sidebar ${mobileNav ? "open" : ""}`}
        inert={isMobile && !mobileNav}
        aria-hidden={isMobile && !mobileNav}
        role={isMobile && mobileNav ? "dialog" : undefined}
        aria-modal={isMobile && mobileNav ? true : undefined}
        aria-label="Điều hướng chính"
      >
        <button className="brand" onClick={() => navigate("overview")}>
          <Logo />
          <span>
            University<span>SIMULATOR</span>
          </span>
        </button>
        <div className="school-label">HÀNH TRÌNH CỦA BẠN</div>
        <nav aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "courses" && (
                <span className="nav-count">{activeCourses.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="semester-card">
          <span className="semester-icon">
            <Sprout size={23} />
          </span>
          <div>
            <strong>Mỗi ngày, một bước tiến.</strong>
            <p>Hành trình của bạn, nhịp độ của bạn.</p>
          </div>
          <div className="semester-progress">
            <i
              style={{
                width: `${Math.min(100, (summary.credits / goal.credits) * 100)}%`,
              }}
            />
          </div>
          <span>
            {summary.credits} / {goal.credits} tín chỉ
          </span>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Hướng dẫn học tập
          </button>
          <button
            className="profile-button"
            onClick={async () => {
              if (
                await askConfirmation(
                  "Đăng xuất? Tiến độ đã lưu vẫn được giữ trên máy chủ.",
                )
              )
                void logout().then(() => {
                  setAuthenticated(false);
                  setStudent(null);
                });
            }}
          >
            <Avatar name={student.displayName} />
            <span>
              <strong>{student.displayName}</strong>
              <small>Sinh viên {goal.shortTitle}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div
        className="main-shell"
        inert={isMobile && mobileNav}
        aria-hidden={isMobile && mobileNav}
      >
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              ref={mobileMenuRef}
              aria-controls="primary-navigation-panel"
              aria-expanded={mobileNav}
              aria-label="Mở menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumbs">
              Trường đại học <ChevronRight size={13} />
              <strong>{navigation.find((n) => n.id === page)?.label}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={17} />
              <input
                aria-label="Tìm học phần"
                placeholder="Tìm học phần…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage("courses");
                  setSelectedCourse(null);
                }}
              />
              <kbd>/</kbd>
            </div>
            <span className="term-pill">
              <span />
              Học kỳ {student.semester}
            </span>
            <button
              className="icon-button"
              aria-label="Thông tin phiên bản"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={20} />
            </button>
            <Avatar name={student.displayName} size="small" />
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "overview"
                  ? "MỘT NGÀY MỚI Ở ĐẠI HỌC"
                  : "UNIVERSITY SIMULATOR"}
              </div>
              <h1>
                {selectedCourse
                  ? selectedCourse.title
                  : page === "overview"
                    ? `Chào ${student.displayName.split(" ").slice(-1)[0]}, hôm nay học gì?`
                    : navigation.find((n) => n.id === page)?.label}
              </h1>
              <p>
                {selectedCourse
                  ? `${selectedCourse.code} · ${selectedCourse.credits} tín chỉ · ${student.track === "cpp" ? "C++" : "Python"}`
                  : page === "overview"
                    ? "Một chút kiến thức, một chút trải nghiệm. Viết tiếp câu chuyện sinh viên của bạn."
                    : goal.title + " · Chương trình 2026.v1"}
              </p>
            </div>
            <span className="date-pill">
              <CalendarDays size={17} />
              Ngày {student.day} · Tuần {student.week}
              <ChevronDown size={14} />
            </span>
          </div>
          {(boot?.capabilities?.developmentAuth ||
            health?.development ||
            health?.environment === "development") && (
            <div className="dev-notice">
              <ShieldCheck size={15} />
              Bản phát triển nội bộ · Học liệu đang được biên soạn và kiểm
              chứng. Đề mẫu không phải kỳ thi chính thức.
            </div>
          )}
          {pendingExam && (
            <div className="active-exam-notice">
              <Clock3 size={18} />
              <span>
                {pendingExam.status === "active"
                  ? "Bạn có một lượt thi đang chạy giờ."
                  : pendingExam.status === "grading"
                    ? "Bài thi đã nhận, đang chờ kiểm chứng mã."
                    : "Bài thi đã lưu và đang chờ xử lý sự cố chấm."}
              </span>
              <button
                className="text-button"
                onClick={() => void openExam(pendingExam.id)}
              >
                Mở bài thi
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {selectedCourse ? (
            <LearningScreen
              course={selectedCourse}
              student={student}
              busy={busy}
              exercises={boot?.exercises || []}
              onUpdated={() => void refresh()}
              onOfficeSubmit={async (artifact) => {
                try {
                  const response = await mutate(
                    "/skills/office/submit",
                    { artifact },
                    "Đã ghi nhận bài thực hành văn phòng.",
                  );
                  return response.assessment;
                } catch {
                  return undefined;
                }
              }}
              onClose={() => setSelectedCourse(null)}
              onError={setToast}
              onCheckpoint={async (lessonId, answer) => {
                try {
                  return await mutate("/learning/checkpoint", {
                    courseId: selectedCourse.id,
                    lessonId,
                    answer,
                  });
                } catch {
                  return undefined;
                }
              }}
              onExam={(kind) => startExam(selectedCourse.id, kind)}
            />
          ) : (
            <>
              {page === "overview" && (
                <>
                  <div className="stat-grid">
                    <Stat
                      label="Học phần kỳ này"
                      value={String(activeCourses.length).padStart(2, "0")}
                      detail={`${activeCourses.reduce((n, c) => n + c.credits, 0)} tín chỉ đã đăng ký`}
                      icon={<BookOpen />}
                      tone="sage"
                    />
                    <Stat
                      label="Điểm trung bình"
                      value={
                        summary.gradedCredits ? summary.gpa.toFixed(2) : "—"
                      }
                      detail={
                        summary.gradedCredits
                          ? "Thang điểm 4.0"
                          : "Chưa có điểm tổng kết"
                      }
                      icon={<TrendingUp />}
                      tone="sand"
                    />
                    <Stat
                      label="Bài học hoàn thành"
                      value={String(student.completedLessons.length).padStart(
                        2,
                        "0",
                      )}
                      detail="Từng bước xây nền tảng"
                      icon={<CheckCircle2 />}
                      tone="blue"
                    />
                    <Stat
                      label="Quỹ sinh hoạt"
                      value={money(student.balance)}
                      detail="Tiền mô phỏng trong game"
                      icon={<Wallet />}
                      tone="peach"
                    />
                  </div>
                  <div className="overview-grid">
                    <section className="card campus-card">
                      <div className="card-heading">
                        <div>
                          <span className="section-kicker">
                            KHÔNG KHÍ SÂN TRƯỜNG
                          </span>
                          <h2>Một góc đại học của bạn</h2>
                        </div>
                        <Badge>
                          <span className="status-dot" />
                          Trời trong, lòng đầy hy vọng
                        </Badge>
                      </div>
                      <div className="campus-frame">
                        <Campus onLocation={location} />
                        <div className="campus-caption">
                          <span>
                            <MapPin size={13} />
                            Khuôn viên USim
                          </span>
                          <span>
                            Học kỳ {student.semester} · Năm{" "}
                            {Math.ceil(student.semester / 2)}
                          </span>
                        </div>
                      </div>
                      <div className="quick-locations">
                        <button onClick={() => location("classroom")}>
                          <GraduationCap size={17} />
                          Đến lớp
                          <ArrowUpRight size={14} />
                        </button>
                        <button onClick={() => location("library")}>
                          <BookOpen size={17} />
                          Thư viện
                          <ArrowUpRight size={14} />
                        </button>
                        <button onClick={() => location("dorm")}>
                          <Home size={17} />
                          Về phòng trọ
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </section>
                    <section className="card learning-plan">
                      <div className="card-heading">
                        <h2>Tiếp tục học</h2>
                        <span className="tiny-label">CỦA BẠN</span>
                      </div>
                      {activeCourses.length ? (
                        activeCourses
                          .slice(0, 3)
                          .map((c, i) => (
                            <CourseProgress
                              key={c.id}
                              course={c}
                              student={student}
                              index={i}
                              onOpen={() => setSelectedCourse(c)}
                            />
                          ))
                      ) : (
                        <div className="empty-inline">
                          <span className="big-line-icon">
                            <BookOpen size={28} />
                          </span>
                          <h3>Hành trình bắt đầu từ đây</h3>
                          <p>
                            Chọn các học phần đầu tiên. Cố vấn sẽ gợi ý một thời
                            khóa biểu phù hợp.
                          </p>
                          <button
                            className="primary"
                            onClick={() => navigate("courses")}
                          >
                            Đăng ký học phần
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                      <button
                        className="text-button all-courses"
                        onClick={() => navigate("courses")}
                      >
                        Xem tất cả học phần
                        <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                  <div className="bottom-grid">
                    <section className="card">
                      <div className="card-heading">
                        <h2>Lịch học của bạn</h2>
                        <button
                          className="text-button"
                          onClick={() => navigate("schedule")}
                        >
                          Xem lịch
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                      {activeCourses.length ? (
                        activeCourses.slice(0, 3).map((c, i) => (
                          <button
                            className="schedule-row"
                            key={c.id}
                            onClick={() => setSelectedCourse(c)}
                          >
                            <div className={`time-block tone-${i}`}>
                              {student.enrollments
                                .find(
                                  (e) =>
                                    e.courseId === c.id &&
                                    e.semester === student.semester,
                                )
                                ?.section.split(" ")[1] || "—"}
                              <small>Buổi học</small>
                            </div>
                            <span>
                              <strong>{c.title}</strong>
                              <small>
                                <MapPin size={12} />
                                {c.category === "foundation"
                                  ? "Phòng máy B.201"
                                  : "Giảng đường A.102"}
                              </small>
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))
                      ) : (
                        <div className="empty-message">
                          Lịch sẽ xuất hiện sau khi bạn đăng ký tín chỉ.
                        </div>
                      )}
                      <div className="subtle-footer">
                        <Clock3 size={14} />
                        Lịch trong game tiến theo lựa chọn của bạn.
                      </div>
                    </section>
                    <section className="card advisor-card">
                      <div className="card-heading">
                        <h2>Góc cố vấn</h2>
                        <MessageCircle size={18} />
                      </div>
                      <div className="advisor-person">
                        <Avatar name="Cô An" />
                        <div>
                          <strong>Cô An</strong>
                          <small>Cố vấn học tập</small>
                        </div>
                        <Badge tone="sand">NPC</Badge>
                      </div>
                      <blockquote>
                        {student.placementAt
                          ? "Đừng vội chạy hết lộ trình. Hãy thử giải thích lại một điều bạn vừa học bằng lời của chính mình."
                          : "Bạn đã sẵn sàng chưa? Bài kiểm tra tiếng Anh đầu vào có thể giúp bạn miễn tối đa ba học phần."}
                      </blockquote>
                      <button
                        className="text-button"
                        onClick={() =>
                          student.placementAt
                            ? navigate("courses")
                            : setPlacement(true)
                        }
                      >
                        {student.placementAt
                          ? "Khám phá lộ trình học"
                          : "Kiểm tra tiếng Anh đầu vào"}
                        <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="balance-card">
                      <div className="balance-decoration">
                        <Leaf size={65} strokeWidth={1} />
                      </div>
                      <span className="section-kicker">HỌC TỐT, SỐNG VUI</span>
                      <h2>
                        Nghỉ một chút
                        <br />
                        cũng là tiến bộ.
                      </h2>
                      <p>
                        Cơm nóng, một cuộc trò chuyện,
                        <br />
                        rồi lại sẵn sàng cho bài học mới.
                      </p>
                      <div className="vital">
                        <Heart size={14} />
                        Năng lượng<span>{student.energy}%</span>
                      </div>
                      <div className="meter">
                        <i style={{ width: `${student.energy}%` }} />
                      </div>
                      <button onClick={() => navigate("life")}>
                        Khám phá đời sống
                        <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                </>
              )}
              {page === "campus" && (
                <section className="card full-campus">
                  <div className="card-heading">
                    <h2>Gặp nhau ở sân trường</h2>
                    <Badge>NPC · Một người chơi</Badge>
                  </div>
                  <Campus onLocation={location} large />
                  <p className="muted center">
                    Dùng phím mũi tên để đi bộ hoặc chọn điểm đến. Đi nhanh luôn
                    sẵn sàng.
                  </p>
                  <div className="quick-locations">
                    {(
                      [
                        ["classroom", "Giảng đường"],
                        ["lab", "Phòng máy"],
                        ["library", "Thư viện"],
                        ["dorm", "Phòng trọ"],
                        ["club", "Câu lạc bộ"],
                      ] as const
                    ).map(([id, label]) => (
                      <button key={id} onClick={() => location(id)}>
                        <MapPin size={17} />
                        {label}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {page === "courses" && (
                <CourseCatalog
                  student={student}
                  search={search}
                  busy={busy}
                  onSearch={setSearch}
                  onOpen={setSelectedCourse}
                  onEnroll={async (courseIds, sections) => {
                    await mutate(
                      "/enrollments",
                      { courseIds, sections, allowImprovement: true },
                      "Đã lưu đăng ký tín chỉ. Hẹn gặp bạn ở lớp!",
                    );
                  }}
                />
              )}
              {page === "schedule" && (
                <Timetable
                  student={student}
                  activeCourses={activeCourses}
                  onOpen={setSelectedCourse}
                  busy={busy}
                  onAdvance={async (unit) => {
                    if (
                      !(await askConfirmation(
                        `Chuyển sang ${unit === "semester" ? "học kỳ" : unit === "week" ? "tuần" : "ngày"} tiếp theo? Khi kết thúc học kỳ, môn chưa hoàn thành sẽ được ghi nhận không đạt. Hãy kiểm tra bài cần nộp trước khi tiếp tục.`,
                      ))
                    )
                      return;
                    try {
                      await mutate(
                        "/calendar/advance",
                        { unit, confirm: true },
                        "Đã cập nhật lịch mô phỏng.",
                      );
                    } catch {
                      /* handled */
                    }
                  }}
                />
              )}
              {page === "grades" && (
                <Grades student={student} onExamOpen={openExam} />
              )}
              {page === "life" && (
                <Life
                  student={student}
                  busy={busy}
                  onMinigame={setMinigame}
                  onActivity={async (id) => {
                    try {
                      await mutate(
                        "/life/activity",
                        {
                          activityId: activityIds[id] || id,
                          idempotencyKey: operationKey(),
                        },
                        "Hoạt động đã được lưu.",
                      );
                    } catch {
                      /* handled */
                    }
                  }}
                />
              )}
              {page === "achievements" && (
                <Achievements
                  student={student}
                  busy={busy}
                  onIssue={async () => {
                    try {
                      await mutate(
                        "/credentials",
                        {},
                        "Chứng nhận đã được lưu.",
                      );
                    } catch {
                      /* handled */
                    }
                  }}
                  onShare={async (code, enabled) => {
                    try {
                      await mutate(`/credentials/${code}/share`, { enabled });
                    } catch {
                      /* handled */
                    }
                  }}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Sprout size={14} />
              Một ngôi trường nhỏ. Những khả năng lớn.
            </span>
            <span>University Simulator · 2026.v1 · Phát triển nội bộ</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CircleHelp size={18} />
          <span>{toast}</span>
          <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {placement && (
        <Placement
          questions={boot?.placementQuestions || []}
          onClose={() => setPlacement(false)}
          busy={busy}
          onSubmit={async (answers) => {
            try {
              const r = await mutate(
                "/placement",
                { answers },
                "Đã ghi nhận kết quả xếp lớp tiếng Anh.",
              );
              setPlacement(false);
              return r;
            } catch {
              return undefined;
            }
          }}
        />
      )}
      {exam && (
        <ExamDialog
          exam={exam}
          confirmAction={askConfirmation}
          onClose={() => {
            setExam(null);
            void refresh();
          }}
          onError={setToast}
        />
      )}
      {minigame && (
        <Minigame
          kind={minigame}
          onClose={() => setMinigame(null)}
          onComplete={async () => {
            try {
              await mutate(
                "/life/activity",
                {
                  activityId: activityIds[minigame] || minigame,
                  idempotencyKey: operationKey(),
                },
                "Bạn đã hoàn thành hoạt động.",
              );
              setMinigame(null);
            } catch {
              /* handled */
            }
          }}
        />
      )}
      {help && (
        <Dialog
          title="Chào mừng đến University Simulator"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              Bạn học tại một ngôi trường hư cấu. Chọn học phần, đến lớp, thực
              hành và tự tay xây dựng kiến thức.
            </p>
            <h3>Nhịp độ của bạn</h3>
            <p>
              Đóng trình duyệt không làm trôi tuần học. Riêng đồng hồ một lượt
              thi đã bắt đầu vẫn tiếp tục chạy theo máy chủ.
            </p>
            <h3>Phiên bản hiện tại</h3>
            <p>
              Đây là bản phát triển nội bộ. Danh mục toàn khóa có sẵn; học liệu
              và ngân hàng đánh giá cần được kiểm chứng trước khi mở phase 1 cho
              mọi người.
            </p>
            <h3>Dữ liệu và chứng nhận</h3>
            <p>
              Tiến độ lưu trên máy chủ. Tiền, bảng điểm và chứng nhận trong game
              là mô phỏng; chia sẻ chứng nhận do bạn chủ động bật.
            </p>
          </div>
          <button className="primary" onClick={() => setHelp(false)}>
            Bắt đầu hành trình
            <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
      {confirmation && (
        <Dialog
          title="Xác nhận lựa chọn"
          onClose={() => decideConfirmation(false)}
        >
          <p className="confirmation-message">{confirmation}</p>
          <div className="button-row">
            <button
              className="secondary"
              onClick={() => decideConfirmation(false)}
            >
              Ở lại
            </button>
            <button
              className="primary"
              onClick={() => decideConfirmation(true)}
            >
              Xác nhận
              <ArrowRight size={15} />
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className={`stat-icon ${tone}`}>{icon}</span>
    </div>
  );
}
function CourseProgress({
  course,
  student,
  index,
  onOpen,
}: {
  course: Course;
  student: Student;
  index: number;
  onOpen: () => void;
}) {
  const ls = getLessons(course.id, student.track);
  const completed = ls.filter((l) =>
    student.completedLessons.includes(l.id),
  ).length;
  const pct = ls.length ? Math.round((completed / ls.length) * 100) : 0;
  return (
    <button className="course-progress" onClick={onOpen}>
      <span className={`course-small-icon tone-${index}`}>
        <Code2 size={19} />
      </span>
      <div>
        <span className="course-code">
          {course.code} · {course.credits} tín chỉ
        </span>
        <strong>{course.title}</strong>
        <div className="progress-line">
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>
          {completed}/{ls.length} bài hiện có
        </small>
      </div>
      <span className="course-arrow">
        <Play size={13} fill="currentColor" />
      </span>
    </button>
  );
}

function AuthGate({
  health,
  onSuccess,
  onError,
  toast,
}: {
  health: any;
  onSuccess: () => Promise<void>;
  onError: (s: string) => void;
  toast: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const dev =
    health?.capabilities?.developmentAuth ||
    health?.developmentAuth ||
    health?.environment === "development";
  async function loginDev(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api("/auth/dev", "POST", {
        displayName: name || "Sinh viên mới",
        profile: localProfile(name),
      });
      setDevToken(r.accessToken);
      await onSuccess();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function emailLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await authClient!.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (r.error) throw r.error;
      setSent(true);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="brand">
          <Logo />
          <span>
            University<span>SIMULATOR</span>
          </span>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">MỘT HÀNH TRÌNH MỚI ĐANG CHỜ</span>
          <h1>
            Tuổi sinh viên.
            <br />
            Viết theo cách
            <br />
            <em>của bạn.</em>
          </h1>
          <p>
            Học điều mới. Gặp những người bạn.
            <br />
            Từng bước xây nên tương lai.
          </p>
        </div>
        <div className="auth-campus">
          <Campus onLocation={() => {}} />
        </div>
        <span className="auth-footnote">
          <Sprout size={16} />
          Miễn phí học tập · Đại học hư cấu tại Việt Nam
        </span>
      </div>
      <div className="auth-panel">
        <Badge>
          <Leaf size={13} />
          CHÀO TÂN SINH VIÊN
        </Badge>
        <h2>
          Cánh cổng đại học
          <br />
          bắt đầu ở đây.
        </h2>
        <p>Đăng nhập để lưu hành trình học tập của bạn.</p>
        {authClient ? (
          <>
            <button
              className="oauth-button"
              onClick={() =>
                void authClient!.auth
                  .signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: window.location.origin },
                  })
                  .then((r) => {
                    if (r.error) onError(r.error.message);
                  })
              }
            >
              <GraduationCap size={20} />
              Tiếp tục với Google
              <ArrowUpRight size={16} />
            </button>
            <div className="divider">
              <span>hoặc dùng email</span>
            </div>
            <form onSubmit={emailLogin}>
              <label>
                Email của bạn
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                />
              </label>
              <button className="primary full" disabled={busy}>
                {sent
                  ? "Gửi lại liên kết đăng nhập"
                  : "Nhận liên kết đăng nhập"}
                <ArrowRight size={17} />
              </button>
              {sent && (
                <p className="success-message">
                  Đã gửi liên kết. Hãy kiểm tra hộp thư của bạn.
                </p>
              )}
            </form>
          </>
        ) : (
          <div className="setup-note">
            <ShieldCheck size={21} />
            <div>
              <strong>Chưa kết nối đăng nhập công khai</strong>
              <p>
                Cấu hình Supabase để bật Google và liên kết email. Tiến độ phát
                triển có thể được thử với tài khoản cục bộ bên dưới.
              </p>
            </div>
          </div>
        )}
        {dev && (
          <form className="dev-login" onSubmit={loginDev}>
            <span className="tiny-label">CHỈ TRÊN MÁY PHÁT TRIỂN</span>
            <label>
              Tên người học
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Ví dụ: Minh Anh"
                autoComplete="nickname"
              />
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? "Đang mở hồ sơ…" : "Vào bản phát triển cục bộ"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
        {toast && (
          <p className="error-message" role="alert">
            {toast}
          </p>
        )}
        <div className="auth-trust">
          <ShieldCheck size={17} />
          <span>
            Tiến độ của riêng bạn.
            <br />
            Không cần thông tin sinh viên ngoài đời.
          </span>
        </div>
      </div>
    </div>
  );
}

function Onboarding({
  busy,
  error,
  onCreate,
}: {
  busy: boolean;
  error: string;
  onCreate: (v: any) => Promise<void>;
}) {
  const [displayName, setName] = useState("");
  const [major, setMajor] = useState<"it" | "cs">("it");
  const [track, setTrack] = useState<"cpp" | "python">("cpp");
  return (
    <div className="onboarding">
      <div className="brand">
        <Logo />
        <span>
          University<span>SIMULATOR</span>
        </span>
      </div>
      <div className="onboarding-card">
        <Badge>BƯỚC ĐẦU TIÊN</Badge>
        <h1>Chào bạn, tân sinh viên.</h1>
        <p>Mỗi người có một điểm khởi đầu. Chọn hành trình dành cho bạn.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onCreate({ displayName, major, track });
          }}
        >
          <label>
            Bạn muốn được gọi là gì?
            <input
              required
              value={displayName}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên nhân vật của bạn"
            />
          </label>
          <h3>Chọn chuyên ngành</h3>
          <div className="choice-grid">
            {programs.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`choice ${major === p.id ? "selected" : ""}`}
                onClick={() => setMajor(p.id)}
              >
                <span className="choice-check">
                  {major === p.id && <Check size={13} />}
                </span>
                {p.id === "it" ? <Code2 size={27} /> : <Sparkles size={27} />}
                <strong>{p.title}</strong>
                <small>{p.credits} tín chỉ · 8 học kỳ</small>
                <p>{p.description}</p>
              </button>
            ))}
          </div>
          <h3>Đường nhập môn lập trình</h3>
          <div className="choice-grid compact">
            {(["cpp", "python"] as const).map((t) => (
              <button
                type="button"
                className={`choice ${track === t ? "selected" : ""}`}
                key={t}
                onClick={() => setTrack(t)}
              >
                <strong>{t === "cpp" ? "C++" : "Python"}</strong>
                <small>
                  {t === "cpp"
                    ? "Hiểu nền tảng từ cách máy tính xử lý"
                    : "Bắt đầu với cú pháp gần gũi, rõ ràng"}
                </small>
              </button>
            ))}
          </div>
          <p className="muted small">
            Hai đường cùng chuẩn đầu ra và 4 tín chỉ. Bạn sẽ học thêm ngôn ngữ
            phù hợp ở các môn sau.
          </p>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <button className="primary full" disabled={busy}>
            Tạo hồ sơ sinh viên
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function CourseCatalog({
  student,
  search,
  busy,
  onSearch,
  onOpen,
  onEnroll,
}: {
  student: Student;
  search: string;
  busy: boolean;
  onSearch: (s: string) => void;
  onOpen: (c: Course) => void;
  onEnroll: (ids: string[], sections: Record<string, string>) => Promise<void>;
}) {
  const [filter, setFilter] = useState("recommended");
  const [selected, setSelected] = useState<string[]>(
    student.enrollments
      .filter((e) => e.semester === student.semester)
      .map((e) => e.courseId),
  );
  const [sections, setSections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      student.enrollments
        .filter((record) => record.semester === student.semester)
        .map((record) => [record.courseId, record.section]),
    ),
  );
  const passed = new Set(
    student.grades.filter((g) => g.status !== "failed").map((g) => g.courseId),
  );
  const enrolled = new Set(
    student.enrollments
      .filter((e) => e.semester === student.semester)
      .map((e) => e.courseId),
  );
  const offered = getProgramCourses(student.major);
  const list = offered.filter(
    (c) =>
      (!search ||
        `${c.title} ${c.code}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi"))) &&
      (filter === "all" ||
        (filter === "registered" && enrolled.has(c.id)) ||
        (filter === "recommended" &&
          c.semester <= student.semester &&
          !passed.has(c.id)) ||
        (filter === "requirements" && c.credits === 0)),
  );
  const credits = [...new Set(selected)].reduce(
    (n, id) => n + (getCourse(id)?.credits || 0),
    0,
  );
  function suggest() {
    setSelected(
      suggestEnrollment(student.major, student.grades, student.semester),
    );
    setFilter("all");
  }
  return (
    <>
      <div className="catalog-toolbar">
        <div className="tabs">
          {[
            ["recommended", "Gợi ý cho bạn"],
            ["all", "Toàn chương trình"],
            ["registered", "Đã đăng ký"],
            ["requirements", "Kỹ năng bổ trợ"],
          ].map(([id, title]) => (
            <button
              key={id}
              className={filter === id ? "selected" : ""}
              onClick={() => setFilter(id)}
            >
              {title}
            </button>
          ))}
        </div>
        <button className="secondary" onClick={suggest}>
          <Sparkles size={16} />
          Cố vấn gợi ý
        </button>
      </div>
      <div className="catalog-summary">
        <span>
          {list.length} học phần · {student.major === "it" ? "125" : "126"} tín
          chỉ toàn khóa
        </span>
        <span>
          <ShieldCheck size={14} />
          Đề cương công bố trước khi đăng ký
        </span>
      </div>
      {(filter === "all" || filter === "requirements") && (
        <section className="card bridge-panel">
          <div className="card-heading">
            <h2>Chuyển tiếp ngôn ngữ</h2>
            <Badge tone="blue">Không tính thêm tín chỉ</Badge>
          </div>
          <p className="muted small">
            Học phần cần ngôn ngữ nào sẽ yêu cầu bạn hoàn thành bài chuyển tiếp
            phù hợp trước khi đăng ký.
          </p>
          <div className="bridge-buttons">
            {languageBridges
              .filter((bridge) => bridge.forTracks.includes(student.track))
              .map((bridge) => (
                <button
                  className="secondary"
                  key={bridge.id}
                  onClick={() =>
                    onOpen({
                      id: bridge.id,
                      code: bridge.language.toUpperCase(),
                      title: bridge.title,
                      credits: 0,
                      category: "requirement",
                      programs: [student.major],
                      semester: 0,
                      prerequisites: [],
                      outcomes: bridge.outcomes,
                      description:
                        "Cầu nối ngôn ngữ để tiếp tục học phần chuyên môn.",
                      slots: [],
                      kind: "requirement",
                      contentStatus: "draft",
                      sources: [],
                    })
                  }
                >
                  {student.completedBridges?.includes(bridge.id) ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Code2 size={16} />
                  )}{" "}
                  {bridge.title}
                  <ArrowRight size={14} />
                </button>
              ))}
          </div>
        </section>
      )}
      <div className="course-grid">
        {list.map((c, i) => {
          const locked = c.prerequisites.filter((id) => !passed.has(id));
          const lessons = getLessons(c.id, student.track);
          return (
            <article
              className={`card course-card ${selected.includes(c.id) ? "picked" : ""}`}
              key={c.id}
            >
              <div className="course-card-top">
                <span className={`course-icon tone-${i % 4}`}>
                  <Code2 size={24} />
                </span>
                <Badge tone={passed.has(c.id) ? "green" : "sand"}>
                  {passed.has(c.id)
                    ? "Đã hoàn thành"
                    : c.credits
                      ? `${c.credits} tín chỉ`
                      : "Ngoại khóa"}
                </Badge>
              </div>
              <span className="course-code">
                {c.code} · KỲ GỢI Ý {c.semester}
              </span>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <div className="course-meta">
                <span>{categoryLabels[c.category]}</span>
                <span>{lessons.length} bài hiện có</span>
              </div>
              {selected.includes(c.id) && c.slots.length > 0 && (
                <label className="section-select">
                  Chọn ca học
                  <select
                    value={sections[c.id] ?? c.slots[0]}
                    onChange={(event) =>
                      setSections((previous) => ({
                        ...previous,
                        [c.id]: event.target.value,
                      }))
                    }
                  >
                    {c.slots.map((slot) => (
                      <option value={slot} key={slot}>
                        {slot.replace("T", "Thứ ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {locked.length > 0 && (
                <small className="prerequisite">
                  Tiên quyết:{" "}
                  {locked.map((id) => getCourse(id)?.title || id).join(", ")}
                </small>
              )}
              <div className="course-card-actions">
                <button className="text-button" onClick={() => onOpen(c)}>
                  Xem môn học
                  <ArrowRight size={14} />
                </button>
                {(!passed.has(c.id) ||
                  student.grades.some(
                    (record) =>
                      record.courseId === c.id &&
                      record.status === "passed" &&
                      record.semester < student.semester,
                  )) &&
                  c.credits > 0 && (
                    <button
                      className={`select-course ${selected.includes(c.id) ? "checked" : ""}`}
                      aria-label={`${selected.includes(c.id) ? "Bỏ chọn" : "Chọn"} ${c.title}`}
                      onClick={() =>
                        setSelected((previous) =>
                          previous.includes(c.id)
                            ? previous.filter((id) => id !== c.id)
                            : [...previous, c.id],
                        )
                      }
                    >
                      {selected.includes(c.id) ? (
                        <Check size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                    </button>
                  )}
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && (
        <div className="card empty-inline">
          <Search size={28} />
          <h3>Chưa có học phần phù hợp</h3>
          <p>Thử một từ khóa khác hoặc mở toàn chương trình.</p>
          <button
            className="secondary"
            onClick={() => {
              onSearch("");
              setFilter("all");
            }}
          >
            Xem toàn chương trình
          </button>
        </div>
      )}
      <div className="registration-bar">
        <div>
          <strong>{selected.length} học phần được chọn</strong>
          <span>
            Tổng kỳ này {credits} tín chỉ · Thông thường 12–22 tín chỉ
          </span>
        </div>
        <button
          className="primary"
          disabled={busy || (!selected.length && !enrolled.size)}
          onClick={() => void onEnroll(selected, sections).catch(() => {})}
        >
          Xác nhận đăng ký
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

function LearningScreen({
  course,
  student,
  busy,
  onClose,
  onCheckpoint,
  onExam,
  onError,
  exercises,
  onUpdated,
  onOfficeSubmit,
}: {
  course: Course;
  student: Student;
  busy: boolean;
  exercises: ProjectExercise[];
  onUpdated: () => void;
  onOfficeSubmit: (artifact: OfficeArtifact) => Promise<any>;
  onClose: () => void;
  onCheckpoint: (id: string, answer: string) => Promise<any>;
  onExam: (kind: "midterm" | "final") => void;
  onError: (s: string) => void;
}) {
  const ls = getLessons(course.id, student.track);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      ls.findIndex((lesson) => !student.completedLessons.includes(lesson.id)),
    ),
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const lesson = ls[index];
  useEffect(() => {
    setIndex(
      Math.max(
        0,
        ls.findIndex((lesson) => !student.completedLessons.includes(lesson.id)),
      ),
    );
  }, [course.id]);
  useEffect(() => {
    setAnswer("");
    setFeedback("");
  }, [index, course.id]);
  return (
    <>
      <button className="text-button back-link" onClick={onClose}>
        <ChevronLeft size={16} />
        Quay lại hành trình
      </button>
      <div className="learning-layout">
        <aside className="card lesson-nav">
          <div className="card-heading">
            <h2>Nội dung học</h2>
            <Badge tone="sand">Đang biên soạn</Badge>
          </div>
          {ls.map((l, i) => (
            <button
              className={i === index ? "selected" : ""}
              key={l.id}
              onClick={() => setIndex(i)}
            >
              <span>
                {student.completedLessons.includes(l.id) ? (
                  <CheckCircle2 size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <strong>{l.title}</strong>
              <ChevronRight size={14} />
            </button>
          ))}
          {course.id === "office-skills" ? (
            <div className="lesson-exams">
              <h3>Thực hành văn phòng</h3>
              <p>
                Soạn báo cáo, nhập công thức và tạo ba slide. Máy chủ kiểm chứng
                sản phẩm để ghi nhận điều kiện hoàn thành.
              </p>
            </div>
          ) : course.id.startsWith("bridge-") ? (
            <div className="lesson-exams">
              <h3>Chuyển tiếp ngôn ngữ</h3>
              <p>
                Hoàn thành các checkpoint để mở điều kiện ngôn ngữ. Mô-đun này
                không cộng tín chỉ hoặc điểm GPA.
              </p>
            </div>
          ) : course.kind === "project" ? (
            <div className="lesson-exams">
              <h3>Đánh giá sản phẩm</h3>
              <p>
                Ba mốc 20% · 30% · 50%. Xem phần bàn giao sản phẩm trong bài
                học.
              </p>
            </div>
          ) : (
            <div className="lesson-exams">
              <h3>Đánh giá học phần</h3>
              <p>
                Chuyên cần 10% · Luyện tập 30%
                <br />
                Giữa kỳ 20% · Cuối kỳ 40%
              </p>
              <button
                className="secondary full"
                onClick={() => onExam("midterm")}
              >
                <Clock3 size={16} />
                Thi giữa kỳ · từ tuần 8
              </button>
              <button
                className="secondary full"
                onClick={() => onExam("final")}
              >
                <Award size={16} />
                Thi cuối kỳ · từ tuần 16
              </button>
            </div>
          )}
        </aside>
        <section className="card lesson-article">
          {lesson ? (
            <>
              <div className="lesson-eyebrow">
                <Badge>
                  BÀI {index + 1} / {ls.length}
                </Badge>
                <span>
                  <Clock3 size={14} />
                  {lesson.estimatedMinutes} phút gợi ý
                </span>
              </div>
              <h2>{lesson.title}</h2>
              <div className="learning-objective">
                <Sprout size={19} />
                <p>
                  <strong>Sau bài này, bạn có thể</strong>
                  {lesson.objective}
                </p>
              </div>
              {lesson.sections.map((s, i) => (
                <section key={i} className="lesson-section">
                  <h3>{s.heading}</h3>
                  {s.body.split("\n").map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </section>
              ))}
              {lesson.example && (
                <section className="lesson-section">
                  <h3>Cùng xem một ví dụ</h3>
                  <div className="code-title">
                    <Code2 size={15} />
                    {lesson.example.language}
                  </div>
                  <pre>
                    <code>{lesson.example.code}</code>
                  </pre>
                  <p className="example-explanation">
                    {lesson.example.explanation}
                  </p>
                </section>
              )}
              {lesson.practice?.map((ex) => (
                <PracticePanel
                  key={ex.id}
                  exercise={ex}
                  courseId={course.id}
                  userId={student.id}
                  onError={onError}
                />
              ))}
              {lesson.checkpoint && (
                <section className="checkpoint">
                  <Badge tone="sand">DỪNG MỘT CHÚT, THỬ SỨC NÀO</Badge>
                  <h3>{lesson.checkpoint.question}</h3>
                  <div className="answer-options">
                    {lesson.checkpoint.options.map((option, i) => (
                      <label
                        key={i}
                        className={answer === String(i) ? "checked" : ""}
                      >
                        <input
                          type="radio"
                          name={`checkpoint-${lesson.id}`}
                          value={i}
                          checked={answer === String(i)}
                          onChange={() => setAnswer(String(i))}
                        />
                        <span>{String.fromCharCode(65 + i)}</span>
                        {option}
                      </label>
                    ))}
                  </div>
                  <button
                    className="primary"
                    disabled={busy || (!answer && answer !== "0")}
                    onClick={() =>
                      void onCheckpoint(lesson.id, answer).then((r) => {
                        if (r)
                          setFeedback(
                            r.feedback ||
                              r.explanation ||
                              "Đã ghi nhận tham gia bài học. Tiếp tục luyện tập để củng cố kiến thức.",
                          );
                      })
                    }
                  >
                    Kiểm tra & lưu bài học
                    <Check size={16} />
                  </button>
                  {feedback && (
                    <p role="status" className="checkpoint-feedback">
                      {feedback}
                    </p>
                  )}
                </section>
              )}
              {course.id === "office-skills" && (
                <OfficeLab
                  busy={busy}
                  onSubmit={onOfficeSubmit}
                  draftKey={student.id}
                  initialArtifact={student.office?.artifact}
                />
              )}
              {course.kind === "project" && (
                <ProjectPanel
                  courseId={course.id}
                  exercises={exercises}
                  onError={onError}
                  onUpdated={onUpdated}
                />
              )}
              <div className="lesson-sources">
                <strong>Đọc thêm từ nguồn gốc</strong>
                {lesson.sources.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    Nguồn {i + 1}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
              </div>
              <div className="lesson-pagination">
                <button
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => setIndex(index - 1)}
                >
                  <ChevronLeft size={15} />
                  Bài trước
                </button>
                <button
                  className="primary"
                  disabled={index === ls.length - 1}
                  onClick={() => setIndex(index + 1)}
                >
                  Bài tiếp theo
                  <ChevronRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <BookOpen size={32} />
              <h3>Học phần đang được biên soạn</h3>
              <p>
                Chuẩn đầu ra và vị trí trong chương trình đã có. Học liệu sẽ
                được mở sau khi đủ nội dung và kiểm chứng.
              </p>
              <ul>
                {course.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function PracticePanel({
  exercise,
  courseId,
  userId,
  onError,
}: {
  exercise: NonNullable<Lesson["practice"]>[number];
  courseId: string;
  userId: string;
  onError: (s: string) => void;
}) {
  const draftKey = `usim.code-draft.${userId}.${exercise.id}`;
  const [source, setSource] = useState(() => {
    try {
      return localStorage.getItem(draftKey) || exercise.starterCode;
    } catch {
      return exercise.starterCode;
    }
  });
  useEffect(() => {
    try {
      if (source.length <= 32000) localStorage.setItem(draftKey, source);
    } catch {
      /* storage is optional for ungraded drafts */
    }
  }, [source, draftKey]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hints, setHints] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      let data = await api("/practice", "POST", {
        courseId,
        exerciseId: exercise.id,
        language: exercise.language,
        source,
      });
      setResult(data.submission || data);
      const id = data.submission?.id || data.id;
      for (let i = 0; id && i < 90; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        data = await api(`/submissions/${id}`);
        const submission = data.submission || data;
        setResult(submission);
        if (!["queued", "running"].includes(submission.status)) break;
      }
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="practice-panel">
      <div className="card-heading">
        <h3>
          <Terminal size={19} />
          Phòng thực hành
        </h3>
        <Badge tone="blue">{exercise.language}</Badge>
      </div>
      <p>{exercise.prompt}</p>
      <label className="sr-only" htmlFor={exercise.id}>
        Mã nguồn bài thực hành
      </label>
      <textarea
        className="code-editor"
        id={exercise.id}
        spellCheck={false}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={10}
      />
      <div className="public-tests">
        {exercise.publicTests.map((test, i) => (
          <div key={i}>
            <strong>Ví dụ {i + 1}</strong>
            <span>Đầu vào</span>
            <pre>{test.input || "(rỗng)"}</pre>
            <span>Kết quả mong đợi</span>
            <pre>{test.output}</pre>
          </div>
        ))}
      </div>
      <div className="practice-actions">
        <button
          className="primary"
          onClick={() => void submit()}
          disabled={
            busy ||
            !source.trim() ||
            !["cpp", "python", "javascript", "sql"].includes(exercise.language)
          }
        >
          <Play size={15} />
          {busy ? "Đang xử lý…" : "Chạy & kiểm tra"}
        </button>
        <button className="text-button" onClick={() => setHints(!hints)}>
          <CircleHelp size={16} />
          {hints ? "Ẩn gợi ý" : "Cần một gợi ý?"}
        </button>
      </div>
      {hints && (
        <ul className="hint-list">
          {exercise.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {result && (
        <div className="execution-result" role="status">
          <strong>
            {(
              {
                queued: "Đang xếp hàng",
                running: "Đang kiểm tra",
                passed: "Đã vượt qua kiểm thử",
                failed: "Cần kiểm tra lại",
                error: "Thực thi chưa hoàn tất",
              } as Record<string, string>
            )[result.status] || result.status}
          </strong>
          <p>{result.result?.feedback}</p>
          {result.result?.output && <pre>{result.result.output}</pre>}
        </div>
      )}
      <small className="muted">
        Mã chạy trong môi trường cô lập. Chức năng thực thi cần được kết nối và
        có hạn mức tài nguyên.
      </small>
    </section>
  );
}

function Grades({
  student,
  onExamOpen,
}: {
  student: Student;
  onExamOpen: (id: string) => Promise<void>;
}) {
  const summary = getTranscriptSummary(student.grades);
  const audit = auditGraduation(student.major, student.grades);
  return (
    <>
      <div className="stat-grid three">
        <Stat
          label="Tín chỉ tích lũy"
          value={`${summary.credits}`}
          detail={`/ ${getProgram(student.major)!.credits} tín chỉ toàn khóa`}
          icon={<BookOpen />}
          tone="sage"
        />
        <Stat
          label="GPA tích lũy"
          value={summary.gradedCredits ? summary.gpa.toFixed(2) : "—"}
          detail="Miễn môn không tính GPA"
          icon={<TrendingUp />}
          tone="sand"
        />
        <Stat
          label="Học kỳ hiện tại"
          value={`${student.semester}`}
          detail="Lộ trình mẫu 8 học kỳ"
          icon={<CalendarDays />}
          tone="blue"
        />
      </div>
      <section className="card transcript">
        <div className="card-heading">
          <h2>Bảng điểm học tập</h2>
          <Badge>Máy chủ ghi nhận</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mã môn</th>
                <th>Học phần</th>
                <th>Tín chỉ</th>
                <th>Học kỳ</th>
                <th>Điểm / 10</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {summary.records.map((g: GradeRecord) => (
                <tr key={g.courseId}>
                  <td>{getCourse(g.courseId)?.code}</td>
                  <td>
                    {getCourse(g.courseId)?.title}
                    {g.reason && (
                      <small className="grade-reason">{g.reason}</small>
                    )}
                  </td>
                  <td>{getCourse(g.courseId)?.credits}</td>
                  <td>{g.semester}</td>
                  <td>{g.status === "exempt" ? "—" : g.score?.toFixed(1)}</td>
                  <td>
                    <Badge tone={g.status === "failed" ? "rose" : "green"}>
                      {g.status === "exempt"
                        ? "Miễn đầu vào"
                        : g.status === "passed"
                          ? "Đạt"
                          : "Học lại"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!summary.records.length && (
          <div className="empty-inline">
            <GraduationCap size={34} />
            <h3>Trang đầu còn đang mở</h3>
            <p>Điểm tổng kết và các môn được miễn sẽ xuất hiện ở đây.</p>
          </div>
        )}
      </section>
      {!!student.exams?.length && (
        <section className="card exam-history">
          <div className="card-heading">
            <h2>Lịch sử bài thi</h2>
            <Badge>Được lưu trên máy chủ</Badge>
          </div>
          {student.exams
            .slice(-12)
            .reverse()
            .map((attempt) => (
              <div className="exam-history-row" key={attempt.id}>
                <span>
                  <strong>{getCourse(attempt.courseId)?.title}</strong>
                  <small>
                    Học kỳ {attempt.semester ?? student.semester} ·{" "}
                    {attempt.kind === "midterm" ? "Giữa kỳ" : "Cuối kỳ"}
                  </small>
                </span>
                <Badge
                  tone={attempt.status === "grading-error" ? "rose" : "sand"}
                >
                  {attempt.status === "active"
                    ? "Đang thi"
                    : attempt.status === "grading"
                      ? "Đang chấm"
                      : attempt.status === "grading-error"
                        ? "Lỗi hệ thống chấm"
                        : attempt.status === "void"
                          ? "Đã hủy do sự cố"
                          : `${attempt.score?.toFixed(1) ?? "—"}/10`}
                </Badge>
                <button
                  className="text-button"
                  onClick={() => void onExamOpen(attempt.id)}
                >
                  Xem
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
        </section>
      )}
      <section className="card audit-card">
        <h2>Kiểm tra điều kiện tốt nghiệp</h2>
        <p>
          {audit.eligible
            ? "Bạn đã đủ điều kiện học vụ."
            : "Hành trình vẫn đang tiếp tục. Những yêu cầu còn lại:"}
        </p>
        <div className="audit-list">
          {audit.deficits.map((d: string) => (
            <span key={d}>
              <span className="small-dot" />
              {d}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
function Life({
  student,
  busy,
  onActivity,
  onMinigame,
}: {
  student: Student;
  busy: boolean;
  onActivity: (id: string) => Promise<void>;
  onMinigame: (id: "cook" | "run") => void;
}) {
  const activities = [
    {
      id: "cook",
      title: "Bữa cơm nhà trọ",
      text: "Một bữa ăn nóng, một khoảng nghỉ nhỏ. Thử minigame nấu ăn.",
      icon: Coffee,
      tag: "MINIGAME",
      tone: "peach",
    },
    {
      id: "run",
      title: "Đường tới giảng đường",
      text: "Một vòng chạy ngắn qua chướng ngại. Chơi bằng phím hoặc nút.",
      icon: Play,
      tag: "MINIGAME",
      tone: "blue",
    },
    {
      id: "rest",
      title: "Nghỉ ngơi đúng lúc",
      text: "Hồi phục năng lượng, giảm áp lực và quay lại khi sẵn sàng.",
      icon: Heart,
      tag: "CHĂM SÓC BẢN THÂN",
      tone: "sage",
    },
    {
      id: "parttime",
      title: "Ca làm thêm",
      text: "Dành một phần thời gian và năng lượng để bổ sung quỹ sinh hoạt.",
      icon: Wallet,
      tag: "TÀI CHÍNH",
      tone: "sand",
    },
    {
      id: "volunteer",
      title: "Ngày chủ nhật xanh",
      text: "Gặp bạn bè NPC và cùng làm điều có ích cho cộng đồng.",
      icon: Leaf,
      tag: "TÌNH NGUYỆN",
      tone: "sage",
    },
    {
      id: "friend",
      title: "Cà phê cùng bạn học",
      text: "Một cuộc trò chuyện nhẹ sau những giờ tập trung.",
      icon: Users,
      tag: "BẠN BÈ",
      tone: "peach",
    },
    {
      id: "scholarship",
      title: "Quỹ hỗ trợ sinh viên",
      text: "Nhận hỗ trợ khẩn cấp khi quỹ sinh hoạt còn dưới 50.000đ.",
      icon: GraduationCap,
      tag: "HỖ TRỢ",
      tone: "blue",
    },
    {
      id: "rent",
      title: "Chuyện phòng trọ",
      text: "Phí chuyển phòng 1.200.000đ. Tiền trọ 1.800.000đ mỗi bốn tuần mô phỏng.",
      icon: Home,
      tag: "CHỖ Ở",
      tone: "sand",
    },
    {
      id: "dorm",
      title: "Về ký túc xá",
      text: "Chuyển về miễn phí. Tiền ký túc xá 800.000đ mỗi bốn tuần mô phỏng.",
      icon: Home,
      tag: "CHỖ Ở",
      tone: "sage",
    },
  ];
  return (
    <>
      <div className="stat-grid three">
        <Stat
          label="Quỹ sinh hoạt"
          value={money(student.balance)}
          detail="Không liên quan tiền thật"
          icon={<Wallet />}
          tone="sand"
        />
        <Stat
          label="Năng lượng"
          value={`${student.energy}%`}
          detail="Học tập và nghỉ ngơi cân bằng"
          icon={<Heart />}
          tone="sage"
        />
        <Stat
          label="Áp lực"
          value={`${student.stress}%`}
          detail="Một cuộc trò chuyện có thể giúp"
          icon={<Leaf />}
          tone="blue"
        />
      </div>
      <div className="life-grid">
        {activities.map((a) => (
          <article className="card life-activity" key={a.id}>
            <span className={`stat-icon ${a.tone}`}>
              <a.icon />
            </span>
            <span className="tiny-label">{a.tag}</span>
            <h3>{a.title}</h3>
            <p>{a.text}</p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                a.id === "cook" || a.id === "run"
                  ? onMinigame(a.id)
                  : void onActivity(a.id)
              }
            >
              {a.tag === "MINIGAME" ? "Chơi một chút" : "Thực hiện"}
              <ArrowRight size={15} />
            </button>
            {a.tag === "MINIGAME" && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void onActivity(a.id)}
              >
                Thực hiện nhanh, bỏ qua trò chơi
              </button>
            )}
          </article>
        ))}
      </div>
      <section className="card ledger">
        <div className="card-heading">
          <h2>Sổ thu chi</h2>
          <Badge>Tiền mô phỏng</Badge>
        </div>
        {student.ledger
          .slice(-10)
          .reverse()
          .map((item) => (
            <div className="ledger-row" key={item.id}>
              <span
                className={`ledger-icon ${item.amount > 0 ? "positive" : ""}`}
              >
                {item.amount > 0 ? (
                  <ArrowDownLeft size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
              <span>
                <strong>{ledgerTitle(item.activityId)}</strong>
                <small>{new Date(item.at).toLocaleString("vi-VN")}</small>
              </span>
              <strong className={item.amount > 0 ? "positive-text" : ""}>
                {item.amount > 0 ? "+" : ""}
                {money(item.amount)}
              </strong>
            </div>
          ))}
        {!student.ledger.length && (
          <p className="empty-message">
            Các khoản thu chi sẽ xuất hiện sau hoạt động đầu tiên.
          </p>
        )}
      </section>
    </>
  );
}
function Achievements({
  student,
  busy,
  onIssue,
  onShare,
}: {
  student: Student;
  busy: boolean;
  onIssue: () => Promise<void>;
  onShare: (code: string, enabled: boolean) => Promise<void>;
}) {
  const audit = auditGraduation(student.major, student.grades);
  return (
    <>
      <div className="achievement-hero">
        <Award size={42} />
        <div>
          <span className="eyebrow">THÀNH TÍCH CỦA BẠN</span>
          <h2>Mỗi điều học được đều đáng ghi nhận.</h2>
          <p>Chứng nhận ảo thể hiện kết quả trong University Simulator.</p>
        </div>
        <button
          className="primary"
          disabled={busy || !audit.eligible}
          onClick={() => void onIssue()}
        >
          Kiểm tra & cấp bằng
          <ArrowRight size={16} />
        </button>
      </div>
      {student.credentials.length ? (
        <div className="credential-grid">
          {student.credentials.map((c) => (
            <article className="card certificate" key={c.code}>
              <GraduationCap size={38} />
              <span>UNIVERSITY SIMULATOR</span>
              <h2>
                {c.type === "graduation"
                  ? "Bằng tốt nghiệp ảo"
                  : "Chứng nhận kỹ năng văn phòng"}
              </h2>
              <p>Ghi nhận hành trình học tập của</p>
              <h3>{student.displayName}</h3>
              <p>{getProgram(student.major)?.title}</p>
              <code>{c.code}</code>
              <small>{new Date(c.issuedAt).toLocaleDateString("vi-VN")}</small>
              <button
                className="secondary"
                onClick={() => void onShare(c.code, !c.public)}
                disabled={busy}
              >
                {c.public
                  ? "Tắt chia sẻ công khai"
                  : "Bật mã tra cứu công khai"}
              </button>
              <p className="small muted">
                Chứng nhận mô phỏng trong game, không phải văn bằng của một cơ
                sở giáo dục.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <section className="card empty-inline">
          <Award size={44} />
          <h3>Thành tích đang chờ bạn phía trước</h3>
          <p>
            Hoàn thành chương trình, đồ án và các điều kiện bổ trợ để nhận bằng
            ảo.
          </p>
          <Badge tone="sand">
            {audit.credits} / {audit.requiredCredits} tín chỉ
          </Badge>
        </section>
      )}
    </>
  );
}

function normalizeExam(raw: any): Exam {
  return {
    ...raw,
    questions: raw.questions || [],
    answers: raw.answers || {},
  };
}
function ExamDialog({
  exam: initial,
  onClose,
  onError,
  confirmAction,
}: {
  exam: Exam;
  onClose: () => void;
  onError: (s: string) => void;
  confirmAction: (message: string) => Promise<boolean>;
}) {
  const [exam, setExam] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [remaining, setRemaining] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        (Date.parse(initial.deadlineAt) -
          (initial.serverTime ? Date.parse(initial.serverTime) : Date.now())) /
          1000,
      ),
    ),
  );
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const sending = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const serverOffset = useRef(
    initial.serverTime ? Date.parse(initial.serverTime) - Date.now() : 0,
  );
  type SaveResponse = {
    exam: Exam;
    savedAt?: string;
    serverTime?: string;
    expired?: boolean;
  };
  const coordinator = useRef<AnswerAutosave | null>(null);
  if (!coordinator.current)
    coordinator.current = createAnswerAutosave(
      initial.answers,
      (snapshot) =>
        api<SaveResponse>(`/exams/${initial.id}/answers`, "PUT", {
          answers: snapshot,
        }),
      {
        onAcknowledged: (response) => {
          setSavedAt(response.exam?.savedAt || response.savedAt);
          if (response.serverTime)
            serverOffset.current = Date.parse(response.serverTime) - Date.now();
          if (response.expired) {
            setExam(normalizeExam(response.exam));
            setAnswers(coordinator.current!.snapshot());
          }
          setDirty(coordinator.current!.isDirty());
        },
      },
    );
  const autosave = coordinator.current;
  function changeAnswer(id: string, value: string) {
    const next = { ...answersRef.current, [id]: value };
    autosave.update(next);
    answersRef.current = next;
    setAnswers(next);
    setDirty(autosave.isDirty());
  }
  async function save() {
    await autosave.flush();
    setDirty(autosave.isDirty());
  }
  async function submit(automatic = false) {
    if (sending.current || exam.status !== "active") return;
    if (!automatic && !(await confirmAction("Nộp bài và kết thúc lượt thi?")))
      return;
    sending.current = true;
    setPending(true);
    try {
      if (!automatic) await save();
      const r = await api(`/exams/${exam.id}/submit`, "POST", {
        idempotencyKey: `exam-submit-${exam.id}`,
      });
      setExam(normalizeExam(r.exam || r));
    } catch (error) {
      onError((error as Error).message);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  useEffect(() => {
    if (exam.status !== "active") {
      setRemaining(0);
      return;
    }
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil(
          (Date.parse(exam.deadlineAt) - (Date.now() + serverOffset.current)) /
            1000,
        ),
      );
      setRemaining(left);
      if (left === 0 && exam.status === "active") void submit(true);
    }, 1000);
    return () => clearInterval(id);
  }, [exam.status]);
  useEffect(() => {
    if (!dirty || exam.status !== "active") return;
    const id = setTimeout(
      () => void save().catch((e) => onError(e.message)),
      1200,
    );
    return () => clearTimeout(id);
  }, [answers, dirty]);
  useEffect(() => {
    if (!["grading", "grading-error"].includes(exam.status)) return;
    let stopped = false;
    const timer = setInterval(() => {
      void api(`/exams/${exam.id}`)
        .then((response) => {
          if (!stopped) setExam(normalizeExam(response.exam));
        })
        .catch((error) => {
          if (!stopped) onError(error.message);
        });
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [exam.id, exam.status]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (exam.status === "active" && dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exam.status, dirty]);
  return (
    <Dialog
      title={`${exam.kind === "midterm" ? "Giữa kỳ" : "Cuối kỳ"} · ${getCourse(exam.courseId)?.title || ""}`}
      onClose={() => {
        if (exam.status !== "active") onClose();
        else
          void confirmAction(
            "Đồng hồ thi vẫn chạy khi đóng màn hình. Tiếp tục đóng?",
          ).then((confirmed) => {
            if (confirmed) onClose();
          });
      }}
      wide
    >
      <div className="exam-top">
        <Badge tone="sand">
          {exam.developmentSample ? "Lượt thi mẫu phát triển" : "Lượt thi"}
        </Badge>
        <strong className={remaining < 120 ? "danger-text" : ""}>
          <Clock3 size={18} />
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </strong>
      </div>
      {exam.status === "active" ? (
        <>
          <p className="muted small">
            Không có gợi ý trong lượt thi. Đồng hồ dựa trên máy chủ và tiếp tục
            khi bạn mất kết nối.
          </p>
          {exam.questions.map((q, index) => (
            <section className="exam-question" key={q.id}>
              <h3>
                {index + 1}. {q.prompt}
              </h3>
              {q.kind === "code" ? (
                <div className="exam-code-question">
                  <Badge tone="blue">{q.language}</Badge>
                  <label htmlFor={`exam-code-${q.id}`}>Mã nguồn bài thi</label>
                  <textarea
                    id={`exam-code-${q.id}`}
                    className="code-editor"
                    spellCheck={false}
                    rows={15}
                    maxLength={20000}
                    disabled={pending}
                    value={answers[q.id] ?? q.starterCode ?? ""}
                    onChange={(event) => changeAnswer(q.id, event.target.value)}
                  />
                  <p className="small muted">
                    Mã được tự lưu cùng bài thi và kiểm chứng sau khi nộp. Không
                    có gợi ý hoặc đáp án kiểm thử trong lượt thi.
                  </p>
                </div>
              ) : (
                <div className="answer-options">
                  {q.options.map((o) => (
                    <label
                      key={o.id}
                      className={answers[q.id] === o.id ? "checked" : ""}
                    >
                      <input
                        type="radio"
                        disabled={pending}
                        name={q.id}
                        checked={answers[q.id] === o.id}
                        onChange={() => {
                          changeAnswer(q.id, o.id);
                        }}
                      />
                      {o.text}
                    </label>
                  ))}
                </div>
              )}
            </section>
          ))}
          <div className="exam-bottom">
            <span>
              {dirty
                ? "Có thay đổi chưa được xác nhận lưu"
                : savedAt
                  ? `Đã lưu lúc ${new Date(savedAt).toLocaleTimeString("vi-VN")}`
                  : "Chưa có câu trả lời được lưu"}
            </span>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void submit()}
            >
              Nộp bài
              <Check size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="empty-inline">
          <CheckCircle2 size={44} />
          <h2>
            {exam.status === "grading-error"
              ? "Bài đã lưu, cần xử lý sự cố chấm"
              : exam.status === "grading"
                ? "Đã nhận bài, đang kiểm chứng mã"
                : "Đã ghi nhận bài thi"}
          </h2>
          <strong className="exam-score">
            {exam.score?.toFixed(1) ?? "Đang chấm"}
            <small>/ 10</small>
          </strong>
          <p>
            {exam.status === "grading-error"
              ? "Mã nguồn và thời điểm nhận bài được giữ nguyên. Lỗi hệ thống không được tính thành điểm trượt."
              : "Kết quả được lưu trên máy chủ."}
          </p>
          {exam.codeResult && (
            <p className="small muted">
              {exam.codeResult.feedback} · {exam.codeResult.passed}/
              {exam.codeResult.total} kiểm thử đạt
            </p>
          )}
          <button className="primary" onClick={onClose}>
            Về hành trình học
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </Dialog>
  );
}
function Placement({
  questions: raw,
  onClose,
  busy,
  onSubmit,
}: {
  questions: any[];
  onClose: () => void;
  busy: boolean;
  onSubmit: (a: Record<string, string>) => Promise<any>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions: PublicQuestion[] = raw.flatMap((q) => q.questions || [q]);
  return (
    <Dialog title="Xếp lớp tiếng Anh đầu vào" onClose={onClose} wide>
      <div className="placement-intro">
        <GraduationCap size={28} />
        <p>
          Kiểm tra theo từng mức để được miễn Tiếng Anh 1, 2 hoặc cả 3. Tiếng
          Anh chuyên ngành vẫn bắt buộc học. Môn được miễn tính tín chỉ, không
          tính GPA.
        </p>
      </div>
      {questions.length ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(answers);
          }}
        >
          {questions.map((q, i) => (
            <section className="exam-question" key={q.id}>
              <h3>
                {i + 1}. {q.prompt}
              </h3>
              <div className="answer-options">
                {q.options.map((o) => (
                  <label
                    key={o.id}
                    className={answers[q.id] === o.id ? "checked" : ""}
                  >
                    <input
                      required
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={answers[q.id] === o.id}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [q.id]: o.id }))
                      }
                    />
                    {o.text}
                  </label>
                ))}
              </div>
            </section>
          ))}
          <button className="primary" disabled={busy}>
            Nộp bài xếp lớp
            <Check size={16} />
          </button>
        </form>
      ) : (
        <div className="empty-inline">
          <BookOpen size={30} />
          <h3>Bài xếp lớp chưa được cấu hình</h3>
          <p>
            Ngân hàng đánh giá cần được nạp trên máy chủ. Bạn vẫn có thể khám
            phá chương trình.
          </p>
          <button className="primary" onClick={onClose}>
            Xem hành trình
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </Dialog>
  );
}

function Minigame({
  kind,
  onClose,
  onComplete,
}: {
  kind: "cook" | "run";
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [lane, setLane] = useState(1);
  const [obstacle, setObstacle] = useState(0);
  const [ticks, setTicks] = useState(0);
  const laneRef = useRef(lane);
  laneRef.current = lane;
  const recipe = ["Vo gạo", "Thêm nước", "Bật nồi", "Dọn bữa"];
  const shuffled = ["Thêm nước", "Dọn bữa", "Vo gạo", "Bật nồi"];
  const done = kind === "cook" ? step === 4 : ticks >= 15 && !failed;
  useEffect(() => {
    if (kind !== "run" || !started || failed || done) return;
    const id = setInterval(() => {
      setTicks((t) => t + 1);
      setObstacle((previous) => {
        if (laneRef.current === previous) setFailed(true);
        return Math.floor(Math.random() * 3);
      });
    }, 850);
    return () => clearInterval(id);
  }, [kind, started, failed, done]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (kind !== "run") return;
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setLane((l) =>
          Math.max(0, Math.min(2, l + (e.key === "ArrowLeft" ? -1 : 1))),
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [kind]);
  return (
    <Dialog
      title={kind === "cook" ? "Bữa cơm nhà trọ" : "Đường tới giảng đường"}
      onClose={onClose}
    >
      <div className="minigame">
        {kind === "cook" ? (
          <>
            <div className="cooking-pot">
              <Coffee size={78} strokeWidth={1.3} />
            </div>
            <h3>
              {done
                ? "Cơm chín rồi, ăn thôi!"
                : `Bước ${step + 1}: ${recipe[step]}`}
            </h3>
            <p>Chọn đúng trình tự để chuẩn bị một bữa cơm đơn giản.</p>
            <div className="recipe-progress">
              {recipe.map((r, i) => (
                <span key={r} className={step > i ? "done" : ""}>
                  {step > i ? <Check size={14} /> : i + 1}
                </span>
              ))}
            </div>
            {!done && (
              <div className="recipe-buttons">
                {shuffled.map((r) => (
                  <button
                    className="secondary"
                    key={r}
                    onClick={() => {
                      if (r === recipe[step]) {
                        setStep(step + 1);
                        setFailed(false);
                      } else setFailed(true);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            {failed && (
              <p className="error-message">
                Thử lại nhé, hãy làm theo bước đang hiển thị.
              </p>
            )}
          </>
        ) : (
          <>
            <p>
              Chuyển làn tránh chướng ngại. Nhìn làn được đánh dấu và chuyển
              sang làn trống trước nhịp tiếp theo.
            </p>
            <div className="running-track">
              {[0, 1, 2].map((l) => (
                <div className="running-lane" key={l}>
                  {started && l === obstacle && !done && (
                    <span className="obstacle">!</span>
                  )}
                  {l === lane && <Avatar name="Nhân vật" />}
                </div>
              ))}
            </div>
            <div className="button-row center">
              <button
                className="secondary"
                onClick={() => setLane((l) => Math.max(0, l - 1))}
                aria-label="Sang làn trái"
              >
                <ChevronLeft />
              </button>
              <strong>{Math.min(ticks, 15)} / 15</strong>
              <button
                className="secondary"
                onClick={() => setLane((l) => Math.min(2, l + 1))}
                aria-label="Sang làn phải"
              >
                <ChevronRight />
              </button>
            </div>
            {!started && (
              <button
                className="primary"
                onClick={() => {
                  setStarted(true);
                  setObstacle((lane + 1) % 3);
                }}
              >
                Bắt đầu chạy
                <Play size={15} />
              </button>
            )}
            {failed && (
              <>
                <p className="error-message">
                  Vấp một chút thôi. Bạn có thể thử lại.
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setFailed(false);
                    setTicks(0);
                    setObstacle((lane + 1) % 3);
                  }}
                >
                  Chạy lại
                </button>
              </>
            )}
          </>
        )}
        {done && (
          <button className="primary" onClick={() => void onComplete()}>
            Hoàn thành hoạt động
            <Check size={16} />
          </button>
        )}
        <button
          className="text-button skip-game"
          onClick={() => void onComplete()}
        >
          Thực hiện nhanh, bỏ qua minigame
          <ArrowRight size={14} />
        </button>
        <p className="small muted">
          Phần thưởng cố định do máy chủ tính; điểm minigame không chuyển thành
          điểm học.
        </p>
      </div>
    </Dialog>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && ref.current?.contains(document.activeElement))
        closeRef.current();
      if (e.key === "Tab") {
        const focusables = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, textarea, select, a[href], [tabindex="0"]',
        );
        if (!focusables?.length) return;
        const first = focusables[0],
          last = focusables[focusables.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="dialog-backdrop">
      <div
        className={`dialog ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Đóng cửa sổ"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
