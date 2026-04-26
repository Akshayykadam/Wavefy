const fs = require('fs');
const path = 'node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt';

let code = fs.readFileSync(path, 'utf8');

// Find all methods with @ReactMethod followed by fun ... = scope.launch {
const regex = /(@ReactMethod[\s\S]*?fun\s+\w+\([^)]*\))\s*=\s*scope\.launch\s*\{/g;

let modifiedCode = code;

// For each match, we need to replace the signature and find the matching closing brace.
// Actually, it's easier to just replace `) = scope.launch {` with `) { scope.launch {` 
// and then add `}` at the matching closing brace of the `scope.launch {` block.

let match;
let newCode = "";
let lastIndex = 0;

while ((match = regex.exec(code)) !== null) {
    const startOfMethod = match.index;
    const endOfMatch = regex.lastIndex; // points to just after `{`
    
    newCode += code.substring(lastIndex, match.index);
    newCode += match[1] + " {\n        scope.launch {";
    
    // Now find the matching closing brace
    let braceCount = 1;
    let i = endOfMatch;
    for (; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        else if (code[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                // Found the matching brace
                break;
            }
        }
    }
    
    // append the body and the closing brace
    newCode += code.substring(endOfMatch, i + 1);
    // append the extra closing brace for the method
    newCode += "\n    }";
    
    lastIndex = i + 1;
}

newCode += code.substring(lastIndex);

fs.writeFileSync(path, newCode);
console.log("Patched MusicModule.kt successfully");
