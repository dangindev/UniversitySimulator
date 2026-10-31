import { describe, expect, it } from 'vitest';
import { assessOfficeArtifact, evaluateFormula, evaluateSpreadsheet, officeTask, officeVersion, type OfficeArtifact } from '../src/index.ts';

function completeArtifact(): OfficeArtifact {
  const artifact = structuredClone(officeTask.template);
  artifact.document.title = 'Báo cáo ngân sách Ngày hội tình nguyện';
  artifact.document.sections[0]!.body = 'Chúng tôi kiểm tra số lượng và đơn giá trước khi tổng hợp dữ liệu.\n- Chuẩn bị mười suất ăn cho các tình nguyện viên.\n- Chuẩn bị năm phần nước uống trong chương trình.';
  artifact.document.sections[1]!.body = 'Tổng ngân sách dự kiến là 410.000đ. Kết quả được kiểm tra bằng công thức tham chiếu để cập nhật chính xác khi thay đổi số lượng.';
  Object.assign(artifact.sheet.cells, { D2: '=B2*C2', D3: '=B3*C3', D4: '=SUM(D2:D3)' });
  artifact.slides[0]!.bullets = ['Thu thập số lượng và đơn giá cho từng hạng mục.', 'Tính thành tiền bằng công thức tham chiếu ô.'];
  artifact.slides[1]!.bullets = ['Mười suất ăn cần ngân sách là 350.000đ.', 'Năm phần nước uống cần ngân sách là 60.000đ.'];
  artifact.slides[2]!.bullets = ['Tổng ngân sách của chương trình là 410.000đ.', 'Dùng SUM để tổng hợp các khoản chi phí.'];
  return artifact;
}
const criterion = (artifact: OfficeArtifact, id: string) => assessOfficeArtifact(artifact).criteria.find(item => item.id === id)!;

describe('office artifact assessment', () => {
  it('assesses the actual document, formulas and slides and leaves the supplied artifact unchanged', () => {
    const artifact = completeArtifact(), before = JSON.stringify(artifact);
    const result = assessOfficeArtifact(artifact);
    expect(result).toMatchObject({ version: officeVersion, score: 10, maxScore: 10, corePassed: true, passed: true });
    expect(result.criteria.filter(item => item.required)).toHaveLength(8);
    expect(result.criteria.every(item => item.passed && item.feedback.length > 0)).toBe(true);
    expect(JSON.stringify(artifact)).toBe(before);
  });

  it('does not pass an empty template or trust client-claimed score and completion', () => {
    const result = assessOfficeArtifact({ ...structuredClone(officeTask.template), score: 10, passed: true, corePassed: true });
    expect(result.passed).toBe(false);
    expect(result.corePassed).toBe(false);
    expect(result.score).toBeLessThan(8);
  });

  it('does not award completion from nine points if a required artifact criterion is missing', () => {
    const artifact = completeArtifact();
    artifact.document.sections[0]!.body = 'Chúng tôi kiểm tra số lượng và đơn giá trước khi tổng hợp dữ liệu. Các hạng mục gồm suất ăn và nước uống cho chương trình.';
    const result = assessOfficeArtifact(artifact);
    expect(result.score).toBe(9);
    expect(result.corePassed).toBe(false);
    expect(result.passed).toBe(false);
    expect(criterion(artifact, 'document-list').passed).toBe(false);
  });

  it('requires named sections with actual content rather than headings alone', () => {
    const artifact = completeArtifact();
    artifact.document.sections[1]!.body = '410000';
    expect(criterion(artifact, 'document-structure').passed).toBe(false);
    artifact.document.sections[1]!.body = completeArtifact().document.sections[1]!.body;
    artifact.document.sections[1]!.heading = artifact.document.sections[0]!.heading;
    expect(criterion(artifact, 'document-structure').passed).toBe(false);
  });

  it('rejects hardcoded product and total numbers even when the displayed budget is correct', () => {
    const artifact = completeArtifact();
    Object.assign(artifact.sheet.cells, { D2: '350000', D3: '60000', D4: '410000' });
    expect(criterion(artifact, 'sheet-products').passed).toBe(false);
    expect(criterion(artifact, 'sheet-sum').passed).toBe(false);
    expect(assessOfficeArtifact(artifact).passed).toBe(false);
  });

  it('perturbs quantity and price to reject constant formulas with fake dependency references', () => {
    const artifact = completeArtifact();
    artifact.sheet.cells.D2 = '=B2*0+C2*0+350000';
    expect(evaluateSpreadsheet(artifact.sheet.cells).values.D2).toBe(350000);
    expect(criterion(artifact, 'sheet-products').passed).toBe(false);
    const other = completeArtifact();
    other.sheet.cells.D4 = '=SUM(D2:D3)*0+410000';
    expect(evaluateSpreadsheet(other.sheet.cells).values.D4).toBe(410000);
    expect(criterion(other, 'sheet-sum').passed).toBe(false);
  });

  it('accepts equivalent arithmetic and reversed SUM range instead of enforcing a single formula string', () => {
    const artifact = completeArtifact();
    Object.assign(artifact.sheet.cells, { D2: '= C2 * B2', D3: '=SUM(B3*C3)', D4: '=sum(D3:D2)+0' });
    expect(assessOfficeArtifact(artifact).passed).toBe(true);
  });

  it('requires both the specified input data and formulas that survive data changes', () => {
    const artifact = completeArtifact(); artifact.sheet.cells.B2 = '11';
    expect(evaluateSpreadsheet(artifact.sheet.cells).values.D4).toBe(445000);
    expect(criterion(artifact, 'sheet-inputs').passed).toBe(false);
    expect(assessOfficeArtifact(artifact).passed).toBe(false);
  });

  it('requires three ordered slides with distinct substantive bullet strings', () => {
    const artifact = completeArtifact();
    [artifact.slides[0], artifact.slides[1]] = [artifact.slides[1]!, artifact.slides[0]!];
    expect(criterion(artifact, 'slides-order').passed).toBe(false);
    expect(assessOfficeArtifact(artifact).passed).toBe(false);
    const repeated = completeArtifact(); repeated.slides[0]!.bullets[1] = repeated.slides[0]!.bullets[0]!;
    expect(criterion(repeated, 'slides-structure').passed).toBe(false);
  });

  it('accepts 8/10 when every required outcome is met but two optional numerical cross-checks are absent', () => {
    const artifact = completeArtifact();
    artifact.document.sections[1]!.body = 'Báo cáo đã tổng hợp các hạng mục theo đúng số lượng và đơn giá. Cần kiểm tra dữ liệu trước khi cập nhật phần kết quả.';
    artifact.slides[2]!.bullets = ['Ngân sách được tổng hợp bằng công thức SUM.', 'Kiểm tra số lượng trước khi cập nhật tổng tiền.'];
    expect(assessOfficeArtifact(artifact)).toMatchObject({ score: 8, passed: true, corePassed: true });
  });

  it('rejects malformed, oversized and prototype-shaped inputs with bounded errors', () => {
    for (const invalid of [null, [], {}, { document: {}, sheet: {}, slides: [] }]) expect(() => assessOfficeArtifact(invalid)).toThrow(RangeError);
    const artifact = completeArtifact(); artifact.document.sections[0]!.body = 'a'.repeat(8001);
    expect(() => assessOfficeArtifact(artifact)).toThrow(RangeError);
    const polluted = completeArtifact(); polluted.sheet.cells = JSON.parse('{"__proto__":"=1"}') as Record<string, string>;
    expect(() => assessOfficeArtifact(polluted)).toThrow(RangeError);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('bounded spreadsheet arithmetic interpreter', () => {
  it('implements arithmetic precedence, parentheses and signed numeric values', () => {
    expect(evaluateFormula('=2+3*4', {})).toBe(14);
    expect(evaluateFormula('=(2+3)*4', {})).toBe(20);
    expect(evaluateFormula('=-2*-3+8/4', {})).toBe(8);
    expect(evaluateFormula('=0.1+0.2', {})).toBeCloseTo(0.3);
    expect(evaluateFormula('=1e3+2', {})).toBe(1002);
  });

  it('evaluates references, SUM ranges and dependent cells from the budget artifact', () => {
    const result = evaluateSpreadsheet(completeArtifact().sheet.cells);
    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({ A2: 'Suất ăn', B2: 10, D2: 350000, D3: 60000, D4: 410000 });
    expect(evaluateFormula('=SUM(A1:A3,4)', { A1: 'nhãn', A2: '2', A3: '3' })).toBe(9);
    expect(evaluateFormula('=SUM(A3:A1)', { A1: '1', A2: '2', A3: '3' })).toBe(6);
    expect(evaluateFormula('=Z50+1', { Z50: '2' })).toBe(3);
    expect(evaluateFormula('=A1+1', {})).toBe(1);
  });

  it('normalizes lowercase addresses and rejects duplicates differing only by case', () => {
    expect(evaluateFormula('=b2*c2', { b2: '10', c2: '35000' })).toBe(350000);
    expect(() => evaluateSpreadsheet({ A1: '1', a1: '2' })).toThrow(RangeError);
  });

  it('detects direct and indirect cycles while keeping unrelated cells readable', () => {
    expect(() => evaluateFormula('=A1', { A1: '=A1+1' })).toThrow(/vòng/);
    const result = evaluateSpreadsheet({ A1: '=B1+1', B1: '=A1+1', C1: 'Bài thử độc lập' });
    expect(result.errors.A1).toMatch(/vòng/); expect(result.errors.B1).toMatch(/vòng/);
    expect(result.values.C1).toBe('Bài thử độc lập');
  });

  it('rejects division by zero, nonnumeric arithmetic and overflow', () => {
    expect(() => evaluateFormula('=1/0', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=A1+1', { A1: 'văn bản' })).toThrow(RangeError);
    expect(() => evaluateFormula('=1e9*1e9', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=1e999', {})).toThrow(RangeError);
  });

  it('does not accept functions, property access or syntax outside the arithmetic whitelist', () => {
    const formulas = ['=eval("1")', '=Function("return 1")()', '=globalThis.process.exit()', '=fetch("x")', '=IMPORTXML(A1)', '=A1;process.exit()', '=1**4', '=1%2', '=SUM(A1:A2:B3)', '=SUM()', '=1+'];
    for (const formula of formulas) expect(() => evaluateFormula(formula, {}), formula).toThrow(RangeError);
  });

  it('bounds reference space, range size, cell count, formula length and nesting', () => {
    expect(() => evaluateFormula('=A51', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=AA1', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=SUM(A1:Z50)', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=' + '1+'.repeat(101) + '1', {})).toThrow(RangeError);
    expect(() => evaluateFormula('=' + '('.repeat(40) + '1' + ')'.repeat(40), {})).toThrow(RangeError);
    const cells = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`${String.fromCharCode(65 + index % 26)}${1 + Math.floor(index / 26)}`, '1']));
    expect(() => evaluateSpreadsheet(cells)).toThrow(RangeError);
    expect(() => evaluateSpreadsheet({ A1: 'x'.repeat(201) })).toThrow(RangeError);
  });

  it('bounds dependency recursion even in a large acyclic reference chain', () => {
    const cells = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`A${index + 1}`, index === 39 ? '1' : `=A${index + 2}+1`]));
    expect(() => evaluateFormula('=A1', cells)).toThrow(RangeError);
  });
});
