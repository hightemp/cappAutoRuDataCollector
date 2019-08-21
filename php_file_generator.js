
const fs = require('fs');

var oURLS = {};

oURLS = JSON.parse(fs.readFileSync(
	"auto_ru_URLS.json",
	"utf8"
));

var aArrayFromDB = [];

aArrayFromDB = JSON.parse(fs.readFileSync(
	"db_lada.json",
	"utf8"
));

var sContents = "";

LOOP1:
for (var oItem of aArrayFromDB) {
	for (var sModel in oURLS["LADA (ВАЗ)"]) {
		if (sModel==oItem.name) {
			sContents += `
if (\$new_res['car_brand']=="LADA" && \$new_res['car_model']=="${oItem.name}") {
	$sURL = "${oURLS["LADA (ВАЗ)"][sModel]}";
}
`
			continue LOOP1;
		}
	}
	sContents += `
if (\$new_res['car_brand']=="LADA" && \$new_res['car_model']=="${oItem.name}") {
	$sURL = "";
}
`
}

fs.writeFileSync(
	"result.php", 
	sContents,
	function() { }
);