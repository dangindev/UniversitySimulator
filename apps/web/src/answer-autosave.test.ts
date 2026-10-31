import { describe, expect, it, vi } from 'vitest';
import { createAnswerAutosave, type AnswerSaveAcknowledgement, type AnswerSnapshot } from './answer-autosave';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => { resolve = accept; reject = decline; });
  return { promise, resolve, reject };
}

describe('answer autosave acknowledgement and concurrency', () => {
  it('starts clean with server-confirmed answers and does not write unchanged data', async () => {
    const send = vi.fn(async () => ({}));
    const autosave = createAnswerAutosave({ q1: 'a', q2: 'b' }, send);
    autosave.update({ q2: 'b', q1: 'a' });
    await autosave.flush();
    expect(send).not.toHaveBeenCalled();
    expect(autosave.isDirty()).toBe(false);
  });

  it('serializes a newer edit behind an in-flight write and never acknowledges it early', async () => {
    const first = deferred<AnswerSaveAcknowledgement>();
    const second = deferred<AnswerSaveAcknowledgement>();
    const writes: AnswerSnapshot[] = [];
    const dirtyAtAcknowledgement: boolean[] = [];
    const autosave = createAnswerAutosave({}, answers => {
      writes.push(answers);
      return writes.length === 1 ? first.promise : second.promise;
    }, { onAcknowledged: () => dirtyAtAcknowledgement.push(autosave.isDirty()) });
    autosave.update({ q1: 'a' });
    const initialFlush = autosave.flush();
    autosave.update({ q1: 'b', q2: 'c' });
    const overlappingFlush = autosave.flush();
    expect(overlappingFlush).toBe(initialFlush);
    expect(writes).toEqual([{ q1: 'a' }]);
    first.resolve({});
    await Promise.resolve();
    expect(dirtyAtAcknowledgement).toEqual([true]);
    expect(writes).toEqual([{ q1: 'a' }, { q1: 'b', q2: 'c' }]);
    expect(autosave.isDirty()).toBe(true);
    second.resolve({});
    await Promise.all([initialFlush, overlappingFlush]);
    expect(autosave.isDirty()).toBe(false);
    expect(autosave.snapshot()).toEqual({ q1: 'b', q2: 'c' });
  });

  it('retains the latest dirty edit after acknowledgement loss and retries that snapshot', async () => {
    const lostAcknowledgement = deferred<AnswerSaveAcknowledgement>();
    const retryAcknowledgement = deferred<AnswerSaveAcknowledgement>();
    const writes: AnswerSnapshot[] = [];
    const autosave = createAnswerAutosave({ q1: 'initial' }, answers => {
      writes.push(answers);
      return writes.length === 1 ? lostAcknowledgement.promise : retryAcknowledgement.promise;
    });
    autosave.update({ q1: 'first edit' });
    const flush = autosave.flush();
    const rejection = expect(flush).rejects.toThrow('connection lost');
    autosave.update({ q1: 'latest edit', q2: 'retained' });
    lostAcknowledgement.reject(new Error('connection lost'));
    await rejection;
    expect(autosave.isDirty()).toBe(true);
    expect(autosave.snapshot()).toEqual({ q1: 'latest edit', q2: 'retained' });
    const retry = autosave.flush();
    expect(writes[1]).toEqual({ q1: 'latest edit', q2: 'retained' });
    retryAcknowledgement.resolve({});
    await retry;
    expect(autosave.isDirty()).toBe(false);
  });

  it('coalesces concurrent flushes into one write', async () => {
    const response = deferred<AnswerSaveAcknowledgement>();
    const send = vi.fn(() => response.promise);
    const autosave = createAnswerAutosave({}, send);
    autosave.update({ q1: 'answer' });
    const one = autosave.flush();
    const two = autosave.flush();
    const three = autosave.flush();
    expect(one).toBe(two);
    expect(two).toBe(three);
    expect(send).toHaveBeenCalledTimes(1);
    response.resolve({});
    await Promise.all([one, two, three]);
    await autosave.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('owns its snapshots even when input objects, sender arguments and callback copies are mutated', async () => {
    const initial = { q1: 'server' };
    const updated = { q1: 'student' };
    const response = deferred<AnswerSaveAcknowledgement>();
    const autosave = createAnswerAutosave(initial, sent => {
      sent.q1 = 'changed by transport';
      return response.promise;
    }, { onAcknowledged: (_acknowledgement, snapshot) => { snapshot.q1 = 'changed by observer'; } });
    initial.q1 = 'outside initial mutation';
    expect(autosave.snapshot()).toEqual({ q1: 'server' });
    autosave.update(updated);
    updated.q1 = 'outside update mutation';
    const view = autosave.snapshot();
    view.q1 = 'outside snapshot mutation';
    const flush = autosave.flush();
    expect(autosave.snapshot()).toEqual({ q1: 'student' });
    response.resolve({});
    await flush;
    expect(autosave.snapshot()).toEqual({ q1: 'student' });
    expect(autosave.isDirty()).toBe(false);
  });

  it('drains an edit triggered synchronously by an acknowledgement observer', async () => {
    const writes: AnswerSnapshot[] = [];
    const autosave = createAnswerAutosave({}, async answers => {
      writes.push(answers);
      return {};
    }, { onAcknowledged: () => { if (writes.length === 1) autosave.update({ q1: 'newer' }); } });
    autosave.update({ q1: 'first' });
    await autosave.flush();
    expect(writes).toEqual([{ q1: 'first' }, { q1: 'newer' }]);
    expect(autosave.isDirty()).toBe(false);
  });

  it('freezes on an expired acknowledgement using its server snapshot, discarding unaccepted edits', async () => {
    const response = deferred<AnswerSaveAcknowledgement>();
    const send = vi.fn(() => response.promise);
    const observed: AnswerSnapshot[] = [];
    const autosave = createAnswerAutosave({ q1: 'old server' }, send, {
      onAcknowledged: (_acknowledgement, confirmed) => { observed.push(confirmed); },
    });
    autosave.update({ q1: 'in flight' });
    const flush = autosave.flush();
    autosave.update({ q1: 'not accepted', q2: 'too late' });
    const serverAnswers = { q1: 'deadline snapshot' };
    response.resolve({ expired: true, exam: { answers: serverAnswers } });
    await flush;
    serverAnswers.q1 = 'outside acknowledgement mutation';
    observed[0]!.q1 = 'outside observer mutation';
    expect(autosave.snapshot()).toEqual({ q1: 'deadline snapshot' });
    expect(autosave.isDirty()).toBe(false);
    autosave.update({ q1: 'after deadline' });
    await autosave.flush();
    expect(autosave.snapshot()).toEqual({ q1: 'deadline snapshot' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('uses the last confirmed snapshot if an expired response does not include answers', async () => {
    const send = vi.fn<(answers: AnswerSnapshot) => Promise<AnswerSaveAcknowledgement>>()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ expired: true });
    const autosave = createAnswerAutosave({ q1: 'initial' }, send);
    autosave.update({ q1: 'confirmed' });
    await autosave.flush();
    autosave.update({ q1: 'rejected at deadline' });
    await autosave.flush();
    expect(autosave.snapshot()).toEqual({ q1: 'confirmed' });
    expect(autosave.isDirty()).toBe(false);
  });

  it('clears a synchronously failing transport so a later flush can retry', async () => {
    let attempts = 0;
    const autosave = createAnswerAutosave({}, () => {
      attempts++;
      if (attempts === 1) throw new Error('transport unavailable');
      return Promise.resolve({});
    });
    autosave.update({ q1: 'retained' });
    await expect(autosave.flush()).rejects.toThrow('transport unavailable');
    expect(autosave.isDirty()).toBe(true);
    await autosave.flush();
    expect(attempts).toBe(2);
    expect(autosave.snapshot()).toEqual({ q1: 'retained' });
    expect(autosave.isDirty()).toBe(false);
  });

  it('persists a revert made while a different snapshot is in flight', async () => {
    const first = deferred<AnswerSaveAcknowledgement>();
    const writes: AnswerSnapshot[] = [];
    const autosave = createAnswerAutosave({ q1: 'initial' }, answers => {
      writes.push(answers);
      return writes.length === 1 ? first.promise : Promise.resolve({});
    });
    autosave.update({ q1: 'temporary' });
    const flush = autosave.flush();
    autosave.update({ q1: 'initial' });
    first.resolve({});
    await flush;
    expect(writes).toEqual([{ q1: 'temporary' }, { q1: 'initial' }]);
    expect(autosave.snapshot()).toEqual({ q1: 'initial' });
  });
});
