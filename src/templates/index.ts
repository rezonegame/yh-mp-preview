// 使用 import 导入 JSON 文件
import defaultTemplate from './default.json';
import minimalTemplate from './minimal.json';
import scarletTemplate from './scarlet.json';
import orangeTemplate from './orange.json';
import elegantTemplate from './elegant.json';
import darkTemplate from './dark.json';
import academicTemplate from './academic.json';
import yebanTemplate from './yeban.json';
import yebanOrangeTemplate from './yeban-orange.json';
import darkgreenTemplate from './darkgreen.json';
import brownTemplate from './brown.json';
// 新增模板
import playfulTemplate from './playful.json';
import blackboardTemplate from './blackboard.json';
import adventureTemplate from './adventure.json';
import warmthTemplate from './warmth.json';
import gameuiTemplate from './gameui.json';
// 亲子教育主题
import parentChildTemplate from './parent-child.json';
import teacherTemplate from './teacher.json';
import kindergartenTemplate from './kindergarten.json';
// 新增专业与极简系列
import academicProTemplate from './academic-pro.json';
import academicProSlateTemplate from './academic-pro-slate.json';
import academicProForestTemplate from './academic-pro-forest.json';
import zenEssenceTemplate from './zen-essence.json';
import zenEssenceSakuraTemplate from './zen-essence-sakura.json';
import zenEssenceTealTemplate from './zen-essence-teal.json';
import modernReportTemplate from './modern-report.json';
import modernReportNavyTemplate from './modern-report-navy.json';
import autumnWarmTemplate from './autumn-warm.json';
import springFreshTemplate from './spring-fresh.json';
import oceanCalmTemplate from './ocean-calm.json';
import cyberNeonTemplate from './cyber-neon.json';
import appleProductTemplate from './apple-product.json';

// Minimal Series (8 themes)
import minimalGoldTemplate from './minimal-gold.json';
import minimalGreenTemplate from './minimal-green.json';
import minimalBlueTemplate from './minimal-blue.json';
import minimalOrangeTemplate from './minimal-orange.json';
import minimalRedTemplate from './minimal-red.json';
import minimalNavyTemplate from './minimal-navy.json';
import minimalGrayTemplate from './minimal-gray.json';
import minimalSkyTemplate from './minimal-sky.json';

// Focus Series (8 themes)
import focusGoldTemplate from './focus-gold.json';
import focusGreenTemplate from './focus-green.json';
import focusBlueTemplate from './focus-blue.json';
import focusOrangeTemplate from './focus-orange.json';
import focusRedTemplate from './focus-red.json';
import focusNavyTemplate from './focus-navy.json';
import focusGrayTemplate from './focus-gray.json';
import focusSkyTemplate from './focus-sky.json';

// Elegant Series (8 themes)
import elegantGoldTemplate from './elegant-gold.json';
import elegantGreenTemplate from './elegant-green.json';
import elegantBlueTemplate from './elegant-blue.json';
import elegantOrangeTemplate from './elegant-orange.json';
import elegantRedTemplate from './elegant-red.json';
import elegantNavyTemplate from './elegant-navy.json';
import elegantGrayTemplate from './elegant-gray.json';
import elegantSkyTemplate from './elegant-sky.json';

// Bold Series (8 themes)
import boldGoldTemplate from './bold-gold.json';
import boldGreenTemplate from './bold-green.json';
import boldBlueTemplate from './bold-blue.json';
import boldOrangeTemplate from './bold-orange.json';
import boldRedTemplate from './bold-red.json';
import boldNavyTemplate from './bold-navy.json';
import boldGrayTemplate from './bold-gray.json';
import boldSkyTemplate from './bold-sky.json';

// xiaohu 主题（来自 xiaohu-wechat-format）
import { xiaohuThemes } from './xiaohu/index';

export const templates = {
    default: defaultTemplate,
    minimal: minimalTemplate,
    scarlet: scarletTemplate,
    orange: orangeTemplate,
    elegant: elegantTemplate,
    dark: darkTemplate,
    academic: academicTemplate,
    yeban: yebanTemplate,
    'yeban-orange': yebanOrangeTemplate,
    darkgreen: darkgreenTemplate,
    brown: brownTemplate,
    // 新增导出
    playful: playfulTemplate,
    blackboard: blackboardTemplate,
    adventure: adventureTemplate,
    warmth: warmthTemplate,
    gameui: gameuiTemplate,
    // 亲子教育主题
    'parent-child': parentChildTemplate,
    teacher: teacherTemplate,
    kindergarten: kindergartenTemplate,
    'academic-pro': academicProTemplate,
    'academic-pro-slate': academicProSlateTemplate,
    'academic-pro-forest': academicProForestTemplate,
    'zen-essence': zenEssenceTemplate,
    'zen-essence-sakura': zenEssenceSakuraTemplate,
    'zen-essence-teal': zenEssenceTealTemplate,
    'modern-report': modernReportTemplate,
    'modern-report-navy': modernReportNavyTemplate,
    'autumn-warm': autumnWarmTemplate,
    'spring-fresh': springFreshTemplate,
    'ocean-calm': oceanCalmTemplate,
    'cyber-neon': cyberNeonTemplate,
    'apple-product': appleProductTemplate,

    // Minimal Series
    'minimal-gold': minimalGoldTemplate,
    'minimal-green': minimalGreenTemplate,
    'minimal-blue': minimalBlueTemplate,
    'minimal-orange': minimalOrangeTemplate,
    'minimal-red': minimalRedTemplate,
    'minimal-navy': minimalNavyTemplate,
    'minimal-gray': minimalGrayTemplate,
    'minimal-sky': minimalSkyTemplate,

    // Focus Series
    'focus-gold': focusGoldTemplate,
    'focus-green': focusGreenTemplate,
    'focus-blue': focusBlueTemplate,
    'focus-orange': focusOrangeTemplate,
    'focus-red': focusRedTemplate,
    'focus-navy': focusNavyTemplate,
    'focus-gray': focusGrayTemplate,
    'focus-sky': focusSkyTemplate,

    // Elegant Series
    'elegant-gold': elegantGoldTemplate,
    'elegant-green': elegantGreenTemplate,
    'elegant-blue': elegantBlueTemplate,
    'elegant-orange': elegantOrangeTemplate,
    'elegant-red': elegantRedTemplate,
    'elegant-navy': elegantNavyTemplate,
    'elegant-gray': elegantGrayTemplate,
    'elegant-sky': elegantSkyTemplate,

    // Bold Series
    'bold-gold': boldGoldTemplate,
    'bold-green': boldGreenTemplate,
    'bold-blue': boldBlueTemplate,
    'bold-orange': boldOrangeTemplate,
    'bold-red': boldRedTemplate,
    'bold-navy': boldNavyTemplate,
    'bold-gray': boldGrayTemplate,
    'bold-sky': boldSkyTemplate,

    // xiaohu 主题
    ...xiaohuThemes,
};
