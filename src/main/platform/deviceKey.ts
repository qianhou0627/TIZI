import { execFile } from 'node:child_process';
import { createHash, randomUUID as createRandomUUID } from 'node:crypto';
import { promisify } from 'node:util';

import { createWindowsPowerShellEnvironment, resolveWindowsPowerShellPath } from './windowsPowerShell';

const execFileAsync = promisify(execFile);
const deviceRegistryKey = 'HKCU\\Software\\118 Studio\\YouYu';
const deviceRegistryValue = 'DeviceKey';

export type DeviceKeyCommand = {
  file: string;
  args: string[];
};

export type WindowsDeviceKeyProviderOptions = {
  platform?: NodeJS.Platform;
  runCommand?: (command: DeviceKeyCommand) => Promise<string>;
  randomUUID?: () => string;
};

export type DeviceKeyProvider = {
  getHardwareInfo?: () => Promise<Record<string, string> | undefined>;
  getDeviceKey: () => Promise<string | undefined>;
};

async function defaultRunCommand(command: DeviceKeyCommand): Promise<string> {
  const { stdout } = await execFileAsync(command.file, command.args, {
    windowsHide: true,
    timeout: 15000,
    env: createWindowsPowerShellEnvironment()
  });
  return stdout;
}

export function createWindowsDeviceKeyProvider(options: WindowsDeviceKeyProviderOptions = {}): DeviceKeyProvider {
  const platform = options.platform ?? process.platform;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const randomUUID = options.randomUUID ?? createRandomUUID;
  let hardwareInfo: Record<string, string> | undefined;
  let resolvedDeviceKey: string | undefined;
  let pending: Promise<string | undefined> | undefined;

  async function loadOrCreateDeviceKey(): Promise<string | undefined> {
    if (platform !== 'win32') return undefined;

    try {
      const raw = await runCommand({
        file: resolveWindowsPowerShellPath(),
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Get-CimInstance Win32_ComputerSystemProduct | Select-Object Vendor,Name,IdentifyingNumber,UUID | ConvertTo-Json -Compress'
        ]
      });
      const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const uuid = typeof data.UUID === 'string' ? data.UUID.trim().toLowerCase() : '';
      hardwareInfo = Object.fromEntries(
        ['Vendor', 'Name', 'IdentifyingNumber', 'UUID'].map((key) => [
          key,
          typeof data[key] === 'string' ? data[key].trim().slice(0, 256) : ''
        ])
      );
      hardwareInfo.collectedAt = new Date().toISOString();
      if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(uuid) && !/^[0f-]+$/.test(uuid)) {
        const hex = createHash('sha256')
          .update('youyu:smbios:v1:' + uuid)
          .digest('hex');
        return (
          hex.slice(0, 8) +
          '-' +
          hex.slice(8, 12) +
          '-5' +
          hex.slice(13, 16) +
          '-a' +
          hex.slice(17, 20) +
          '-' +
          hex.slice(20, 32)
        );
      }
    } catch {
      /* Hardware unavailable: retain the installation identity. */
    }
    const existing = parseDeviceKey(await queryDeviceKey().catch(() => ''));
    if (existing) return existing;

    try {
      await ensureRegistryKey();
    } catch {
      return undefined;
    }

    const recovered = parseDeviceKey(await queryDeviceKey().catch(() => ''));
    if (recovered) return recovered;

    const candidate = normalizeDeviceKey(randomUUID());
    if (!candidate) return undefined;

    try {
      await reg(['add', deviceRegistryKey, '/v', deviceRegistryValue, '/t', 'REG_SZ', '/d', candidate, '/f']);
      return parseDeviceKey(await queryDeviceKey());
    } catch {
      return undefined;
    }
  }

  async function ensureRegistryKey(): Promise<void> {
    try {
      await reg(['query', deviceRegistryKey]);
    } catch {
      await reg(['add', deviceRegistryKey, '/f']);
      await reg(['query', deviceRegistryKey]);
    }
  }

  function queryDeviceKey(): Promise<string> {
    return reg(['query', deviceRegistryKey, '/v', deviceRegistryValue]);
  }

  function reg(args: string[]): Promise<string> {
    return runCommand({ file: 'reg.exe', args });
  }

  return {
    async getHardwareInfo() {
      await this.getDeviceKey();
      return hardwareInfo;
    },
    async getDeviceKey() {
      if (resolvedDeviceKey) return resolvedDeviceKey;
      pending ??= loadOrCreateDeviceKey();
      const result = await pending;
      if (result) resolvedDeviceKey = result;
      else pending = undefined;
      return result;
    }
  };
}

function parseDeviceKey(output: string): string | undefined {
  const escapedName = deviceRegistryValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const value = output.match(new RegExp(`${escapedName}\\s+REG_SZ\\s+([^\\r\\n]+)`, 'i'))?.[1]?.trim();
  return normalizeDeviceKey(value);
}

function normalizeDeviceKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : undefined;
}
