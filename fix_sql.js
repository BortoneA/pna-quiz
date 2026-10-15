const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'banco_questoes_pna_neon.sql');
const outputPath = path.join(__dirname, 'banco_questoes_pna_neon_corrigido.sql');

console.log('Lendo banco_questoes_pna_neon.sql...');
let content = fs.readFileSync(inputPath, 'utf8');

// 1. Corrigir subáreas para usar os capítulos corretos (não conflitantes)
console.log('Corrigindo subáreas...');
content = content.replace("(95, 93, '5.1',", "(95, 62, '5.1',");
content = content.replace("(119, 117, '7.2',", "(119, 27, '7.2',");
content = content.replace("(122, 103, '8.1',", "(122, 103, '8.2',");

// 2. Corrigir sintaxe da função get_questoes_aleatorias no final do dump
console.log('Corrigindo sintaxe da função get_questoes_aleatorias...');
content = content.replace(/AS\s+BEGIN\s+RETURN QUERY/i, "AS $$$$\nBEGIN\n    RETURN QUERY");
content = content.replace(/END;\s+LANGUAGE plpgsql;/i, "END;\n$$$$ LANGUAGE plpgsql;");

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Arquivo banco_questoes_pna_neon_corrigido.sql gerado com sucesso!');
