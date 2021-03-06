
const { app, BrowserWindow, dialog, shell } = require('electron')
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
        var bOnlySQL = process.argv.indexOf('--sql')!=-1
        
        try {
            await this.fnLoadURLs()

            if (!bOnlySQL) {
                await this.oWindow.setIgnoreMouseEvents(true, { forward: false })

                await this.fnParse()
                await this.fnSaveURLs()
            }

            this.fnGenerateSQLFile()
        } catch(oException) {
            console.log(`[E] ${oException.message}`)
            await this.oWindow.setIgnoreMouseEvents(false)
            return
        }

        shell.beep()
        shell.beep()
        shell.beep()

        await this.oWindow.close()
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

    fnGenerateSQLFile(sFileName ="auto_ru.sql")
    {
        console.log(`[!] Generating SQL file '${sFileName}'`);

        var sSQLFileContents = ""

        sSQLFileContents += `TRUNCATE TABLE \`lst_car_models__auto_ru\`;\n`;
        sSQLFileContents += `TRUNCATE TABLE \`lst_car_models_references__auto_ru\`;\n`;

        for (var sBrand in this.oURLs) {
            var sEscapedBrand = sBrand //.replace(/'/, "\\'");

            for (var sModel in this.oURLs[sBrand]) {
                if (sModel=='') {
                    console.log(`[!!] fnGenerateSQLFile - empty model in brand '${sBrand}'`);
                    continue;
                }

                var sEscapedModel = sModel //.replace(/'/, "\\'");

                if (typeof this.oURLs[sBrand][sModel] == "object") {
                    for (var sSubModel in this.oURLs[sBrand][sModel]) {
                        var sEscapedSubModel = sSubModel //.replace(/'/, "\\'");

                        sSQLFileContents += `INSERT INTO \`lst_car_models__auto_ru\` SET brand="${sEscapedBrand}", model="${sEscapedModel} ${sEscapedSubModel}", url="${this.oURLs[sBrand][sModel][sSubModel]}";\n`;
                    }
                } else {
                    sSQLFileContents += `INSERT INTO \`lst_car_models__auto_ru\` SET brand="${sEscapedBrand}", model="${sEscapedModel}", url="${this.oURLs[sBrand][sModel]}";\n`;
                }
            }
        }

        fs.writeFileSync(
            sFileName, 
            sSQLFileContents
        )

        console.log(`[+] SQL saved to '${sFileName}'`);
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
                console.log(`[+] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Found ${aResult.length}`);
                return aResult;    
            }
        }

        console.log(`[E] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnGetElementXPath(sXPath, iElementIndex=0, iWaitTime = this.iWaitTime)
    {
        sXPath = sXPath.replace(/'/, "\\'");

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

                        var oElement = oXPathResult.snapshotItem(${iElementIndex});
                        
                        if (!oElement) {
                            return -1;
                        }

                        window.SAVED_ELEMENTS.push(oElement);

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
        sXPath = sXPath.replace(/'/, "\\'");

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
                console.log(`[+] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Found ${iResult}`);
                return true;    
            }
        }

        console.log(`[E] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Element not found`);
        return false;
    }

    async fnGetElementCSS(sCSS, iElementIndex=0, iWaitTime = this.iWaitTime)
    {
        sCSS = sCSS.replace(/'/, "\\'");

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
        sCSS = sCSS.replace(/'/, "\\'");

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
        console.log(`[~] Get location - window.location - '${sResult}'`)
        
        return sResult
    }

    fnSleep(ms)
    {
        console.log(`[!] *** sleep ${ms}ms ***`)
        return new Promise(resolve=> {
            setTimeout(resolve, ms)
        })
    }

    async fnConsoleLogElementInnerHTMLWithCss(sCSS, iElementIndex=-1, iWaitTime = this.iWaitTime)
    {
        var oElement = await this.fnGetElementCSS(sCSS, iElementIndex, iWaitTime)

        if (oElement) {
            console.log(`[>] fnConsoleLogElementInnerHTMLWithCss - '${sCSS}' - `);
            this.fnConsoleDir(oElement.fnGetAttribute('innerHTML', true))
        } else {
            console.log(`[E] fnConsoleLogElementInnerHTMLWithCss - '${sCSS}' - Element not found`);
        }
    }

    async fnClickElementUntilCssExists(sElementCss, iElementIndex, sUntilCss, iUntilElementIndex, iTimes=10)
    {
        while (!await this.fnWaitElementCSS(sUntilCss, iUntilElementIndex, 1) && iTimes) {
            console.log(`[!] fnClickElementUntilCssExists - '${sUntilCss}' - ${iTimes}`)
            var oElement = await this.fnGetElementCSS(sElementCss, iElementIndex)
            await oElement.fnJavascriptClick()
            await this.fnSleep(500)
            --iTimes;
        }

        if (!await this.fnWaitElementCSS(sUntilCss, iUntilElementIndex, 1)) {
            throw new Error(`[${__line}] fnClickElementUntilCssExists - '${sUntilCss}' - Element not found`)
        }
    }

    async fnClickDOMElementUntilXPathExists(oDOMElement, sUntilXPath, iTimes=10)
    {
        while (!await this.fnWaitElementXPath(sUntilXPath, 1) && iTimes) {
            console.log(`[!] fnClickDOMElementUntilXPathExists - '${sUntilXPath}' - ${iTimes}`)
            await oDOMElement.fnJavascriptClick()
            await this.fnSleep(500)
            --iTimes
        }

        if (!await this.fnWaitElementXPath(sUntilXPath, 1)) {
            throw new Error(`[${__line}] fnClickElementUntilCssExists - '${sUntilXPath}' - Element not found`)
        }
    }

    async fnParse()
    {
        console.log('START PARSING');

        await this.fnLoadURL('https://auto.ru/moskva/cars/all/')

        if (!await this.fnWaitElementCSS(".Select__button")) {
            throw new Error(`[${__line}] .Select__button - Button not found`)
        }

        var oBodyElement = await this.fnGetElementCSS("body")

        // Открытие списка с марками(брендами)
        var oBrandsSelectButtonElement = await this.fnGetElementCSS(".Select__button")

        if (!oBrandsSelectButtonElement) {
            throw new Error(`[${__line}] Parsing brands list - Element not found '.Select__button'`)
        }

        await oBrandsSelectButtonElement.fnJavascriptClick()
        await this.fnSleep(500)

        // Получение списка с марками(брендами)
        var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])//*[contains(@class,\"Menu__group\")][descendant::*[text()=\"Все\"]]/*[contains(@class,\"MenuItem\")]"
        this.aBrands = await this.fnGetElementsAttributeXPath(sBrandMenuItemXPath, 'innerText', 1)

        for (var sBrand of this.aBrands) {
            console.log(`[!] ----------------- Brand - '${sBrand}'`)

            if (!this.oURLs[sBrand]) {
                this.oURLs[sBrand] = {}
            }

            await oBodyElement.fnJavascriptClick()
            await this.fnSleep(500)

            var oBrandsSelectButtonElement = await this.fnGetElementCSS(".Select__button")

            if (!oBrandsSelectButtonElement) {
                throw new Error(`[${__line}] brands list - Element not found '.Select__button'`)
            }

            await oBrandsSelectButtonElement.fnJavascriptClick()
            await this.fnSleep(500)

            var sBrandMenuXPath = "(//*[contains(@class,\"Select__menu\")])[1]" 
            var oBrandMenu = await this.fnGetElementXPath(sBrandMenuXPath)
            
            //console.log('[!] HTML: ', await oBrandMenu.fnGetAttribute("innerHTML"))
    
            var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])[1]//*[text()=\""+sBrand+"\"]"

            var oBrandMenuItem = await this.fnGetElementXPath(sBrandMenuItemXPath)

            if (!oBrandMenuItem) {
                throw new Error(`[${__line}] brands list - menu item - Element not found '${sBrandMenuItemXPath}'`)
            }

            oBrandMenuItem.fnJavascriptClick()
            await this.fnSleep(500)

            // Получение групп моделей
            console.log('[!] -----------------  Getting models groups ----------------- ')
            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

            if (!oModelsSelectButtonElement) {
                throw new Error(`[${__line}] models list - Element not found '.Select__button'`)
            }

            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid green")

            await this.fnClickElementUntilCssExists(".Select__button", 1, ".Select__menu", 0)

            var bHasMenuItemGroupRootClass = await this.fnWaitElementCSS(".Select__menu .MenuItemGroup_root", 0, 1)
            console.log(`[!] bHasMenuItemGroupRootClass - ${bHasMenuItemGroupRootClass}`)

            // Поиск всех групп моделей(пункты меню с кнопкой)
            var sModelsGroupsItemsXPath = '(//*[contains(@class,"Select__menu")])[1]//*[contains(@class,"MenuItemGroup")]/*[contains(@class,"MenuItem") and not(contains(@class,"MenuItemGroup"))][string-length(text()) > 0]'
            var aModelsGroups = await this.fnGetElementsAttributeXPath(sModelsGroupsItemsXPath, 'innerText', 1)

            if (!aModelsGroups) {
                if (bHasMenuItemGroupRootClass) {
                    throw new Error(`[${__line}] models groups - not found - bHasMenuItemGroupRootClass`)
                }
                console.log(`[!] models groups - not found`)
            } else {
                aModelsGroups = aModelsGroups.filter((v) => v != 'Любая')
                aModelsGroups = aModelsGroups.filter((v, p) => aModelsGroups.indexOf(v) == p )

                console.log(`[!] models groups found: ${aModelsGroups.length}`)
    
                for (var sModel of aModelsGroups) {
                    console.log(`[!] ----------------- Group model - ${sModel}`)

                    await oBodyElement.fnJavascriptClick()
                    await this.fnSleep(500)

                    var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                    if (!oModelsSelectButtonElement) {
                        throw new Error(`[${__line}] models list - oModelsSelectButtonElement - Element not found`)
                    }

                    await oModelsSelectButtonElement.fnSetStyle("border: 1px solid green")

                    await oModelsSelectButtonElement.fnJavascriptClick()
                    await this.fnSleep(500)

                    var sModelsGroupsModelButtonXPath = '(//*[contains(@class,"Select__menu")])[1]//*[preceding-sibling::*[text()="'+sModel+'"] and contains(@class,"Button")]'
                    var oModelsGroupsModelButton = await this.fnGetElementXPath(sModelsGroupsModelButtonXPath, 0, 1)

                    if (!oModelsGroupsModelButton) {
                        throw new Error(`[${__line}] models list - oModelsGroupsModelButton - Element not found`)
                    }

                    await oModelsGroupsModelButton.fnJavascriptClick()
                    await this.fnSleep(500)

                    // Получение списка подмоделей
                    var sSubmodelsListXPath = '(//*[contains(@class,"Select__menu")])[1]//*[descendant::*[text()="'+sModel+'"] and contains(@class,"MenuItemGroup")]//*[contains(@class,"MenuItemGroup__children")]//*[contains(@class,"MenuItem") and not(contains(@class,"MenuItemGroup"))]'
                    var aSubmodels = await this.fnGetElementsAttributeXPath(sSubmodelsListXPath, 'innerText', 1)

                    this.fnConsoleDir(aSubmodels)

                    if (!aSubmodels) {
                        throw new Error(`[${__line}] models groups - ${sModel} - submodels not found`)
                    } else {
                        try {
                            aSubmodels.filter(function(v, p) { if (aSubmodels.indexOf(v) != p) throw new Error(`[${__line}] dublicates detected in aSubmodels`) })
                        } catch(oException) {
                            //throw new Error(`[${__line}] submodels list - duplicate submodels`)
                            console.log("[!!] submodels list - duplicate submodels")
                        }

                        aSubmodels = aSubmodels.filter((v, p) => aSubmodels.indexOf(v) == p )

                        for (var sSubModel of aSubmodels) {
                            console.log(`[!] ----------------- Submodel - '${sSubModel}'`)

                            if (this.oURLs[sBrand][sModel] && this.oURLs[sBrand][sModel][sSubModel]) {
                                continue
                            }

                            await oBodyElement.fnJavascriptClick()
                            await this.fnSleep(500)
    
                            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                            if (!oModelsSelectButtonElement) {
                                throw new Error(`[${__line}] models list - oModelsSelectButtonElement - Element not found`)
                            }

                            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid orange")
    
                            await oModelsSelectButtonElement.fnJavascriptClick()
                            await this.fnSleep(500)

                            var sModelsGroupsModelButtonXPath = '(//*[contains(@class,"Select__menu")])[1]//*[preceding-sibling::*[text()="'+sModel+'"] and contains(@class,"Button")]'
                            var oModelsGroupsModelButton = await this.fnGetElementXPath(sModelsGroupsModelButtonXPath, 0, 1)
        
                            if (!oModelsGroupsModelButton) {
                                throw new Error(`[${__line}] models list - oModelsGroupsModelButton - Element not found`)
                            }

                            await this.fnClickDOMElementUntilXPathExists(oModelsGroupsModelButton, '(//*[contains(@class,"Select__menu")])[1]//*[text()="'+sSubModel+'"]')
    
                            var sSubmodelXPath = '(//*[contains(@class,"Select__menu")])[1]//*[text()="'+sSubModel+'"]'
                            var oSubModelItem = await this.fnGetElementXPath(sSubmodelXPath, 0, 1)
    
                            if (!oSubModelItem) {
                                throw new Error(`[${__line}] models list - oSubModelItem - Element not found`)
                            }

                            await oSubModelItem.fnJavascriptClick()
                            await this.fnSleep(500)
    
                            if (!this.oURLs[sBrand][sModel]) {
                                this.oURLs[sBrand][sModel] = {}
                            }
                            this.oURLs[sBrand][sModel][sSubModel] = await this.fnGetLocation()
                        }
                    }
                }
            }
            console.log('[!] -----------------  END: Getting models groups ----------------- ')

            await oBodyElement.fnJavascriptClick()
            await this.fnSleep(500)

            // Получение моделей
            console.log('[!] -----------------  Getting models ----------------- ')
            var oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

            if (!oModelsSelectButtonElement) {
                throw new Error(`[${__line}] models list - Element not found '.Select__button'`)
            }

            await oModelsSelectButtonElement.fnSetStyle("border: 1px solid black")

            await oModelsSelectButtonElement.fnJavascriptClick()
            await this.fnSleep(500)

            var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//*[not(parent::*[contains(@class,"MenuItemGroup__root")]) and not(parent::*[contains(@class,"MenuItemGroup__children")]) and contains(@class,"MenuItem") and not(contains(@class,"MenuItemGroup")) and string-length(text()) > 0]'
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

                    await oBodyElement.fnJavascriptClick()
                    await this.fnSleep(500)

                    oModelsSelectButtonElement = await this.fnGetElementCSS(".Select__button", 1)

                    if (!oModelsSelectButtonElement) {
                        throw new Error(`[${__line}] models list - Element not found '.Select__button'`)
                    }

                    await oModelsSelectButtonElement.fnSetStyle("border: 1px solid red")

                    await oModelsSelectButtonElement.fnJavascriptClick()
                    await this.fnSleep(500)

                    if (!await this.fnWaitElementCSS(".Select__menu", -1, 1)) {
                        throw new Error(`[${__line}] models list - Element not found '.Select__menu'`)
                    }

                    var sModelMenuItemXPath = '(//*[contains(@class,"Select__menu")])[1]//*[text()="'+sModel+'"]' // [.//*[not(contains(@class,"MenuItemGroup__button"))]]
                    var oModelMenuItem = await this.fnGetElementXPath(sModelMenuItemXPath, 0, 1)

                    if (!oModelMenuItem) {
                        throw new Error(`[${__line}] brands list - menu item - Element not found '${sModelMenuItemXPath}'`)
                    }

                    await oModelMenuItem.fnJavascriptClick()
                    await this.fnSleep(500)

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