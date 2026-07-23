import academicProForestTemplate from './academic-pro-forest.json';
import academicProTemplate from './academic-pro.json';
import appleProductTemplate from './apple-product.json';
import clearGuideTemplate from './clear-guide.json';
import dataBlueprintTemplate from './data-blueprint.json';
import deepReadingTemplate from './deep-reading.json';
import defaultTemplate from './default.json';
import easternNotesTemplate from './eastern-notes.json';
import minimalTemplate from './minimal.json';
import modernReportTemplate from './modern-report.json';
import oliveJournalTemplate from './olive-journal.json';
import productReviewTemplate from './product-review.json';
import redWhiteEditorialTemplate from './red-white-editorial.json';
import zenEssenceTemplate from './zen-essence.json';

/**
 * Distinct WeChat reading structures only. Colour-only and decorative legacy
 * variants were intentionally removed from the distributable catalogue.
 */
export const templates = {
    default: defaultTemplate,
    'deep-reading': deepReadingTemplate,
    'academic-pro': academicProTemplate,
    'clear-guide': clearGuideTemplate,
    'apple-product': appleProductTemplate,
    'product-review': productReviewTemplate,
    minimal: minimalTemplate,
    'red-white-editorial': redWhiteEditorialTemplate,
    'modern-report': modernReportTemplate,
    'data-blueprint': dataBlueprintTemplate,
    'zen-essence': zenEssenceTemplate,
    'eastern-notes': easternNotesTemplate,
    'academic-pro-forest': academicProForestTemplate,
    'olive-journal': oliveJournalTemplate,
};
