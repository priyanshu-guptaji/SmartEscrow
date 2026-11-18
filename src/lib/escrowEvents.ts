import { decodeEventLog } from 'viem';
import { SMART_ESCROW_ABI } from './contracts';

type RawLog = {
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

/**
 * Find the escrow id emitted by `EscrowCreated` in a transaction receipt's
 * logs. Returns null when the event is absent (e.g. the wrong transaction).
 *
 * Shared by the wallet hook and the end-to-end test so both exercise the same
 * decoding logic that links a payment record to its on-chain escrow.
 */
export function extractEscrowIdFromLogs(logs: readonly RawLog[]): number | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: SMART_ESCROW_ABI,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      if (decoded.eventName === 'EscrowCreated' && decoded.args) {
        return Number((decoded.args as { id: bigint }).id);
      }
    } catch {
      // Not an event from this contract
    }
  }

  return null;
}
