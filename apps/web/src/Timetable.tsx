import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";
import type { Course } from "@university-simulator/core";

interface Props {
  student: {
    semester: number;
    week: number;
    enrollments: { courseId: string; semester: number; section: string }[];
  };
  activeCourses: Course[];
  busy: boolean;
  onOpen: (course: Course) => void;
  onAdvance: (unit: string) => Promise<void>;
}
export default function Timetable({
  student,
  activeCourses,
  busy,
  onOpen,
  onAdvance,
}: Props) {
  const times = ["08:00", "10:00", "13:00", "15:00", "17:00"];
  return (
    <>
      <div className="card calendar-header">
        <div>
          <h2>
            Tuần {student.week} · Học kỳ {student.semester}
          </h2>
          <p>
            Lịch lớp từ các ca học bạn đã đăng ký. Thời gian mô phỏng chỉ tiến
            khi bạn lựa chọn.
          </p>
        </div>
        <div className="button-row">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void onAdvance("day")}
          >
            Ngày tiếp
            <ChevronRight size={15} />
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void onAdvance("week")}
          >
            Tuần tiếp
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="card calendar-grid">
        <div className="calendar-days">
          {["Ca học", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu"].map(
            (day) => (
              <strong key={day}>{day}</strong>
            ),
          )}
        </div>
        {times.map((time) => (
          <div className="calendar-week-row" key={time}>
            <span>
              <Clock3 size={12} /> {time}
            </span>
            {[2, 3, 4, 5, 6].map((day) => {
              const enrollment = student.enrollments.find(
                (record) =>
                  record.semester === student.semester &&
                  record.section === `T${day} ${time}`,
              );
              const course = activeCourses.find(
                (record) => record.id === enrollment?.courseId,
              );
              return (
                <div key={day}>
                  {course && (
                    <button
                      onClick={() => onOpen(course)}
                      className={`calendar-class tone-${(day - 2) % 4}`}
                    >
                      <small>
                        {course.code} · {course.credits} tín chỉ
                      </small>
                      <strong>{course.title}</strong>
                      <span>{enrollment?.section}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!activeCourses.length && (
        <p className="empty-message">
          Chưa có lớp. Đăng ký tín chỉ để tạo thời khóa biểu.
        </p>
      )}
      <div className="card term-info">
        <div>
          <h3>Cột mốc học kỳ</h3>
          <p>
            Giữa kỳ từ tuần 8 · Cuối kỳ từ tuần 16. Khi đủ điều kiện, bạn chủ
            động chọn lúc bắt đầu thi.
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void onAdvance("semester")}
        >
          Kết thúc học kỳ
          <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
}
