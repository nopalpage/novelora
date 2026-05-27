const fs = require('fs');
let content = fs.readFileSync('src/index.js', 'utf8');

content = content.replace(/if \(!supabase\) return ok\(c, MOCK_NOVELS\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_NOVELS\.filter\(n => n\.title\.toLowerCase\(\)\.includes\(q\.toLowerCase\(\)\)\)\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_NOVELS\.find\(n => n\.id === c\.req\.param\("id"\)\) \|\| MOCK_NOVELS\[0\]\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_NOVELS\.slice\(0, 10\)\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_ANALYTICS_SUMMARY\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, \{ labels: MOCK_CHART_LABELS, values: MOCK_CHART_VALUES \}\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_NOVELS\.slice\(0, 5\)\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, MOCK_ADS\);/g, 'if (!supabase) return err(c, "Database not available", 503);');

content = content.replace(/if \(!supabase\) return ok\(c, \{ user: \{ email \}, mock: true \}\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, \{ sent: true, mock: true \}\);/g, 'if (!supabase) return err(c, "Database not available", 503);');
content = content.replace(/if \(!supabase\) return ok\(c, \{ verified: true, mock: true \}\);/g, 'if (!supabase) return err(c, "Database not available", 503);');

content = content.replace(/return ok\(c, data \|\| MOCK_NOVELS\);/g, 'return ok(c, data || []);');
content = content.replace(/return ok\(c, data \|\| MOCK_ADS\);/g, 'return ok(c, data || []);');

content = content.replace(/\/\* ── Mock data \(fallback tanpa Supabase\) ── \*\/[\s\S]*$/, '');

fs.writeFileSync('src/index.js', content);
console.log('Cleanup done.');
