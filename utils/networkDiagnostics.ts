import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { logger } from './logger';

// Independent of apiClient on purpose — no baseURL, no interceptors, no auth
// header injection. These are plain reachability probes against known-good
// URLs, run before the login request, to isolate "the device can't reach
// motoxplus.com at all" from "something about the login request specifically
// fails."
const CHECK_URLS = ['https://motoxplus.com', 'https://motoxplus.com/api', 'https://motoxplus.com/favicon.ico'];

type AndroidPlatformConstants = {
  Release?: string;
  Model?: string;
  Brand?: string;
  Manufacturer?: string;
  Fingerprint?: string;
};

function logDeviceInfo() {
  const androidConstants =
    Platform.OS === 'android' ? (Platform.constants as AndroidPlatformConstants) : undefined;

  // eslint-disable-next-line no-console
  console.info(
    '[DEVICE INFO]',
    JSON.stringify(
      {
        platformOS: Platform.OS,
        platformVersion: Platform.Version,
        androidRelease: androidConstants?.Release,
        androidModel: androidConstants?.Model,
        androidBrand: androidConstants?.Brand,
        androidManufacturer: androidConstants?.Manufacturer,
        androidFingerprint: androidConstants?.Fingerprint,
        expoVersion: Constants.expoVersion,
        executionEnvironment: Constants.executionEnvironment,
        apiUrl: env.apiUrl,
      },
      null,
      2
    )
  );
}

/**
 * Runs plain GET probes against the site root, the API base, and a static
 * asset — before the login request fires — so a connectivity failure is
 * caught and fully logged before it gets conflated with an auth failure.
 * Returns false if any probe never got an HTTP response.
 */
export async function runConnectivityDiagnostics(): Promise<boolean> {
  // Literal, grep-able markers with no `await` above them — if these two
  // lines don't appear, this function never ran, period.
  // eslint-disable-next-line no-console
  console.log('DIAGNOSTICS START');
  // eslint-disable-next-line no-console
  console.log('DEVICE INFO', { apiUrl: env.apiUrl, platform: Platform.OS, version: Platform.Version });

  logDeviceInfo();

  let allReachable = true;
  for (const url of CHECK_URLS) {
    try {
      const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      // eslint-disable-next-line no-console
      console.info(
        '[DIAGNOSTIC GET OK]',
        JSON.stringify(
          { url, status: response.status, statusText: response.statusText, headers: response.headers },
          null,
          2
        )
      );
    } catch (error) {
      allReachable = false;
      logger.networkError(error as AxiosError, `diagnostic GET ${url}`);
    }
  }
  return allReachable;
}
