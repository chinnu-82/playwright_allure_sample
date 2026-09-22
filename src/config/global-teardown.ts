import type { FullConfig } from '@playwright/test';
import { writeEnvironmentProperties, writeExecutor } from './allure-metadata';

/** Runs once after all workers finish: writes Environment and Executor metadata for Allure. */
export default async function globalTeardown(_: FullConfig): Promise<void> {
  writeEnvironmentProperties();
  writeExecutor();
}
