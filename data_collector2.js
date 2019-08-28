
const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

Object.defineProperty(global, '__stack', {
    get: function() 
    {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});
    
Object.defineProperty(global, '__line', {
    get: function() 
    {
        return __stack[1].getLineNumber();
    }
});
    
Object.defineProperty(global, '__function', {
    get: function() 
    {
        return __stack[1].getFunctionName();
    }
});

class DOMElement
{
    constructor(oWindow_i, iID_i)
    {
        this.oWindow = oWindow_i
        this.iID = iID_i*1

        console.log(`[!] DOMElement ${this.iID} - created`)
    }

    async fnGetAttribute(sAttributeName, bAsArray=false)
    {
        console.log(`[!] DOMElement ${this.iID} - fnGetAttribute`)

        var sResult = await this.oWindow.webContents.executeJavaScript(`
            (function()
            {
                if (!window.SAVED_ELEMENTS[${this.iID}]) {
                    console.log('[E] fnGetAttribute - ${this.iID} - empty');
                    return false;
                }

                if (window.SAVED_ELEMENTS[${this.iID}].parentElement===null) {
                    console.log('[E] fnGetAttribute - ${this.iID} - parentElement===null');
                    return false;
                }

                if (${bAsArray}) {
                    return window.SAVED_ELEMENTS[${this.iID}]['${sAttributeName}'];
                } else {
                    return window.SAVED_ELEMENTS[${this.iID}].getAttribute('${sAttributeName}');
                }
            })()
        `)
        if (!sResult) {
            console.log(`[E] DOMElement ${this.iID} - fnGetAttribute - Element not found`)
            return;
        }

        console.log(`[+] DOMElement ${this.iID} - fnGetAttribute "${sAttributeName}" ${sResult}`)

        return sResult;        
    }

    async fnSetStyle(sCSS)
    {
        console.log(`[!] DOMElement ${this.iID} - fnSetStyle`)

        var bResult = await this.oWindow.webContents.executeJavaScript(`
            (function()
            {
                if (!window.SAVED_ELEMENTS[${this.iID}]) {
                    console.log('[E] fnSetStyle - ${this.iID} - empty');
                    return false;
                }

                if (window.SAVED_ELEMENTS[${this.iID}].parentElement===null) {
                    console.log('[E] fnSetStyle - ${this.iID} - parentElement===null');
                    return false;
                }

                window.SAVED_ELEMENTS[${this.iID}].setAttribute("style", "${sCSS}");

                return true;
            })()
        `)
        if (!bResult) {
            console.log(`[E] DOMElement ${this.iID} - fnSetStyle - Element not found`)
            return;
        }

        console.log(`[+] DOMElement ${this.iID} - fnSetStyle "${sCSS}" ${bResult}`)

        return bResult;
    }

    async fnGetClientPosition()
    {
        console.log(`[!] DOMElement ${this.iID} - fnGetClientPosition`)

        var sResult = await this.oWindow.webContents.executeJavaScript(`
            (function()
            {
                if (!window.SAVED_ELEMENTS[${this.iID}]) {
                    console.log('[E] fnGetClientPosition - ${this.iID} - empty');
                    return false;
                }

                if (window.SAVED_ELEMENTS[${this.iID}].parentElement===null) {
                    console.log('[E] fnGetClientPosition - ${this.iID} - parentElement===null');
                    return false;
                }

                return JSON.stringify(window.SAVED_ELEMENTS[${this.iID}].getBoundingClientRect());
            })()
        `)
        if (!sResult) {
            console.log(`[E] DOMElement ${this.iID} - fnGetClientPosition - Element not found`)
            return;
        }

        var oResult = JSON.parse(sResult);

        console.log(`[+] DOMElement ${this.iID} - fnGetClientPosition ${sResult}`)

        return oResult;
    }

    async fnSendInputClickEvent(oEvent_i = {})
    {
        var oEvent = {type: 'mouseDown', button:'left', ...oEvent_i}
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))

        var oEvent = {type: 'mouseUp', button:'left', ...oEvent_i}
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))
    }

    async fnClick(iClickCount = 1)
    {
        console.log(`[!] DOMElement ${this.iID} - fnClick`)

        var oBoundingClientRect = await this.fnGetClientPosition()

        if (!oBoundingClientRect) {
            console.log(`[E] DOMElement ${this.iID} - fnClick - Error. Can't click`)
            return false
        }

        var fX = (oBoundingClientRect.right + oBoundingClientRect.left)/2;
        var fY = (oBoundingClientRect.bottom + oBoundingClientRect.top)/2;

        for (let iIndex = 0; iIndex < iClickCount; iIndex++) {
            await this.fnSendInputClickEvent({ x:fX, y:fY })
        }

        return true
    }

    async fnJavascriptClick()
    {
        console.log(`[!] DOMElement ${this.iID} - fnJavascriptClick`)

        var sResult = await this.oWindow.webContents.executeJavaScript(`
            (function()
            {                
                if (!window.SAVED_ELEMENTS[${this.iID}]) {
                    console.log('[E] fnJavascriptClick - ${this.iID} - empty');
                    return false;
                }

                if (window.SAVED_ELEMENTS[${this.iID}].parentElement===null) {
                    console.log('[E] fnJavascriptClick - ${this.iID} - parentElement===null');
                    return false;
                }

                const mouseClickEvents = ['mousedown', 'click', 'mouseup'];
                function simulateMouseClick(element) 
                {
                    mouseClickEvents.forEach(function(mouseEventType) {
                        element.dispatchEvent(
                            new MouseEvent(mouseEventType, {
                                view: window,
                                bubbles: true,
                                cancelable: true,
                                buttons: 1
                            })
                        );
                    });
                }

                simulateMouseClick(window.SAVED_ELEMENTS[${this.iID}]);
                //window.SAVED_ELEMENTS[${this.iID}].click();

                return true;
            })()
        `)
    }
}

class AutoRuParser
{
    constructor(oWindow_i)
    {
        this.oWindow = oWindow_i
        this.iWaitTime = 1000
        this.sSavedURLsFileName = "auto_ru_URLs.json"
        this.aBrands = []
        this.oModels = {}
        this.oURLs = {}
    }

    async fnStart()
    {
        try {
            await this.fnLoadURLs()
            await this.fnParse()
            await this.fnSaveURLs()
        } catch(oException) {
            console.log(`[E] ${oException.message}`)
        }
    }

    fnLoadURLs(sFileName = this.sSavedURLsFileName)
    {
        console.log(`[!] URLs load from '${sFileName}'`);
        if (fs.existsSync(sFileName)) {
            this.oURLs = JSON.parse(fs.readFileSync(
				sFileName,
				"utf8"
            ))            
            console.log(`[+] URLs loaded from '${sFileName}'`);
        }
    }

    fnSaveURLs(sFileName = this.sSavedURLsFileName)
    {
        fs.writeFileSync(
            sFileName, 
            JSON.stringify(this.oURLs, null, 4)
        )
        console.log(`[+] URLs saved to '${sFileName}'`);
    }

    async fnGetElementsAttributeXPath(sXPath, aAttributeName, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var aResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oXPathResult = document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    console.log('fnGetElementsAttributeXPath', '${sXPath}', oXPathResult);
                    if (oXPathResult.snapshotLength>0) {
                        var aResult = [];

                        for (var iIndex=0; iIndex<oXPathResult.snapshotLength; iIndex++) {
                            aResult.push(oXPathResult.snapshotItem(iIndex)['${aAttributeName}']);
                        }

                        return aResult;
                    }
                    return false;
                })()
            `)

            if (aResult) {
                console.log(`[+] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - ${aResult.length}`);
                return aResult;    
            }
        }

        console.log(`[E] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnGetElementXPath(sXPath, iElementIndex=0, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oXPathResult = document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    console.log('fnGetElementXPath', '${sXPath}', oXPathResult);
                    if (oXPathResult.snapshotLength>0) {
                        if (!window.SAVED_ELEMENTS) {
                            window.SAVED_ELEMENTS = [];
                        }
                        window.SAVED_ELEMENTS.push(oXPathResult.snapshotItem(${iElementIndex}));
                        return window.SAVED_ELEMENTS.length-1;
                    }
                    return -1;
                })()
            `)

            if (iResult!=-1) {
                console.log(`[+] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Create element with id ${iResult}`);
                return new DOMElement(this.oWindow, iResult);    
            }
        }

        console.log(`[E] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnWaitElementXPath(sXPath, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnWaitElementXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength
            `)

            if (iResult) {
                console.log(`[+] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Found ${iResult} elements`);
                return true;    
            }
        }

        console.log(`[E] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnGetElementCSS(sCSS, iElementIndex=0, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementCSS '${sCSS}' ${iElementIndex} ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementCSS '${sCSS}' ${iElementIndex} ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oNodeList = document.querySelectorAll('${sCSS}');
                    console.log('fnGetElementCSS', '${sCSS}', oNodeList);
                    if (oNodeList.length>0) {
                        if (!window.SAVED_ELEMENTS) {
                            window.SAVED_ELEMENTS = [];
                        }
                        if (!oNodeList[${iElementIndex}]) {
                            return -1;
                        }
                        window.SAVED_ELEMENTS.push(oNodeList[${iElementIndex}]);
                        return window.SAVED_ELEMENTS.length-1;
                    }
                    return -1;
                })()
            `)

            if (iResult!=-1) {
                console.log(`[+] fnGetElementCSS '${sCSS}' ${iElementIndex} ${iWaitTime}s - Create element with id ${iResult}`);
                return new DOMElement(this.oWindow, iResult);    
            }
        }

        console.log(`[E] fnGetElementCSS '${sCSS}' ${iElementIndex} ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnWaitElementCSS(sCSS, iElementIndex=-1, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnWaitElementCSS '${sCSS}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Timeout`);
                break;
            }

            if (iElementIndex==-1) {
                var iResult = await this.oWindow.webContents.executeJavaScript(`document.querySelectorAll('${sCSS}').length`)

                if (iResult) {
                    console.log(`[+] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Found ${iResult} elements`);
                    return true;    
                }
            } else {
                var bResult = await this.oWindow.webContents.executeJavaScript(`!!document.querySelectorAll('${sCSS}')[${iElementIndex}]`)

                if (bResult) {
                    console.log(`[+] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Found 1 element`);
                    return true;    
                }
            }
        }

        console.log(`[E] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnGetLocation()
    {
        var sResult = await this.oWindow.webContents.executeJavaScript(`window.location.toString()`)
        
        return sResult
    }

    fnSleep(ms)
    {
        console.log(`[!] *** sleep ${ms}ms ***`)
        return new Promise(resolve=> {
            setTimeout(resolve, ms)
        })
    }

    async fnParse()
    {
        console.log('START PARSING');

        await this.fnLoadURL('https://auto.ru/moskva/cars/all/')

        if (!await this.fnWaitElementCSS(".Select__button")) {
            new Error("10001 - Button not found");
        }

        var oBodyElement = await this.fnGetElementCSS("body")

        // Открытие списка с марками(брендами)
        var oBrandsSelectButtonElement = await this.fnGetElementCSS(".Select__button")

        if (!oBrandsSelectButtonElement) {
            console.log(`[E] [${__line}] Parsing brands list - Element not found '.Select__button'`)
            return;
        }

        await oBrandsSelectButtonElement.fnClick()
        await this.fnSleep(500)

        // Получение списка с марками(брендами)
        var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])//*[contains(@class,\"Menu__group\")][descendant::*[text()=\"Все\"]]/*[contains(@class,\"MenuItem\")]"
        this.aBrands = await this.fnGetElementsAttributeXPath(sBrandMenuItemXPath, 'innerText', 1)

        for (var sBrand of this.aBrands) {
            console.log(`[!] Brand - '${sBrand}'`)

            this.oURLs[sBrand] = {}

            await oBodyElement.fnClick()
            await this.fnSleep(500)

            var oBrandsSelectButtonElement = await this.fnGetElementCSS(".Select__button")

            if (!oBrandsSelectButtonElement) {
                console.log(`[E] [${__line}] brands list - Element not found '.Select__button'`)
                return;
            }

            await oBrandsSelectButtonElement.fnClick()
            await this.fnSleep(500)

            var sBrandMenuXPath = "(//*[contains(@class,\"Select__menu\")])[1]" 
            var oBrandMenu = await this.fnGetElementXPath(sBrandMenuXPath)
            
            console.log('[!] HTML: ', await oBrandMenu.fnGetAttribute("innerHTML"))
    
            //var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])[1]//div[text()=\"Все\"]/following::*[text()=\""+sBrand+"\"]"
            var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])[1]//*[text()=\""+sBrand+"\"]"

            var oBrandMenuItem = await this.fnGetElementXPath(sBrandMenuItemXPath)

            if (!oBrandMenuItem) {
                console.log(`[E] [${__line}] brands list - menu item - Element not found '${sBrandMenuItemXPath}'`)
                return;
            }

            oBrandMenuItem.fnJavascriptClick()

            // Получение групп моделей
            console.log('[!] -----------------  Getting models groups ----------------- ')
            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

            if (!oModelsSelectButtonElement) {
                console.log(`[E] [${__line}] models list - Element not found '.Select__button'`)
                return;
            }

            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid green")

            await oModelsSelectButtonElement.fnClick()
            await this.fnSleep(500)

            var bHasButtonClass = await this.fnWaitElementCSS(".Select__menu .Button", 0, 1)

            // Поиск всех групп моделей(пункты меню с кнопкой)
            //var sModelsGroupsItemsXPath = "(//*[contains(@class,\"Select__menu\")])[1]//*[contains(@class,\"Menu__group\")][descendant::*[text()=\"Все\"]]//*[contains(@class,\"MenuItemGroup__root\")]/*[contains(@class,\"MenuItem\")][string-length(text()) > 0]"
            var sModelsGroupsItemsXPath = '(//*[contains(@class,"Select__menu")])[1]//*[contains(@class,"MenuItemGroup")]/*[contains(@class,"MenuItem")][string-length(text()) > 0]'
            var aModelsGroups = await this.fnGetElementsAttributeXPath(sModelsGroupsItemsXPath, 'innerText', 1)

            if (!aModelsGroups) {
                if (!bHasButtonClass) {
                    console.log(`[E] [${__line}] models groups - not found - bHasButtonClass`)
                    return
                }
                console.log(`[!] models groups - not found`)
            } else {
                aModelsGroups = aModelsGroups.filter((v) => v != 'Любая')
                aModelsGroups = aModelsGroups.filter((v, p) => aModelsGroups.indexOf(v) == p )

                console.log(`[!] models groups found: ${aModelsGroups.length}`)
    
                for (var sModel of aModelsGroups) {
                    console.log(`[!] ----------------- Group model - ${sModel}`)

                    await oBodyElement.fnClick()
                    await this.fnSleep(500)

                    var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                    if (!oModelsSelectButtonElement) {
                        console.log(`[E] [${__line}] models list - oModelsSelectButtonElement - Element not found`)
                        return;
                    }

                    await oModelsSelectButtonElement.fnSetStyle("border: 1px solid green")

                    await oModelsSelectButtonElement.fnClick()
                    await this.fnSleep(500)

                    //var sModelsGroupsModelItemXPath = '(//*[contains(@class,"Select__menu")])[1]//div[text()="Все"]/following::*[text()="'+sModel+'"]/following::*[contains(@class,"Button")]'
                    var sModelsGroupsModelButtonXPath = '(//*[contains(@class,"Select__menu")])[1]//*[preceding-sibling::*[text()="'+sModel+'"]][contains(@class,"Button")]' //following::*[contains(@class,"Button")]'
                    var oModelsGroupsModelButton = await this.fnGetElementXPath(sModelsGroupsModelButtonXPath, 0, 1)

                    if (!oModelsGroupsModelButton) {
                        console.log(`[E] [${__line}] models list - oModelsGroupsModelButton - Element not found`)
                        return
                    }

                    await oModelsGroupsModelButton.fnJavascriptClick()
                    await this.fnSleep(500)

                    // Получение списка подмоделей
                    //var sSubmodelsListXPath = '(//*[contains(@class,"Select__menu")])[1]//*[contains(@class,"Menu__group")][descendant::*[text()="Все"]]//*[contains(@class,"MenuItemGroup__children")]/*[contains(@class,"MenuItem")]'
                    var sSubmodelsListXPath = '(//*[contains(@class,"Select__menu")])[1]//*[preceding-sibling::*[text()="'+sModel+'"]][contains(@class,"MenuItemGroup")][1]/*[contains(@class,"MenuItem")]'
                    var aSubmodels = await this.fnGetElementsAttributeXPath(sSubmodelsListXPath, 'innerText', 1)

                    this.fnConsoleDir(aSubmodels)

                    if (!aSubmodels) {
                        console.log(`[!] models groups - ${sModel} - submodels not found`)
                    } else {
                        for (var sSubModel of aSubmodels) {
                            console.log(`[!] ----------------- Submodel - '${sSubModel}'`)

                            if (this.oURLs[sBrand][sModel] && this.oURLs[sBrand][sModel][sSubModel]) {
                                continue
                            }

                            await oBodyElement.fnClick()
                            await this.fnSleep(500)
    
                            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                            if (!oModelsSelectButtonElement) {
                                console.log(`[E] [${__line}] models list - oModelsSelectButtonElement - Element not found`)
                                return;
                            }

                            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid orange")
    
                            await oModelsSelectButtonElement.fnClick()
                            await this.fnSleep(500)

                            var sModelsGroupsModelButtonXPath = '(//*[contains(@class,"Select__menu")])[1]//*[preceding-sibling::*[text()="'+sModel+'"]][contains(@class,"Button")]' //following::*[contains(@class,"Button")]'
                            var oModelsGroupsModelButton = await this.fnGetElementXPath(sModelsGroupsModelButtonXPath, 0, 1)
        
                            if (!oModelsGroupsModelButton) {
                                console.log(`[E] [${__line}] models list - oModelsGroupsModelButton - Element not found`)
                                return;
                            }

                            await oModelsGroupsModelButton.fnJavascriptClick()
                            await this.fnSleep(500)
    
                            //var sSubmodelXPath = '(//*[contains(@class,"Select__menu")])[1]//div[text()="Все"]/following::*[text()="'+sSubModel+'"]'
                            var sSubmodelXPath = '(//*[contains(@class,"Select__menu")])[1]//*[text()="'+sSubModel+'"]'
                            var oSubModelItem = await this.fnGetElementXPath(sSubmodelXPath, 0, 1)
    
                            if (!oSubModelItem) {
                                console.log(`[E] [${__line}] models list - oSubModelItem - Element not found`)
                                return;
                            }

                            await oSubModelItem.fnJavascriptClick()
    
                            if (!this.oURLs[sBrand][sModel]) {
                                this.oURLs[sBrand][sModel] = {}
                            }
                            this.oURLs[sBrand][sModel][sSubModel] = await this.fnGetLocation()
                        }
                    }
                }
            }
            console.log('[!] -----------------  END: Getting models groups ----------------- ')

            await oBodyElement.fnClick()
            await this.fnSleep(500)

            // Получение моделей
            console.log('[!] -----------------  Getting models ----------------- ')
            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

            if (!oModelsSelectButtonElement) {
                console.log(`[E] [${__line}] models list - Element not found '.Select__button'`)
                return;
            }

            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid black")

            await oModelsSelectButtonElement.fnClick()
            await this.fnSleep(500)

            //var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//div[text()="Все"]/following::*[contains(@class,"MenuItem")]'
            var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//*[not(parent::*[contains(@class,"MenuItemGroup__root")]) and contains(@class,"MenuItem") and not(contains(@class,"MenuItemGroup")) and string-length(text()) > 0]'
            var aModels = await this.fnGetElementsAttributeXPath(sModelMenuItemXPath, 'innerText', 1)

            if (aModels) {
                aModels = aModels.filter((v) => v != 'Любая')
                aModels = aModels.filter((v, p) => aModels.indexOf(v) == p )

                this.fnConsoleDir(aModels)

                for (var sModel of aModels) {
                    console.log(`[!] ----------------- Model - '${sModel}'`)

                    if (this.oURLs[sBrand][sModel]) {
                        continue
                    }

                    await oBodyElement.fnClick()
                    await this.fnSleep(500)

                    oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                    if (!oModelsSelectButtonElement) {
                        console.log(`[E] [${__line}] models list - Element not found '.Select__button'`)
                        return;
                    }

                    await oModelsSelectButtonElement.fnSetStyle("border: 1px solid red")

                    await oModelsSelectButtonElement.fnClick()
                    await this.fnSleep(500)

                    if (!await this.fnWaitElementCSS(".Select__menu", -1, 1)) {
                        console.log(`[E] [${__line}] models list - Element not found '.Select__menu'`)
                        return;
                    }

                    //var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//div[text()="Все"]/following::*[text()="'+sModel+'"]' // [.//*[not(contains(@class,"MenuItemGroup__button"))]]
                    var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//*[text()="'+sModel+'"]' // [.//*[not(contains(@class,"MenuItemGroup__button"))]]
                    var oModelMenuItem = await this.fnGetElementXPath(sModelMenuItemXPath, 0, 1)

                    if (!oModelMenuItem) {
                        console.log(`[E] [${__line}] brands list - menu item - Element not found '${sModelMenuItemXPath}'`)
                        return;
                    }

                    await oModelMenuItem.fnJavascriptClick()

                    this.oURLs[sBrand][sModel] = await this.fnGetLocation()
                }
            }
            console.log('[!] -----------------  END: Getting models ----------------- ')

            this.fnSaveURLs()
        }

        this.fnConsoleDir(this.oURLs)
    }

    fnConsoleDir(aValue)
    {
        console.dir(aValue, {depth: null, colors: true, maxArrayLength: null})
    }

    async fnLoadURL(sURL)
    {
        console.log(`[!] Loading URL '${sURL}'`)
        await this.oWindow.loadURL(sURL)
        console.log(`[!] URL loaded '${sURL}'`)
    }
}

async function createWindow() 
{
    var oAutoRuParser = new AutoRuParser(new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    }));

    await oAutoRuParser.fnStart();
}

app.on('ready', createWindow)