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
    
	lineAdd = '.line-button-add'; // element defining a button to add "line", outside the line definition
    lineContainer = '.line-container'; // element defining the container that will receive the dynamically created lines
	lineDefinition = 'template.line-definition'; // element defining a "line of fields (like an array)"
    lineDelete = '.line-button-delete'; // delete button present inside the line definition
    lineField = '.field-line-data'; // element defining a single field inside the line definition
    lineParent = '.line-parent'; // element defining the parent element of each individual line
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

	fieldKey = 'data-ref-key';
    fieldFormula = 'data-formula';
    fieldReference = 'data-reference';
    
    lineID = 'data-line-id';
    lineName = 'data-line-name';
}

/**
 * This class handles the HTML DOM parsing and creation of the Dakair Aspect System
 * It creates the events needed to interact with the inputs, the events of data change and of ui refresh needed.
 * Create the HTML page (seed docs TODO: set doc), create an instance and then call initialize()
 * 
 * @class DasUiHandler
 */
class DasUiHandler {
    #_dasSelectors = null;
    #_dasAttributes = null;
    #_doCallback = true; // used to avoid setting callback on initial assignation of the system values
    #_dakairAspectSystem = null

    /**
     * Creates an instance of DasUiHandler.
     * @param {DasSelectors} selectors - Optional class with css selectors for the fields. Else, use default value.
     * @param {DasAttributes} attributes - Optional class with dom attributes for the fields. Else, use defaults values.
     * @memberof DasUiHandler
     */
    constructor(selectors, attributes) {
        if (selectors && !(selectors instanceof DasSelectors)) throw "selectors must be an instance of DasSelectors";
        if (attributes && !(attributes instanceof DasAttributes)) throw "attributes must be an instance of DasAttributes";
		this.#_dasSelectors = selectors ?? new DasSelectors();
        this.#_dasAttributes = attributes ?? new DasAttributes();
	}

	get selects() { return this.#_dasSelectors; }
	get attrs() { return this.#_dasAttributes; }
	get doCallback() { return this.#_doCallback; }

    initialize(dataContextName) {
        document.onreadystatechange = () => {
			if (document.readyState == "complete") {
				console.log('onreadystatechange ' + document.readyState);
				this.#initializeWhenReady(dataContextName);
			}
		}
    }

	load(dataKey) {
		this.#_dakairAspectSystem.loadData(dataKey);
	}
	reset() {
		this.#_dakairAspectSystem.resetData();
	}
	save(dataKey) {
		this.#_dakairAspectSystem.saveData(dataKey);
	}

	#initializeWhenReady(dataContextName) {
		console.log("initializeWhenReady called");
        this.#_dakairAspectSystem = new AspectSystemManager((aspect) => { this.onAspectValueChange(aspect); });
		let attributeArray = this.#detectRegularAttributes();
		attributeArray = attributeArray.concat(this.#detectLinesDefinitions());
		this.#detectLineAddButtons();
		this.#_dakairAspectSystem.loadDefinitions(attributeArray);
		this.load(dataContextName);
	}

	#detectRegularAttributes() {
		let attributesArray = Array();
		let attrDomElements = document.querySelectorAll(`:not(${this.selects.lineDefinition}) ${this.selects.root} ${this.selects.field}`);
		for (let domElement of attrDomElements) {
			let attrDefinition = this.#getAspectDefinition(domElement);
			if (attrDefinition != null) {
				attributesArray.push(attrDefinition);
				this.#setupAspectElement(domElement, true);
			}		
		}
		return attributesArray;
	}

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

	// for a line element, setup basic properties needed for a data-field
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

	// outside actual line templates
	#detectLineAddButtons() {
		let addButtons = document.querySelectorAll(this.selects.root + ' ' + this.selects.lineAdd);
		for(let btn of addButtons) {
			btn.addEventListener("click", (evtArgs) => {
				this.addNewLine(evtArgs.currentTarget);
			});
		}
	}

	// setup a line delete button for script and needed properties
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

    #selectorToClass(selector) {
        return selector.replaceAll('.', '').trim();
    }
	
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
	
	#getModifiedInfo(element) {	
		if (element.hasAttribute(this.attrs.fieldFormula)) {
			return null; // no ui change form formula
		}
		let key = element.getAttribute(this.attrs.fieldKey);
		let value = element.value;
		
		if (element.hasAttribute(this.attrs.lineName)) {
			let arrayName = element.getAttribute(this.attrs.lineName);
			let lineId = element.getAttribute(this.attrs.lineID);
			//array
			return new AspectModifiedInfo(arrayName, key, lineId, value);
		} else {
			return new AspectModifiedInfo(key, null, null, value);
		}
	}

    // meant to be called by a button with data-line-name defined.
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

	addNewDomLine(lineName, newLineID) {
		let nodeTemplate = document.querySelector(`${this.selects.root} ${this.selects.lineDefinition}[${this.attrs.lineName}='${lineName}']`);
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

		// find and setup delete buttons
		let btnDeleteArray = clone.querySelectorAll(this.selects.lineDelete);
		for(let btnDel of btnDeleteArray) {
			this.#setupLineDeleteButton(btnDel, lineName, newLineID);
		}

		let target = document.querySelector(`${this.selects.lineContainer}[${this.attrs.lineName}='${lineName}']`);
		target.appendChild(clone);
	}

	deleteDomLine(lineName, lineID) {
		let query = `${this.selects.lineParent}[${this.attrs.lineName}='${lineName}'][${this.attrs.lineID}='${lineID}']`;
		let lineParent = document.querySelector(query);
		if (!lineParent) {
			console.error(`Could not find line '${lineID}' for element '${lineName}'`);
			return;
		}
		lineParent.remove();
	}

    // DOM Element value changed
	onElementValueChange(element) {
		// handles HTML input changes and send them to value-handler js
		console.log("onElementValueChange called");
		if (!this.doCallback) {
			return;
		}
		let modifiedAspect = this.#getModifiedInfo(element);
		this.#_dakairAspectSystem.setValue(modifiedAspect);
	}
	
    // Dakair Aspect System reported a value change
	onAspectValueChange(aspectModified) {
        this.#_doCallback = false;

		if (aspectModified.lineOperation) {
			// find the 
			switch (aspectModified.lineOperation) {
				case 'add':
					this.addNewDomLine(aspectModified.name, aspectModified.lineID);
					break;
				case 'delete':
					this.deleteDomLine(aspectModified.name, aspectModified.lineID);
					break;
				default:
					console.error(`onAspectValueChange : Received unexpected lineOperation : '${aspectModified.lineOperation}' `);
			}
			return;
		}

        let query = aspectModified.lineID ? `${this.selects.root} ${this.selects.lineField}[${this.attrs.lineName}='${aspectModified.name}'][${this.attrs.lineID}='${aspectModified.lineID}'][${this.attrs.fieldKey}='${aspectModified.property}']`
							    : `${this.selects.root} ${this.selects.field}[${this.attrs.fieldKey}='${aspectModified.name}']`;
		let allEls = document.querySelectorAll(query);
		let newValue = aspectModified.value;
		console.log("onAspectValueChange. query=" + query + ", newValue=" + newValue);
		for(let el of allEls) {
			el.value = newValue;
		}
		this.#_doCallback = true;
	}
}