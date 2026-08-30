const fs = require('fs');
let content = fs.readFileSync('src/components/YourShelvesView.tsx', 'utf8');

const badString = `        <div className="flex gap-2">\n          {onAutoSort <button<button (\n            <button\n              onClick={() => {\n                haptic.mediumImpact();\n                onAutoSort();\n              }}\n              className="px-4 py-2 bg-[#2C251D] hover:bg-[#3A332A] text-[#C9963F] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all flex items-center gap-1.5 border border-[#C9963F]/30 hover:border-[#C9963F]"\n            >\n              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>\n              <span className="hidden sm:inline">AUTO-SORT</span>\n            </button>\n          )}\n          <button`;

// Replace all occurrences of badString with '<button'
content = content.split(badString).join('<button');
fs.writeFileSync('src/components/YourShelvesView.tsx', content);
