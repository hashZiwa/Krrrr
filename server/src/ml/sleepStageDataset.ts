export type SleepStageValue = 0 | 1 | 2 | 3;

export type SleepStageTrainingRow = {
  timestampMs: number;
  sleepStage: SleepStageValue;
  respiratoryRate: number;
};

export type SleepStageCsvRow = {
  timestampMs: number;
  sleepStage: SleepStageValue | null;
  respiratoryRate: number;
};

const sleepStageByLabel: Record<string, SleepStageValue> = {
  Wake: 0,
  REM: 1,
  Light: 2,
  Deep: 3,
};

const sleepStageByCode: Record<string, SleepStageValue> = {
  "40001": 0,
  "40004": 1,
  "40002": 2,
  "40003": 3,
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseTimestamp(value: string): number {
  const timestamp = new Date(value.replace(" ", "T")).getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return timestamp;
}

function parseSleepStage(label: string, code: string): SleepStageValue | null {
  if (!label && !code) return null;

  const stage = sleepStageByLabel[label] ?? sleepStageByCode[code];

  if (stage === undefined) {
    throw new Error(`Unknown sleep stage: ${label} (${code})`);
  }

  return stage;
}

export function parseSleepStageCsv(csvText: string): SleepStageCsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const timestampIndex = headers.indexOf("timestamp");
  const stageIndex = headers.indexOf("sleep_stage");
  const stageCodeIndex = headers.indexOf("sleep_stage_code");
  const respiratoryRateIndex = headers.indexOf("respiratory_rate_bpm");

  if ([timestampIndex, stageIndex, stageCodeIndex, respiratoryRateIndex].some((index) => index < 0)) {
    throw new Error("Sleep stage CSV must include timestamp, sleep_stage, sleep_stage_code, respiratory_rate_bpm");
  }

  return lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line);
      const respiratoryRate = Number(cells[respiratoryRateIndex]);

      if (!Number.isFinite(respiratoryRate)) {
        throw new Error(`Invalid respiratory rate: ${cells[respiratoryRateIndex]}`);
      }

      return {
        timestampMs: parseTimestamp(cells[timestampIndex]),
        sleepStage: parseSleepStage(cells[stageIndex], cells[stageCodeIndex]),
        respiratoryRate,
      };
    })
    .sort((left, right) => left.timestampMs - right.timestampMs);
}
