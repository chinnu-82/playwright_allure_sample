/**
 * Write Allure metadata (environment, executor, categories) into allure-results/
 * without generating a report. Useful after merging results from several
 * machines/shards, or before `allure serve`.
 */
import { writeCategories, writeEnvironmentProperties, writeExecutor } from '../src/config/allure-metadata';

const env = writeEnvironmentProperties();
writeExecutor();
writeCategories();
console.log('Allure metadata written:', env);
