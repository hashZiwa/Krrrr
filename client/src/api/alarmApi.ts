export type AlarmSettings = {
  enabled: boolean;
  time: string;
  active: boolean;
};

type AlarmSettingKey = "enabled" | "time" | "status";

async function requestAlarmSettings(path: string, init?: RequestInit): Promise<AlarmSettings> {
  const response = init ? await fetch(path, init) : await fetch(path);

  if (!response.ok) {
    throw new Error(`Alarm request failed: ${response.status}`);
  }

  return response.json() as Promise<AlarmSettings>;
}

export function fetchAlarmSettings(): Promise<AlarmSettings> {
  return requestAlarmSettings("/api/alarm/settings");
}

export function updateAlarmSetting(key: AlarmSettingKey, value: boolean | string): Promise<AlarmSettings> {
  return requestAlarmSettings(`/api/alarm/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
}
