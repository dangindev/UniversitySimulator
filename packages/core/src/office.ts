/** Internal practical assessment. This is not MOS or a validated external qualification. */
export interface OfficeArtifact {
  document: { title: string; sections: { heading: string; body: string }[] };
  sheet: { cells: Record<string, string> };
  slides: { title: string; bullets: string[] }[];
}
export interface OfficeCriterion { id: string; label: string; passed: boolean; feedback: string; required: boolean }
export interface OfficeAssessment { version: string; score: number; maxScore: 10; passed: boolean; corePassed: boolean; criteria: OfficeCriterion[] }
export interface SpreadsheetEvaluation { values: Record<string, string | number>; errors: Record<string, string> }

export const officeVersion = 'office.2026.v1';
export const officeLimits = { maxCells: 100, maxCellLength: 200, maxFormulaLength: 200, maxTokens: 256, maxDepth: 32, maxRangeCells: 100, maxOperations: 10000, maxNumber: 1e12 } as const;
const seedInputs: Record<string, number> = { B2: 10, C2: 35000, B3: 5, C3: 12000 };
export const officeTask: { id: string; version: string; title: string; description: string; instructions: string[]; template: OfficeArtifact } = {
  id: 'office-skills-practical', version: officeVersion, title: 'Báo cáo ngân sách Ngày hội tình nguyện',
  description: 'Tạo một báo cáo, bảng tính có công thức và ba trang trình chiếu từ cùng dữ liệu. Bài thực hành nội bộ kiểm chứng cấu trúc và phép tính; không chấm tự động chất lượng viết hoặc thuyết trình.',
  instructions: [
    'Văn bản: đặt tiêu đề có cụm “Báo cáo ngân sách”; viết ít nhất hai mục có tiêu đề khác nhau, mỗi nội dung ít nhất 40 ký tự. Có danh sách ít nhất hai dòng bắt đầu bằng “- ”.',
    'Dữ liệu: 10 suất ăn, đơn giá 35.000đ; 5 phần nước uống, đơn giá 12.000đ. Giữ B2=10, C2=35000, B3=5, C3=12000.',
    'Bảng tính: dùng công thức nhân tham chiếu ô ở D2 và D3; dùng SUM trên vùng D2:D3 ở D4. Kết quả phải vẫn đúng khi thay đổi số lượng hoặc đơn giá, không điền cứng đáp án.',
    'Trình chiếu: đúng ba trang theo thứ tự Phương pháp → Kết quả → Ngân sách; mỗi trang có ít nhất hai gạch đầu dòng khác nhau, mỗi dòng ít nhất 12 ký tự.',
    'Đối chiếu báo cáo và trang Ngân sách với tổng 410.000đ. Đạt khi đủ các tiêu chí bắt buộc và điểm từ 8/10. Công thức hỗ trợ số, tham chiếu A1:Z50, + - * /, dấu ngoặc và SUM; không thực thi mã.',
  ],
  template: {
    document: { title: '', sections: [{ heading: 'Phương pháp lập ngân sách', body: '' }, { heading: 'Kết quả và đề xuất', body: '' }] },
    sheet: { cells: { A1: 'Hạng mục', B1: 'Số lượng', C1: 'Đơn giá', D1: 'Thành tiền', A2: 'Suất ăn', B2: '10', C2: '35000', D2: '', A3: 'Nước uống', B3: '5', C3: '12000', D3: '', A4: 'Tổng ngân sách', B4: '', C4: '', D4: '' } },
    slides: [{ title: 'Phương pháp', bullets: ['', ''] }, { title: 'Kết quả', bullets: ['', ''] }, { title: 'Ngân sách', bullets: ['', ''] }],
  },
};

type Token = { kind: 'number'; value: number } | { kind: 'reference' | 'identifier' | 'symbol'; value: string } | { kind: 'end'; value: '' };
type Node = { kind: 'number'; value: number } | { kind: 'reference'; value: string } | { kind: 'unary'; operator: '+' | '-'; value: Node } | { kind: 'binary'; operator: '+' | '-' | '*' | '/'; left: Node; right: Node } | { kind: 'sum'; arguments: (Node | RangeNode)[] };
type RangeNode = { kind: 'range'; start: string; end: string };
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new RangeError(`${name} phải là một đối tượng dữ liệu.`);
  return value as Record<string, unknown>;
}
function boundedText(value: unknown, name: string, maximum: number): string {
  if (typeof value !== 'string' || value.length > maximum) throw new RangeError(`${name} phải là chuỗi tối đa ${maximum} ký tự.`);
  return value;
}
function cellCoordinates(value: string): { column: number; row: number } {
  const match = /^([A-Z])([1-9]\d?)$/.exec(value);
  if (!match || Number(match[2]) > 50) throw new RangeError('Chỉ hỗ trợ tham chiếu ô từ A1 đến Z50.');
  return { column: match[1]!.charCodeAt(0) - 65, row: Number(match[2]) };
}
function cleanCells(value: unknown): Record<string, string> {
  const input = record(value, 'Các ô bảng tính');
  if (Object.keys(input).length > officeLimits.maxCells) throw new RangeError(`Tối đa ${officeLimits.maxCells} ô dữ liệu.`);
  const cells: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input)) {
    const id = key.toUpperCase(); cellCoordinates(id);
    if (Object.hasOwn(cells, id)) throw new RangeError(`Trùng địa chỉ ô ${id}.`);
    cells[id] = boundedText(raw, `Ô ${id}`, officeLimits.maxCellLength);
  }
  return cells;
}
function finite(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > officeLimits.maxNumber) throw new RangeError('Kết quả không hữu hạn hoặc vượt giới hạn 10^12.');
  return value;
}
function rangeCells(start: string, end: string): string[] {
  const a = cellCoordinates(start), b = cellCoordinates(end);
  const size = (Math.abs(a.column - b.column) + 1) * (Math.abs(a.row - b.row) + 1);
  if (size > officeLimits.maxRangeCells) throw new RangeError('Vùng SUM vượt quá 100 ô.');
  const result: string[] = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) for (let column = Math.min(a.column, b.column); column <= Math.max(a.column, b.column); column++) result.push(`${String.fromCharCode(column + 65)}${row}`);
  return result;
}

function tokenize(formula: string): Token[] {
  if (typeof formula !== 'string' || formula.length > officeLimits.maxFormulaLength || !formula.trim().startsWith('=')) throw new RangeError('Công thức phải bắt đầu bằng = và tối đa 200 ký tự.');
  const input = formula.trim().slice(1); const tokens: Token[] = [];
  for (let index = 0; index < input.length;) {
    const char = input[index]!;
    if (/\s/.test(char)) { index++; continue; }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(input.slice(index));
    if (number) { tokens.push({ kind: 'number', value: finite(Number(number[0])) }); index += number[0].length; }
    else {
      const identifier = /^[A-Za-z]+[0-9]*/.exec(input.slice(index));
      if (identifier) {
        const value = identifier[0].toUpperCase();
        if (value === 'SUM') tokens.push({ kind: 'identifier', value });
        else { cellCoordinates(value); tokens.push({ kind: 'reference', value }); }
        index += identifier[0].length;
      } else if ('+-*/():,'.includes(char)) { tokens.push({ kind: 'symbol', value: char }); index++; }
      else throw new RangeError(`Ký tự “${char}” không được phép trong công thức.`);
    }
    if (tokens.length > officeLimits.maxTokens) throw new RangeError('Công thức có quá nhiều thành phần.');
  }
  tokens.push({ kind: 'end', value: '' }); return tokens;
}

function parseFormula(formula: string): Node {
  const tokens = tokenize(formula); let index = 0;
  const current = () => tokens[index]!;
  const consume = (value: string) => { if (current().value !== value) throw new RangeError(`Thiếu hoặc sai dấu ${value}.`); index++; };
  const guard = (depth: number) => { if (depth > officeLimits.maxDepth) throw new RangeError('Công thức lồng quá sâu.'); };
  function expression(depth: number): Node {
    guard(depth); let node = product(depth);
    while (current().value === '+' || current().value === '-') { const operator = current().value as '+' | '-'; index++; node = { kind: 'binary', operator, left: node, right: product(depth) }; }
    return node;
  }
  function product(depth: number): Node {
    let node = unary(depth);
    while (current().value === '*' || current().value === '/') { const operator = current().value as '*' | '/'; index++; node = { kind: 'binary', operator, left: node, right: unary(depth) }; }
    return node;
  }
  function unary(depth: number): Node {
    guard(depth);
    if (current().value === '+' || current().value === '-') { const operator = current().value as '+' | '-'; index++; return { kind: 'unary', operator, value: unary(depth + 1) }; }
    return primary(depth);
  }
  function primary(depth: number): Node {
    guard(depth); const token = current();
    if (token.kind === 'number') { index++; return { kind: 'number', value: token.value }; }
    if (token.kind === 'reference') { index++; return { kind: 'reference', value: token.value }; }
    if (token.value === '(') { index++; const value = expression(depth + 1); consume(')'); return value; }
    if (token.kind === 'identifier' && token.value === 'SUM') {
      index++; consume('('); const args: (Node | RangeNode)[] = [];
      if (current().value === ')') throw new RangeError('SUM cần ít nhất một đối số.');
      do {
        if (current().kind === 'reference' && tokens[index + 1]?.value === ':') {
          const start = current().value as string; index += 2; const end = current();
          if (end.kind !== 'reference') throw new RangeError('Vùng SUM cần hai địa chỉ ô.');
          rangeCells(start, end.value); args.push({ kind: 'range', start, end: end.value }); index++;
        } else args.push(expression(depth + 1));
        if (current().value !== ',') break;
        index++;
      } while (true);
      consume(')'); return { kind: 'sum', arguments: args };
    }
    throw new RangeError('Thiếu số, địa chỉ ô hoặc biểu thức được hỗ trợ.');
  }
  const result = expression(0);
  if (current().kind !== 'end') throw new RangeError('Công thức còn thành phần không hợp lệ.');
  return result;
}

function evaluator(cells: Record<string, string>) {
  const cache = new Map<string, string | number>(); const active = new Set<string>(); const parsed = new Map<string, Node>(); let operations = 0;
  function tick(depth: number) { if (depth > officeLimits.maxDepth || ++operations > officeLimits.maxOperations) throw new RangeError('Bảng tính vượt giới hạn tính toán.'); }
  function numeric(value: string | number): number { if (typeof value !== 'number') throw new RangeError('Phép tính tham chiếu ô chứa văn bản.'); return value; }
  function cell(id: string, depth: number): string | number {
    tick(depth); cellCoordinates(id);
    if (active.has(id)) throw new RangeError(`Tham chiếu vòng tại ô ${id}.`);
    if (cache.has(id)) return cache.get(id)!;
    const raw = (cells[id] ?? '').trim();
    if (!raw) return 0;
    if (!raw.startsWith('=')) { const value = numericPattern.test(raw) ? finite(Number(raw)) : raw; cache.set(id, value); return value; }
    active.add(id);
    try { const ast = parsed.get(raw) ?? parseFormula(raw); parsed.set(raw, ast); const value = evaluate(ast, depth + 1); cache.set(id, value); return value; }
    finally { active.delete(id); }
  }
  function evaluate(node: Node, depth: number): number {
    tick(depth);
    if (node.kind === 'number') return node.value;
    if (node.kind === 'reference') return numeric(cell(node.value, depth + 1));
    if (node.kind === 'unary') { const value = evaluate(node.value, depth + 1); return finite(node.operator === '-' ? -value : value); }
    if (node.kind === 'sum') {
      let total = 0;
      for (const arg of node.arguments) {
        if (arg.kind === 'range') for (const id of rangeCells(arg.start, arg.end)) { const value = cell(id, depth + 1); if (typeof value === 'number') total = finite(total + value); }
        else if (arg.kind === 'reference') { const value = cell(arg.value, depth + 1); if (typeof value === 'number') total = finite(total + value); }
        else total = finite(total + evaluate(arg, depth + 1));
      }
      return total;
    }
    const left = evaluate(node.left, depth + 1), right = evaluate(node.right, depth + 1);
    if (node.operator === '/' && right === 0) throw new RangeError('Không thể chia cho 0.');
    return finite(node.operator === '+' ? left + right : node.operator === '-' ? left - right : node.operator === '*' ? left * right : left / right);
  }
  return { cell: (id: string) => cell(id, 0), formula: (formula: string) => evaluate(parseFormula(formula), 0) };
}

/** Pure arithmetic parser: no eval, Function, scripts, network, or file access. */
export function evaluateFormula(formula: string, cells: Record<string, string>): number { return evaluator(cleanCells(cells)).formula(formula); }
export function evaluateSpreadsheet(input: Record<string, string>): SpreadsheetEvaluation {
  const cells = cleanCells(input), engine = evaluator(cells); const values: Record<string, string | number> = {}, errors: Record<string, string> = {};
  for (const id of Object.keys(cells)) {
    try { values[id] = cells[id]!.trim() ? engine.cell(id) : ''; }
    catch (error) { values[id] = ''; errors[id] = error instanceof Error ? error.message : 'Không tính được ô.'; }
  }
  return { values, errors };
}

function artifactFromUnknown(value: unknown): OfficeArtifact {
  const input = record(value, 'Bài thực hành'), document = record(input.document, 'Văn bản'), sheet = record(input.sheet, 'Bảng tính');
  if (!Array.isArray(document.sections) || document.sections.length > 8) throw new RangeError('Văn bản có tối đa tám mục.');
  if (!Array.isArray(input.slides) || input.slides.length > 6) throw new RangeError('Bộ trình chiếu có tối đa sáu trang.');
  const result: OfficeArtifact = {
    document: { title: boundedText(document.title, 'Tiêu đề văn bản', 160), sections: document.sections.map((raw, index) => { const item = record(raw, `Mục ${index + 1}`); return { heading: boundedText(item.heading, 'Tiêu đề mục', 120), body: boundedText(item.body, 'Nội dung mục', 8000) }; }) },
    sheet: { cells: cleanCells(sheet.cells) },
    slides: input.slides.map((raw, index) => { const slide = record(raw, `Trang ${index + 1}`); if (!Array.isArray(slide.bullets) || slide.bullets.length > 8) throw new RangeError('Mỗi trang có tối đa tám gạch đầu dòng.'); return { title: boundedText(slide.title, 'Tiêu đề trang', 160), bullets: slide.bullets.map(value => boundedText(value, 'Gạch đầu dòng', 500)) }; }),
  };
  const textSize = result.document.title.length + result.document.sections.reduce((sum, item) => sum + item.heading.length + item.body.length, 0) + Object.values(result.sheet.cells).reduce((sum, item) => sum + item.length, 0) + result.slides.reduce((sum, item) => sum + item.title.length + item.bullets.join('').length, 0);
  if (textSize > 50000) throw new RangeError('Bài thực hành vượt quá giới hạn dữ liệu.');
  return result;
}
const normalizeText = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const hasTotal = (text: string) => /(?:^|[^\d])410[.,\s]?000(?:$|[^\d])/.test(text);
const close = (actual: number, expected: number) => Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected));

function references(node: Node | RangeNode, output = new Set<string>()): Set<string> {
  if (node.kind === 'reference') output.add(node.value);
  else if (node.kind === 'range') rangeCells(node.start, node.end).forEach(id => output.add(id));
  else if (node.kind === 'unary') references(node.value, output);
  else if (node.kind === 'binary') { references(node.left, output); references(node.right, output); }
  else if (node.kind === 'sum') node.arguments.forEach(arg => references(arg, output));
  return output;
}
function containsRequiredSum(node: Node): boolean {
  if (node.kind === 'sum') return node.arguments.some(arg => arg.kind === 'range' && rangeCells(arg.start, arg.end).length === 2 && references(arg).has('D2') && references(arg).has('D3')) || node.arguments.some(arg => arg.kind !== 'range' && containsRequiredSum(arg));
  if (node.kind === 'unary') return containsRequiredSum(node.value);
  if (node.kind === 'binary') return containsRequiredSum(node.left) || containsRequiredSum(node.right);
  return false;
}
function formulaWorks(cells: Record<string, string>, id: string, expected: (data: Record<string, number>) => number, requiredReferences: string[], requireSum = false): boolean {
  try {
    const formula = cells[id] ?? '', ast = parseFormula(formula), refs = references(ast);
    if (!requiredReferences.every(reference => refs.has(reference)) || (requireSum && !containsRequiredSum(ast))) return false;
    const probes: Record<string, number>[] = [{}, { B2: 13 }, { C2: 37000 }, { B3: 8 }, { C3: 13500 }, { B2: 7, C2: 40000, B3: 9, C3: 15000 }];
    return probes.every(changes => {
      const inputs = { ...seedInputs, ...changes };
      const changedCells = { ...cells, ...Object.fromEntries(Object.entries(inputs).map(([key, number]) => [key, String(number)])) };
      return close(evaluateFormula(formula, changedCells), expected(inputs));
    });
  } catch { return false; }
}

export function assessOfficeArtifact(input: unknown): OfficeAssessment {
  const artifact = artifactFromUnknown(input), { document, sheet, slides } = artifact;
  const criteria: OfficeCriterion[] = [];
  function add(id: string, label: string, passed: boolean, required: boolean, success: string, failure: string) { criteria.push({ id, label, passed, required, feedback: passed ? success : failure }); }
  add('document-title', 'Đặt tiêu đề báo cáo', normalizeText(document.title).includes('bao cao ngan sach'), true, 'Tiêu đề thể hiện đây là báo cáo ngân sách.', 'Tiêu đề cần có cụm “Báo cáo ngân sách”.');
  const structured = document.sections.length >= 2 && document.sections.every(section => section.heading.trim().length >= 3 && section.body.trim().length >= 40) && new Set(document.sections.map(section => normalizeText(section.heading))).size === document.sections.length;
  add('document-structure', 'Tổ chức nội dung thành các mục', structured, true, 'Có ít nhất hai mục khác nhau với nội dung đạt độ dài yêu cầu.', 'Cần ít nhất hai mục có tiêu đề khác nhau; mỗi nội dung ít nhất 40 ký tự.');
  const listLines = document.sections.flatMap(section => section.body.split(/\r?\n/)).filter(line => /^\s*(?:[-*•]\s+|\d+[.)]\s+)\S.{5,}$/.test(line));
  add('document-list', 'Trình bày danh sách', listLines.length >= 2, true, 'Danh sách có ít nhất hai nội dung rõ ràng.', 'Thêm ít nhất hai dòng danh sách, ví dụ “- Chuẩn bị dữ liệu số lượng và đơn giá”.');
  add('document-consistency', 'Đối chiếu số liệu trong báo cáo', document.sections.some(section => hasTotal(section.body)), false, 'Báo cáo nhắc đúng tổng 410.000đ.', 'Đưa tổng 410.000đ vào phần kết quả hoặc đề xuất.');
  const inputsCorrect = Object.entries(seedInputs).every(([id, value]) => numericPattern.test(sheet.cells[id]?.trim() ?? '') && Number(sheet.cells[id]) === value);
  add('sheet-inputs', 'Giữ đúng dữ liệu đầu vào', inputsCorrect, true, 'Số lượng và đơn giá khớp đề bài.', 'Cần B2=10, C2=35000, B3=5, C3=12000 dưới dạng dữ liệu số.');
  const productsCorrect = formulaWorks(sheet.cells, 'D2', data => data.B2! * data.C2!, ['B2', 'C2']) && formulaWorks(sheet.cells, 'D3', data => data.B3! * data.C3!, ['B3', 'C3']);
  add('sheet-products', 'Tính thành tiền bằng tham chiếu ô', productsCorrect, true, 'Hai công thức nhân vẫn đúng khi thay đổi dữ liệu thử.', 'D2 và D3 phải dùng các ô số lượng/đơn giá; giá trị điền cứng hoặc công thức không phụ thuộc dữ liệu không đạt.');
  const sumCorrect = formulaWorks(sheet.cells, 'D4', data => data.B2! * data.C2! + data.B3! * data.C3!, ['D2', 'D3'], true);
  add('sheet-sum', 'Tổng hợp bằng SUM trên vùng', sumCorrect, true, 'SUM trên D2:D3 cho kết quả đúng khi thay đổi dữ liệu.', 'D4 cần dùng SUM trên vùng D2:D3 và trả kết quả đúng với dữ liệu mới.');
  const slidesStructured = slides.length === 3 && slides.every(slide => slide.title.trim().length >= 5 && slide.bullets.length >= 2 && slide.bullets.every(bullet => bullet.trim().length >= 12) && new Set(slide.bullets.map(normalizeText)).size === slide.bullets.length);
  add('slides-structure', 'Tạo ba trang có nội dung', slidesStructured, true, 'Ba trang có tiêu đề và các gạch đầu dòng khác nhau, đủ độ dài yêu cầu.', 'Cần đúng ba trang; mỗi trang có ít nhất hai gạch đầu dòng khác nhau, mỗi dòng ít nhất 12 ký tự.');
  const ordered = slides.length === 3 && ['phuong phap', 'ket qua', 'ngan sach'].every((keyword, index) => normalizeText(slides[index]!.title).includes(keyword));
  add('slides-order', 'Sắp xếp mạch trình bày', ordered, true, 'Các trang theo thứ tự Phương pháp → Kết quả → Ngân sách.', 'Tiêu đề ba trang cần lần lượt có “Phương pháp”, “Kết quả”, “Ngân sách”.');
  add('slides-consistency', 'Đối chiếu tổng trên trang ngân sách', slides.length === 3 && slides[2]!.bullets.some(hasTotal), false, 'Trang Ngân sách ghi đúng tổng 410.000đ.', 'Đưa tổng 410.000đ vào một gạch đầu dòng của trang Ngân sách.');
  const score = criteria.filter(criterion => criterion.passed).length, corePassed = criteria.filter(criterion => criterion.required).every(criterion => criterion.passed);
  return { version: officeVersion, score, maxScore: 10, corePassed, passed: score >= 8 && corePassed, criteria };
}
