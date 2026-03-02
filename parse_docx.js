const fs = require('fs');
const xml = fs.readFileSync('D:/docx_ext/document.xml', 'utf8');

// A very naive XML parser for docx paragraphs
// Find all <w:p>...</w:p> blocks
const pRegex = /<w:p[\s>](.*?)<\/w:p>/g;
const tRegex = /<w:t[\s>]*>([^<]*)<\/w:t>/g;

let match;
let docText = [];
while ((match = pRegex.exec(xml)) !== null) {
    const pContent = match[1];
    let tMatch;
    let pText = "";
    // In docx sometimes text is split into multiple <w:t> tags in the same paragraph
    while ((tMatch = tRegex.exec(pContent)) !== null) {
        pText += tMatch[1];
    }
    if (pText) {
        docText.push(pText);
    }
}

fs.writeFileSync('D:/docx_parsed.txt', docText.join('\n'), 'utf8');
console.log('Doc parsed');
