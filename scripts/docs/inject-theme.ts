/** Re-apply allure-theme/ to an existing report without regenerating it (handy while tweaking CSS). */
import { injectTheme } from '../generate-report';
injectTheme();
console.log('Theme injected into allure-report/index.html');
