import type { LibrarySaveBatchResult, LibrarySaveKind } from './apiTypes/librarySave.ts'

const MOCK_DELAY_MS = 120

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockSaveBatch(
  kind: LibrarySaveKind,
  ids: string[],
): Promise<LibrarySaveBatchResult> {
  await delay(MOCK_DELAY_MS)
  return { kind, ids, ok: true }
}
