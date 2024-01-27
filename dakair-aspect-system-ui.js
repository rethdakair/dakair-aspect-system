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
	lineFilter = 'line-filter';
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

	fieldKey = 'data-ref-key';
  fieldFormula = 'data-formula';
  fieldReference = 'data-reference';
    
  lineID = 'data-line-id';
  lineName = 'data-line-name';
}


class LineFiltering {
	/** @type {LineFilter[]} */
	#_filters = new Array();

	/**
	 * @summary Create a new Line Filter based on a line and filter
	 * @param {modifiedAspect} definition
	 * @memberof LineFiltering
	 */
	createNew(definition) {
		let filterProps = definition.suppl;
		let filter = new LineFilter(definition.name, filterProps.lineName, filterProps.filter);
		this.#_filters.push(filter);
	}

	/**
	 * @param {DasUiHandler} uiHandler
	 * @param {modifiedAspect} modifiedAspect
	 * @memberof LineFiltering
	 */
	validateChange(uiHandler, modifiedAspect) {
		if (!modifiedAspect.lineID) {
			return; // not a line field, ignore value
		}
		let lineID = modifiedAspect.lineID;
		if (modifiedAspect.lineOperation === 'del') {
			this.#validateDeletion(uiHandler, modifiedAspect);
			return;
		}
		for(let filter of this.#_filters) {
			if (filter.hasImpact(modifiedAspect)) {
				if (filter.actions.add) { 
					this.#addLine(uiHandler, filter, lineID); 
					uiHandler.resend(modifiedAspect.name, lineID);
				}
				if (filter.actions.del) { this.#removeLine(uiHandler, filter, lineID); }
				filter.actions = {};
			}
		}
	}

	/**
	 * @param {DasUiHandler} uiHandler
	 * @param {modifiedAspect} modifiedAspect
	 * @memberof LineFiltering
	 */
	#validateDeletion(uiHandler, modifiedAspect) {
		// update internal
		if (!modifiedAspect.lineID) {
			return; // not a line field, ignore value
		}
		let linkedFilters = this.#_filters.filter( x => x.lineName == modifiedAspect.name);
		for(let lineFilter of linkedFilters) {
			lineFilter.deleteLine(modifiedAspect.lineID);
			uiHandler.removeLine(lineFilter.lineName, modifiedAspect.lineID, lineFilter.name);
		}
	}

	/**	
	 * 	@summary adds a line in a filter collection
	 * 	@param {DasUiHandler} uiHandler Ui handler to interact with the dom
	 * 	@param {LineFilter} lineFilter LineFilter affected
	 *  @param {string} lineID Line ID added
	*/
	#addLine(uiHandler,lineFilter, lineID) {
		uiHandler.addNewDomLine(lineFilter.lineName, lineID, lineFilter.name);
		lineFilter.addLine(lineID);
		// ask for new values !
	}
	
	/**
	 * @summary Remove a line in the filter collection
	 * @param {DasUiHandler} uiHandler
	 * @param {LineFilter} lineFilter
	 * @memberof LineFiltering
	 */
	#removeLine(uiHandler,lineFilter) {
		uiHandler.deleteDomLine(lineFilter.lineName, modifiedAspect.lineID, lineFilter.name);
	}
}

/**
 * @class LineFilter
 */
class LineFilter {
	#_name = '';
	#_filterText = ''; // used in debug only
	#_lineName = '';
	/** @type {string} */
	#_formula = null;
	/** @type {Map<string, string>} */
	#_lines = new Map();
	actions = {};

	/**
	 * Creates an instance of LineFilter.
	 * @param {string} name Name of the filter, for Dom element reference
	 * @param {string} lineName Name of the LineElement that is an Aspect in DAS
	 * @param {string} filter Formula to evaluate to include a given lineID into the filter shown line
	 * @memberof LineFilter
	 */
	constructor(name, lineName, filter) {
		this.#_name = name;
		this.#_lineName = lineName;
		this.#_filterText = filter;
		this.#_formula = new AspectFormula(name, name, filter);
	}
	get name() { return this.#_name; }
	get lineName() { return this.#_lineName; }

	/**
	 * @param {string} lineID
	 * @memberof LineFilter
	 */
	addLine(lineID) {
		this.#_lines.add(lineID, lineID);
	}

	/**
	 * @param {string} lineID
	 * @memberof LineFilter
	 */
	deleteLine(lineID) {
		if (this.#_lines.has(lineID)) {
			this.#_lines.remove(lineID);
		}
	}

	/**
	 * @param {ModifierAspect} modifiedAspect
	 * @return {boolean} Is the line to be added or removed after filter analysys
	 * @memberof LineFilter
	 */
	hasImpact(modifiedAspect) {
		let change = false;
		if (!this.#_formula.refersTo([modifiedAspect])) {
			// not an element referred in the filter, ignore
		}
		let completeName = `${modifiedAspect.name}_${modifiedAspect.property}`;
		let scope = new Map();
		scope.set(completeName, modifiedAspect.value);
		let passFilter = this.#_formula.getValue(scope, true);
		if (passFilter) {
			if (this.#_lines.has(modifiedAspect.lineID)) {
				return; // already in and should be, no problem.
			} else { // not in lines, but should be !
				this.actions.add = modifiedAspect.lineID;
				change = true;
			}
		} else {
			if (this.#_lines.has(modifiedAspect.lineID)) {
				this.actions.del = modifiedAspect.lineID; // already in. should not be
				change = true;
			} else { 
				return; // not in lines,so is ok.
			}
		}
		return change;
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
	 * @summary Initialize the DAS when the Dom is ready
	 * @param {string} dataContextName
	 * @memberof DasUiHandler
	 */
	initialize(dataContextName) {
		let fnLoad = () => {
			if (document.readyState == "complete") {
				console.log('initializing ' + dataContextName);
				this.#initializeWhenReady(dataContextName, this.#_storageService);	
			}
		}
		if (document.readyState != "complete") {
			document.addEventListener('readystatechange', fnLoad);
		} else {
			this.#initializeWhenReady(dataContextName, this.#_storageService);
		}
		
	}

	/**
	 * @summary Loads data from the StorageSystem with the given key
	 * @param {string} dataKey key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	load(dataKey) {
		this.#_dakairAspectSystem.loadData(dataKey);
	}

	/**
	 * @summary Reset data in the UI
	 * @memberof DasUiHandler
	 */
	reset() {
		this.#_dakairAspectSystem.resetData();
	}
	
	/**
	 * @summary Saves data to the StorageSystem with the given key
	 * @param {string} dataKey key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	save(dataKey) {
		this.#_dakairAspectSystem.saveData(dataKey);
	}

	/**
	 * @summary Sends an Aspect values back to the Ui, with the onchange callback
	 * @param {string} aspectName Aspect name to send back
	 * @param {string?} [lineID] lineID to resend. When empty, will resends all line
	 * @memberof DasUiHandler
	 */
	askResend(aspectName, lineID) {
		this.#_dakairAspectSystem.resend(aspectName, lineID);
	}

	/**
	 * @summary Initialize the system. Only call when the Dom is ready, else won't be able to find definitions
	 * @param {string} dataContextName key for the Storage save and load
	 * @memberof DasUiHandler
	 */
	#initializeWhenReady(dataContextName) {
		console.log("initializeWhenReady called");
        this.#_dakairAspectSystem = new AspectSystemManager((aspect) => { this.onAspectValueChange(aspect); });
		let aspectArray = this.#detectRegularAspects();
		aspectArray = aspectArray.concat(this.#detectLinesDefinitions());
		aspectArray = aspectArray.concat(this.#detectLineFilters());
		this.#detectLineAddButtons();
		this.#_dakairAspectSystem.loadDefinitions(aspectArray);
		this.load(dataContextName);
	}

	/**
	 * @summary Finds all regular aspects defined in the DOM under the given root
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
	 * @summary Finds all Lines Aspects defined in the DOM under the given root
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
	 * @summary Finds and creates all Lines Filters (UI Only) defined in the DOM under the given root.
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

			this.#_lineFiltering.createNew(new AspectDefinition(filterName, EnumAspectKind.Lines, suppl));
		}
	}

	/**
	 * @summary Setup an aspect Dom element events and disables any Formula
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
	 * @summary for a line element, setup basic properties needed for a data-field
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
	 * @summary Detect Add buttons (outside of line template)
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
	 * @summary setup line delete button inside Line template
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
	 * @summary Patch function to turn a selector to a class name for querySelector operations
	 * @param {string} selector value of the DAS selector
	 * @return {string} value of the selector, without any dots
	 * @memberof DasUiHandler
	 */
	#selectorToClass(selector) {
			return selector.replaceAll('.', '').trim();
	}
	
	/**
	 *
	 * @summary Analyze a Dom Element to set a new @AspectDefinition from it
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
		attrDef.defaultValue = domElement.value;
		
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
	 * @summary Get info from a Dom Element into a @AspectModifiedInfo instance
	 * @param {DomElement} element
	 * @return {AspectModifiedInfo} 
	 * @memberof DasUiHandler
	 */
	#getModifiedInfo(element) {	
		if (element.hasAttribute(this.attrs.fieldFormula)) {
			return null; // no ui change from formula
		}
		let key = element.getAttribute(this.attrs.fieldKey);
		let value = element.value;
		if (element.type == 'checkbox') {
			value = element.checked ? 1 : 0;
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
		* @summary Adds a new line to a Line container
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
	 * @summary add a line in the Dom for a Line container
	 * @param {string} lineName LineElement name associated with line
	 * @param {string} newLineID New Line ID for this line
	 * @param {string?} [filterName] Associated filter name. When present, will add for a FilterLine instead of a line
	 * @memberof DasUiHandler
	 */
	addNewDomLine(lineName, newLineID, filterName) {
		let queryTemplate = filterName ? `${this.selects.root} ${this.selects.lineFilterTemplate}[${this.attrs.fieldKey}='${filterName}']`
												: `${this.selects.root} ${this.selects.lineDefinition}[${this.attrs.lineName}='${lineName}']`;
		let queryContainer = filterName ? `${this.selects.root} ${this.selects.lineFilter}[${this.attrs.fieldKey}='${filterName}']`
												: `${this.selects.root} ${this.selects.lineContainer}[${this.attrs.lineName}='${lineName}']`;

		let nodeTemplate = document.querySelector(queryTemplate);
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
		target.appendChild(clone);
	}

	/**
	 * @summary Adjust the Add button of a line for new line index
	 * @param {string} lineName LineElement name
	 * @param {int} addedLineID line identifier
	 * @memberof DasUiHandler
	 */
	adjustNewLineButton(lineName, addedLineID) {
		let target = document.querySelector(`${this.selects.root} ${this.selects.lineAdd}[${this.attrs.lineName}='${lineName}']`);
		if (target) {
			target.setAttribute(this.attrs.lineID, addedLineID + 1);
		}
		
	}

	/**
	 * @summary Delete a Line form the DOM
	 * @param {string} lineName LineElement name
	 * @param {string} lineID Line identifier
	 * @param {string?} [filterName] Associated Line Filter Name. change behavior for a fitler line instead of standard line.
	 * @return {*} 
	 * @memberof DasUiHandler
	 */
	deleteDomLine(lineName, lineID, filterName) {
		let query = filterName ? `${this.selects.root} ${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'][${this.attrs.lineID}='${lineID}']`
							: `${this.selects.root} ${this.selects.lineFilter}[${this.attrs.fieldKey}='${filterName}' ${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'][${this.attrs.lineID}='${lineID}']`;
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
		* @summary callback when DOM Element value changed. Sets value in @AspectSystemManager
		* @param {DomElement} element
		* @memberof DasUiHandler
		*/
	onElementValueChange(element) {
		// handles HTML input changes and send them to value-handler js
		console.log("onElementValueChange called");
		if (!this.doCallback) {
			return;
		}
		let modifiedAspect = this.#getModifiedInfo(element);
		this.#_dakairAspectSystem.setValue(modifiedAspect);
	}
	
	/**
	 * @summary callback when Dakair Aspect System reported a value change
	 * @param {modifiedAspect} aspectModified Modified Aspect information
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
				default:
					console.error(`onAspectValueChange : Received unexpected lineOperation : '${aspectModified.lineOperation}' `);
			}
			this.#_lineFiltering.validateChange(this, aspectModified);
			return;
		}
		let newValue = aspectModified.value;

    let query = aspectModified.lineID ? `${this.selects.root} ${this.selects.lineField}[${this.attrs.lineName}='${aspectModified.name}'][${this.attrs.lineID}='${aspectModified.lineID}'][${this.attrs.fieldKey}='${aspectModified.property}']`
						    : `${this.selects.root} ${this.selects.field}[${this.attrs.fieldKey}='${aspectModified.name}']`;
		let allEls = document.querySelectorAll(query);
		//console.log("onAspectValueChange. query=" + query + ", newValue=" + newValue);
		for(let el of allEls) {
			this.#changeValue(el, newValue);
		}
		//now, the display fields only
		query = aspectModified.lineID ? `${this.selects.root} ${this.selects.lineDisplay}[${this.attrs.lineName}='${aspectModified.name}'][${this.attrs.lineID}='${aspectModified.lineID}'][${this.attrs.fieldKey}='${aspectModified.property}']`
						    : `${this.selects.root} ${this.selects.display}[${this.attrs.fieldKey}='${aspectModified.name}']`;
		allEls = document.querySelectorAll(query);
		for(let el of allEls) {
			this.#changeValue(el, newValue);
		}
		this.#_lineFiltering.validateChange(this, aspectModified);
		this.#_doCallback = true;
	}

	/**
	 * @summary change value of a DOM element. The value can be inner text, an attribute or an input value.
	 * @param {DomElement} element
	 * @param {string} newValue
	 * @memberof DasUiHandler
	 */
	#changeValue(element, newValue) {
		if (element.hasAttribute(this.#_dasAttributes.valueDestination)) {
			let targetAttribute = element.getAttribute(this.#_dasAttributes.valueDestination);
			element.setAttribute(targetAttribute, newValue);
		} else if (element.nodeName == 'INPUT' || element.nodeName == 'SELECT') {
			if (element.type == 'checkbox') {
				element.checked = (newValue == 1);
			} else {
				element.value  = newValue;
			}
		} else {
			element.textContent = newValue;
		}
	}

}
