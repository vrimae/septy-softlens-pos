const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(/<Button[^>]*>[\s\S]*?<\/Button>/gi);
        if (matches) {
          matches.forEach(m => {
            if (!m.includes('onClick') && !m.includes('type="submit"')) {
              console.log(file, ':', m.substring(0, 80).replace(/\n/g, ' '));
            } else if (m.includes('alert("Belum') || m.includes('alert(Belum') || m.includes("alert('Belum")) {
              console.log(file, ':', 'Has alert Belum tersedia');
            } else if (m.includes('onClick={() => alert(')) {
                console.log(file, ':', m.substring(0, 80).replace(/\n/g, ' '));
            }
          });
        }
        
        const rawMatches = content.match(/<button[^>]*>[\s\S]*?<\/button>/gi);
        if (rawMatches) {
            rawMatches.forEach(m => {
                if (!m.includes('onClick') && !m.includes('type="submit"')) {
                  console.log(file, ': RAW:', m.substring(0, 80).replace(/\n/g, ' '));
                } else if (m.includes('alert("Belum') || m.includes('alert(Belum') || m.includes("alert('Belum")) {
                  console.log(file, ': RAW:', 'Has alert Belum tersedia');
                } else if (m.includes('onClick={() => alert(')) {
                    console.log(file, ': RAW:', m.substring(0, 80).replace(/\n/g, ' '));
                }
              });
        }
      }
    }
  });
  return results;
}
walk('src/app');
