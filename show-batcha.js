var fs = require("fs");
var files = [
  "scripts/baseline/compare-catalogs.cjs",
  "scripts/baseline/capture-full-catalog.cjs",
  "scripts/baseline/capture-production-catalog.cjs"
];
for (var i = 0; i < files.length; i++) {
  var c = fs.readFileSync(files[i], "utf8");
  console.log("===FILE:" + files[i] + "===LINES:" + c.split("\n").length + "===");
  console.log(c);
  console.log("===END===");
}
