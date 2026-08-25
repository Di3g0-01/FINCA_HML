const fs = require('fs');
const path = require('path');

function processDir(dir) {
  let files = fs.readdirSync(dir);
  for (let f of files) {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (p.endsWith('.jsx')) {
      let content = fs.readFileSync(p, 'utf8');
      
      // Match something like <Plus size={20} /> Nuevo Animal
      // Group 1: Icon tag and its props: <Plus size={20} /> or <FileSpreadsheet />
      // Group 2: The text following it
      const regex = /(<[A-Z][A-Za-z0-9]+\s*(?:size=\{[0-9]+\})?[^>]*\/>)\s+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ][A-Za-z0-9áéíóúÁÉÍÓÚñÑ\s]+)/g;
      
      let changed = false;
      content = content.replace(regex, (match, iconElement, text) => {
        text = text.trim();
        // Ignore cases that already have spans or are very short
        if (text.length > 2 && !match.includes('mobile-only') && !match.includes('desktop-only')) {
          changed = true;
          return `<span className="mobile-only">${iconElement}</span> <span className="desktop-only">${text}</span>`;
        }
        return match;
      });
      
      if (changed) {
         fs.writeFileSync(p, content);
         console.log('Updated', p);
      }
    }
  }
}

processDir('c:/Users/ovall/OneDrive - Universidad Rafael Landivar/Escritorio/FINCA_HML/frontend/src/pages');
processDir('c:/Users/ovall/OneDrive - Universidad Rafael Landivar/Escritorio/FINCA_HML/frontend/src/components');
