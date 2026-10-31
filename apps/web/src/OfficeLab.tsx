import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileText, ListChecks, Presentation, Send, Table2 } from 'lucide-react';
import { assessOfficeArtifact, evaluateSpreadsheet, officeLimits, officeTask, type OfficeArtifact } from '@university-simulator/core';
import './OfficeLab.css';

type OfficeResult = Pick<ReturnType<typeof assessOfficeArtifact>, 'score' | 'passed' | 'criteria'>;
type OfficeTab = 'document' | 'sheet' | 'slides';
export interface OfficeLabProps {
  onSubmit: (artifact: OfficeArtifact) => Promise<OfficeResult | undefined>;
  busy: boolean;
  draftKey?: string;
  initialArtifact?: OfficeArtifact;
}

const tabs = [
  { id: 'document', label: 'Văn bản', icon: FileText },
  { id: 'sheet', label: 'Bảng tính', icon: Table2 },
  { id: 'slides', label: 'Trình chiếu', icon: Presentation },
] as const;
const columns = ['A', 'B', 'C', 'D'];
const rows = [1, 2, 3, 4];
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
const maximumStoredDraftLength = 100_000;

function blankArtifact(): OfficeArtifact {
  const initial = structuredClone(officeTask.template);
  initial.document.sections = initial.document.sections.map(() => ({ heading: '', body: '' }));
  initial.slides = initial.slides.map(() => ({ title: '', bullets: ['', ''] }));
  return initial;
}

/** Validate limits and retain only known data fields; draft storage never contains scores. */
function validatedArtifact(value: unknown): OfficeArtifact {
  assessOfficeArtifact(value);
  const artifact = value as OfficeArtifact;
  if (artifact.document.sections.length < 2 || artifact.slides.length !== 3) throw new RangeError('Bản nháp cần ít nhất hai mục và đúng ba slide để mở trong phòng thực hành này.');
  return {
    document: { title: artifact.document.title, sections: artifact.document.sections.map(section => ({ heading: section.heading, body: section.body })) },
    sheet: { cells: Object.fromEntries(Object.entries(artifact.sheet.cells).map(([address, text]) => [address.toUpperCase(), text])) },
    slides: artifact.slides.map(slide => ({ title: slide.title, bullets: [...slide.bullets] })),
  };
}

function initialDraft(storageKey: string | undefined, serverArtifact: OfficeArtifact | undefined) {
  if (storageKey && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        if (raw.length > maximumStoredDraftLength) throw new RangeError('Draft exceeds its limit');
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RangeError('Invalid draft');
        const saved = parsed as Record<string, unknown>;
        if (saved.version !== officeTask.version) throw new RangeError('Unsupported draft version');
        const artifact = validatedArtifact(saved.artifact);
        const savedAt = typeof saved.savedAt === 'string' && Number.isFinite(Date.parse(saved.savedAt)) ? saved.savedAt : undefined;
        return { artifact, restored: true, note: 'Đã khôi phục bản nháp lưu trên thiết bị này.', savedAt };
      }
    } catch {
      return { artifact: blankArtifact(), restored: false, note: 'Không đọc được bản nháp hợp lệ trên thiết bị này. Đã mở bản trống; kết quả đã gửi trước đó không bị thay đổi.', savedAt: undefined };
    }
  }
  if (serverArtifact) {
    try { return { artifact: validatedArtifact(serverArtifact), restored: false, note: 'Đã nạp sản phẩm gửi gần nhất để bạn tiếp tục chỉnh sửa.', savedAt: undefined }; }
    catch { /* An invalid server seed must not enter the editors. */ }
  }
  return { artifact: blankArtifact(), restored: false, note: storageKey ? 'Bản nháp mới sẽ được lưu trên thiết bị này.' : '', savedAt: undefined };
}

function storeDraft(storageKey: string, artifact: OfficeArtifact): string {
  const savedAt = new Date().toISOString();
  const raw = JSON.stringify({ version: officeTask.version, savedAt, artifact: validatedArtifact(artifact) });
  if (raw.length > maximumStoredDraftLength) throw new RangeError('Bản nháp vượt giới hạn lưu trên thiết bị.');
  window.localStorage.setItem(storageKey, raw);
  return savedAt;
}

function DocumentBody({ body }: { body: string }) {
  if (!body.trim()) return <p className="office-empty">Nội dung bạn viết sẽ xuất hiện ở đây.</p>;
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  function flush() {
    if (bullets.length) {
      blocks.push(<ul key={`list-${blocks.length}`}>{bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>);
      bullets = [];
    }
  }
  body.split('\n').forEach(line => {
    if (line.trimStart().startsWith('- ')) bullets.push(line.trimStart().slice(2));
    else { flush(); if (line.trim()) blocks.push(<p key={`paragraph-${blocks.length}`}>{line}</p>); }
  });
  flush();
  return <>{blocks}</>;
}

function Assessment({ result, official }: { result: OfficeResult; official: boolean }) {
  return <section className={`office-result ${official ? 'office-server-result' : ''}`} aria-live="polite" aria-atomic="true">
    <h3><ListChecks size={18} aria-hidden="true" />{official ? 'Kết quả đã ghi nhận' : 'Kiểm tra bản nháp'} · {number.format(result.score)}/10</h3>
    <p>{official
      ? result.passed ? 'Bài thực hành đã đạt các tiêu chí bắt buộc. Kết quả của bài gửi đã được hệ thống xác nhận.' : 'Bài thực hành chưa đủ các tiêu chí bắt buộc. Bạn có thể chỉnh sửa rồi gửi lại.'
      : 'Phản hồi luyện tập trên thiết bị này, chưa ghi điểm hoặc cấp chứng nhận. Gửi bài để ghi nhận kết quả.'}</p>
    <ul className="office-criteria">{result.criteria.map(criterion => <li key={criterion.id} className={criterion.passed ? 'office-criterion-passed' : 'office-criterion-failed'}>
      {criterion.passed ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
      <span><span className="sr-only">{criterion.passed ? 'Đạt: ' : 'Chưa đạt: '}</span><strong>{criterion.label}</strong>{criterion.required && ' · bắt buộc'}<br />{criterion.feedback}</span>
    </li>)}</ul>
  </section>;
}

export default function OfficeLab(props: OfficeLabProps) {
  // A different student gets a fresh editor instance and cannot inherit another account's draft.
  return <OfficeLabSession key={`office:${props.draftKey ?? 'unsaved'}`} {...props} />;
}

function OfficeLabSession({ onSubmit, busy, draftKey, initialArtifact }: OfficeLabProps) {
  const storageKey = draftKey && draftKey.length <= 200 ? `university-simulator:office-draft:${encodeURIComponent(draftKey)}` : undefined;
  const [restoredDraft] = useState(() => initialDraft(storageKey, initialArtifact));
  const [artifact, setArtifact] = useState<OfficeArtifact>(() => restoredDraft.artifact);
  const [draftNotice, setDraftNotice] = useState(restoredDraft.note);
  const [draftSavedAt, setDraftSavedAt] = useState<string | undefined>(restoredDraft.savedAt);
  const [tab, setTab] = useState<OfficeTab>('document');
  const [selfCheck, setSelfCheck] = useState<OfficeResult>();
  const [serverResult, setServerResult] = useState<OfficeResult>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const latestArtifact = useRef(artifact);
  latestArtifact.current = artifact;
  const edited = useRef(false);
  const lastStored = useRef(restoredDraft.restored ? JSON.stringify(restoredDraft.artifact) : '');
  const evaluated = useMemo(() => {
    try { return evaluateSpreadsheet(artifact.sheet.cells); }
    catch (failure) { return { values: {}, errors: { D4: failure instanceof Error ? failure.message : 'Chưa tính được bảng dữ liệu.' } }; }
  }, [artifact.sheet.cells]);
  const locked = busy || submitting;

  useEffect(() => {
    if (!storageKey) return;
    const serialized = JSON.stringify(artifact);
    if (serialized === lastStored.current) return;
    setDraftNotice('Đang lưu bản nháp trên thiết bị này…');
    const timer = window.setTimeout(() => {
      try {
        const savedAt = storeDraft(storageKey, artifact);
        lastStored.current = serialized;
        setDraftSavedAt(savedAt);
        setDraftNotice('Bản nháp đã được lưu trên thiết bị này.');
      } catch {
        setDraftNotice('Chưa lưu được bản nháp trên thiết bị. Giữ màn hình mở và kiểm tra giới hạn nội dung hoặc gửi bài để lưu sản phẩm.');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [artifact, storageKey]);

  useEffect(() => {
    function flushDraft() {
      // Flush on navigation/page exit so the 500 ms debounce cannot discard the last edit.
      if (!storageKey || !edited.current) return;
      try {
        const serialized = JSON.stringify(latestArtifact.current);
        if (serialized !== lastStored.current) { storeDraft(storageKey, latestArtifact.current); lastStored.current = serialized; }
      } catch { /* Keep the last valid saved draft; never affect submitted work or grades. */ }
    }
    window.addEventListener('pagehide', flushDraft);
    return () => { window.removeEventListener('pagehide', flushDraft); flushDraft(); };
  }, [storageKey]);

  function edit(update: (current: OfficeArtifact) => OfficeArtifact) {
    edited.current = true;
    setArtifact(update);
    setSelfCheck(undefined);
    setServerResult(undefined);
    setError('');
  }
  function changeSection(index: number, field: 'heading' | 'body', value: string) {
    edit(current => ({ ...current, document: { ...current.document, sections: current.document.sections.map((section, at) => at === index ? { ...section, [field]: value } : section) } }));
  }
  function changeSlide(index: number, field: 'title' | 'bullets', value: string) {
    edit(current => ({ ...current, slides: current.slides.map((slide, at) => at === index ? { ...slide, [field]: field === 'bullets' ? value.split('\n') : value } : slide) }));
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next]!.id);
    tabRefs.current[next]?.focus();
  }
  function submissionArtifact(): OfficeArtifact {
    const snapshot = structuredClone(artifact);
    snapshot.slides = snapshot.slides.map(slide => ({ ...slide, bullets: slide.bullets.map(bullet => bullet.trim()).filter(Boolean) }));
    return snapshot;
  }
  function checkDraft() {
    setServerResult(undefined);
    setError('');
    try { setSelfCheck(assessOfficeArtifact(submissionArtifact())); }
    catch (failure) { setSelfCheck(undefined); setError(failure instanceof Error ? failure.message : 'Bản nháp có dữ liệu chưa hợp lệ.'); }
  }
  async function submit() {
    if (locked) return;
    setSubmitting(true);
    setError('');
    setServerResult(undefined);
    try {
      const result = await onSubmit(submissionArtifact());
      if (result) setServerResult(result);
      else setError('Chưa nhận được kết quả xác nhận. Bản đang chỉnh sửa vẫn được giữ; hãy kiểm tra kết nối và thử lại.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Chưa thể gửi bài. Nội dung đang chỉnh sửa vẫn được giữ.');
    } finally { setSubmitting(false); }
  }

  return <section className="office-lab" aria-labelledby="office-lab-heading">
    <header className="office-header">
      <span className="office-header-icon"><FileText size={23} aria-hidden="true" /></span>
      <div><span className="office-kicker">PHÒNG THỰC HÀNH</span><h2 id="office-lab-heading">Tin học văn phòng</h2><p>{officeTask.description} Soạn báo cáo, tính ngân sách bằng công thức và trình bày kết quả. Gửi bài khi hoàn tất để ghi nhận kết quả.</p></div>
    </header>
    <div className="office-tabs" role="tablist" aria-label="Các phần bài thực hành văn phòng">{tabs.map((item, index) => <button
      key={item.id} ref={element => { tabRefs.current[index] = element; }}
      id={`office-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`office-panel-${item.id}`}
      tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => tabKey(event, index)}>
      <item.icon size={17} aria-hidden="true" />{item.label}
    </button>)}</div>

    <div className="office-panel" id={`office-panel-${tab}`} role="tabpanel" aria-labelledby={`office-tab-${tab}`}>
      {tab === 'document' && <>
        <div className="office-task"><strong><ListChecks size={16} aria-hidden="true" />Bài 1 · Báo cáo có cấu trúc</strong><p>Đặt tiêu đề có cụm “Báo cáo ngân sách”. Viết hai mục có tiêu đề khác nhau, mỗi mục ít nhất 40 ký tự nội dung. Có ít nhất hai dòng danh sách bắt đầu bằng “- ”. Nêu phương pháp tính và kết quả từ bảng tính của bạn.</p></div>
        <div className="office-workspace">
          <fieldset className="office-fieldset office-editor" disabled={locked} aria-label="Soạn báo cáo">
            <label className="office-field" htmlFor="office-document-title">Tiêu đề báo cáo<input id="office-document-title" value={artifact.document.title} maxLength={160} placeholder="Nhập tiêu đề của bạn" onChange={event => edit(current => ({ ...current, document: { ...current.document, title: event.target.value } }))} /></label>
            {artifact.document.sections.map((section, index) => <div className="office-section-editor" key={index}>
              <strong>Mục {index + 1}</strong>
              <label className="office-field" htmlFor={`office-section-heading-${index}`}>Tiêu đề mục<input id={`office-section-heading-${index}`} value={section.heading} maxLength={120} placeholder="Tên mục" onChange={event => changeSection(index, 'heading', event.target.value)} /></label>
              <label className="office-field" htmlFor={`office-section-body-${index}`}>Nội dung<textarea id={`office-section-body-${index}`} value={section.body} maxLength={8000} placeholder="Viết nội dung; dùng - ở đầu dòng cho danh sách" onChange={event => changeSection(index, 'body', event.target.value)} /></label>
              <span className="office-note">{section.body.trim().length} ký tự · ít nhất 40 ký tự mỗi mục</span>
            </div>)}
          </fieldset>
          <aside className="office-preview" aria-label="Xem trước báo cáo"><div className="office-preview-caption"><Eye size={15} aria-hidden="true" />Xem trước văn bản</div><article className="office-paper">
            <h3 className={artifact.document.title.trim() ? '' : 'office-empty'}>{artifact.document.title || 'Tiêu đề báo cáo'}</h3>
            {artifact.document.sections.map((section, index) => <section key={index}><h4 className={section.heading.trim() ? '' : 'office-empty'}>{section.heading || `Tiêu đề mục ${index + 1}`}</h4><DocumentBody body={section.body} /></section>)}
          </article></aside>
        </div>
      </>}

      {tab === 'sheet' && <>
        <div className="office-task"><strong><ListChecks size={16} aria-hidden="true" />Bài 2 · Ngân sách sinh hoạt</strong><p>Dữ liệu: số lượng 10 và đơn giá 35.000 ở dòng 2; số lượng 5 và đơn giá 12.000 ở dòng 3. Tính thành tiền tại D2, D3 bằng tham chiếu ô; dùng SUM tính tổng tại D4. Đầu ra phải cập nhật khi dữ liệu đầu vào thay đổi.</p></div>
        <div className="office-workspace">
          <fieldset className="office-fieldset" disabled={locked} aria-label="Chỉnh sửa bảng tính">
            <div className="office-spreadsheet-scroll"><table className="office-spreadsheet"><caption className="sr-only">Bảng ngân sách có thể chỉnh sửa, các cột A đến D và các dòng 1 đến 4</caption>
              <thead><tr><th scope="col"><span className="sr-only">Dòng</span></th>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>{rows.map(row => <tr key={row}><th scope="row">{row}</th>{columns.map(column => {
                const address = `${column}${row}`;
                return <td key={address} className={['D2', 'D3', 'D4'].includes(address) ? 'office-formula-cell' : ''}><input
                  aria-label={`Ô ${address}`} data-testid={`office-cell-${address}`} value={artifact.sheet.cells[address] ?? ''}
                  maxLength={officeLimits.maxCellLength} spellCheck={false} autoComplete="off" placeholder={['D2', 'D3', 'D4'].includes(address) ? 'Nhập công thức' : ''}
                  onChange={event => edit(current => ({ ...current, sheet: { cells: { ...current.sheet.cells, [address]: event.target.value } } }))}
                /></td>;
              })}</tr>)}</tbody>
            </table></div>
            <p className="office-grid-legend"><i aria-hidden="true" />Ô vàng là kết quả cần điền bằng công thức.</p>
            <p className="office-note">Công thức bắt đầu bằng =. Có thể dùng tham chiếu ô, + − × ÷ qua các ký hiệu + - * /, ngoặc và SUM. Thay đổi ở đây là bản nháp, chưa ghi điểm.</p>
          </fieldset>
          <aside className="office-preview" aria-label="Kết quả bảng tính"><div className="office-preview-caption"><Eye size={15} aria-hidden="true" />Xem trước giá trị</div>
            <table className="office-evaluated-table"><caption className="sr-only">Giá trị đã tính từ bảng ngân sách</caption><tbody>{rows.map(row => <tr key={row}>{columns.map(column => {
              const address = `${column}${row}`;
              const value = evaluated.values[address];
              const problem = evaluated.errors[address];
              const Cell = row === 1 ? 'th' : 'td';
              return <Cell key={address} {...(row === 1 ? { scope: 'col' } : {})} className={problem ? 'office-error-value' : ''} title={problem || address}>
                {problem ? <span role="status">Lỗi {address}: {problem}</span> : value === undefined || value === '' ? '—' : typeof value === 'number' ? number.format(value) : value}
              </Cell>;
            })}</tr>)}</tbody></table>
            <p className="office-note">Chỉ dùng công thức được hỗ trợ; ô báo lỗi cần được sửa trước khi gửi bài.</p>
          </aside>
        </div>
      </>}

      {tab === 'slides' && <>
        <div className="office-task"><strong><ListChecks size={16} aria-hidden="true" />Bài 3 · Trình bày kết quả</strong><p>Soạn đúng ba slide: tiêu đề lần lượt chứa “Phương pháp”, “Kết quả” và “Ngân sách”. Mỗi slide có ít nhất hai ý, mỗi ý ít nhất 12 ký tự. Mỗi dòng trong ô nội dung là một ý; giữ số liệu nhất quán với báo cáo và bảng tính.</p></div>
        <div className="office-workspace">
          <fieldset className="office-fieldset office-slides-editor" disabled={locked} aria-label="Soạn ba slide">{artifact.slides.map((slide, index) => <div className="office-section-editor" key={index}>
            <strong>Slide {index + 1}</strong>
            <label className="office-field" htmlFor={`office-slide-title-${index}`}>Tiêu đề slide<input id={`office-slide-title-${index}`} value={slide.title} maxLength={160} placeholder="Nhập thông điệp chính" onChange={event => changeSlide(index, 'title', event.target.value)} /></label>
            <label className="office-field" htmlFor={`office-slide-bullets-${index}`}>Các ý trình bày<textarea id={`office-slide-bullets-${index}`} value={slide.bullets.join('\n')} maxLength={4000} placeholder="Mỗi dòng là một ý" onChange={event => changeSlide(index, 'bullets', event.target.value)} /></label>
            <span className="office-note">{slide.bullets.filter(bullet => bullet.trim()).length} ý đã nhập · tối đa 8 ý, mỗi ý 12–500 ký tự</span>
          </div>)}</fieldset>
          <aside className="office-preview" aria-label="Xem trước trình chiếu"><div className="office-preview-caption"><Eye size={15} aria-hidden="true" />Xem trước ba slide</div><div className="office-slides-preview">{artifact.slides.map((slide, index) => <article className="office-slide-preview" key={index}>
            <h4 className={slide.title.trim() ? '' : 'office-empty'}>{slide.title || `Tiêu đề slide ${index + 1}`}</h4>
            {slide.bullets.some(bullet => bullet.trim()) ? <ul>{slide.bullets.filter(bullet => bullet.trim()).map((bullet, at) => <li key={at}>{bullet}</li>)}</ul> : <p className="office-empty office-note">Các ý chính sẽ xuất hiện ở đây.</p>}
            <span className="office-slide-number">{index + 1} / 3</span>
          </article>)}</div></aside>
        </div>
      </>}
    </div>

    <footer className="office-actions">
      <div><p className="office-note">Ba phần được gửi cùng nhau. “Kiểm tra nháp” chỉ giúp bạn luyện tập; gửi bài để ghi nhận kết quả.</p>
        {storageKey ? <p className="office-note" role="status" aria-live="polite"><strong>Bản nháp lưu trên thiết bị này</strong><br />{draftNotice}{draftSavedAt && ` Lần lưu gần nhất: ${new Date(draftSavedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`} Dữ liệu nháp chưa phải điểm và không tự đồng bộ sang thiết bị khác.</p>
          : <p className="office-note">Bản nháp chưa gửi chỉ được giữ khi màn hình này còn mở.</p>}
      </div>
      <div className="office-action-buttons"><button className="secondary" type="button" data-testid="office-selfcheck" disabled={locked} onClick={checkDraft}><ListChecks size={16} aria-hidden="true" />Kiểm tra nháp</button><button className="primary" type="button" data-testid="office-submit" disabled={locked} onClick={() => { void submit(); }}><Send size={16} aria-hidden="true" />{locked ? 'Đang gửi…' : 'Gửi bài thực hành'}</button></div>
    </footer>
    {error && <p className="office-alert" role="alert">{error}</p>}
    {serverResult ? <Assessment result={serverResult} official /> : selfCheck ? <Assessment result={selfCheck} official={false} /> : null}
  </section>;
}
