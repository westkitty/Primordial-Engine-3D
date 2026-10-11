const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = __dirname;
const files = [];
function walk(dir) {for (const name of fs.readdirSync(dir)) {
  const file=path.join(dir,name); if(fs.statSync(file).isDirectory()) walk(file);
  else if(/\.tsx?$/.test(name)) files.push(file);
}}
walk(root);
let errors=0;
for(const file of files){
 const txt=fs.readFileSync(file,'utf8');
 const src=ts.createSourceFile(file,txt,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const diagnostics=src.parseDiagnostics;
 if(diagnostics.length){errors+=diagnostics.length; console.error(path.relative(root,file),diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')));}
}
console.log(`Parsed ${files.length} TypeScript/TSX sources; parse errors: ${errors}`);
process.exit(errors?1:0);
