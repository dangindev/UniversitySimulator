import { useEffect, useState } from "react";
import { BookOpenCheck, FlaskConical, PencilLine } from "lucide-react";
import type { Lesson } from "@university-simulator/content";

export function LessonTrace({
  trace,
}: {
  trace: NonNullable<Lesson["trace"]>;
}) {
  const [visible, setVisible] = useState(1);
  return (
    <section className="lesson-section trace-lab">
      <h3>
        <FlaskConical size={18} />
        {trace.title}
      </h3>
      <p>Dự đoán hàng tiếp theo trước khi mở thêm một bước.</p>
      <div className="trace-table-wrap">
        <table>
          <caption className="sr-only">{trace.title}</caption>
          <thead>
            <tr>
              {trace.columns.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trace.rows.slice(0, visible).map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="trace-actions">
        <span>
          {Math.min(visible, trace.rows.length)} / {trace.rows.length} bước
        </span>
        <button
          className="secondary"
          disabled={visible >= trace.rows.length}
          onClick={() => setVisible((value) => value + 1)}
        >
          Mở bước tiếp theo
        </button>
        <button className="text-button" onClick={() => setVisible(1)}>
          Bắt đầu lại
        </button>
      </div>
      {visible >= trace.rows.length && (
        <p className="trace-explanation" role="status">
          {trace.explanation}
        </p>
      )}
    </section>
  );
}

export function LessonMistakes({
  mistakes,
}: {
  mistakes: NonNullable<Lesson["commonMistakes"]>;
}) {
  return (
    <section className="lesson-section common-mistakes">
      <h3>
        <BookOpenCheck size={18} />
        Nhận diện lỗi thường gặp
      </h3>
      {mistakes.map((item) => (
        <details key={item.mistake}>
          <summary>{item.mistake}</summary>
          <p>
            <strong>Vì sao sai: </strong>
            {item.why}
          </p>
          <p>
            <strong>Cách sửa: </strong>
            {item.fix}
          </p>
        </details>
      ))}
    </section>
  );
}

export function LessonReflection({
  reflection,
  draftKey,
}: {
  reflection: NonNullable<Lesson["reflection"]>;
  draftKey: string;
}) {
  const storageKey = `usim.reflection.${draftKey}`;
  const [answer, setAnswer] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  const [sample, setSample] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, answer);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [storageKey, answer]);
  return (
    <section className="lesson-section reflection-lab">
      <h3>
        <PencilLine size={18} />
        Giải thích bằng lời của bạn
      </h3>
      <label htmlFor={storageKey}>{reflection.prompt}</label>
      <textarea
        id={storageKey}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={6000}
        rows={4}
        placeholder="Nêu cách nghĩ, rồi dùng một ví dụ để kiểm tra…"
      />
      <small>
        {saved
          ? "Ghi chú đã lưu trên trình duyệt này."
          : "Chưa lưu được ghi chú; hãy sao chép trước khi rời trang."}{" "}
        Phần giải thích không được tự động chấm điểm.
      </small>
      <fieldset>
        <legend>Tự đối chiếu</legend>
        {reflection.criteria.map((criterion) => (
          <label key={criterion}>
            <input
              type="checkbox"
              checked={checks.includes(criterion)}
              onChange={(event) =>
                setChecks((previous) =>
                  event.target.checked
                    ? [...previous, criterion]
                    : previous.filter((item) => item !== criterion),
                )
              }
            />
            {criterion}
          </label>
        ))}
      </fieldset>
      {reflection.sampleAnswer && (
        <>
          <button
            className="text-button"
            onClick={() => setSample((value) => !value)}
          >
            {sample ? "Ẩn bài đối chiếu" : "Xem một cách giải thích mẫu"}
          </button>
          {sample && (
            <p className="reflection-sample">{reflection.sampleAnswer}</p>
          )}
        </>
      )}
    </section>
  );
}
