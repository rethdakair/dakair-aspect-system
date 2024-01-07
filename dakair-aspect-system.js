/* ---------------------------------- */
/* ---- Global utils ---- */
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
/* ---------------------- */

const EnumAspectKind = Object.freeze({
	Direct: 'direct',
	Reference: 'reference',// meant for direct simple reference. Else, weight might be off and values propagation could be affected.
	Formula: 'formula',
	Lines: 'lines',
	isValid: function (value) {
		let found = false;
		Object.getOwnPropertyNames(this).forEach(propertyName => { if (this[propertyName] == value) found = true; });
		return found;
	}
});

const EnumCalculatedState = Object.freeze({
	NotCalculated: 0,
	Calculated: 1,
	AlwaysCalculate: 2,
	isCalculated(state) {
		return state == this.Calculated;
	},
	setState(currentState, newState) {
		if (currentState == this.AlwaysCalculate) return this.AlwaysCalculate;
		return newState;
	},
	isValid: function (value) {
		let found = false;
		Object.getOwnPropertyNames(this).forEach(propertyName => { if (this[propertyName] == value) found = true; });
		return found;
	}
});

const EnumDataType = Object.freeze({
	Numeric: 'int', // parseInt
	Decimal: 'float', // parseFloat
	Text: 'text',
	NotSet: '?',
	isValid: function (value) {
		let found = false;
		Object.getOwnPropertyNames(this).forEach(propertyName => { if (this[propertyName] == value) found = true; });
		return found;
	}
});

// Use localStorage. override to use custom storage options
class DasStorageService {
	mapToObject(map) {
		let o = Object.assign(Object.create(null), ...[...map].map(v => ({ [v[0]]: v[1] })));
		o.jsonType = 'map';
		//console.log(map);
		return o;
	}
	
	objectToMap(obj) {
		if (obj.jsonType == 'map') {
			let map = new Map([...Object.keys(obj).map(k => ([k, obj[k]]))]);
			map.delete('jsonType');
			return map;
		}
		return obj
	}
	  
	mapToJson(key, value) {
		return value instanceof Map ? this.mapToObject(value) : value; // Array.from(value.entries()).toString() : value; //Object.entries(value) : value; // Array.from(value.entries())
	}
	mapReviver(key,value){
		return value && (value.jsonType == 'map') ? this.objectToMap(value) : value;
	}
	
	encodeData(sourceMap) {
		return JSON.stringify(sourceMap, (k, v) => this.mapToJson(k, v));  //Array.from(sourceMap.entries()));
	}
	decodeData(sourceData) {
		let data;
		try {
			data = JSON.parse(sourceData || "{}", (k,v) => this.mapReviver(k,v));
			if (!(data instanceof Map)) {
				console.log('Oh oh');
			}
		} catch (e) {
			console.error(`Could not decode value '${sourceData}' : ${e}`);
			data = new Map();
		}
		return data;
	}
	deleteData(dataKey) {
		if (localStorage.getItem(dataKey)) {
			localStorage.removeItem(dataKey);
		}
	}
	doesKeyExist(contextKey) {
		return localStorage.getItem(contextKey) != null;
	}
	duplicate(dataKey, newDataKey) {
		let data = this.getData(dataKey);
		this.saveData(newDataKey, data);
	}
	getData(dataKey) {
		if (!this.doesKeyExist(dataKey)) {
			console.error(`Could not load context '${dataKey}' from storage. returned empty Map.`);
			return new Map();
		}
		let data = localStorage.getItem(dataKey);
		return this.decodeData(data);
	}
	saveData(dataKey, data) {
		localStorage.setItem(dataKey, this.encodeData(data));
	}
}

/* Data Objects to use with external sources as definition source */

// AspectDefinition
// supplemental must be instance of a String for Formula, or instance of LinePropertiesDefinition for array

/**
 * Class to hold definition of aspect
 *
 * @class AspectDefinition
 */
class AspectDefinition {
	#_name = '';
	#_kind = '';
	#_supplemental = null;
	#_defaultValue = null;
	#_dataType = EnumDataType.NotSet;

	defaultValue = 0;
	properName = ''; // this field is set internally, but used inside the DAS.
	/**
	 * Creates an instance of AspectDefinition.
	 * @param {string} name
	 * @param {string} kind
	 * @param {*} supplemental
	 * @memberof AspectDefinition
	 */
	constructor(name, kind, supplemental, properName = null) {
		//console.log(`3) AspectDefinition(${name}, ${kind}, ${supplemental})`);
		if (!name) {
			throw "name is mandatory for AspectDefinition";
		}
		if (!EnumAspectKind.isValid(kind)) {
			throw "Wrong Aspect kind value : " + kind + ". Use Values from EnumAspectKind";
		}
		if (kind == EnumAspectKind.Lines && (supplemental == null || (!(supplemental instanceof LinePropertiesDefinition)))) {
			throw "Line Aspect, you need to provide LinePropertiesDefinition";
		}
		if (kind == EnumAspectKind.Formula && !((supplemental && typeof supplemental == 'string'))) {
			throw "Formula Aspect need to have a non empty formula given";
		}
		if (kind == EnumAspectKind.Reference && !((supplemental && typeof supplemental == 'string'))) {
			throw "Reference Aspect need to have a non empty reference given";
		}
		this.#_name = name;
		this.#_kind = kind
		this.#_supplemental = supplemental;
		this.properName = properName;
	}
	get name() { return this.#_name; }
	get dataType() { return this.#_dataType; }
	get kind() { return this.#_kind; }
	get supplemental() { return this.#_supplemental; }
	get defaultValue() { return this.#_defaultValue; }
	get defaultValueIsDefined() { return this.defaultValue != null; }

	set defaultValue(value) { this.#_defaultValue = value; }
	set dataType(value) { this.#_dataType = value; }
}

/**
 * Class to hold properties definition for Line Elements
 *
 * @class LinePropertiesDefinition
 */
class LinePropertiesDefinition {
	#_properties = new Map();

	get properties() { return this.#_properties; }

	addProperty(aspectDef) {
		if (!(aspectDef instanceof AspectDefinition)) {
			throw "addProperty requires one instance of AspectDefinition as parameter";
		}
		this.#_properties.set(aspectDef.name, aspectDef);
	}
}

/**
 * Class to hold modifier information from the html page to the AspectManagermentSystem
 *
 * @class AspectModifiedInfo
 */
class AspectModifiedInfo {
	#_name = '';
	#_property = '';
	#_lineID = -1;
	#_value = '';
	#_lineOperation = null;
	constructor(name, property, lineID, value, lineOperation) {
		this.#_name = name;
		this.#_property = property?.toString();
		this.#_lineID = lineID?.toString();
		this.#_value = value;
		this.#_lineOperation = lineOperation ?? null;
	}
	get name() { return this.#_name; }
	get property() { return this.#_property; }
	get lineID() { return this.#_lineID; }
	get value() { return this.#_value; }
	get lineOperation() { return this.#_lineOperation; }
}

/* 
	AspectSystemManager instance is meant to be called by the page function directly.
	Other classes are for internal use only.
	Public methods redirect to right objects methods.
*/

/**
 *	AspectSystemManager instance is meant to be called by the page function directly.
 *	Other classes are for internal use only.
 *	Public methods redirect to right objects methods.
 *
 * @class AspectSystemManager
 */
class AspectSystemManager {	
	#_scopeManager;
	#_aspectManager;
	#_lineAspectManager;
	#_storageService;
	#_modifiedAspectValueCallback;
	#_defaultContext = 'default';
	#_contextKey = 'lastValues';
	

	constructor(modifiedAspectValueCallback, storageService) {
		this.#_scopeManager = new AspectScopeManager((aspectArray)=> { this.onChangedValue(aspectArray); } );
		this.#_aspectManager = new AspectManager(this.#_scopeManager);
		this.#_lineAspectManager = new LineAspectManager(this.#_aspectManager, this.#_scopeManager);
		this.#_modifiedAspectValueCallback = modifiedAspectValueCallback;
		if (storageService && !(storageService instanceof DasStorageService)) {
			throw "storageService must be and instance of DasStorageService";
		}
		this.#_storageService = storageService ?? new DasStorageService();
	}

	/**
	 * add a single aspect in the system
	 *
	 * @param {AspectDefinition} aspectDefinition
	 * @return {*} 
	 * @memberof AspectSystemManager
	 */
	AddAspect(aspectDefinition) {
		if (!(aspectDefinition instanceof AspectDefinition)) {
			throw "AddAspect require one instance of AspectDefinition";
		}

		if (aspectDefinition.kind == EnumAspectKind.Lines) {
			this.#_lineAspectManager.AddAspect(aspectDefinition);
			return;
		} else {
			return this.#_aspectManager.AddAspect(aspectDefinition);
		}
	}
	
	addLookupValues(key, object) {
		this.#_scopeManager.addLookupValues(key, object);
	}

	addLine(lineName, lineID) {
		this.#_lineAspectManager.addLine(lineName, lineID);
	}

	deleteLine(lineName, lineID) {
		this.#_lineAspectManager.deleteLine(lineName, lineID);
	}

	onChangedValue(aspectArray, skipSave) {
		if (this.#_scopeManager.isLoading) {
			return; // no changed pushed anywhere while loading
		}
		if (!Array.isArray(aspectArray)) aspectArray = [aspectArray];
		for (let aspect of aspectArray) {
			if (aspect.canSaveToStorage && !skipSave) {
				this.saveChanges(aspect.name, this.#_scopeManager.scope.get(aspect.name));
			}
			try {
				this.#_modifiedAspectValueCallback(aspect.toAspectModifiedInfo());
			} catch (e) {
				console.error(e);
			}
		}
	}

	setValue(aspectModifiedInfo) { //  //name, value, arrayInfo) {
		if (!(aspectModifiedInfo instanceof AspectModifiedInfo)) {
			throw "setValue expected one argument, an instance of AspectModifiedInfo";
		}
		let aspect;
		if (aspectModifiedInfo.property || aspectModifiedInfo.lineID) {
			aspect = this.#_lineAspectManager.setValueOfLine(aspectModifiedInfo);
		} else {
			aspect = this.#_aspectManager.setValue(aspectModifiedInfo);
		}
		this.onChangedValue(aspect); // save value directly changed by the user, as it will not be propagated
	}

	getValue(name) {
		let properName = AspectScopeManager.getProperName(name);
		return this.#_aspectManager.getValue(properName);
	}

	loadData(dataKey) {
		console.log('--------------------------- LOAD DATA --------------------------------------');
		if (!dataKey) {
			console.log('Empty key. Switching to default key');
			dataKey = this.#_defaultContext;
		}
		this.#_scopeManager.isLoading = true;
		let aspectValues = this.#_storageService.getData(dataKey);
		if (!aspectValues || aspectValues.size < 1) {
			console.log(`WARNING : Context '${dataKey}' was empty. nothing loaded, but context switched.`)
			this.#_contextKey = dataKey;
			return;
		}
		this.resetData(true); // reset the sheet and context key
		this.#_contextKey = dataKey;
		let scope = this.#_scopeManager.scope;

		for(let mapEntry of aspectValues) {
			scope.set(mapEntry[0], mapEntry[1]);
		}

		for(let aspect of this.#_scopeManager.aspects.values()) {
			aspect.initializeFromScope(scope);
		}
		// Line elements need a special load, to recreate dynamic aspects
		let changes = this.#_lineAspectManager.loadFromScopeData();
		this.#sendModifiedSpecialOp(changes);

		this.#_scopeManager.recalculate();
		this.#_scopeManager.isLoading = false;

		this.sendAllValues(true);
	}

	#sendModifiedSpecialOp(modifiedAspectLineArray) {
		for (let change of modifiedAspectLineArray) {
			this.#_modifiedAspectValueCallback(change);
		}
	}

	saveData(dataKey) {
		console.log('--------------------------- SAVE DATA --------------------------------------');
		// saves all data (savable) to a potential new name
		var dataMap = new Map();
		for (let scopeInfo of this.#_scopeManager.scope) {
			let key = scopeInfo[0];
			let value = scopeInfo[1];
			let aspect = this.#_scopeManager.aspects.get(key);
			if (aspect && aspect.canSaveToStorage) {
				dataMap.set(key, value);
			}
		}
		this.#_storageService.saveData(dataKey, dataMap);
		this.#_contextKey = dataKey;
	}

	saveChanges(changeKey, changeData) {
		// save to current context an attribute change
		let data = this.#_storageService.getData(this.#_contextKey); // should receive a Map
		if(!(data instanceof Map)) data = this.#_scopeManager.scope;
		data.set(changeKey, changeData);
		this.#_storageService.saveData(this.#_contextKey, data);

	}

	// expect an array of AspectDefinition
	loadDefinitions(AspectDefinitionArray) {
		this.#_scopeManager.isLoading = true;

		// initialize all new properties
		//let loadMap = new Map();

		console.log("loadDefinitions start");
		let aspectChangedArray = new Array();
		for (let aspectDefinition of AspectDefinitionArray) {
			if (!(aspectDefinition instanceof AspectDefinition)) {
				throw "loadDefinitions expect an array of AspectDefinition instances.";
			}
			aspectDefinition.properName = AspectScopeManager.getProperName(aspectDefinition.name);

			if (!this.#_scopeManager.aspects.has(aspectDefinition.properName)) {

				let aspect = this.AddAspect(aspectDefinition);
				if (aspect && aspect.isDirectValue && aspectDefinition.defaultValueIsDefined) {
					this.#_aspectManager.setValueDirect(aspect, aspect.defaultValue, true);
					aspectChangedArray.push(aspect);
					if (aspect instanceof LinePropertyValue) {
						aspectChangedArray.push(aspect.linkedProperty);
					}
				}
			}
		}
		this.#_scopeManager.setResolutionOrder();
		this.#_scopeManager.propagateChange(aspectChangedArray, false);
		
		this.#_scopeManager.isLoading = false;
	}

	resetData(skipSend) {
		console.log('--------------------------- RESET DATA --------------------------------------');
		this.#_contextKey = this.#_defaultContext;
		
		// Line elements need a special load, to delete existing lines
		let changes = this.#_lineAspectManager.resetLines();
		this.#sendModifiedSpecialOp(changes);

		this.#_scopeManager.resetValues();
		if (!(skipSend == true)) {
			this.sendAllValues();
		}
	}

	sendAllValues(skipSave) {
		this.onChangedValue(Array.from(this.#_scopeManager.aspects.values()), skipSave);
	}
}


/*
	changedAspectCallback  : function(BaseAspect) -> {}
	This callback is used when a value is changed, typically to refresh ui.
	Do not change the value of the BaseAspect.
	Use the property originalName to get a match of the element name, as name was perhaps changed to a valid name.
*/

class AspectManager {
	#_scopeManager;

	/**
	 * Creates an instance of AspectManager.
	 * @param {AspectScopeManager} scopeData
	 * @memberof AspectManager
	 */
	constructor(scopeData) {
		this.#_scopeManager = scopeData;
	}

	AddAspect(aspectDefinition) {
		let properName = aspectDefinition.properName; //AspectScopeManager.getProperName(aspectDefinition.name);
		if (this.#_scopeManager.aspects.has(properName)) {
			console.log("Aspect already existed : " + aspectDefinition.name);
			return;
		}
		let aspect = this.createAspect(aspectDefinition);
		this.#_scopeManager.insertAspect(aspect);
		return aspect;
	}

	createAspect(aspectDefinition) {
		let aspect = null;
		switch (aspectDefinition.kind) {
			case EnumAspectKind.Direct:
				aspect = new BaseAspect(aspectDefinition.name, aspectDefinition.properName, true);
				break;
			case EnumAspectKind.Formula:
				aspect = new AspectFormula(aspectDefinition.name, aspectDefinition.properName, aspectDefinition.supplemental);
				break;
			case EnumAspectKind.Reference:
				aspect = new AspectReference(aspectDefinition.name, aspectDefinition.properName, aspectDefinition.supplemental);
				break;
			default:
				throw "Aspect kind wrong value received : " + kind;
				break;
		}
		this.completeAspectDefinition(aspect, aspectDefinition);
		return aspect;
	}
	completeAspectDefinition(aspect, aspectDefinition) {
		aspect.dataType = aspectDefinition.dataType;
		if (aspectDefinition.defaultValueIsDefined) {
			if (aspect.dataType == EnumDataType.NotSet && isNumeric(aspectDefinition.defaultValue)) {
				aspect.dataType = EnumDataType.Numeric;
			}
			aspect.defaultValue = this.convertValue(aspect, aspectDefinition.defaultValue);
		}
	}

	convertValue(aspect, newValue) {
		try {
			switch (aspect.dataType) {
				case EnumDataType.Numeric:
					return parseInt(newValue);
				case EnumDataType.Decimal:
					return parseFloat(newValue);
				default:
					return newValue;
			}
		} catch (e) {
			console.error(`Could not convert value for ${aspect.name} into ${aspect.dataType}. Value:'${newValue}. Error: ${e}'`);
		}
	}

	/**
	 * Set a modified aspect value into the appropriate object and scope
	 *
	 * @param {AspectModifiedInfo} aspectModifiedInfo
	 * @return {*} - Doesnt return anything
	 * @memberof AspectManager
	 */
	setValue(aspectModifiedInfo) { //  //name, value, arrayInfo) {
		let searchName = AspectScopeManager.getProperName(aspectModifiedInfo.name);
		let aspect = this.#_scopeManager.aspects.get(searchName);
		if (!aspect) {
			throw "Cannot set aspect value " + aspectModifiedInfo.value + ", unknown name :" + aspectModifiedInfo.name;
		}
		if (aspect instanceof LineElement) {
			console.error("setValue was called for a line, but without property and index set correctly");
			return;
		} else {
			this.setValueDirect(aspect, aspectModifiedInfo.value);
			if (!this.#_scopeManager.isLoading) {
				this.#_scopeManager.propagateChange(aspect);
			}
		}
		return aspect;
	}

	setValueDirect(aspect, value, skipValueCheck = false) {
		if (!aspect.isDirectValue) {
			return;
		}
		if (!skipValueCheck) {
			if (aspect.getValue() == value) {
				return; // no value changed
			}
		}
		//console.log("setValueDirect #scope.set : " + aspect.name + ", value :"  + value);
		let valueTyped = this.convertValue(aspect, value);
		aspect.setValue(valueTyped, this.#_scopeManager.scope);
	}

	getValue(properName) {
		let el = this.#_scopeManager.aspects.get(properName);
		if (!el) { return ''; }
		return el.getValue();
	}

	showValues(order) {
		for (let index = 0; index < order.length; index++) {
			let aspect = order[index];
			console.log(`${index} > ${aspect.name} : ${aspect.getWeight()}`);
		}
	}
}

// handle scope, propagation of changes
class AspectScopeManager {
	#_changedAspectCallback;
	isLoading = false;
	aspects = new Map();
	
	resolutionOrder = new Array();
	scope = new Map();
	persistantScope = new Map();

	constructor(changedAspectCallback) {
		// sets the callback after value changes have been observed
		this.#_changedAspectCallback = changedAspectCallback;
	}

	addLookupValues(key, object) {
		this.persistantScope.set(key, object);
		this.scope.set(key, object);
	}

	insertAspect(aspect) {
		this.aspects.set(aspect.name, aspect);
		aspect.initialize(this.scope);

		if (!this.isLoading) {
			this.setResolutionOrder();
		}
	}

	// names cannot include some characters (such as -) TODO : Change more characters
	static getProperName(name) {
		return name.replace('-', '_');
	}

	// originalAspect can be a single aspect, or an array of aspects
	propagateChange(originalAspect, skipFirst = true) {
		let changeToPropagate = null;
		if (Array.isArray(originalAspect)) {
			changeToPropagate = originalAspect;
		} else {
			changeToPropagate = Array();
			changeToPropagate.push(originalAspect);
		}

		//console.log("propagateChange");
		for (let index = 0; index < this.resolutionOrder.length; index++) {
			let aspect = this.resolutionOrder[index];
			//console.log(aspect);
			if (aspect.refersTo(changeToPropagate)) {
				//console.log("refers");
				aspect.getValue(this.scope, true); // gets the value, force a recalculation
				changeToPropagate.push(aspect);
				if (aspect.parentProperty) {
					changeToPropagate.push(aspect.parentProperty);
				}
			} else {
				//console.log("does not refers to");
			}
		}
		if (skipFirst) {
			changeToPropagate.shift(); // remove, no need to change for a specifically changed aspect
		}

		if (changeToPropagate) {
			this.#_changedAspectCallback(changeToPropagate);
		}
	}

	refreshResolutionOrder() {
		this.resolutionOrder.sort(this.#sortFunction);
	}

	setResolutionOrder() {
		let order = new Array(this.aspects.size - 1);
		let index = 0;
		for (let aspect of this.aspects.values()) {
			// calculate and add sequentially (getWeight calls referred functions as needed recursively)
			order[index] = aspect;
			aspect.getWeight(this.aspects);
			index++;
		}

		order.sort(this.#sortFunction);
		this.resolutionOrder = order;
	}

	// reloads all values to default attribute definition values. Delete all LinePropertyValue items
	resetValues() {
		this.isLoading = true;
		let markedAspects = Array();
		this.scope = new Map();
		for (let persistantScope of this.persistantScope) {
			this.scope.set(persistantScope.key, persistantScope.value);
		}
		for (let aspect of this.aspects.values()) {
			if (aspect.isLineAspect && (aspect instanceof LinePropertyValue)) {
				markedAspects.push(aspect);
			} else {
				aspect.reset(this.scope);
			}
		}

		for (let aspect of markedAspects) {
			this.aspects.delete(aspect.name);
		}

		this.recalculate();

		this.isLoading = false;
	}

	recalculate() {
		this.setResolutionOrder();
		for (let aspect of this.aspects.values()) {
			aspect.getValue(this.scope, true); // get value, force recalculation to take loaded values into account
		}
	}

	#sortFunction(left, right) {
		try {
			let compareResult = left.getWeight() < right.getWeight() ? -1 : (left.getWeight() > right.getWeight() ? 1 : 0);
			return compareResult;
		}
		catch (e) {
			console.error("Could not calculate weight : " + e);
			return 0;
		}
	}

}

class LineAspectManager {
	#_scopeManager;
	#_aspectManager;
	#_lineAspects = new Array();

	constructor(AspectManager, scopeManager) {
		if (!(scopeManager instanceof AspectScopeManager)) {
			throw "Cannot instanciate LineAspectManager without AspectScopeManager";
		}
		this.#_scopeManager = scopeManager;
		this.#_aspectManager = AspectManager;
	}

	// creates lineAspect and add properties
	AddAspect(aspectDefinition) {
		let changeLoadingBack = !this.#_scopeManager.isLoading;
		this.#_scopeManager.isLoading = true;

		let aspect = this.#_scopeManager.aspects.get(aspectDefinition.name);
		if (!aspect) {
			aspect = new LineElement(aspectDefinition.name, aspectDefinition.name, aspectDefinition.supplemental.properties);
			this.#_scopeManager.insertAspect(aspect, aspectDefinition.name);
			this.#_lineAspects.push(aspect);
		}

		for (let prop of aspect.propertiesDefinition) {
			let propName = aspect.getPropertyAspectName(prop.name);
			if (!this.#_scopeManager.aspects.has(propName)) {
				let linkedAspectCreation = this.getlinkedAspectFactory(prop);
				let aspectProp = new LineProperty(aspect, prop.name, linkedAspectCreation);
				this.#_scopeManager.insertAspect(aspectProp, aspectProp.name);
			}
		}

		if (changeLoadingBack) {
			this.#_scopeManager.setResolutionOrder();
			this.#_scopeManager.isLoading = false;
		}
	}

	// create a factory function to create the linked aspect needed
	// function(p) ==> where p is the LineProperty Aspect itself.
	getlinkedAspectFactory(propertyDefinition) {
		let originalName = "_internalAspect";
		let aspectManager = this.#_aspectManager;
		switch (propertyDefinition.kind) {
			case EnumAspectKind.Direct: // None
				return function () { return null; }
			case EnumAspectKind.Formula: // single shared instance accross lines
				return function (p, lineID) {  
					let propDef = propertyDefinition;
					let formula = p.parentLine.getIndexedLineIdentifier(propDef.supplemental, lineID);
					return aspectManager.createAspect(new AspectDefinition(originalName, EnumAspectKind.Formula, formula, propDef.name));
				}
			case EnumAspectKind.Reference: // new instance per line
				return function (p, lineID) {  
					let propDef = propertyDefinition;
					let reference = p.parentLine.getIndexedLineIdentifier(propDef.supplemental, lineID);
					return aspectManager.createAspect(new AspectDefinition(originalName, EnumAspectKind.Reference, reference, propDef.name));
				}
			default:
				throw `createlinkedAspect : Invalid Aspect kind ${propertyDefinition.kind}`;
		}
	}

	createLineIfNeeded(lineAspect, lineID) {
		if (!lineAspect.hasLine(lineID)) {
			let changedProp = new Array();
			for (let aspectDefinition of lineAspect.propertiesDefinition) {
				let aspectProp = this.#_scopeManager.aspects.get(lineAspect.getPropertyAspectName(aspectDefinition.name));
				let aspectValue = new LinePropertyValue(aspectProp, aspectDefinition.name, lineID);
				this.#_aspectManager.completeAspectDefinition(aspectValue, aspectDefinition);
				
				if (aspectValue.defaultValueIsDefined && aspectValue.isDirectValue) {
					this.#_aspectManager.setValueDirect(aspectValue, aspectValue.defaultValue, true);
					changedProp.push(aspectValue);
					changedProp.push(aspectProp);
				}
				this.#_scopeManager.insertAspect(aspectValue);
				lineAspect.setLineValue(lineID, aspectProp.name, aspectValue.value);
			}
			this.#_scopeManager.setResolutionOrder();
			this.#_scopeManager.propagateChange(changedProp, false);
		}
	}

	addLine(lineName, lineID) {
		lineID = lineID.toString();
		let lineAspect = this.#_scopeManager.aspects.get(lineName);
		if (!(lineAspect && (lineAspect instanceof LineElement))) {
			console.error("addLine called for a non Line Aspect :" + lineName);
			return 0;
		}
		this.createLineIfNeeded(lineAspect, lineID);
	}

	deleteLine(lineName, lineID) {
		// delete the line of data
		let lineAspect = this.#_scopeManager.aspects.get(lineName);
		if (!(lineAspect && (lineAspect instanceof LineElement))) {
			console.error("deleteLine called for a non Line Aspect :" + lineName);
			return 0;
		}
		if (lineAspect.hasLine(lineID)) {
			lineAspect.deleteLine(lineID);
			// delete the value aspect associated with the line
			for (let propDef of lineAspect.propertiesDefinition) {
				let aspectPropValueName = lineAspect.getValuePropertyAspectName(propDef.name, lineID);
				this.#_scopeManager.aspects.delete(aspectPropValueName);
			}

			// the lineAspect is propagated, as it has changed
			this.#_scopeManager.propagateChange(lineAspect);
		} else {
			console.error(`deleteLine: Line '${lineID}' not found in aspect ${lineName}`);
		}
	}

	// recreates all LinePropertyValue from scope data
	loadFromScopeData() {
		// scope data has been loaded, it is time to recreate all attributes and lines.
		let operations = Array();
		for(let lineAspect of this.#_lineAspects) {
			let lineMap = this.#_scopeManager.scope.get(lineAspect.name);
			for (let lineID of lineMap.keys()) {
				for (let aspectDefinition of lineAspect.propertiesDefinition) {
					let aspectProp = this.#_scopeManager.aspects.get(lineAspect.getPropertyAspectName(aspectDefinition.name));
					let aspectValue = new LinePropertyValue(aspectProp, aspectDefinition.name, lineID);
					this.#_aspectManager.completeAspectDefinition(aspectValue, aspectDefinition);
					aspectValue.initializeFromScope(this.#_scopeManager.scope, true);
					this.#_aspectManager.aspects.set(aspectValue.name, aspectValue);
				}
				let modifiedInfo = new AspectModifiedInfo(lineAspect.name, '', lineID, '', 'add');
				operations.push(modifiedInfo);
			}
		}
		return operations;
	}

	resetLines() {
		let operations = Array();
		for(let lineAspect of this.#_lineAspects) {
			let lineMap = this.#_scopeManager.scope.get(lineAspect.name);
			for (let lineID of lineMap.keys()) {
				let modifiedInfo = new AspectModifiedInfo(lineAspect.name, '', lineID, '', 'delete');
				operations.push(modifiedInfo);
			}
		}
		return operations;
	}

	setValueOfLine(aspectModified) {
		let lineAspect = this.#_scopeManager.aspects.get(aspectModified.name);
		if (!(lineAspect instanceof LineElement)) {
			console.error("setValueOfArray called for a non line Aspect :" + aspectModified.name);
			return 0;
		}
		if (!lineAspect.hasLine(aspectModified.lineID)) {
			console.error(`setValueOfLine called with a line ID '${aspectModified.lineID}' that does not exist`);
			return;
		}
		let aspectPropModified = this.#_scopeManager.aspects.get(lineAspect.getPropertyAspectName(aspectModified.property));
		if (!aspectPropModified) {
			console.error("setValueOfLine called for an undefined property :" + aspectModified.property);
			return 0;
		}

		let aspectValueModified = this.#_scopeManager.aspects.get(aspectPropModified.getValuePropertyAspectName(aspectModified.lineID));
		if (!aspectValueModified) {
			console.error(`Line value should have existed : ${aspectModified.lineID}, property: ${aspectModified.property}`);
			return;
		}
		this.#_aspectManager.setValueDirect(aspectValueModified, aspectModified.value);
		//if (!this.#_scopeManager.isLoading) {
			this.#_scopeManager.propagateChange([aspectValueModified, aspectPropModified, lineAspect]);
		//}
		return aspectValueModified;
	}

}

class BaseAspect {
	#_name = '';
	#_originalName = '';
	#_valueCalculatedState;
	#_weightCalculatedState;
	#_defaultValue = null;
	#_isDirectValue = true;
	#_canSaveToStorage = true;
	#_weight = 0;
	#_isLineAspect = false;
	value = 0;

	constructor(originalName, name, isDirectValue, canSaveToStorage, isLineAspect) {
		this.#_originalName = originalName;
		this.#_name = name;
		this.#_isDirectValue = isDirectValue;
		this.#_valueCalculatedState = isDirectValue ? EnumCalculatedState.Calculated : EnumCalculatedState.NotCalculated;
		this.#_weightCalculatedState = this.#_valueCalculatedState;
		this.#_canSaveToStorage = !(canSaveToStorage == false);
		this.#_isLineAspect = isLineAspect;
	}

	get name() { return this.#_name; }
	get originalName() { return this.#_originalName; }
	get isDirectValue() { return this.#_isDirectValue; }
	get defaultValue() { return this.#_defaultValue; }
	get defaultValueIsDefined() { return this.defaultValue != null; }
	get weight() { return this.#_weight; }
	get isWeightCalculated() { return EnumCalculatedState.isCalculated(this.#_weightCalculatedState); }
	get isValueCalculated() { return EnumCalculatedState.isCalculated(this.#_valueCalculatedState); }
	get canSaveToStorage() { return this.#_canSaveToStorage; }
	get isLineAspect() { return this.#_isLineAspect; }

	set defaultValue(value) { this.#_defaultValue = value; }
	set weight(value) { this.#_weight = value; }
	set weightCalculatedState(value) { this.#_weightCalculatedState = EnumCalculatedState.setState(this.#_weightCalculatedState, value); }
	set valueCalculatedState(value) { this.#_valueCalculatedState = EnumCalculatedState.setState(this.#_valueCalculatedState, value); }

	// called when aspect is initialized or a reset is called
	initialize(scope) {
		scope.set(this.name, this.value);
	}
	initializeFromScope(scope) {
		this.value = scope.get(this.name);
	}

	getValue(scope, forceCalculation) {
		// cannot calculate value when scope is not defined
		if (scope && (!this.isValueCalculated || forceCalculation)) {
			this.calculateValue(scope, forceCalculation);
			this.valueCalculatedState = EnumCalculatedState.setState(this.valueCalculatedState, EnumCalculatedState.Calculated);
			scope.set(this.name, this.value);
		}
		return this.value;
	}

	setValue(newValue, scope) {
		if (!this.isDirectValue) {
			console.log(`inappropriate setValue called for : ${this.name}`);
			return;
		}
		this.value = newValue;
		scope.set(this.name, this.value);
	}

	refersTo(names) {
		return false;
	}

	// present to be overridden
	calculateWeight(aspectMap) {

		return;
	}
	// present to be overridden
	calculateValue(scope, forceRecalculate) {
		return;
	}

	getWeight(aspectMap) {
		if (!this.isWeightCalculated) {
			this.calculateWeight(aspectMap);
			this.weightCalculatedState = EnumCalculatedState.Calculated;
		}
		return this.#_weight;
	}

	reset(scope) {
		this.value = this.defaultValue;
		this.valueCalculatedState = EnumCalculatedState.setState(this.valueCalculatedState, EnumCalculatedState.Calculated);
		this.initialize(scope);
	}

	toAspectModifiedInfo() {
		//console.log(this);
		return new AspectModifiedInfo(this.originalName, null, null, this.getValue());
	}
}

// Resolve a value of the name of an aspect to its actual value
// Name A. value = 1;
// Name F. value:'A'.
// Name R. reference: F. value depends on F and returns evaluated aspect value. 1 in this case.
// Must points to another aspect. That aspect should have the name of an aspect in it.
class AspectReference extends BaseAspect {
	#_referedMembers = Array(1);
	#_additionalWeight = 10;

	/**
	 * Creates an instance of AspectReference.
	 * @param {string} originalName
	 * @param {string} name
	 * @param {string} referenceName
	 * @param {string} lineID
	 * @memberof AspectReference
	 */
	constructor(originalName, name, referenceName, lineID) {
		super(originalName, name, false);
		if (lineID) {

		}
		this.#_referedMembers[0] = referenceName;
		this.#_referedMembers[1] = '';
		this.weight = this.#_additionalWeight;
		this.valueCalculatedState = EnumCalculatedState.AlwaysCalculate;
		this.weightCalculatedState = EnumCalculatedState.AlwaysCalculate;
	}

	#getReferencedAspectValue(scope, forceRecalculate) {
		let referenceName = this.#_referedMembers[0];
		let resolvedName = scope.get(referenceName);
		if (resolvedName == this.#_referedMembers[1] && !forceRecalculate) {
			return this.value;
		}
		if (this.#isNameRefered(this.name)) {
			throw "Circular reference. The resolved aspect name equals the reference aspect name " + resolvedName;
		}
		this.#_referedMembers[1] = resolvedName;

		let resolvedValue = scope.get(resolvedName);
		return resolvedValue;
	}


	#isNameRefered(name) {
		return this.#_referedMembers[0] == name || this.#_referedMembers[1] == name;
	}

	calculateValue(scope, forceRecalculate) {
		this.value = this.#getReferencedAspectValue(scope, forceRecalculate);
		scope.set(this.name, this.value);
		return this.value;
	}
	
	calculateWeight(aspectMap) {
		let newWeight = this.#_additionalWeight;
		if (!aspectMap) {
			console.log(`calculateWeight called without aspectMap for ${this.name}, weight: ${this.weight}`);
			return this.weight;
		}
		if (this.#isNameRefered(this.name)) {
			console.error(`Circular reference : AspectReference refers to itself : ${this.name}`);
			return 1000;
		}
		newWeight += Math.max(aspectMap.get(this.#_referedMembers[0])?.getWeight(aspectMap), (aspectMap.get(this.#_referedMembers[1])?.getWeight(aspectMap) ?? 0));

		if (newWeight != this.weight) {
			this.weight = newWeight;
			// TODO : trigger something, warn somehow that weight has changed, could affect resolution order.
		}
	}

	refersTo(aspectArray, aspectLineValue) {
		for (let aspect of aspectArray) {
			if (aspect instanceof LinePropertyValue && aspectLineValue) {
				if (aspect.lineID == aspectLineValue.lineID && this.#isNameRefered(aspect.parentProperty.name)) {
					return true;
				}
			}
			if (this.#isNameRefered(aspect.name)) {
				return true;
			}
		}
		return false;
	}

}

class AspectFormula extends BaseAspect {

	#_formula = null;
	#_textFormula = '';
	#_referedMembers = new Map();

	constructor(originalName, name, formula) {
		super(originalName, name, false, false); // not a direct value. not saved to storage (recalculated).
		this.#_textFormula = formula;
		try {
			this.#_formula = math.parse(formula);
		} catch (e) {
			throw `${originalName} : Could not parse text formula '${formula}' : ${e}`;
		}

		let nodesReferences = this.#_formula.filter((node) => { return node.isSymbolNode || node.isAccessorNode });

		for (let node of nodesReferences) {
			if (node.isSymbolNode) {
				//console.log("Add member : " + arg.name);
				this.#_referedMembers.set(node.name, 1);
			}
		}
	}

	refersTo(aspectArray, aspectLineValue) {
		for (let aspect of aspectArray) {
			if (aspect instanceof LinePropertyValue && aspectLineValue) {
				if (aspect.lineID == aspectLineValue.lineID && this.#_referedMembers.has(aspect.parentProperty.name)) {
					return true;
				}
			}
			if (this.#_referedMembers.has(aspect.name)) {
				return true;
			}
		}
		return false;
	}

	calculateValue(scope, forceCalculation = false) {
		//console.log("calculate called. isCalculated:" + this.#isCalculated + ", value:" + this.#value);
		if (!forceCalculation && this.isValueCalculated) {
			return this.value;
		}
		try {
			this.value = this.#_formula.evaluate(scope);
		} catch (e) {
			console.error(`Error parsing formula '${this.#_textFormula}' : ${e}`);
			this.value = 0;
		}

		return;
	}

	calculateWeight(aspectMap, circularCheckMap) {
		if (!(aspectMap)) {
			console.error(this.name + " getWeight() called without needed arguments");
			return 1000;
		}
		if (!circularCheckMap) {
			circularCheckMap = new Map();
		} else if (circularCheckMap.has(this.name)) {
			console.error("Formula circular reference error :" + member);
			return 1000;
		}
		circularCheckMap.set(this.name, 1);
		this.weight = 1;
		for (let member of this.#_referedMembers.keys()) {
			let memberAspect = aspectMap.get(member);
			if (!memberAspect) {
				//console.log("Symbol is not a member:" + member);
				this.weight += 1;
			} else {
				this.weight += memberAspect.getWeight(aspectMap, circularCheckMap)
			}
		}
	}
}

class LineElement extends BaseAspect {
	#_propertiesDefinition = null;
	#_values = new Map(); // key = lineIndex, value = Object() where all lines properties are added

	constructor(originalName, name, propertyMap) {
		if (propertyMap == null || !(propertyMap instanceof Map) || propertyMap.size < 1) {
			throw "LineElement --> requires a valid non-empty propertyMap";
		}
		super(originalName, name, false, true, true); // not a directvalue, do save to storage, and is LineAspect
		this.value = 0;
		this.valueCalculatedState = EnumCalculatedState.Calculated;
		this.weightCalculatedState = EnumCalculatedState.Calculated;
		this.#_propertiesDefinition = propertyMap;
	}
	// not the Actual LineProperty, but their definition.. not the same thing !
	get propertiesDefinition() { return Array.from(this.#_propertiesDefinition.values()); }
	get lineCount() { return this.#_values.size; }

	getPropertyAspectName(propName) {
		return this.name + "_" + propName;
	}
	getValuePropertyAspectName(propName, lineId) {
		return propName + "_" + lineId;
	}
	getIndexedLineIdentifier(formula, lineID) {
		return formula.replaceAll('[line-id]', '_' + lineID);
	}
	getLine(lineID) {
		return this.#_values.get(lineID);
	}
	hasLine(lineID) {
		return this.#_values.has(lineID);
	}
	setLineValue(lineID, property, value) {
		if (!this.#_values.has(lineID)) {
			this.#_values.set(lineID, new Object());
			this.value = this.#_values.size;
		}
		this.#_values.get(lineID)[property] = value;
	}
	getLineValue(lineID, property) {
		if (!this.#_values.has(lineID)) {
			console.error("getLineValue accessed with invalid row index " + index);
			return 0;
		}
		return this.#_values.get(lineID)[property];
	}
	deleteLine(lineID) {
		if (this.#_values.has(lineID)) {
			this.#_values.delete(lineID);
			this.value = this.#_values.size;
		}
	}

	initializeFromScope(scope) {
		this.#_values = scope.get(this.name);
	}
	initialize(scope) {
		scope.set(this.name, this.#_values);
	}
	getValue() {
		return this.value;
	}
	setValue(newValue) {
		console.error("setValue ignored. LineElement value can't be set directly");
	}
	reset(scope) {
		this.#_values = new Map();
		this.value = this.#_values.size;
		this.initialize(scope);
	}
}

// this element should not be referred directly
class LineProperty extends BaseAspect {

	#_lineAspect = null;
	#_additionalWeight = 100;
	#_linkedAspectFactory = null;

	/**
	 * Creates an instance of LineProperty.
	 * @param {LineElement} lineAspect
	 * @param {string} propertyName
	 * @param {function} linkedAspectFactory
	 * @memberof LineProperty
	 */
	constructor(lineAspect, propertyName, linkedAspectFactory) {
		let name = lineAspect.getPropertyAspectName(propertyName);
		super(propertyName, name, false, false, true); // not a directvalue, do not save to storage, and is LineAspect
		this.#_lineAspect = lineAspect;
		this.#_linkedAspectFactory = linkedAspectFactory;
		this.value = this.name;
		this.valueCalculatedState = EnumCalculatedState.Calculated;
		this.weightCalculatedState = EnumCalculatedState.NotCalculated;
	}

	// property name is the short property name. qty.
	get additionnalWeight() { return this.#_additionalWeight; }
	get parentLine() { return this.#_lineAspect; }
	get lineIDPropertyName() {
		return this.parentLine.lineIDPropertyName;
	}

	initializeLinkedAspect(lineID) {
		return this.#_linkedAspectFactory(this, lineID);
	}

	getValuePropertyAspectName(lineID) {
		return this.parentLine.getValuePropertyAspectName(this.name, lineID);
	}

	setLineValue(lineID, newValue) {
		this.parentLine.setLineValue(lineID, this.name, newValue);
	}

	setValue(newValue) {
		console.error("setValue ignored. LineProperty value can't be set directly");
	}

	reset(scope) {
		this.value = this.name;
		scope.set(this.name, this.value);
	}

	calculateWeight(aspectMap, forceCalculation) {
		this.weight = this.additionnalWeight;
	}
}

class LinePropertyValue extends BaseAspect {
	#_parentProperty = null;
	#_parentLine = null;
	#_linkedAspect;
	#_lineID = -1;
	#_additionalWeight = 10;

	/**
	 * Creates an instance of LinePropertyValue.
	 * @param {LineProperty} parentProperty
	 * @param {string} originalName
	 * @param {string} lineID
	 * @memberof LinePropertyValue
	 */
	constructor(parentProperty, originalName, lineID) {
		let name = parentProperty.getValuePropertyAspectName(lineID);
		let linkedAspect = parentProperty.initializeLinkedAspect(lineID);
		let isDirectValue = linkedAspect == null;
		super(originalName, name, isDirectValue, false, true); // do not save to storage, and is LineAspect
		this.#_parentProperty = parentProperty;
		this.#_lineID = lineID;
		this.#_parentLine = parentProperty.parentLine;
		this.#_linkedAspect = linkedAspect;
		this.valueCalculatedState = linkedAspect == null ? EnumCalculatedState.Calculated : EnumCalculatedState.AlwaysCalculate; // always set the scope on a getValue, so calculateAlways called
		this.weightCalculatedState = parentProperty.weightCalculatedState;
	}

	get lineID() { return this.#_lineID; }
	get parentLine() { return this.#_parentLine; }
	get parentProperty() { return this.#_parentProperty; }
	get additionalWeight() { return this.#_additionalWeight; }

	#setInternalValue(newValue) {
		this.parentLine.setLineValue(this.lineID, this.parentProperty.name, newValue);
		this.value = newValue;
	}

	calculateValue(scope, forceRecalculate) {
		if (this.#_linkedAspect) {
			this.#setInternalValue(this.#_linkedAspect.getValue(scope, forceRecalculate));
		}
	}

	initializeFromScope(scope) {
		let lineValues = scope.get(this.parentLine.name);
		let currentLineObject = lineValues.get(this.lineID);
		this.value = currentLineObject[this.parentProperty.name];
	}

	setValue(newValue, scope) {
		if (this.isDirectValue) {
			if (newValue === this.value) {
				return;
			}
			this.#setInternalValue(newValue);
		} else {
			console.log("ArrayPropertyValue.setValue called and ignored, as " + this.parentProperty.name + " is not a Fixed value Aspect");
			return;
		}

		scope.set(this.name, this.value);
	}

	calculateWeight(aspectMap) {
		this.weight = this.additionalWeight;
		if (this.#_linkedAspect) {
			this.weight += this.#_linkedAspect.getWeight(aspectMap);
		}
	}

	refersTo(aspectArray) {
		if (this.#_linkedAspect) {
			return this.#_linkedAspect.refersTo(aspectArray, this);	
		}
		return false;
	}

	toAspectModifiedInfo() {
		return new AspectModifiedInfo(this.parentLine.name, this.originalName, this.lineID, this.value);
	}

}

// import the new function in the math namespace
math.import({
	// operation: sum, count, mean
	lineAggregate: function(lineMap, propertyName, operation, propNameCond, propValueCond) {
		if (!operation) operation = "sum";
		let hasCondition = !(propNameCond && propValueCond);
		let index = 0;
		let valueArray = Array();
		for (let lineObject of lineMap.values()) {
			if (!hasCondition || (lineObject[propNameCond] == propValueCond)) {
				valueArray.push(lineObject[propertyName]);
				index += 1;
			}
		}
		if (index == 0) return 0; // when empty, return 0 as the value
		switch (operation) {
			case "sum":
				return valueArray.reduce((a,b) => a+b,0);
			case "mean":
				return index == 0 ? 0 : valueArray.reduce((a,b) => a+b,0) / (index);
			case "count":
				return index;
			case "min":
				return math.min(...valueArray);
			case "max":
				return math.max(...valueArray);
			default:
				return valueArray.reduce((a,b) => { a+b },0);
		}
	},
	lineFirst: function (lineMap, propNameCond, propValue) {
		for (let lineObject of lineMap.values()) {
			if (lineObject.hasOwnProperty(propNameCond)) {
				if (lineObject[propNameCond] == propValue) {
					return lineObject;
				}
			}
		}
		return new Object();
	}
});