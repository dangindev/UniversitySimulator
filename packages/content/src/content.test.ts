import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { courses, languageBridges } from '@university-simulator/core';
import { contentReleaseStatus, courseReadiness, getLesson, getLessons, introLessons, lessons } from './index.ts';

describe('learning content integrity and public-release boundary', () => {
  it('has unique identifiers and source-backed substantive sections', () => {
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(lesson.objective.length).toBeGreaterThan(15);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
      expect(lesson.sections.every(section => section.heading && section.body.length > 50)).toBe(true);
      expect(lesson.sources.every(source => new URL(source).protocol === 'https:')).toBe(true);
      expect(JSON.stringify(lesson)).not.toMatch(/lorem ipsum|TODO|coming soon/i);
      expect(lesson.reviewStatus).toBe('draft');
      if (lesson.checkpoint) {
        expect(lesson.checkpoint.options.length).toBeGreaterThanOrEqual(2);
        expect(lesson.checkpoint.answerIndex).toBeGreaterThanOrEqual(0);
        expect(lesson.checkpoint.answerIndex).toBeLessThan(lesson.checkpoint.options.length);
        expect(lesson.checkpoint.explanation.length).toBeGreaterThan(15);
        expect(new Set(lesson.checkpoint.options).size).toBe(lesson.checkpoint.options.length);
      }
    }
  });

  it('covers every catalog course and every bridge without claiming a finished course', () => {
    for (const item of [...courses, ...languageBridges]) {
      expect(getLessons(item.id).length, `Missing content for ${item.id}`).toBeGreaterThan(0);
      expect(courseReadiness[item.id]?.releaseEligible).toBe(false);
      expect(courseReadiness[item.id]?.assessmentBankReady).toBe(false);
    }
    expect(contentReleaseStatus.publicLaunchReady).toBe(false);
  });

  it('gives two introductory tracks the same objectives, checkpoints and test contracts', () => {
    const cpp = getLessons('intro-programming', 'cpp');
    const python = getLessons('intro-programming', 'python');
    expect(cpp.length).toBeGreaterThanOrEqual(12);
    expect(cpp.length).toBe(python.length);
    cpp.forEach((lesson, index) => {
      const peer = python[index]!;
      expect(lesson.objective).toBe(peer.objective);
      expect(lesson.checkpoint).toEqual(peer.checkpoint);
      expect(lesson.practice?.[0]?.publicTests).toEqual(peer.practice?.[0]?.publicTests);
      expect(lesson.example?.language).toBe('cpp');
      expect(peer.example?.language).toBe('python');
    });
  });

  it('keeps technical English present independently of placement practice', () => {
    expect(getLessons('technical-english').length).toBeGreaterThanOrEqual(3);
    expect(getLesson('english-placement-practice')?.checkpoint?.options[1]).toBe('Tiếng Anh chuyên ngành');
    expect(getLessons('unknown-course')).toEqual([]);
    expect(getLesson('unknown-lesson')).toBeUndefined();
  });
});

const pythonAvailable = spawnSync('python', ['--version'], { timeout: 3000, windowsHide: true }).status === 0;
const sampleCases: Record<string, [string, string]> = {
  'input-output': ['7 5\n', '12'],
  'variables-types': ['', '3 2'],
  conditions: ['18\n', 'YES'],
  'boolean-logic': ['20 0\n', 'NO'],
  loops: ['4\n', '10'],
  'nested-loops': ['3 4\n', '12'],
  functions: ['-4\n', '16'],
  sequences: ['5\n2 -1 0 7 -4\n', '2'],
  strings: ['school\n', '2'],
  records: ['3 12000\n', '36000'],
  debugging: ['1\n', '1'],
  searching: ['4 4\n4 9 4 2\n', '0'],
  testing: ['5\n-2 -1 0 3 4\n', '3'],
  'budget-project': ['500000 3\n120000 80000 50000\n', '250000'],
};

describe.skipIf(!pythonAvailable)('trusted authored Python examples', () => {
  for (const lesson of introLessons.filter(item => item.track === 'python')) {
    it(`executes the published example: ${lesson.id}`, () => {
      const slug = lesson.id.replace('intro-python-', '');
      const [input, expected] = sampleCases[slug]!;
      // Only trusted repository-authored reference examples execute here; learner submissions never do.
      const output = execFileSync('python', ['-I', '-c', lesson.example!.code], {
        input, encoding: 'utf8', timeout: 3000, windowsHide: true,
      });
      expect(output.trim()).toBe(expected);
    });
  }
});
