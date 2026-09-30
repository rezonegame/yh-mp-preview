// One-time, opt-in mechanical migration to Obsidian's supported inline-style API.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

if (!process.argv.includes('--write')) throw new Error('Pass --write to perform this mechanical migration');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
}
const safeStyleFiles = new Set([
  'src/templateManager.ts', 'src/backgroundManager.ts', 'src/containers/DialogueRenderer.ts',
  'src/containers/GalleryRenderer.ts', 'src/settings/CreateBackgroundModal.ts',
]);
for (const file of files('src').filter(file => file.endsWith('.ts') && !file.startsWith('src/assets/') && !file.startsWith('src/core/security/'))) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  let needsSafeStyle = false;
  function visit(node) {
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken].includes(node.operatorToken.kind)
      && ts.isPropertyAccessExpression(node.left) && ts.isPropertyAccessExpression(node.left.expression)
      && node.left.expression.name.text === 'style') {
      const target = node.left.expression.expression.getText(ast);
      const key = node.left.name.text;
      const value = node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken
        ? `${node.left.getText(ast)} + (${node.right.getText(ast)})` : node.right.getText(ast);
      edits.push({ start: node.getStart(ast), end: node.end, text: `${target}.setCssStyles({ ${key}: ${value} })` });
      return;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'setAttribute' && node.arguments.length === 2
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'style') {
      const target = node.expression.expression.getText(ast);
      const value = node.arguments[1];
      if (ts.isStringLiteral(value) && value.text === '') {
        edits.push({ start: node.getStart(ast), end: node.end, text: `${target}.removeAttribute('style')` });
      } else if (safeStyleFiles.has(file)) {
        needsSafeStyle = true;
        edits.push({ start: node.getStart(ast), end: node.end, text: `setSafeInlineStyle(${target}, ${value.getText(ast)})` });
      } else if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
        edits.push({ start: node.getStart(ast), end: node.end, text: `${target}.setCssStyles({ cssText: ${value.getText(ast)} })` });
      }
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) continue;
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  if (needsSafeStyle && !/import[^;]*\bsetSafeInlineStyle\b/.test(result)) {
    const module = file.startsWith('src/settings/') || file.startsWith('src/containers/') ? '../core/security/safeDom' : './core/security/safeDom';
    result = `import { setSafeInlineStyle } from '${module}';\n${result}`;
  }
  writeFileSync(file, result);
  console.log(`${file}: ${edits.length} mechanical style migrations`);
}
