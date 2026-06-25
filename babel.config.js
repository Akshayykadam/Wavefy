const fs = require('fs');
const path = require('path');

// Dynamically resolve exports from lucide-react-native to handle aliases like Home -> house.js
let lucideExportMap = null;
function getLucideExportMap() {
  if (lucideExportMap) return lucideExportMap;
  
  lucideExportMap = {};
  try {
    const lucideMainPath = require.resolve('lucide-react-native/dist/esm/lucide-react-native.js');
    const fileContent = fs.readFileSync(lucideMainPath, 'utf8');
    const regex = /export\s+\{\s*([\s\S]*?)\s*\}\s*from\s*'(\.\/icons\/[^']+)'/g;
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      const specifiers = match[1];
      const relativePath = match[2];
      const fileNameWithExt = path.basename(relativePath);
      const fileName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.js'));
      
      const specifierRegex = /default\s+as\s+(\w+)/g;
      let specifierMatch;
      while ((specifierMatch = specifierRegex.exec(specifiers)) !== null) {
        const exportedName = specifierMatch[1];
        lucideExportMap[exportedName] = fileName;
      }
    }
  } catch (e) {
    // Fallback if node_modules is not yet populated or resolve fails
    console.warn("lucide-react-native export resolver fallback enabled:", e.message);
  }
  return lucideExportMap;
}

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Custom plugin to tree-shake lucide-react-native icons automatically
      function lucideImportResolver({ types: t }) {
        return {
          visitor: {
            ImportDeclaration(path) {
              if (path.node.source.value === 'lucide-react-native') {
                const specifiers = path.node.specifiers;
                
                // If they are importing all of it using namespace or default import, don't rewrite
                if (specifiers.some(s => t.isImportNamespaceSpecifier(s) || t.isImportDefaultSpecifier(s))) {
                  return;
                }
                
                const exportMap = getLucideExportMap();
                const newImports = [];
                
                for (const specifier of specifiers) {
                  const importedName = specifier.imported.name; // e.g. "Home", "ArrowLeft"
                  const localName = specifier.local.name; // e.g. "Home", "SearchIcon"
                  
                  // Use map or convert PascalCase to kebab-case as fallback
                  let kebabName = exportMap[importedName];
                  if (!kebabName) {
                    kebabName = importedName
                      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
                      .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
                      .toLowerCase();
                  }
                  
                  const iconPath = `lucide-react-native/dist/esm/icons/${kebabName}`;
                  newImports.push(
                    t.importDeclaration(
                      [t.importDefaultSpecifier(t.identifier(localName))],
                      t.stringLiteral(iconPath)
                    )
                  );
                }
                
                path.replaceWithMultiple(newImports);
              }
            }
          }
        };
      }
    ]
  };
};
