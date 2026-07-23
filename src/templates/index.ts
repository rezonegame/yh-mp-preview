import academicProForestTemplate from './academic-pro-forest.json';
import academicProTemplate from './academic-pro.json';
import appleProductTemplate from './apple-product.json';
import defaultTemplate from './default.json';
import minimalTemplate from './minimal.json';
import modernReportTemplate from './modern-report.json';
import zenEssenceTemplate from './zen-essence.json';

/**
 * Distinct WeChat reading structures only. Colour-only and decorative legacy
 * variants were intentionally removed from the distributable catalogue.
 */
export const templates = {
    default: defaultTemplate,
    'academic-pro': academicProTemplate,
    'apple-product': appleProductTemplate,
    minimal: minimalTemplate,
    'modern-report': modernReportTemplate,
    'zen-essence': zenEssenceTemplate,
    'academic-pro-forest': academicProForestTemplate,
};
