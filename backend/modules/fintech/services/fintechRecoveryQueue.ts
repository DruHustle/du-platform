import fs from "fs/promises";
import path from "path";

type RecoveryFlow = "remittance" | "airtime";

type RecoveryRecord = {
  flow: RecoveryFlow;
  provider: string;
  userId: number;
  idempotencyKey: string | null;
  providerReference: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  recordedAt: string;
  reason: string;
  metadata?: Record<string, unknown>;
};

function resolveRecoveryFilePath(flow: RecoveryFlow) {
  const baseDir = path.resolve(process.cwd(), ".runtime", "fintech-recovery");
  return {
    baseDir,
    filePath: path.join(baseDir, `${flow}.jsonl`),
  };
}

export async function appendFintechRecoveryRecord(record: RecoveryRecord) {
  const { baseDir, filePath } = resolveRecoveryFilePath(record.flow);
  await fs.mkdir(baseDir, { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}
