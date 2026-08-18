var c = require("fs").readFileSync("scripts/baseline/ci-capture-row-counts.cjs","utf8");
c = c.replace(/\r\n/g, "\n");
console.log("11.Helper exists:", c.length > 100);
console.log("12.Uses DATABASE_URL:", c.includes("process.env.DATABASE_URL"));
console.log("13.Label from argv:", c.includes("process.argv[2]"));
console.log("14.Output to backups:", c.includes("backups/"));
