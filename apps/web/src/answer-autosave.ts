export type AnswerSnapshot = Record<string, string>;

export interface AnswerSaveAcknowledgement {
  expired?: boolean;
  answers?: AnswerSnapshot;
  exam?: { answers?: AnswerSnapshot };
}

export interface AnswerAutosave {
  update(answers: AnswerSnapshot): void;
  flush(): Promise<void>;
  isDirty(): boolean;
  snapshot(): AnswerSnapshot;
}

const clone = (answers: AnswerSnapshot): AnswerSnapshot => ({ ...answers });
function equal(left: AnswerSnapshot, right: AnswerSnapshot): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && left[key] === right[key]);
}

/**
 * Initial answers are server-confirmed. The caller supplies its own debounce timer.
 * A flush serializes writes and drains all edits made before that flush completes.
 * Failed writes stay dirty. Expiry replaces local edits with the last server snapshot
 * (ack.exam.answers, ack.answers, or the last confirmed snapshot) and freezes updates.
 */
export function createAnswerAutosave<Acknowledgement extends AnswerSaveAcknowledgement>(
  initialAnswers: AnswerSnapshot,
  sendSnapshot: (answers: AnswerSnapshot) => Promise<Acknowledgement>,
  options: { onAcknowledged?: (acknowledgement: Acknowledgement, confirmedSnapshot: AnswerSnapshot) => void } = {},
): AnswerAutosave {
  let latest = clone(initialAnswers);
  let confirmed = clone(initialAnswers);
  let revision = 0;
  let confirmedRevision = 0;
  let expired = false;
  let pending: Promise<void> | undefined;
  const onAcknowledged = options.onAcknowledged;

  const isDirty = () => !expired && revision > confirmedRevision;

  function update(answers: AnswerSnapshot): void {
    if (expired || equal(latest, answers)) return;
    latest = clone(answers);
    revision++;
  }

  function flush(): Promise<void> {
    if (pending) return pending;
    if (!isDirty()) return Promise.resolve();
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const operation = new Promise<void>((accept, decline) => { resolve = accept; reject = decline; });
    pending = operation;

    function fail(reason: unknown) {
      pending = undefined;
      reject(reason);
    }
    function next() {
      if (!isDirty()) {
        // Checking for edits and completing the shared promise happen atomically.
        pending = undefined;
        resolve();
        return;
      }
      const savingRevision = revision;
      const sending = clone(latest);
      let request: Promise<Acknowledgement>;
      try { request = sendSnapshot(clone(sending)); }
      catch (reason) { fail(reason); return; }
      void Promise.resolve(request).then(acknowledgement => {
        try {
          const serverAnswers = acknowledgement.exam?.answers ?? acknowledgement.answers;
          if (acknowledgement.expired) {
            confirmed = clone(serverAnswers ?? confirmed);
            latest = clone(confirmed);
            expired = true;
            confirmedRevision = revision;
          } else {
            confirmed = clone(serverAnswers ?? sending);
            confirmedRevision = savingRevision;
            if (revision === savingRevision) latest = clone(confirmed);
          }
          onAcknowledged?.(acknowledgement, clone(confirmed));
          next();
        } catch (reason) { fail(reason); }
      }, fail);
    }
    next();
    return operation;
  }

  return { update, flush, isDirty, snapshot: () => clone(latest) };
}
