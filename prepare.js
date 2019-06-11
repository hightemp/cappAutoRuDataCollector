
const fs = require('fs');

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

var oURLS = {};

for (var sFileName of [
	"auto_ru_URLS.old.json", 
	"auto_ru_URLS.old2.json", 
	"auto_ru_URLS.old3.json",
	"auto_ru_URLS.old4.json",
	"auto_ru_URLS.old5.json",
	"auto_ru_URLS.old6.json",
	"auto_ru_URLS.old7.json",
	"auto_ru_URLS.old8.json",
	"auto_ru_URLS.old9.json"
]) {
	if (fs.existsSync(sFileName)) {
		var oLoadedURLs = JSON.parse(fs.readFileSync(
			sFileName,
			"utf8"
		));
		
		oURLS = extend(oURLS, oLoadedURLs);
	}
}

var sSQL = "";

for (var sBrand in oURLS) {
	for (var sModel in oURLS[sBrand]) {
		if (typeof oURLS[sBrand][sModel] == "object") {
			for (var sSubModel in oURLS[sBrand][sModel][sSubModel]) {
				sSQL += `\n`;
			}
		} else {
			sSQL += `\n`;
		}
	}
}

fs.writeFileSync(
	"auto_ru_URLS.json", 
	JSON.stringify(oURLS),
	function() { }
);