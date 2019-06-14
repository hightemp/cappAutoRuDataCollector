
var webdriver = require('selenium-webdriver');
const until = webdriver.until;

var by = require('selenium-webdriver/lib/by');
const By = by.By;

const fs = require('fs');

var chrome = require('selenium-webdriver/chrome');
var path = require('chromedriver').path;

var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);

var driver = new webdriver
	.Builder()
	.forBrowser('chrome')
	.build();

async function clickWhenClickable(locator, timeout)
{
	await driver.wait(async function(){
		return driver.findElement(locator).then(function(element){
			return element.click().then(function(){
				return true;
			}, function(err){
				return false;
			})
		}, function(err){
			return false;
		});
	}, timeout, 'Timeout waiting for ' + locator.value);
}

async function clickWhenClickableElement(locator, timeout, iIndex)
{
	await driver.wait(async function(){
		return driver.findElements(locator).then(function(elements){
			return elements[iIndex].click().then(function(){
				return true;
			}, function(err){
				return false;
			})
		}, function(err){
			return false;
		});
	}, timeout, 'Timeout waiting for ' + locator.value);
}

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

async function fnMain()
{
	var oPreviusURLS = {};

	for (var sFileName of [
	/*
			"auto_ru_URLS.old.json", 
			"auto_ru_URLS.old2.json", 
			"auto_ru_URLS.old3.json",
			"auto_ru_URLS.old4.json",
			"auto_ru_URLS.old5.json",
			"auto_ru_URLS.old6.json",
			"auto_ru_URLS.old7.json",
			"auto_ru_URLS.old8.json",
			"auto_ru_URLS.old9.json"
	*/
		]) {
		if (fs.existsSync(sFileName)) {
			var oLoadedURLs = JSON.parse(fs.readFileSync(
				sFileName,
				"utf8"
			));
			
			oPreviusURLS = extend(oPreviusURLS, oLoadedURLs);
		}
	}
			
	await driver
		.get("https://auto.ru/moskva/cars/all/");

	await driver.wait(function () {
		return until.elementLocated(By.css('.Select__button'));
	}, 10000).catch((err) => { console.error(err); });

	await driver.executeScript(function() {
		window.open = function() {};
	});
	
	await clickWhenClickableElement(By.css('.Select__button'), 10000, 0);

	await driver.sleep(300);

	console.log('---1---');

	var aBrandItems = await driver.executeScript(function() {
		var iterator = document.evaluate("(//*[contains(@class,'Select__menu')])//*[contains(@class,'Menu__group')][descendant::*[text()=\"Все\"]]/*[contains(@class,'MenuItem')]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
		var thisNode = iterator.iterateNext();
		var aElements = [];

		while (thisNode) {
			aElements.push(thisNode.textContent);
			//console.log(thisNode.parentNode.innerHTML);
			thisNode = iterator.iterateNext();
		}
		
		//return [...document.querySelectorAll('.MenuItem')].map((i) => i.innerHTML);
		return aElements;
	});

	await driver.executeScript(function() { document.body.click(); });

	var oModelsItems = {};
	var oURLS = {};

	console.log("Brands ", aBrandItems.length);
	
	var sSkeepBeforeBrand = "BMW";
	var sSkeepBeforeModel = "";
	var sSkeepBeforeSubModel = "";
	var bSkeepBeforeBrand = true;
	var bSkeepBeforeModel = false;
	var bSkeepBeforeSubModel = false;
	
	for (var sBrand of aBrandItems) {
		console.log(sBrand);
		
		if (bSkeepBeforeBrand) {
			if (sBrand==sSkeepBeforeBrand) {
				bSkeepBeforeBrand = false;
			} else {
				console.log("SKIPPED");
				continue;
			}
		}
		
		oURLS[sBrand] = {};
		
		await clickWhenClickableElement(By.css('.Select__button'), 10000, 0);
		await driver.sleep(300);
		
		await driver.executeScript(function(sBrand) {
			var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sBrand+"\"]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
			oElement.click();
		}, sBrand);
		
		await driver.executeScript(function() { document.body.click(); });
		await driver.sleep(300);
		
		var iTimes = 3;
		
		oModelsItems[sBrand] = [];
		
		while (iTimes && !oModelsItems[sBrand].length) {
			await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);		
			await driver.sleep(300);
			
			if (iTimes<3) console.log('EMPTY '+sBrand);
			
			oModelsItems[sBrand] = await driver.executeScript(function() {
				var iterator = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//*[contains(@class,'Menu__group')][descendant::*[text()=\"Все\"]]/child::*[not(*)][contains(@class,'MenuItem')]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
				var thisNode = iterator.iterateNext();
				var aElements = [];
  
				while (thisNode) {
					aElements.push(thisNode.textContent);
					//console.log(thisNode.parentNode.innerHTML);
					thisNode = iterator.iterateNext();
				}
				
				//return [...document.querySelectorAll('.MenuItem')].map((i) => i.innerHTML);
				return aElements;
			});
			
			//oModelsItems[sBrand].splice(0, 1);
			
			await driver.executeScript(function() { document.body.click(); });
			await driver.sleep(300);
			
			iTimes--;
		}
		
		if (!oModelsItems[sBrand].length) {
			await driver.executeScript(function() { document.body.click(); });
			await driver.sleep(300);
			
			await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);
			
			oModelsItems[sBrand] = await driver.executeScript(function() {
				var iterator = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//*[contains(@class,'MenuItem')]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
				var thisNode = iterator.iterateNext();
				var aElements = [];
  
				while (thisNode) {
					aElements.push(thisNode.textContent);
					//console.log(thisNode.parentNode.innerHTML);
					thisNode = iterator.iterateNext();
				}
				
				//return [...document.querySelectorAll('.MenuItem')].map((i) => i.innerHTML);
				return aElements;
			});
			
			oModelsItems[sBrand].splice(0, 1);
		}
		
		var oModelsGroupsItems = [];
		var oModelsGroupsModelsItems = {};
		
		await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);
		await driver.sleep(300);
		
		oModelsGroupsItems = await driver.executeScript(function() {
			var iterator = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//*[contains(@class,'Menu__group')][descendant::*[text()=\"Все\"]]//*[contains(@class,'MenuItemGroup__root')]/*[contains(@class,'MenuItem')][string-length(text()) > 0]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
			var thisNode = iterator.iterateNext();
			var aElements = [];

			while (thisNode) {
				aElements.push(thisNode.textContent);
				//console.log(thisNode.parentNode.innerHTML);
				thisNode = iterator.iterateNext();
			}
			
			//return [...document.querySelectorAll('.MenuItem')].map((i) => i.innerHTML);
			return aElements;
		});
		
		console.log(oModelsGroupsItems);
		
		await driver.executeScript(function() { document.body.click(); });
		await driver.sleep(300);
		
		for (var sModel of oModelsGroupsItems) {
			console.log("\nModel ", sModel ," \n");
		
			if (bSkeepBeforeModel) {
				if (sModel==sSkeepBeforeModel) {
					bSkeepBeforeModel = false;
				} else {
					console.log("SKIPPED");
					continue;
				}
			}
			
			if (oPreviusURLS[sBrand] && oPreviusURLS[sBrand][sModel]) {
				console.log("FOUND IN oPreviusURLS");
				continue;
			}

			await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);
			await driver.sleep(300);
		
			await clickWhenClickable(By.xpath("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]/following::*[contains(@class,'Button')]"), 10000);
			await driver.sleep(300);
			/*
			await driver.executeScript(function(sModel) {
				var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]/following::*[contains(@class,'Button')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				console.log(oElement.getEventListeners(), oElement, oElement.innerHTML, oElement.parentNode, oElement.parentNode.innerHTML);
				oElement.click();
			}, sModel);
			console.log(">>>2 ", sModel ," \n");
			await driver.sleep(300000);
			*/
			
			oModelsGroupsModelsItems[sModel] = await driver.executeScript(function(sModel) {
				var iterator = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//*[contains(@class,'Menu__group')][descendant::*[text()=\"Все\"]]//*[contains(@class,'MenuItemGroup__children')]/*[contains(@class,'MenuItem')]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
				var thisNode = iterator.iterateNext();
				var aElements = [];

				while (thisNode) {
					aElements.push(thisNode.textContent);
					thisNode = iterator.iterateNext();
				}
				
				//return [...document.querySelectorAll('.MenuItem')].map((i) => i.innerHTML);
				return aElements;
			}, sModel);
			
			console.log(oModelsGroupsModelsItems[sModel]);

			await driver.executeScript(function() { document.body.click(); });
			await driver.sleep(300);			
			
			await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);
			await driver.sleep(500);
	
			await clickWhenClickable(By.xpath("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]/following::*[contains(@class,'Button')]"), 10000);
			await driver.sleep(300);
			
			for (var sSubModel of oModelsGroupsModelsItems[sModel]) {
				console.log(sBrand+" "+sModel+" "+sSubModel);

				if (!oURLS[sBrand]) {
					oURLS[sBrand] = {};
				}
				if (!oURLS[sBrand][sModel]) {
					oURLS[sBrand][sModel] = {};
				}			

				if (bSkeepBeforeSubModel) {
					if (sSubModel==sSkeepBeforeSubModel) {
						bSkeepBeforeSubModel = false;
					} else {
						console.log("SKIPPED");
						continue;
					}
				}
							
				if (oPreviusURLS[sBrand] && oPreviusURLS[sBrand][sModel] && oPreviusURLS[sBrand][sModel][sSubModel]) {
					oURLS[sBrand][sModel][sSubModel] = oPreviusURLS[sBrand][sModel][sSubModel];
					console.log("FOUND IN oPreviusURLS");
					continue;
				}

				/*
				await driver.executeScript(function(sSubModel) {
					var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sSubModel+"\"]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
					oElement.click();
				}, sSubModel);
				*/
				await clickWhenClickable(By.xpath("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sSubModel+"\"]"), 10000);				
				await driver.sleep(500);
				
				await clickWhenClickableElement(By.css('.Select__button'), 10000, 1);
				await driver.sleep(500);
				
				oURLS[sBrand][sModel][sSubModel] = await driver.executeScript(function() { return window.location.href; });
				
				await fs.writeFile(
					"auto_ru_URLS.json", 
					JSON.stringify(oURLS),
					function() { }
				);
			}
			
			/*
			await driver.executeScript(function(sModel) {
				var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]/following::*[contains(@class,'Button')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				oElement.click();
			}, sModel);
			*/
			await clickWhenClickable(By.xpath("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]"), 10000);			
			await driver.sleep(300);

			await driver.executeScript(function() { document.body.click(); });
			await driver.sleep(300);			
		}
		
		//oModelsItems[sBrand].splice(0, 1);
		
		await driver.executeScript(function() { document.body.click(); });
		await driver.sleep(300);			
		
		//*[contains(@class,'MenuItemGroup')]/
		
		for (var sModel of oModelsItems[sBrand]) {
			console.log(sBrand+" "+sModel);

			if (bSkeepBeforeModel) {
				if (sModel==sSkeepBeforeModel) {
					bSkeepBeforeModel = false;
				} else {
					console.log("SKIPPED");
					continue;
				}
			}
						
			if (oPreviusURLS[sBrand] && oPreviusURLS[sBrand][sModel]) {
				oURLS[sBrand][sModel] = oPreviusURLS[sBrand][sModel];
				console.log("FOUND IN oPreviusURLS");
				continue;
			}
			
			aSelectElements = await driver.findElements({ css:'.Select__button' });
			if (!aSelectElements) {
				console.error('ERROR: '+sModel);
				continue;
			}
			aSelectElements[1].click();
		
			await driver.sleep(300);
			
			await driver.executeScript(function(sModel) {
				//var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				var oElement = document.evaluate("(//*[contains(@class,'Select__menu')])[1]//div[text()=\"Все\"]/following::*[text()=\""+sModel+"\"][.//*[not(contains(@class,'MenuItemGroup__button'))]]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				if (!oElement) {
					console.error('ERROR: '+sModel);
					return;
				}
				oElement.click();
			}, sModel);
			
			await driver.sleep(300);
			
			if (!oURLS[sBrand]) {
				oURLS[sBrand] = {};
			}
			
			oURLS[sBrand][sModel] = await driver.executeScript(function() { return window.location.href; });
			
			await fs.writeFile(
				"auto_ru_URLS.json", 
				JSON.stringify(oURLS),
				function() { }
			);
			
			await driver.executeScript(function() { document.body.click(); });
			
			await driver.sleep(300);				
		}
		
		//break;
	}

	console.log('---2---');

	// document.evaluate("//*[contains(@class,'Select')]//*[contains(text(),'Audi')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue

	console.log(oURLS);	
}

fnMain();