
const fs = require('fs');

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

var oURLS = {};

if (fs.existsSync("auto_ru_URLS.json")) {
	oURLS = JSON.parse(fs.readFileSync(
		"auto_ru_URLS.json",
		"utf8"
	));
} else {
	for (var sFileName of [
		"auto_ru_URLS.old.json", 
		"auto_ru_URLS.old2.json", 
		"auto_ru_URLS.old3.json",
		"auto_ru_URLS.old4.json",
		"auto_ru_URLS.old5.json",
		"auto_ru_URLS.old6.json",
		"auto_ru_URLS.old7.json",
		"auto_ru_URLS.old8.json",
		"auto_ru_URLS.old9.json",
		"auto_ru_URLS.old10.json"
	]) {
		if (fs.existsSync(sFileName)) {
			var oLoadedURLs = JSON.parse(fs.readFileSync(
				sFileName,
				"utf8"
			));
			
			oURLS = extend(oURLS, oLoadedURLs);
		}
	}
	
	fs.writeFileSync(
		"auto_ru_URLS.json", 
		JSON.stringify(oURLS),
		function() { }
	);
}

var sSQL = "";

for (var sBrand in oURLS) {
	sBrand = sBrand.replace(/'/, "\\'");
	for (var sModel in oURLS[sBrand]) {
		if (sModel=='') {
			continue;
		}
		sModel = sModel.replace(/'/, "\\'");
		if (typeof oURLS[sBrand][sModel] == "object") {
			for (var sSubModel in oURLS[sBrand][sModel]) {
				sSubModel = sSubModel.replace(/'/, "\\'");
				sSQL += `INSERT INTO \`lst_car_models__auto_ru\` SET brand='${sBrand}', model='${sModel} ${sSubModel}', url='${oURLS[sBrand][sModel][sSubModel]}';\n`;
			}
		} else {
			sSQL += `INSERT INTO \`lst_car_models__auto_ru\` SET brand='${sBrand}', model='${sModel}', url='${oURLS[sBrand][sModel]}';\n`;
		}
	}
}

fs.writeFileSync(
	"auto_ru.sql", 
	sSQL,
	function() { }
);