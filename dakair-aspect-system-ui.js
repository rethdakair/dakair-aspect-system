/* this code is not related in any kind, affiliated, etc, to BouncyRock, Talespire.
	It is meant to be included in mod (Symbiotes) for the Talespire application.

	Das --> Dakair Aspect System. Meant for HTML creation of custom Character sheets for Talespire 
*/
/**
 * This class hold the css selectors used for the detection and initialization of the Dakair Aspect System
 * Can be instanciated and custumized if needed. Else, contains the default values.
 * @class DasSelectors
 */
class DasSelectors {
	root = ''; // if defined, will limit which elemnts ti inspects. allowing multiple instance of DAS to run on different par of the DOM.
  field = '.field-data'; // element defining a field to be managed by Das
	display = '.field-display'; // element for value display without edit
    
	lineField = '.field-line-data'; // element defining a single field inside the line definition
	lineDisplay = '.field-line-display'; // element for value display without edit
	lineAdd = '.line-button-add'; // element defining a button to add "line", outside the line definition
  lineContainer = '.line-container'; // element defining the container that will receive the dynamically created lines
	lineDefinition = 'template.line-definition'; // element defining a "line of fields (like an array)"
  lineDelete = '.line-button-delete'; // delete button present inside the line definition
  lineParent = '.line-parent'; // element defining the parent element of each individual line

	lineFilterTemplate = 'template.line-filter-template';
	lineFilterDefinition = '.line-filter-definition';
}

/**
 * This class holds the dom attributes names used for the detection and initialization of the Dakair Aspect System
 * Can be instanciated and custumized if needed. Else, contains the defualt values.
 * values starts with data-, in accordance with HTML 5.
 *
 * @class DasAttributes
 */
class DasAttributes {
  dataType = 'data-value-kind'; // int, float, text

	defaultValue = 'data-default-value';
	valueDestination = 'data-value-attribute'; // for element that do not want value or innerText set. the named attribute will be set instead (display only).
	fnValueChange = "data-value-callback"; // Value must be a root function. When value change in the UI, window[value](domElement, newValue) will be called

	fieldKey = 'data-ref-key';
  fieldFormula = 'data-formula';
  fieldReference = 'data-reference';
    
  lineID = 'data-line-id';
  lineName = 'data-line-name';
}

class DomLineInfo {
	/**
	 * Creates an instance of DomLineInfo.
	 * @param {string} lineName
	 * @param {string} lineID
	 * @memberof DomLineInfo
	 */
	constructor(lineElement, lineName, lineID) {
		/** @type {Element} */
		this.lineElement = lineElement;
		/** @type {Map<string,DomLineProperty>} */
		this.properties = new Map();
		/** @type {string} */
		this.lineName = lineName;
		/** @type {string} */
		this.lineID = lineID;
	}
}
class DomLineProperty {
/**
 * Creates an instance of DomLineProperty.
 * @param {DomLineInfo} line
 * @param {Element} element
 * @param {string} refKey
 * @param {string|number} value
 * @memberof DomLineProperty
 */
constructor(line, element, refKey, value) {
		/** @type {DomLineInfo} */
		this.parentLine = line;
		/** @type {string} */
		this.refKey = refKey;
		/** @type {Element} */
		this.element = element;
		/** @type {number|string} */
		this.value = value;
	}
}

class LineFiltering {
	/** @type {LineFilter[]} */
	#_filters = new Array();

	/**
	 * Add an active line filter processor
	 * @param {*} filterName
	 * @param {*} lineName
	 * @memberof LineFiltering
	 */
	addFilter(filterName, lineName) {
		let filter = new LineFilter(filterName, lineName);
		this.#_filters.push(filter);
	}

	/**
	 * @param {DasUiHandler} uiHandler
	 * @param {AspectModifiedInfo} modifiedAspect
	 * @memberof LineFiltering
	 */
	validateChange(uiHandler, modifiedAspect) {
		if (modifiedAspect.lineOperation != 'filter') {
			return; // not a line field, ignore value
		}
		// DEBUG
		console.log(`validateChange filtering ${modifiedAspect.name} : ${JSON.stringify(modifiedAspect.value)}`);
		let lineIds = Array.isArray(modifiedAspect.value) ? modifiedAspect.value : [];
		for(let filter of this.#_filters) {
			if (filter.name != modifiedAspect.name) {
				continue;
			}
			let changes = filter.getChangeList(lineIds);
			for (let change of changes) {
				switch (change.op) {
					case 'add':
						this.#addLine(uiHandler, filter, change.lineID); 
						uiHandler.resend(filter.lineName, change.lineID);	
						break;
					case 'del':
						this.#removeLine(uiHandler, filter, change.lineID);
						break;
				}
			}
		}
	}

	/**	
	 *  adds a line in the UI for a filter
	 * 	@param {DasUiHandler} uiHandler Ui handler to interact with the dom
	 * 	@param {LineFilter} lineFilter LineFilter affected
	 *  @param {string} lineID Line ID added
	*/
	#addLine(uiHandler,lineFilter, lineID) {
		uiHandler.addNewDomLine(lineFilter.lineName, lineID, lineFilter.name);
		lineFilter.addLine(lineID);
	}
	
	/**
	 * Remove a line in the UI for a filter
	 * @param {DasUiHandler} uiHandler
	 * @param {LineFilter} lineFilter
	 *  @param {string} lineID Line ID to remove
	 * @memberof LineFiltering
	 */
	#removeLine(uiHandler,lineFilter, lineID) {
		uiHandler.deleteDomLine(lineFilter.lineName, lineID, lineFilter.name);
		lineFilter.deleteLine(lineID);
	}
}

/**
 * @class LineFilter
 */
class LineFilter {
	#_name = '';
	#_lineName = '';
	/** @type {string[]} */
	#_lines = [];
	/** @typedef {{ op:string, lineID:string }} OperationInfo  */
	/** @type {OperationInfo[]} */
	actions = [];

	/**
	 * Creates an instance of LineFilter.
	 * @param {string} name Name of the filter, for Dom element reference
	 * @param {string} lineName Name of the LineElement that is an Aspect in DAS
	 * @memberof LineFilter
	 */
	constructor(name, lineName) {
		this.#_name = name;
		this.#_lineName = lineName;
		
	}
	get name() { return this.#_name; }
	get lineName() { return this.#_lineName; }

	/**
	 * @param {string} lineID
	 * @memberof LineFilter
	 */
	addLine(lineID) {
		this.#_lines.push(lineID);
	}

	/**
	 * @param {string} lineID
	 * @memberof LineFilter
	 */
	deleteLine(lineID) {
		let lineIndex = this.#_lines.indexOf(lineID);
		if (lineIndex > -1) {
			this.#_lines.splice(lineIndex,1);
		}
	}

	/**
	 * @param {string[]} lineIds
	 * @return {OperationInfo[]} Any Operations needed. null/empty for none
	 * @memberof LineFilter
	 */
	getChangeList(lineIds) {
		// compare lines ID to current line ID
		/** @type {OperationInfo[]} */
		let changeList = [];
		for (let currentLine of this.#_lines) {
			if (!lineIds.find((x) => x === currentLine)) {
				changeList.push({op:'del',lineID:currentLine});
			}
		}
		for (let newLine of lineIds) {
			if (!this.#_lines.find((x) => x === newLine)) {
				changeList.push({op:'add',lineID:newLine});
			}
		}
		return changeList;
	}

}

/**
 * This class handles the HTML DOM parsing and creation of the Dakair Aspect System
 * It creates the events needed to interact with the inputs, the events of data change and of ui refresh needed.
 * Create the HTML page (seed docs TODO: set doc), create an instance and then call initialize()
 * 
 * @class DasUiHandler
 */
class DasUiHandler {
	/** @type {DasSelectors} */
	#_dasSelectors = null;
	/** @type {DasAttributes} */
	#_dasAttributes = null;
	#_doCallback = true; // used to avoid setting callback on initial assignation of the system values
	/** @type {AspectSystemManager} */
	#_dakairAspectSystem = null;
	/** @type {DasStorageService} */
	#_storageService = null;
	/** @type {LineFiltering} */
	#_lineFiltering = null;

	/**
	 * Creates an instance of DasUiHandler.
	 * @param {DasSelectors} selectors - Optional class with css selectors for the fields. Else, use default value.
	 * @param {DasAttributes} attributes - Optional class with dom attributes for the fields. Else, use defaults values.
	 * @memberof DasUiHandler
	 */
	constructor(selectors, attributes, storageService) {
		if (selectors && !(selectors instanceof DasSelectors)) throw "selectors must be an instance of DasSelectors";
		if (attributes && !(attributes instanceof DasAttributes)) throw "attributes must be an instance of DasAttributes";
		this.#_dasSelectors = selectors ?? new DasSelectors();
		this.#_dasAttributes = attributes ?? new DasAttributes();
		this.#_storageService = storageService;
		this.#_lineFiltering = new LineFiltering();
	}

	get selects() { return this.#_dasSelectors; }
	get attrs() { return this.#_dasAttributes; }
	get doCallback() { return this.#_doCallback; }

	/**
	 * Initialize the DAS when the Dom is ready
	 * @param {string} dataContextName
	 * @memberof DasUiHandler
	 */
	initialize(dataContextName) {
		let fnLoad = () => {
			if (document.readyState == "complete") {
				console.log('initializing ' + dataContextName);
				this.#initializeWhenReady(dataContextName);	
			}
		}
		if (document.readyState != "complete") {
			document.addEventListener('readystatechange', fnLoad);
		} else {
			this.#initializeWhenReady(dataContextName);
		}
		
	}

	/**
	 * Restore callback functionnality. For debug purpose.
	 * @memberof DasUiHandler
	 */
	unstuck() {
		this.#_doCallback = true;
	}

	/**
	 * Loads data from the StorageSystem with the given key
	 * @param {string} dataKey key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	load(dataKey) {
		this.#_dakairAspectSystem.loadData(dataKey);
	}

	/**
	 * Reset data in the UI
	 * @memberof DasUiHandler
	 */
	reset() {
		this.#_dakairAspectSystem.resetData();
	}
	
	/**
	 * Saves data to the StorageSystem with the given key
	 * @param {string} dataKey key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	save(dataKey) {
		this.#_dakairAspectSystem.saveData(dataKey);
	}

	/**
	 * Sends an Aspect values back to the Ui, with the onchange callback
	 * @param {string} aspectName Aspect name to send back
	 * @param {string?} [lineID] lineID to resend. When empty, will resends all line
	 * @memberof DasUiHandler
	 */
	resend(aspectName, lineID) {
		this.#_dakairAspectSystem.resend(aspectName, lineID);
	}

	/**
	 * Initialize the system. Only call when the Dom is ready, else won't be able to find definitions
	 * @param {string} dataContextName key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	#initializeWhenReady(dataContextName) {
		console.log("initializeWhenReady called");
    this.#_dakairAspectSystem = new AspectSystemManager((aspect) => { this.onAspectValueChange(aspect); }, this.#_storageService);
		let aspectArray = this.#detectRegularAspects();
		aspectArray = aspectArray.concat(this.#detectLinesDefinitions());
		aspectArray = aspectArray.concat(this.#detectLineFilters());
		this.#detectLineAddButtons();
		this.#_dakairAspectSystem.loadDefinitions(aspectArray);
		this.load(dataContextName);
	}

	/**
	 * Finds all regular aspects defined in the DOM under the given root
	 * @return {AspectDefinition[]} List of regular Aspect Definitions
	 * @memberof DasUiHandler
	 */
	#detectRegularAspects() {
		let aspectArray = Array();
		let attrDomElements = document.querySelectorAll(`:not(${this.selects.lineDefinition}) ${this.selects.root} ${this.selects.field}`);
		for (let domElement of attrDomElements) {
			let attrDefinition = this.#getAspectDefinition(domElement);
			if (attrDefinition != null) {
				aspectArray.push(attrDefinition);
				this.#setupAspectElement(domElement, true);
			}		
		}
		return aspectArray;
	}

	/**
	 * Finds all Lines Aspects defined in the DOM under the given root
	 * @return {AspectDefinition[]} List of LineElement Aspect Definitions
	 * @memberof DasUiHandler
	 */
	#detectLinesDefinitions() {
		let linesTemplates = document.querySelectorAll(this.selects.root + ' ' + this.selects.lineDefinition);
		let allDefinitions = [];
		
		for(let nodeTemplate of linesTemplates) {
			let lineName = nodeTemplate.getAttribute(this.attrs.lineName);
			let queryableTemplate = nodeTemplate.content.cloneNode(true);
			let allLineFields = queryableTemplate.querySelectorAll(this.selects.lineField);

			let props = new LinePropertiesDefinition();
			for (let lineElement of allLineFields) {
				let info = this.#getAspectDefinition(lineElement);
				props.addProperty(info);
			}
			allDefinitions.push(new AspectDefinition(lineName, EnumAspectKind.Lines, props));
		}
		return allDefinitions;
	}

	/**
	 * Finds and creates all Lines Filters (UI Only) defined in the DOM under the given root.
	 * @memberof DasUiHandler
	 */
	#detectLineFilters() {
		let filterTemplates = document.querySelectorAll(this.selects.root + ' ' + this.selects.lineFilterDefinition);
		let allFilters = [];
		
		for(let nodeTemplate of filterTemplates) {
			let filterName = nodeTemplate.getAttribute(this.attrs.fieldKey);
			let lineName = nodeTemplate.getAttribute(this.attrs.lineName);
			let filter = nodeTemplate.getAttribute(this.attrs.fieldFormula);
			let suppl = new LineFilterProperties(lineName, filter);

			this.#_lineFiltering.addFilter(filterName, lineName);
			let aspect = new AspectDefinition(filterName, EnumAspectKind.LineFilter, suppl);
			allFilters.push(aspect);
		}
		return allFilters;
	}

	/**
	 * Setup an aspect Dom element events and disables any Formula
	 * @param {domElement} element
	 * @param {boolean} doEventSetup
	 * @memberof DasUiHandler
	 */
	#setupAspectElement(element, doEventSetup) {
		if (element.hasAttribute(this.attrs.fieldFormula) || element.hasAttribute(this.attrs.fieldReference)) {
			element.setAttribute("disabled", "disabled");
		}
		if (doEventSetup) {
			element.addEventListener("change", (evtArgs) => {
				this.onElementValueChange(evtArgs.currentTarget);
			});
		}
	}

	/**
	 * For a line element, setup basic properties needed for a data-field
	 * @param {DomElement} element
	 * @param {string} lineName
	 * @param {string} lineID
	 * @param {boolean} doEventSetup
	 * @memberof DasUiHandler
	 */
	#setupLine(element, lineName, lineID, doEventSetup) {
		element.setAttribute(this.attrs.lineName, lineName);
		element.setAttribute(this.attrs.lineID, lineID);
		if (element.hasAttribute(this.attrs.fieldFormula)) {
			element.setAttribute("disabled", "disabled");
		}
		if (doEventSetup) {
			element.addEventListener("change", (evtArgs) => {
				this.onElementValueChange(evtArgs.currentTarget);
			});
		}
	}

	/**
	 * Detect Add buttons (outside of line template)
	 * @memberof DasUiHandler
	 */
	#detectLineAddButtons() {
		let addButtons = document.querySelectorAll(this.selects.root + ' ' + this.selects.lineAdd);
		for(let btn of addButtons) {
			btn.addEventListener("click", (evtArgs) => {
				this.addNewLine(evtArgs.currentTarget);
			});
		}
	}

	/**
	 * Setup line delete button inside Line template
	 * @param {DomElement} element
	 * @param {string} lineName
	 * @param {string} lineID
	 * @memberof DasUiHandler
	 */
	#setupLineDeleteButton(element, lineName, lineID) {
		element.setAttribute(this.attrs.lineID, lineID);
		element.setAttribute(this.attrs.lineName, lineName);

		element.addEventListener("click", (evtArgs) => {
			let elem = evtArgs.currentTarget;
			let lineName = elem.getAttribute(this.attrs.lineName);
			let lineID = elem.getAttribute(this.attrs.lineID);
			this.#_dakairAspectSystem.deleteLine(lineName, lineID);
			this.deleteDomLine(lineName, lineID);
		});
	}

	/**
	 * Patch function to turn a selector to a class name for querySelector operations
	 * @param {string} selector value of the DAS selector
	 * @return {string} value of the selector, without any dots
	 * @memberof DasUiHandler
	 */
	#selectorToClass(selector) {
			return selector.replaceAll('.', '').trim();
	}
	
	/**
	 *
	 * Analyze a Dom Element to set a new @AspectDefinition from it
	 * @param {DomElement} domElement Dom Element to anlayze attributes to create new aspect from
	 * @return {AspectDefinition}  New Aspect Definition
	 * @memberof DasUiHandler
	 */
	#getAspectDefinition(domElement) {        
		let key = domElement.getAttribute(this.attrs.fieldKey);
		let formula = domElement.getAttribute(this.attrs.fieldFormula);
		let reference = domElement.getAttribute(this.attrs.fieldReference);
		if (!key) {
			return null;
		}
		let kind = formula ? EnumAspectKind.Formula : 
					(reference ? EnumAspectKind.Reference : EnumAspectKind.Direct);
		let attrDef = new AspectDefinition(key, kind, formula ?? reference);
		attrDef.defaultValue = this.getValue(domElement);
		
		// optional attributes setup
		if (domElement.hasAttribute(this.attrs.dataType)) {
			attrDef.dataType = domElement.getAttribute(this.attrs.dataType);
		}
		if (domElement.hasAttribute(this.attrs.defaultValue)) {
			let defaultValue = domElement.getAttribute(this.attrs.defaultValue);
			attrDef.defaultValue = defaultValue;
		}
		return attrDef;
	}

	/**
	 * Get info from a Dom Element into a @AspectModifiedInfo instance
	 * @param {DomElement} element
	 * @param {Object} overrideObject - Optional Only used when overriding properties. useValue and value must be set to be used.
	 * @return {AspectModifiedInfo} 
	 * @memberof DasUiHandler
	 */
	#getModifiedInfo(element, overrideObject) {	
		if (element.hasAttribute(this.attrs.fieldFormula)) {
			return null; // no ui change from formula
		}
		let key = element.getAttribute(this.attrs.fieldKey);
		let value = this.getValue(element);
		if (overrideObject && overrideObject.useValue) {
			value = overrideObject.value;
		}
		
		if (element.hasAttribute(this.attrs.lineName)) {
			let arrayName = element.getAttribute(this.attrs.lineName);
			let lineId = element.getAttribute(this.attrs.lineID);
			//array
			return new AspectModifiedInfo(arrayName, key, lineId, value);
		} else {
			return new AspectModifiedInfo(key, null, null, value);
		}
	}

	/**
		* Adds a new line to a Line container
		* @param {DomElement} button Dom button element used to Add a new Line
		* @memberof DasUiHandler
		*/
	addNewLine(button) {
		let lineName = button.getAttribute(this.attrs.lineName);
		if (!lineName) {
			console.error("Line Add failed : lineName was not sent");
			return;
		}
		let newLineID = button.hasAttribute(this.attrs.lineID) ? parseInt(button.getAttribute(this.attrs.lineID)) + 1 : 0;
		
		this.addNewDomLine(lineName, newLineID);

		button.setAttribute(this.attrs.lineID, newLineID);

		this.#_dakairAspectSystem.addLine(lineName, newLineID.toString());
	}

	
	/**
	 * Add a line in the Dom for a Line container
	 * @param {string} lineName LineElement name associated with line
	 * @param {string} newLineID New Line ID for this line
	 * @param {string?} [filterName] Associated filter name. When present, will add for a FilterLine instead of a line
	 * @memberof DasUiHandler
	 */
	addNewDomLine(lineName, newLineID, filterName) {
		let queryTemplate = filterName ? `${this.selects.root} ${this.selects.lineFilterTemplate}[${this.attrs.fieldKey}='${filterName}']`
												: `${this.selects.root} ${this.selects.lineDefinition}[${this.attrs.lineName}='${lineName}']`;
		let queryContainer = filterName ? `${this.selects.root} ${this.selects.lineFilterDefinition}[${this.attrs.fieldKey}='${filterName}']`
												: `${this.selects.root} ${this.selects.lineContainer}[${this.attrs.lineName}='${lineName}']`;

		let nodeTemplate = document.querySelector(queryTemplate);
		if (!nodeTemplate) {
			console.error("Cannot Add line. Template not found :" + queryTemplate);
			return;
		}
		let clone = nodeTemplate.content.cloneNode(true).firstElementChild;

		// set line info
		clone.setAttribute(this.attrs.lineID, newLineID);
		clone.classList.add(this.#selectorToClass(this.selects.lineParent)); // useful when deleting the line
		clone.setAttribute(this.attrs.lineName, lineName);

		// set all fields lineId and needed attributes
		let allLineFields = clone.querySelectorAll(this.selects.lineField);
		for (let lineElement of allLineFields) {
			this.#setupLine(lineElement, lineName, newLineID, true);
		}
		// set all fields lineId and needed attributes
		allLineFields = clone.querySelectorAll(this.selects.lineDisplay);
		for (let lineElement of allLineFields) {
			this.#setupLine(lineElement, lineName, newLineID, false);
		}

		// find and setup delete buttons
		let btnDeleteArray = clone.querySelectorAll(this.selects.lineDelete);
		for(let btnDel of btnDeleteArray) {
			this.#setupLineDeleteButton(btnDel, lineName, newLineID);
		}

		let target = document.querySelector(queryContainer);
		if (!target) {
			console.error("Cannot Add line. Container not found :" + queryContainer);
			return;
		}
		target.appendChild(clone);
		//console.log(`Added line - Filter:${filterName}, line:${lineName}, Line ID: ${newLineID}`)

		let fieldElementsInLine = clone.querySelectorAll(this.selects.display);
		for (let field of fieldElementsInLine) {
			let key = field.getAttribute(this.attrs.fieldKey);
			this.#_dakairAspectSystem.resend(key);
		}
	}

	/**
	 * Adjust the Add button of a line for new line index
	 * @param {string} lineName LineElement name
	 * @param {int} addedLineID line identifier
	 * @memberof DasUiHandler
	 */
	adjustNewLineButton(lineName, addedLineID) {
		let target = document.querySelector(`${this.selects.root} ${this.selects.lineAdd}[${this.attrs.lineName}='${lineName}']`);
		if (target) {
			target.setAttribute(this.attrs.lineID, this.getNewLineID(addedLineID));
		}
	}
	
	getNewLineID(lineID) {
		let currentID = 0;
		try {
			currentID = parseInt(lineID);
		} catch {
			currentID = -1;
		}
		return currentID + 1;
	}

	/**
	 * Delete a Line form the DOM
	 * @param {string} lineName LineElement name
	 * @param {string} lineID Line identifier
	 * @param {string?} [filterName] Associated Line Filter Name. change behavior for a fitler line instead of standard line.
	 * @return {*} 
	 * @memberof DasUiHandler
	 */
	deleteDomLine(lineName, lineID, filterName) {
		let query = filterName ? `${this.selects.root} ${this.selects.lineFilterDefinition}[${this.attrs.fieldKey}='${filterName}'] ${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'][${this.attrs.lineID}='${lineID}']`
				: `${this.selects.root} ${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'][${this.attrs.lineID}='${lineID}']`;
		let lineParent = document.querySelectorAll(query);
		if (!lineParent) {
			console.error(`Could not find line '${lineID}' for element '${lineName}'`);
			return;
		}
		for(let line of lineParent) {
			line.remove();
		}
	}

	/**
		* Callback when DOM Element value changed. Sets value in @AspectSystemManager
		* @param {DomElement} element
		* @memberof DasUiHandler
		*/
	onElementValueChange(element, overrideObject) {
		// handles HTML input changes and send them to value-handler js
		console.log("onElementValueChange called");
		if (!this.doCallback) {
			return;
		}
		DasUiHandler.#patchRadioChangeEvent(element);
		this.sendAspectChange(this.#getModifiedInfo(element, overrideObject));
	}

	/**
	 * Send to Das a change to an aspect.
	 * @param {AspectModifiedInfo} modifiedAspect
	 * @memberof DasUiHandler
	 */
	sendAspectChange(modifiedAspect) {
		this.#_dakairAspectSystem.setValue(modifiedAspect);
	}

	/**
	 * Return DomElement info from a line
	 * @param {string} id
	 * @returns {DomLineInfo[]} Array of all the lines and property under a parent container
	 * @memberof DasUiHandler
	 */
	getDomLineInfoFromContainer(id) {
		let container = document.getElementById(id);
		if (!container) {
			console.error(`can't find container '${id}'. Cannot get line info.`);
		}
		let containerLines = container.querySelectorAll('.line-parent');
		let result = Array();

    for(let containerLine of containerLines) {
			let lineID = containerLine.getAttribute(this.attrs.lineID);
			let lineName = containerLine.getAttribute(this.attrs.lineName);
      let line = new DomLineInfo(containerLine, lineName, lineID);
			result.push(line);
			this.#setDomLineProperties(line, containerLine.querySelectorAll(this.selects.lineField));
			this.#setDomLineProperties(line, containerLine.querySelectorAll(this.selects.lineDisplay));
    }
		return result;
	}

	getDomElementFromRefKey(key, lineName, lineID) {
		let element = 
		lineName ? document.querySelector(`${this.selects.root} ${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'] ${this.selects.lineField}[${this.attrs.lineID}='${lineID}'][${this.attrs.fieldKey}='${key}']`)
			: document.querySelector(`${this.selects.root} ${this.selects.field}[${this.attrs.fieldKey}='${key}']`);
		if (! element) {
			console.warn(`Could not find element for ${key}`);
			return null;
		}
		return element;
	}

	getDomValueFromRefKey(key, lineName, lineID) {
		let element = this.getDomElementFromRefKey(key, lineName, lineID);
		if (element) {
			return DasUiHandler.getElementValue(element);
		}
		console.warn(`Could not find value, because could not find element for ${key}, line (optional):${lineName}, ${lineID}`);
		return '';
	}

	/**
	 * Sets fields properties of DomLineInfo from a list of fields
	 * @param {DomLineInfo} line
	 * @param {NodeListOf<Element>} allLineFields
	 * @memberof DasUiHandler
	 */
	#setDomLineProperties(line, allLineFields) {
		for(let lineField of allLineFields) {
			let refKey = lineField.getAttribute(this.attrs.fieldKey);
			let value = this.getValue(lineField);
			let fieldInfo = new DomLineProperty(line, lineField, refKey, value);
			if (!line.properties.has(refKey)) {
				line.properties.set(refKey, fieldInfo);
			}
		}
	}
	
	/**
	 * Callback when Dakair Aspect System reported a value change
	 * @param {AspectModifiedInfo} aspectModified Modified Aspect information
	 * @memberof DasUiHandler
	 */
	onAspectValueChange(aspectModified) {
    this.#_doCallback = false;

		if (aspectModified.lineOperation) {
			switch (aspectModified.lineOperation) {
				case 'add':
					this.addNewDomLine(aspectModified.name, aspectModified.lineID);
					this.adjustNewLineButton(aspectModified.name, aspectModified.lineID);
					break;
				case 'delete':
					this.deleteDomLine(aspectModified.name, aspectModified.lineID);
					break;
				case 'filter':
					setTimeout(() => {this.#_lineFiltering.validateChange(this, aspectModified)}, 100);
					break;
				default:
					console.error(`onAspectValueChange : Received unexpected lineOperation : '${aspectModified.lineOperation}' `);
			}
			this.#_doCallback = true;
			return;
		}
		let newValue = aspectModified.value;

    let query = aspectModified.lineID ? `${this.selects.root} ${this.selects.lineField}[${this.attrs.lineName}='${aspectModified.name}'][${this.attrs.lineID}='${aspectModified.lineID}'][${this.attrs.fieldKey}='${aspectModified.property}']`
						    : `${this.selects.root} ${this.selects.field}[${this.attrs.fieldKey}='${aspectModified.name}']`;
		let allEls = document.querySelectorAll(query);
		//console.log("onAspectValueChange. query=" + query + ", newValue=" + newValue);
		for(let el of allEls) {
			this.changeValue(el, newValue);
		}
		//now, the display fields only
		query = aspectModified.lineID ? `${this.selects.root} ${this.selects.lineDisplay}[${this.attrs.lineName}='${aspectModified.name}'][${this.attrs.lineID}='${aspectModified.lineID}'][${this.attrs.fieldKey}='${aspectModified.property}']`
						    : `${this.selects.root} ${this.selects.display}[${this.attrs.fieldKey}='${aspectModified.name}']`;
		allEls = document.querySelectorAll(query);
		for(let el of allEls) {
			this.changeValue(el, newValue);
		}
		this.#_doCallback = true;
	}

	/**
	 * Change value of a DOM element. The value can be inner text, an attribute or an input value.
	 * @param {DomElement} element
	 * @param {string} newValue
	 * @memberof DasUiHandler
	 */
	changeValue(element, newValue) {
		if (element.hasAttribute(this.#_dasAttributes.valueDestination)) {
			let targetAttribute = element.getAttribute(this.#_dasAttributes.valueDestination);
			element.setAttribute(targetAttribute, newValue);
		} else {
			DasUiHandler.setElementValue(element, newValue);
		}
		if (element.hasAttribute(this.#_dasAttributes.fnValueChange)) {
			let fnName = element.getAttribute(this.#_dasAttributes.fnValueChange)
			if (!window[fnName]) {
				console.warn(`Function ${fnName} set in ${this.#_dasAttributes.fnValueChange}, but is not defined under window object. can't call.`)
			} else {
				setTimeout(() => {window[fnName](element, newValue);}, 100); // handled outside DAS value events
			}
		}
	}

	/**  
	 * Get value of a Dom element
	 * @param {DomElement} element Dom node to extract value from
	 * @return {number|string} Dom element value from value attribute, or 1 for checkbox checked, or option selected from select. Else, textContent.
	*/
	getValue(element) {
		if (element.hasAttribute(this.#_dasAttributes.valueDestination)) {
			let targetAttribute = element.getAttribute(this.#_dasAttributes.valueDestination);
			return element.getAttribute(targetAttribute);
		} else {
			return DasUiHandler.getElementValue(element);
		}
	}

	/**
	 * Set Html Element value to the right place.
	 * @param {Element} element 
	 * @param {string|number} newValue value to assign
	 */
	static setElementValue(element, newValue) {
		if (element.nodeName == 'INPUT' || element.nodeName == 'SELECT') {
			if (element.type == 'checkbox' || element.type == 'radio') {
				element.checked = (newValue == 1);
			} else {
				element.value  = newValue;
			}
		} else {
			if (!element.firstChild) {
				element.appendChild(document.createTextNode(''));
			} else if ( element.firstChild.nodeName != '#text') {
				element.insertBefore(document.createTextNode(''), element.firstChild);
			}
			element.firstChild.textContent = newValue;
		}
	}

	/**
	 * Get Html Element value from the right place. Returns 1 for checked, 0 for unchecked.
	 * @param {Element} element 
	 * @returns {string|number} value
	 */
	static getElementValue(element) {
		if (element.nodeName == 'INPUT' || element.nodeName == 'SELECT') {
			if (element.type == 'checkbox' || element.type == 'radio') {
				return element.checked ? 1 : 0;
			} else {
				return element.value;
			}
		} else {
			if (element.firstChild && element.firstChild.nodeName == '#text') {
				return element.firstChild.textContent;
			}
			return element.textContent;
		}
	}

	// since radio do not fire the change when they are unchecked, have to do it manually.
	// when one radio triggers, it triggers all radio of the same name.
	// to avoid eternal loop, they do not fire other events until removed from the list
	static #radioPatchList = []

	static #patchRadioChangeEvent(element) {
		if (element.type != 'radio') return;
		if (this.#radioPatchList.includes(element)) {
			this.#radioPatchList.splice(this.#radioPatchList.indexOf(element));
			return;
		}
		if (element.name) {
			let allRadioOfNames = document.querySelectorAll(`input[name='${element.name}']`);
			var evt = new Event('change');
			for (let singleRadio of allRadioOfNames) {
				if (singleRadio != element) {
					this.#radioPatchList.push(singleRadio);
					singleRadio.dispatchEvent(evt);
				}
			}
		}
	}

}
