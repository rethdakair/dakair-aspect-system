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
	LineFilter: 'line-filter',
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
	isValid: function (value) {
		let found = false;
		Object.getOwnPropertyNames(this).forEach(propertyName => { if (this[propertyName] == value) found = true; });
		return found;
	},
	getName: function (value) {
		let name = '';
		Object.getOwnPropertyNames(this).forEach(propertyName => { if (this[propertyName] == value) name = propertyName; });
		return name;
	}
});

class CalculatedState {
	/** @type {number} state from {EnumCalculatedState} type */
	#_state = 0;
	constructor(initialState) {
		if (!EnumCalculatedState.isValid(initialState)) {
			console.error('Invalid state set : ' + initialState);
			return;
		}
	}
	get isCalculated() { return this.#_state == EnumCalculatedState.Calculated; }
	get state() { return this.#_state; }
	/** @param {number} value valid state from {EnumCalculatedState} type */
	set state(value) {
		if (!EnumCalculatedState.isValid(value)) {
			console.error('Invalid state set : ' + value);
			return;
		}
		if (this.#_state != EnumCalculatedState.AlwaysCalculate) {
			this.#_state = value;
		}
	}

}

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

/**
 * Use localStorage. override to use custom storage options
 * @class DasStorageService
 */
class DasStorageService {
	useCallback(callback, data) {
		if (callback) {
			callback(data);
		}
	}

	/**
	 * Transform a Map to an Object to allow json save. adds a property for invert casting
	 * @param {Map} map instance of Map to transform to object property/values.
	 * @return {Object} Object with each property being a key of the Map and their value.
	 * @memberof DasStorageService
	 */
	mapToObject(map) {
		let o = Object.assign(Object.create(null), ...[...map].map(v => ({ [v[0]]: v[1] })));
		o.jsonType = 'map';
		return o;
	}

	/**
	 * Transform an object with a special member into a Map
	 * @param {Object} obj Object to read properties from
	 * @return {Map | Object} if the Object has the right property, returns a Map of an Object
	 * @memberof DasStorageService
	 */
	objectToMap(obj) {
		if (obj.jsonType == 'map') {
			let map = new Map([...Object.keys(obj).map(k => ([k, obj[k]]))]);
			map.delete('jsonType');
			return map;
		}
		return obj
	}

	/**
	 * Callback for JSON.stringify to transform map To Json
	 * @param {*} key Not used
	 * @param {*} value Value checked for Map type and transformation to an Object
	 * @return {*} 
	 * @memberof DasStorageService
	 */
	mapToJson(key, value) {
		return value instanceof Map ? this.mapToObject(value) : value; // Array.from(value.entries()).toString() : value; //Object.entries(value) : value; // Array.from(value.entries())
	}

	/**
	 * Callback for JSON.parse to transform Object to Map from Json
	 * @param {*} key Not Used
	 * @param {*} value value checked for Object to transform into Map
	 * @return {*} 
	 * @memberof DasStorageService
	 */
	mapReviver(key, value) {
		return value && (value.jsonType == 'map') ? this.objectToMap(value) : value;
	}

	/**
	 * Encodes data as a JSON string
	 * @param {Map} sourceMap Map of source values
	 * @return {string} Json string
	 * @memberof DasStorageService
	 */
	encodeData(sourceMap) {
		return JSON.stringify(sourceMap, (k, v) => this.mapToJson(k, v));
	}

	/**
	 * Decode JSOn string into a Map of data
	 * @param {string} sourceData Source JSON string to decode
	 * @return {Map} Map of the saved data
	 * @memberof DasStorageService
	 */
	decodeData(sourceData) {
		let data;
		try {
			data = JSON.parse(sourceData || "{}", (k, v) => this.mapReviver(k, v));
			if (!(data instanceof Map)) {
				console.log('Oh oh');
			}
		} catch (e) {
			console.error(`Could not decode value '${sourceData}' : ${e}`);
			data = new Map();
		}
		return data;
	}

	/**
	 * Delete all data Map from the specified key
	 * @param {string} dataKey Data key of LocalStorage
	 * @memberof DasStorageService
	 */
	deleteData(dataKey, callback) {
		if (localStorage.getItem(dataKey)) {
			localStorage.removeItem(dataKey);
		}
		this.useCallback(callback);
	}

	/**
	 * Duplicate a key Map data into a different entry name
	 * @param {string} dataKey original data key name
	 * @param {string} newDataKey new data key name where it will be saved
	 * @memberof DasStorageService
	 */
	duplicate(dataKey, newDataKey, callback) {
		this.getData(dataKey, (data) => {this.saveData(newDataKey, data, () => {console.log('Saved'); this.useCallback(callback,null);})});
	}

	/**
	 * Returns the Map associated with the dataKey
	 * @param {string} dataKey data key name
	 * @return {Map} Data collection Map
	 * @memberof DasStorageService
	 */
	getData(dataKey, callback) {
		let localData = localStorage.getItem(dataKey);
		let result = null;
		if (!localData) {
			console.error(`Could not load context '${dataKey}' from storage. returned empty Map.`);
			result = new Map();
		} else {
			result = this.decodeData(localData);
		}
		this.useCallback(callback, result);
	}

	/**
	 * Save data in the given key
	 * @param {string} dataKey data key name
	 * @param {Map} data Data collection Map
	 * @memberof DasStorageService
	 */
	saveData(dataKey, data, callback) {
		localStorage.setItem(dataKey, this.encodeData(data));
		this.useCallback(callback, null);
	}
}

/**
 * Class to hold definition of Aspect for UI Definition
 * @class AspectDefinition
 */
class AspectDefinition {
	#_name = '';
	#_kind = '';
	#_supplemental = null;
	/** @type {string} */
	#_defaultValue = null;
	#_dataType = EnumDataType.NotSet;

	properName = ''; // this field is set internally, but used inside the DAS.
	/**
	 * Creates an instance of AspectDefinition.
	 * @param {string} name Aspect name
	 * @param {string} kind Aspect kind
	 * @param {LinePropertiesDefinition | LineFilterProperties | string} [supplemental] supplemental info depending on the kind
	 * @param {string?} [properName=null] Propername to use, no special or forbidden characters
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
		if (kind == EnumAspectKind.LineFilter && (supplemental == null || !(supplemental instanceof LineFilterProperties))) {
			throw "Line Filter Aspect need to have a non empty line name";
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
 * @class LinePropertiesDefinition
 */
class LinePropertiesDefinition {
	/** @type {Map<string, AspectDefinition>} */
	#_properties = new Map();

	get properties() { return this.#_properties; }

	/**
	* Adds a property to the Line
	* @param {AspectDefinition} aspectDef
	* @memberof LinePropertiesDefinition
	*/
	addProperty(aspectDef) {
		if (!(aspectDef instanceof AspectDefinition)) {
			throw "addProperty requires one instance of AspectDefinition as parameter";
		}
		this.#_properties.set(aspectDef.name, aspectDef);
	}
}

/**
 * Class to hold properties for Line Filters
 * @class LineFilterProperties
 */
class LineFilterProperties {
	/**
	 * Creates an instance of LineFilterProperties.
	 * @param {*} lineName
	 * @param {*} filter
	 * @memberof LineFilterProperties
	 */
	constructor(lineName, filter) {
		this.lineName = lineName;
		this.filter = filter;
	}
}

/**
 * Class to hold modifier information from the html page to the AspectManagermentSystem
 * @class AspectModifiedInfo
 */
class AspectModifiedInfo {
	#_name = '';
	#_property = '';
	#_lineID = -1;
	#_value = '';
	/** @type {string} */
	#_lineOperation = null;
	/**
	 * Creates an instance of AspectModifiedInfo. Class used to transfer information to the UI
	 * @param {string} name Name of the Aspect modified
	 * @param {string?} [property] Property name of the LineElement aspect modified
	 * @param {string?} [lineID] Line ID of the LineElement aspect modified
	 * @param {string|number} value value of the modified property
	 * @param {string?} [lineOperation] line operation for LineElement. add or del.
	 * @memberof AspectModifiedInfo
	 */
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

	/**
	 * Get simple value changed instance
	 * @static
	 * @param {string} name
	 * @param {string|number|string[]} newValue
	 * @memberof AspectModifiedInfo
	 */
	static getSimpleValueChanged(name, newValue) {
		return new AspectModifiedInfo(name, null, null, newValue);
	}
}

/* 
	AspectSystemManager instance is meant to be called by the page function directly.
	Other classes are for internal use only.
	Public methods redirect to right objects methods.
*/

/**
 *	AspectSystemManager main class.
 *	@description instance is meant to be called by the page function directly. 
 *  Other classes are for internal use only.
 *	Public methods redirect to right objects methods.
 * @class AspectSystemManager
 */
class AspectSystemManager {
	/** @type {AspectScopeManager} */
	#_scopeManager;
	/** @type {AspectManager} */
	#_aspectManager;
	/** @type {LineAspectManager} */
	#_lineAspectManager;
	/** @type {DasStorageService} */
	#_storageService;
	#_modifiedAspectValueCallback;
	#_defaultContext = 'default';
	#_contextKey = 'lastValues';

	/**
	 * Creates an instance of AspectSystemManager.
	 * @param {function} modifiedAspectValueCallback Function called when a value is modified in the system to tell the UI
	 * @param {DasStorageService} storageService storage service for data persistance
	 * @memberof AspectSystemManager
	 */
	constructor(modifiedAspectValueCallback, storageService) {
		this.#_scopeManager = new AspectScopeManager((aspectArray) => { this.onChangedValue(aspectArray); });
		this.#_aspectManager = new AspectManager(this.#_scopeManager);
		this.#_lineAspectManager = new LineAspectManager(this.#_aspectManager, this.#_scopeManager);
		this.#_modifiedAspectValueCallback = modifiedAspectValueCallback;
		if (storageService && !(storageService instanceof DasStorageService)) {
			throw "storageService must be an instance of DasStorageService.";
		}
		this.#_storageService = storageService ?? new DasStorageService();
	}

	/**
	 * add a single aspect in the system
	 * @param {AspectDefinition} aspectDefinition Definition of Aspect to create
	 * @return {BaseAspect | AspectFormula | AspectReference} Specific aspect created instance
	 * @memberof AspectSystemManager
	 */
	AddAspect(aspectDefinition) {
		if (!(aspectDefinition instanceof AspectDefinition)) {
			throw "AddAspect require one instance of AspectDefinition";
		}

		if (aspectDefinition.kind == EnumAspectKind.Lines) {
			return this.#_lineAspectManager.AddAspect(aspectDefinition);
		} else {
			return this.#_aspectManager.AddAspect(aspectDefinition);
		}
	}
	/**
	 * NOT USED YET. TODO : Implement for handling list lookup from number to text
	 * @param {*} key
	 * @param {*} object
	 * @memberof AspectSystemManager
	 */
	addLookupValues(key, object) {
		this.#_scopeManager.addLookupValues(key, object);
	}
	/**
	 * Add a Line into a LineElement Aspect
	 * @param {string} lineName LineElement Aspect name
	 * @param {string} lineID Line key
	 * @memberof AspectSystemManager
	 */
	addLine(lineName, lineID) {
		this.#_lineAspectManager.addLine(lineName, lineID);
	}

	/**
	 * Delete a Line from a LineElement Aspect
	 * @param {string} lineName LineElement Aspect name
	 * @param {string} lineID Line key
	 * @memberof AspectSystemManager
	 */
	deleteLine(lineName, lineID) {
		this.#_lineAspectManager.deleteLine(lineName, lineID);
	}

	/**
	 * Function called when values are modified to send to the UI
	 * @param {BaseAspect[]} aspectArray Array of Aspect to send to the UI
	 * @param {boolean} skipSave Indicate to avoid savind this data
	 * @memberof AspectSystemManager
	 */
	onChangedValue(aspectArray, skipSave) {
		if (this.#_scopeManager.isLoading) {
			return; // no changed pushed anywhere while loading
		}
		if (!Array.isArray(aspectArray)) aspectArray = [aspectArray];
		let changes = Array();
		for (let aspect of aspectArray) {
			if (aspect.canSaveToStorage && !skipSave) {
				changes.push({changeKey: aspect.name, changeData:this.#_scopeManager.scope.get(aspect.name)});
			}
			try {
				this.#_modifiedAspectValueCallback(aspect.toAspectModifiedInfo());
			} catch (e) {
				console.log(aspect);
				console.error(e);
			}
		}
		
		if (!skipSave) {
			this.saveChanges(changes);
		}
	}

	/**
	 * Set value of Aspect to given value
	 * @param {AspectModifiedInfo} aspectModifiedInfo Instance with all modification information to apply to actual Aspect
	 * @memberof AspectSystemManager
	 */
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
	}

	/**
	 * Gets a simple value from an aspect name
	 * @param {string} name
	 * @return {string|number|Map} 
	 * @memberof AspectSystemManager
	 */
	getValue(name) {
		let properName = AspectScopeManager.getProperName(name);
		return this.#_aspectManager.getValue(properName);
	}

	/**
	 * Empty UI, cache and persisted value for given key
	 * @param {string} dataKey
	 * @memberof AspectSystemManager
	 */
	setEmptyData(dataKey) {
		this.#_scopeManager.isLoading = false;
		this.resetData(true); // reset the sheet and context key
		this.#_contextKey = dataKey;
		this.sendAllValues(false); // resends all the values and save them
	}

	/**
	 * Load data from the Storage Service
	 * @param {string} dataKey
	 * @memberof AspectSystemManager
	 */
	loadData(dataKey) {
		console.log('--------------------------- LOAD DATA --------------------------------------');
		if (!dataKey) {
			console.log('Empty key. Switching to default key');
			dataKey = this.#_defaultContext;
		}
		this.#_scopeManager.isLoading = true;
		this.#_storageService.getData(dataKey, (data) => this.loadDataPart2(dataKey,data));
	}
	/**
	 * Loads given data from storage
	 * @param {Map<string,*>} aspectValues 
	 * @returns 
	 */
	loadDataPart2(dataKey, aspectValues){
		if (!aspectValues || aspectValues.size < 1) {
			this.setEmptyData(dataKey)
			return;
		}
		this.resetData(true); // reset the sheet and context key
		this.#_contextKey = dataKey;
		let scope = this.#_scopeManager.scope;

		for (let mapEntry of aspectValues) {
			scope.set(mapEntry[0], mapEntry[1]);
		}

		for (let aspect of this.#_scopeManager.aspects.values()) {
			aspect.initializeFromScope(scope);
		}
		
		// Line elements need a special load, to recreate dynamic aspects
		let changes = this.#_lineAspectManager.loadFromScopeData();
		this.#sendModifiedSpecialOp(changes);

		this.#_scopeManager.recalculate();
		this.#_scopeManager.isLoading = false;

		this.sendAllValues(true);
	}

	/**
	 * Send special Line Operation as call back. Used while loading data mainly.
	 * @param {AspectModifiedInfo[]} modifiedAspectLineArray Array of ModifiedAspect info
	 * @memberof AspectSystemManager
	 */
	#sendModifiedSpecialOp(modifiedAspectLineArray) {
		for (let change of modifiedAspectLineArray) {
			this.#_modifiedAspectValueCallback(change);
		}
	}

	/**
	 * Methods to tell DAS to send smart information of Aspect, with the same callback that modified value is sent
	 * LineElement are especially targetted. Can send all Lines or only specified line.
	 * @param {string} aspectName Aspect name
	 * @param {string?} [lineID] Line identifier for a LineElement
	 * @memberof AspectSystemManager
	 */
	resend(aspectName, lineID) {
		let aspect = this.#_scopeManager.aspects.get(aspectName);
		let resultAspects = aspect;
		if (aspect instanceof LineElement) {
			resultAspects = aspect.getAllLineAspects(this.#_scopeManager.aspects, lineID);
		}
		this.onChangedValue(resultAspects, false);
	}

	/**
	 * Save data to the StorageService
	 * @param {string} dataKey key of data to save
	 * @memberof AspectSystemManager
	 */
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

	/** 
	 * @typedef ChangedValues
   * @type {object}
   * @property {string} changeKey key
   * @property {string|number} changeData value
   */

	/**
	 * Saves a change in the storage
	 * @param {ChangedValues[]} allChanges array of changes
	 * @memberof AspectSystemManager
	 */
	saveChanges(allChanges) {
		// save to current context an attribute change
		this.#_storageService.getData(this.#_contextKey, (data) => { 
			if (!(data instanceof Map)) data = this.#_scopeManager.scope;
			for(let oneChange of allChanges) {
				data.set(oneChange.changeKey, oneChange.changeData);
			}			
			this.#_storageService.saveData(this.#_contextKey, data);
		});
	}
	

	/**
	 * Loads Aspect Definition into the system. Creating all real Aspect instances.
	 * @param {AspectDefinition[]} AspectDefinitionArray Array of all aspects to load definitions
	 * @memberof AspectSystemManager
	 */
	loadDefinitions(AspectDefinitionArray) {
		this.#_scopeManager.isLoading = true;

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

	/**
	 * Restes loaded and displayed data to default values
	 * @param {boolean} skipSend When true, do not send resetted values to the UI
	 * @memberof AspectSystemManager
	 */
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

	/**
	 * Send all values to the UI
	 * @param {boolean} skipSave Don,t save data as persistent values
	 * @memberof AspectSystemManager
	 */
	sendAllValues(skipSave) {
		this.onChangedValue(Array.from(this.#_scopeManager.aspects.values()), skipSave);
	}
}

/**
 * Manager of all the base Aspects and global Aspect operations (Get, Set, list)
 * @class AspectManager
 */
class AspectManager {
	/** @type {AspectScopeManager} */
	#_scopeManager;

	/**
	 * Creates an instance of AspectManager.
	 * @param {AspectScopeManager} scopeData
	 * @memberof AspectManager
	 */
	constructor(scopeData) {
		this.#_scopeManager = scopeData;
	}

	/**
	 * Adds a Single Aspect to the list and instanciate it. Does not handle LineElement Aspects.
	 * @param {AspectDefinition} aspectDefinition
	 * @return {BaseAspect} Returns the Aspect, properly instanciated
	 * @memberof AspectManager
	 */
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

	/**
	 * Creates an isntance of BaseAspect or extended class from AspectDefinition
	 * @param {AspectDefinition} aspectDefinition
	 * @return {BaseAspect} Returns the Aspect, properly instanciated
	 * @memberof AspectManager
	 */
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
			case EnumAspectKind.LineFilter:
				/** @type {LineFilterProperties} */
				let filterInfo = aspectDefinition.supplemental;
				aspect = new AspectLineFilter(aspectDefinition.name, filterInfo.lineName,filterInfo.filter);
				break;
			default:
				throw "Aspect kind wrong value received : " + aspectDefinition.kind;
				break;
		}
		this.completeAspectDefinition(aspect, aspectDefinition);
		return aspect;
	}

	/**
	 * Sets attributes commons to all aspects, not handled by class instances
	 * @param {BaseAspect} aspect
	 * @param {AspectDefinition} aspectDefinition
	 * @memberof AspectManager
	 */
	completeAspectDefinition(aspect, aspectDefinition) {
		aspect.dataType = aspectDefinition.dataType;
		if (aspectDefinition.defaultValueIsDefined) {
			if (aspect.dataType == EnumDataType.NotSet && isNumeric(aspectDefinition.defaultValue)) {
				aspect.dataType = EnumDataType.Numeric;
			}
			aspect.defaultValue = this.convertValue(aspect, aspectDefinition.defaultValue);
		}
	}

	/**
	 * Convert a value into the type expected by the Aspect
	 * @param {BaseAspect} aspect
	 * @param {number|string|decimal} newValue new value, potentially not in the right type
	 * @return {number|string|decimal} Correctly typed value. If no type specified, returned as sent.
	 * @memberof AspectManager
	 */
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
	 * @param {AspectModifiedInfo} aspectModifiedInfo Modification information
	 * @return {BaseAspect} Return the Aspect modified from the information
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

	/**
	 * Sets the value to the Aspect instance sent
	 * @param {BaseAspect} aspect
	 * @param {*} value
	 * @param {boolean} [skipValueCheck=false] When set, will not set value if it has not changed
	 * @memberof AspectManager
	 */
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

	/**
	 * Returns value of specified Aspect
	 * @param {string} properName aspect processed name
	 * @return {*} value as stored in the instance
	 * @memberof AspectManager
	 */
	getValue(properName) {
		let el = this.#_scopeManager.aspects.get(properName);
		if (!el) { return ''; }
		return el.getValue();
	}

	/**
	 * DEBUG METHOD. Display all values
	 * @param {BaseAspect[]} order AAspect array to display. typically the sorted by weight array.
	 * @memberof AspectManager
	 */
	showValues(order) {
		for (let index = 0; index < order.length; index++) {
			let aspect = order[index];
			console.log(`${index} > ${aspect.name} : ${aspect.getWeight()}`);
		}
	}
}

/**
 * Manages the scope data used for formula and global values shared by the different Manager classes
 * @class AspectScopeManager
 */
class AspectScopeManager {
	/** @type {function} */
	#_changedAspectCallback;
	#_loadingLevel = 0;

	/** @type {Map<string, BaseAspect>} */
	aspects = new Map();
	/** @type {BaseAspect[]} */
	resolutionOrder = new Array();
	/** @type {Map<string, *>} */
	scope = new Map();
	/** @type {Map<string, *>} */
	persistantScope = new Map();

	/**
	 * Creates an instance of AspectScopeManager.
	 * @param {function} changedAspectCallback Callback used to send Changed info. (ModifiedAspectInfo) => ()
	 * @memberof AspectScopeManager
	 */
	constructor(changedAspectCallback) {
		// sets the callback after value changes have been observed
		this.#_changedAspectCallback = changedAspectCallback;
	}
	get isLoading() { return this.#_loadingLevel != 0;}
	set isLoading(value) { 
		this.#_loadingLevel = Math.max(0,this.#_loadingLevel + (value ? 1 : -1)); 
		//console.log(`level: ${this.#_loadingLevel}, isLoading?${this.isLoading}`);
	}

	/**
	 * TODO : Not yet used.
	 * @param {*} key
	 * @param {*} object
	 * @memberof AspectScopeManager
	 */
	addLookupValues(key, object) {
		this.persistantScope.set(key, object);
		this.scope.set(key, object);
	}

	/**
	 * Insert an aspect. typically after the loading, for dynamic Aspects like LineElement
	 * @param {*} aspect
	 * @memberof AspectScopeManager
	 */
	insertAspect(aspect) {
		this.aspects.set(aspect.name, aspect);
		aspect.initialize(this.scope);

		if (!this.isLoading) {
			this.setResolutionOrder();
		}
	}

	/**
	 * Gives a name without forbidden character. TODO : Process more chanracters
	 * @static
	 * @param {string} name original name form the UI. Stored internally.
	 * @return {string} Processed name.
	 * @memberof AspectScopeManager
	 */
	static getProperName(name) {
		return name.replace('-', '_');
	}

	/**
	 * Propagate changes of Aspect to other Aspect which reference the aspects. Does it in one pass in a sorted by weight and reference array.
	 * @param {BaseAspect|BaseAspect[]} originalAspect
	 * @param {boolean} [skipFirst=true] Deprecated and removed parameter
	 * @memberof AspectScopeManager
	 */
	propagateChange(originalAspect) {
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
			if (aspect.refersTo(changeToPropagate) && !changeToPropagate.includes(aspect)) {
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
		
		this.processWeightChange(() => this.propagateChange);
		if (changeToPropagate) {
			this.#_changedAspectCallback(changeToPropagate);
		}
	}

	// return false is nothg had to be reprocessed
	processWeightChange(fn) {
		let weightChangedArray = this.resolutionOrder.filter((a) => a.weightChanged);
		if (weightChangedArray.length > 0) {
			for(let changedOne of weightChangedArray) {
				changedOne.calculateWeight(this.aspects);
				changedOne.weightChanged = false;
				changedOne.getValue(this.scope, true);
			}
			this.setResolutionOrder();
			fn(weightChangedArray);
			return true;
		}
		return false;
	}

	/**
	 * Resorts the resolution order Aspect array
	 * @memberof AspectScopeManager
	 */
	refreshResolutionOrder() {
		this.resolutionOrder.sort(this.#sortFunction);
	}

	/**
	 * Create the resolutioNOrder Aspect Array. Precalculates weight.
	 * @memberof AspectScopeManager
	 */
	setResolutionOrder() {
		let order = new Array(this.aspects.size - 1);
		let index = 0;
		for (let aspect of this.aspects.values()) {
			// calculate and add sequentially (getWeight calls referred functions as needed recursively)
			order[index] = aspect;
			aspect.getWeight(this.aspects);
			index++;
		}

		this.resolutionOrder = order.sort(this.#sortFunction);
		//this.showSomeThings();
	}

	/**
	 * Resets Aspects to default values. Delete LineElement lines
	 * @memberof AspectScopeManager
	 */
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
		//this.showSomeThings();
		for (let aspect of this.resolutionOrder) {
			aspect.getValue(this.scope, true); // get value, force recalculation to take loaded values into account
		}
		this.processWeightChange(() => { console.log('recalculate 2'); this.recalculate(); });
	}

	showSomeThings() {
		this.getResolutionDebugInfo('skill_accounting_stat');
		this.getResolutionDebugInfo('skill_accounting_rank');
		this.getResolutionDebugInfo('skill_accounting_total');
		this.getResolutionDebugInfo('stat_int_total');
		this.getResolutionDebugInfo('hp_max');
	}

	getResolutionDebugInfo(name) {
		let aspect = this.aspects.get(name);
		let resolutionOrder = this.resolutionOrder.indexOf(aspect);

		console.log(`---------------------- Name: ${name}. Resolution: ${resolutionOrder}`);
		aspect.explain(this.scope);
	}

	/**
	 * Sort by Weight default function for Aspect array
	 * @param {BaseAspect} left Element figuratively at the left of the evaluation
	 * @param {BaseAspect} right Element figuratively at the right of the evaluation
	 * @return {number} Comparison result. 0 for equality. -1 for value smaller and 1 for greater value. Expected for sort.
	 * @memberof AspectScopeManager
	 */
	#sortFunction(left, right) {
		try {
			let compareResult = left.weight < right.weight ? -1 : (left.weight > right.weight ? 1 : 0);
			return compareResult;
		}
		catch (e) {
			console.error("Could not calculate weight : " + e);
			return 0;
		}
	}

}

/**
 * LIneElement Manager class. Manages line creation
 * @class LineAspectManager
 */
class LineAspectManager {
	/** @type {AspectScopeManager} */
	#_scopeManager;
	/** @type {AspectManager} */
	#_aspectManager;
	/** @type {LineElement[]} */
	#_lineAspects = new Array();

	/**
	 * Creates an instance of LineAspectManager.
	 * @param {AspectManager} AspectManager Aspect Manager
	 * @param {AspectScopeManager} scopeManager Scope Manager - Common global values and scope Map for formula resolution
	 * @memberof LineAspectManager
	 */
	constructor(AspectManager, scopeManager) {
		if (!(scopeManager instanceof AspectScopeManager)) {
			throw "Cannot instanciate LineAspectManager without AspectScopeManager";
		}
		this.#_scopeManager = scopeManager;
		this.#_aspectManager = AspectManager;
	}

	/**
	 * Add a LineElementAspect. Create the LineProperty and LinePropertyValue
	 * @param {AspectDefinition} aspectDefinition Aspect definition information
	 * @memberof LineAspectManager
	 */
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

		this.#_scopeManager.isLoading = false;
	}

	/**
	 * create a factory function to create the linked aspect needed
	 * @param {*} propertyDefinition
	 * @return {function} function(p,l) ==> where p is the LineProperty Aspect itself. l is the LineID
	 * @memberof LineAspectManager
	 */
	getlinkedAspectFactory(propertyDefinition) {
		let originalName = "_internalAspect";
		let aspectManager = this.#_aspectManager;
		switch (propertyDefinition.kind) {
			case EnumAspectKind.Direct: // None
				return function () { return null; }
			case EnumAspectKind.Formula: // single shared instance accross lines
				return function (p, lineID) {
					let propDef = propertyDefinition;
					let formula = p.parentLine.transformFormula(propDef.supplemental, lineID);
					return aspectManager.createAspect(new AspectDefinition(originalName, EnumAspectKind.Formula, formula, propDef.name));
				}
			case EnumAspectKind.Reference: // new instance per line
				return function (p, lineID) {
					let propDef = propertyDefinition;
					let reference = p.parentLine.transformFormula(propDef.supplemental, lineID);
					return aspectManager.createAspect(new AspectDefinition(originalName, EnumAspectKind.Reference, reference, propDef.name));
				}
			default:
				throw `createlinkedAspect : Invalid Aspect kind ${propertyDefinition.kind}`;
		}
	}

	/**
	 * Create a LinePropertyValues of the LineElement if lineID does not already exist
	 * @param {LineElement} lineAspect Line Aspect to validate for presene of line
	 * @param {string} lineID lineID to create
	 * @memberof LineAspectManager
	 */
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

	/**
	 * Add a line using Aspect name and lineID. Meant for UI external call.
	 * @param {string} lineName Line Element aspect name
	 * @param {string} lineID Line identifier
	 * @return {number} 0 for error. 1 otherwise
	 * @memberof LineAspectManager
	 */
	addLine(lineName, lineID) {
		lineID = lineID.toString();
		let lineAspect = this.#_scopeManager.aspects.get(lineName);
		if (!(lineAspect && (lineAspect instanceof LineElement))) {
			console.error("addLine called for a non Line Aspect :" + lineName);
			return 0;
		}
		this.createLineIfNeeded(lineAspect, lineID);
		return 1;
	}

	/**
	 * Delete a line using Aspect name and lineID. Meant for UI external call.
	 * @param {string} lineName Line Element aspect name
	 * @param {string} lineID Line identifier
	 * @return {number} 0 for error. 1 otherwise
	 * @memberof LineAspectManager
	 */
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
			return 1;
		} else {
			console.error(`deleteLine: Line '${lineID}' not found in aspect ${lineName}`);
			return 0;
		}
	}

	/**
	 * Reloads the Line Attributes from the scope data. Since the scope data is what is saved and loaded from the Storage class.
	 * @return {AspectModifiedInfo[]} returns all special Lines Operation to do (add,del)
	 * @memberof LineAspectManager 
	 */
	loadFromScopeData() {
		// scope data has been loaded, it is time to recreate all attributes and lines.
		let operations = Array();
		for (let lineAspect of this.#_lineAspects) {
			let lineMap = this.#_scopeManager.scope.get(lineAspect.name);
			for (let lineID of lineMap.keys()) {
				for (let aspectDefinition of lineAspect.propertiesDefinition) {
					let aspectProp = this.#_scopeManager.aspects.get(lineAspect.getPropertyAspectName(aspectDefinition.name));
					let aspectValue = new LinePropertyValue(aspectProp, aspectDefinition.name, lineID);
					this.#_aspectManager.completeAspectDefinition(aspectValue, aspectDefinition);
					aspectValue.initializeFromScope(this.#_scopeManager.scope, true);
					this.#_scopeManager.aspects.set(aspectValue.name, aspectValue);
				}
				let modifiedInfo = new AspectModifiedInfo(lineAspect.name, '', lineID, '', 'add');
				operations.push(modifiedInfo);
			}
		}
		return operations;
	}

	/**
	 * Reset all LineElement LinePropertyValue, removing existing Lines
	 * @return {AspectModifiedInfo[]} returns all special Lines Operation to do (add,del)
	 * @memberof LineAspectManager
	 */
	resetLines() {
		let operations = Array();
		for (let lineAspect of this.#_lineAspects) {
			let lineMap = this.#_scopeManager.scope.get(lineAspect.name);
			for (let lineID of lineMap.keys()) {
				let modifiedInfo = new AspectModifiedInfo(lineAspect.name, '', lineID, '', 'delete');
				operations.push(modifiedInfo);
			}
		}
		return operations;
	}

	/**
	 * Set the value of a given LineElement at a given LineID
	 * @param {AspectModifiedInfo} aspectModified Aspect Modified Information
	 * @return {LinePropertyValue} LinePropertyValue instance that was modified or null in case of error
	 * @memberof LineAspectManager
	 */
	setValueOfLine(aspectModified) {
		let lineAspect = this.#_scopeManager.aspects.get(aspectModified.name);
		if (!(lineAspect instanceof LineElement)) {
			console.error("setValueOfArray called for a non line Aspect :" + aspectModified.name);
			return null;
		}
		if (!lineAspect.hasLine(aspectModified.lineID)) {
			console.error(`setValueOfLine called with a line ID '${aspectModified.lineID}' that does not exist`);
			return null;
		}
		let aspectPropModified = this.#_scopeManager.aspects.get(lineAspect.getPropertyAspectName(aspectModified.property));
		if (!aspectPropModified) {
			console.error("setValueOfLine called for an undefined property :" + aspectModified.property);
			return null;
		}

		let aspectValueModified = this.#_scopeManager.aspects.get(aspectPropModified.getValuePropertyAspectName(aspectModified.lineID));
		if (!aspectValueModified) {
			console.error(`Line value should have existed : ${aspectModified.lineID}, property: ${aspectModified.property}`);
			return null;
		}
		this.#_aspectManager.setValueDirect(aspectValueModified, aspectModified.value);
		//if (!this.#_scopeManager.isLoading) {
		this.#_scopeManager.propagateChange([aspectValueModified, aspectPropModified, lineAspect]);
		//}
		return aspectValueModified;
	}

}

/**
 * Base class used for all Aspects. Defines base methods and expectes several overrides.
 * Some properties are public instead of private to allow extended members to allow their values.
 * @class BaseAspect
 */
class BaseAspect {
	#_name = '';
	#_originalName = '';
	/** @type {string} */
	#_defaultValue = null;
	#_isDirectValue = true;
	#_canSaveToStorage = true;
	#_weight = 0;
	#_isLineAspect = false;
	value = 0;
	/**
	 * Creates an instance of BaseAspect.
	 * @param {string} originalName Original name form the UI
	 * @param {string} name properName. name without any forbidden chanracter.
	 * @param {boolean} isDirectValue Tell if the value can be set manually or come from reference/formula/other.
	 * @param {boolean} canSaveToStorage Tell if the value can be saved to storage (formula result should not be)
	 * @param {boolean} isLineAspect Tell if the extended Asepct is a LineElement, LineProperty or LinePropertyValue
	 * @memberof BaseAspect
	 */
	constructor(originalName, name, isDirectValue, canSaveToStorage, isLineAspect) {
		this.#_originalName = originalName;
		this.#_name = name;
		this.#_isDirectValue = isDirectValue;
		this.valueCalculatedState = new CalculatedState(isDirectValue ? EnumCalculatedState.Calculated : EnumCalculatedState.NotCalculated);
		this.weightCalculatedState = new CalculatedState(this.valueCalculatedState.state);
		this.#_canSaveToStorage = !(canSaveToStorage == false);
		this.#_isLineAspect = isLineAspect;
	}

	get name() { return this.#_name; }
	get originalName() { return this.#_originalName; }
	get isDirectValue() { return this.#_isDirectValue; }
	get defaultValue() { return this.#_defaultValue; }
	get defaultValueIsDefined() { return this.defaultValue != null; }
	get weight() { return this.#_weight; }
	get canSaveToStorage() { return this.#_canSaveToStorage; }
	get isLineAspect() { return this.#_isLineAspect; }
	set defaultValue(value) { this.#_defaultValue = value; }
	set weight(value) { this.#_weight = value; }
	
	/**
	 * Initialize scope value with element value
	 * @param {Map<string,*>} scope
	 * @memberof BaseAspect
	 */
	initialize(scope) {
		scope.set(this.name, this.value);
	}
	/**
	 * Initialize value from the content of the scope
	 * @param {Map<string,*>} scope
	 * @memberof BaseAspect
	 */
	initializeFromScope(scope) {
		this.value = scope.get(this.name);
	}

	/**
	 * Get value from element, recalculating where needed. or with forceCalculation
	 * @param {Map<string,*>} scope
	 * @param {boolean} forceCalculation
	 * @return {*} element value
	 * @memberof BaseAspect
	 */
	getValue(scope, forceCalculation) {
		// cannot calculate value when scope is not defined
		if (scope && (!this.valueCalculatedState.isCalculated || forceCalculation)) {
			if (this.calculateValue(scope, forceCalculation)) this.valueCalculatedState.state = EnumCalculatedState.Calculated;
			scope.set(this.name, this.value);
		}
		
		return this.value;
	}

	/**
	 * Set new value
	 * @param {*} newValue
	 * @param {Map<string,*>} scope
	 * @memberof BaseAspect
	 */
	setValue(newValue, scope) {
		if (!this.isDirectValue) {
			console.log(`inappropriate setValue called for : ${this.name}`);
			return;
		}
		this.value = newValue;
		scope.set(this.name, this.value);
	}

	/**
	 * Useful for extended classes. Tells if name array is in the referred members or formulas
	 * @param {BaseAspect[]} aspects Array of aspects that have been modified. 
	 * @return {boolean}  Returns true if a name in the array is linked to this element value
	 * @memberof BaseAspect
	 */
	refersTo(aspects) {
		return false;
	}

	/**
	 * Useful for extended classes. Calculate weight with aspect Maps
	 * @param {Map<string, BaseAspect>} aspectMap
	 * @memberof BaseAspect
	 */
	calculateWeight(aspectMap) {
		return;
	}

	/**
	 * Useful for extended classes. Calculate value when it is not a direct value
	 * @param {Map<string,*>} scope
	 * @param {boolean} forceRecalculate
	 * @memberof BaseAspect
	 */
	calculateValue(scope, forceRecalculate) {
		return true;
	}

	/**
	 * Gets the wieght of the aspect. Should not be overridden. Calls calculateWeioght when needed.
	 * @param {Map<string, BaseAspect>} aspectMap
	 * @param {Map<string,number>} [circularCheckMap] As the weight depends on other Aspect weight, this map detects circular references when needed.
	 * @return {number} relative weight of the element. 0 for direct value. Formula = 1 + sum of each referred members.
	 * @memberof BaseAspect
	 */
	getWeight(aspectMap, circularCheckMap) {
		
		if (!this.weightCalculatedState.isCalculated) {
			this.calculateWeight(aspectMap, circularCheckMap);
			this.weightCalculatedState.state = EnumCalculatedState.Calculated;
			//console.log( 'Calc :' + this.name + ' = ' + this.weight );
		//} else {
			//console.log( 'Already Calc :' + this.name + ' = ' + this.weight );
		}
		return this.#_weight;
	}

	/**
	 * Resets BaseAspect value to default and set the scope accordingly
	 * @param {Map<string,*>} scope
	 * @memberof BaseAspect
	 */
	reset(scope) {
		this.value = this.defaultValue;
		this.valueCalculatedState.state = EnumCalculatedState.Calculated;
		this.initialize(scope);
	}

	/**
	 * Create a new AspectModifiedInfo instance with all the value, names, etc info needed for UI update.
	 * @param {string?} [lineOp] Optional. Line operation name.
	 * @return {AspectModifiedInfo} Modified info of this Aspect
	 * @memberof BaseAspect
	 */
	toAspectModifiedInfo(lineOp) {
		//console.log(this);
		return new AspectModifiedInfo(this.originalName, null, null, this.getValue(), lineOp);
	}

	explain(scope) {
		console.log(`Name: ${this.name}. weight:${this.weight}.  value:'${this.value}'`);
		if (scope) {
			console.log(`Scope Value: ${scope.get(this.name)}`);
		}
	}
	
}

/**
 * This Aspect points another aspect by name, allowing a dynamic reference of an aspect value
 * @class AspectReference
 * @extends {BaseAspect}
 */
class AspectReference extends BaseAspect {
	/** @type {string[]} */
	#_referedMembers = Array(1);
	#_additionalWeight = 100;
	#_weightChanged = false;  // set when value potentially change the weight

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
		
		this.#_referedMembers[0] = referenceName;
		this.#_referedMembers[1] = '';
		this.weight = this.#_additionalWeight;
		this.valueCalculatedState.state = EnumCalculatedState.AlwaysCalculate;
		this.weightCalculatedState.state = EnumCalculatedState.AlwaysCalculate;
	}
	get weightChanged() { return this.#_weightChanged; }
	set weightChanged(value) { this.#_weightChanged = value; }

	/**
	 * Get Referenced Aspect value from it's name
	 * @param {Map<string,*>} scope
	 * @param {boolean} forceRecalculate
	 * @return {*} Referred Aspect value
	 * @memberof AspectReference
	 */
	#getReferencedAspectValue(scope, forceRecalculate) {
		let referenceName = this.#_referedMembers[0];
		let resolvedName = scope.get(referenceName);
		if (resolvedName == this.#_referedMembers[1] && !forceRecalculate) {
			return this.value;
		}
		if (this.#isNameRefered(this.name)) {
			throw "Circular reference. The resolved aspect name equals the reference aspect name " + resolvedName;
		}
		if (resolvedName != this.#_referedMembers[1]) {
			this.weightChanged = true;
		}
		this.#_referedMembers[1] = resolvedName;

		let resolvedValue = scope.get(resolvedName);
		return resolvedValue;
	}

	/**
	 * Tells if the given name is referred in this Aspect value or reference value
	 * @param {string} name
	 * @return {boolean} True if the name is referred, false otherwise
	 * @memberof AspectReference
	 */
	#isNameRefered(name) {
		return this.#_referedMembers[0] == name || this.#_referedMembers[1] == name;
	}

	/**
	 * Get the referred value
	 * @param {Map<string,*>} scope
	 * @param {boolean} forceRecalculate
	 * @return {*} value
	 * @memberof AspectReference
	 */
	calculateValue(scope, forceRecalculate) {
		this.value = this.#getReferencedAspectValue(scope, forceRecalculate);
		scope.set(this.name, this.value);
		return true;
	}

	/**
	 * @param {Map<string,BaseAspect>} aspectMap
	 * @memberof AspectReference
	 */
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
		if (!aspectMap.get(this.#_referedMembers[0])) {
			console.error(`Invalid Reference name : ${this.#_referedMembers[0]}`);
			return 1000;
		}
		let weightReferal = aspectMap.get(this.#_referedMembers[0]).getWeight(aspectMap);
		if (this.#_referedMembers[1]) {
			if (!aspectMap.get(this.#_referedMembers[1])) {
				console.error(`Invalid Affected Reference name : ${this.#_referedMembers[1]}`);
				return 1000;
			}
			weightReferal = Math.max(weightReferal, aspectMap.get(this.#_referedMembers[1])?.getWeight(aspectMap));
		} else {
			//console.log('Empty referral');
		}

		newWeight += weightReferal;

		if (newWeight != this.weight) {
			this.weight = newWeight;
			this.weightChanged = true;
		}
	}

	/**
	 * @param {BaseAspect[]} aspectArray
	 * @param {LinePropertyValue?} [aspectLineValue]
	 * @memberof AspectReference
	 */
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

/**
 * Aspect for Resolving formulas
 * @class AspectFormula
 * @extends {BaseAspect}
 */
class AspectFormula extends BaseAspect {
	#_i = 1;
	/** @type {mathjs} */
	#_formula = null;
	#_textFormula = '';
	/** @type {Map<string,number>} */
	#_referedMembers = new Map();

	/**
	 * Creates an instance of AspectFormula.
	 * @param {string} originalName Original name form the UI
	 * @param {string} name Propername used internally
	 * @param {string} formula Formula to parse and evaluate
	 * @memberof AspectFormula
	 */
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

	get referedMembers() { return this.#_referedMembers; }

	/**
 * @param {BaseAspect[]} aspectArray
 * @param {LinePropertyValue?} [aspectLineValue]
 * @memberof AspectFormula
 */
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

	/**
   * Get the referred value
   * @param {Map<string,*>} scope
   * @param {boolean} forceRecalculate
   * @return {*} value
   * @memberof AspectFormula
   */
	calculateValue(scope, forceCalculation = false) {
		
		//console.log("calculate called. isCalculated:" + this.#isCalculated + ", value:" + this.#value);
		if (!forceCalculation) { //} && this.valueCalculatedState.isCalculated) {
			return true;
		}
		try {
			this.value = this.#_formula.evaluate(scope);
		} catch (e) {
			console.error(`Error parsing formula '${this.#_textFormula}' : ${e}`);
			this.value = 0;
			this.explain(scope);
			return false;
		}

		//if (this.name == 'skill_accounting_total') {
		//	this.explain(scope);
			//console.log(`name: ${this.name}. weight:${this.weight}.  value:${this.value}`);
		//}
		return true;
	}


	/**
	 * Calculate Weight
	 * @param {Map<string,BaseAspect>} aspectMap
	 * @param {Map<string,number>} circularCheckMap
	 * @return {*} value
	 * @memberof AspectFormula
	 */
	calculateWeight(aspectMap, circularCheckMap) {
		
		if (!(aspectMap)) {
			if (this.weight) {
				return this.weight;
			}
			console.error(this.name + " getWeight() called without needed arguments");
			return 1000;
		}
		this.#_i += 1;
		if (this.weightCalculatedState.isCalculated && this.weightCalculatedState.state != EnumCalculatedState.AlwaysCalculate) {
			return this.weight;
		}

		if (!circularCheckMap) {
			circularCheckMap = new Map();
		}

		if (circularCheckMap.has(this.name)) {
			console.error("Formula circular reference error :" + this.name + "\n" + this.#_textFormula);
			//throw "Formula circula reference error : "
			return 1000;
		} else {
			circularCheckMap.set(this.name, 1);
		}

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

	// explain the formula value
	explain(scope) {
		console.log(`name: ${this.name}. weight:${this.weight}.  value:${this.value}`);
		console.log('Formula:' + this.#_textFormula);
		console.log('Members:' + [... this.#_referedMembers.keys()].join());
		if (scope) {
			let vals = '';
			for (let member of this.#_referedMembers.keys()) {
				vals += scope.get(member) + ', ';
			}
			console.log('Values: ' + vals);
		}
	}
	
}

/**
 * Line Aspect Element.
 * @class LineElement
 * @extends {BaseAspect}
 */
class LineElement extends BaseAspect {
	/** @type {Map<string, AspectDefinition>} */
	#_propertiesDefinition = null;
	/** @type {Map<string, Object>} */
	#_values = new Map(); // key = lineIndex, value = Object() where all lines properties are added

	/**
	 * Creates an instance of LineElement.
	 * @param {string} originalName
	 * @param {string} name
	 * @param {Map<string,LinePropertiesDefinition>} propertyMap
	 * @memberof LineElement
	 */
	constructor(originalName, name, propertyMap) {
		if (propertyMap == null || !(propertyMap instanceof Map) || propertyMap.size < 1) {
			throw "LineElement --> requires a valid non-empty propertyMap";
		}
		super(originalName, name, false, true, true); // not a directvalue, do save to storage, and is LineAspect
		this.value = 0;
		this.valueCalculatedState.state = EnumCalculatedState.Calculated;
		this.weightCalculatedState.state = EnumCalculatedState.Calculated;
		this.#_propertiesDefinition = propertyMap;
	}
	// not the Actual LineProperty, but their definition.. not the same thing !
	get propertiesDefinition() { return Array.from(this.#_propertiesDefinition.values()); }
	get lineCount() { return this.#_values.size; }

	/**
	 * Transform formula references of fields with the lineID inserted
	 * @param {string} originalFormula
	 * @param {string} lineID
	 * @return {string} 
	 * @memberof LineElement
	 */
	transformFormula(originalFormula, lineID) {
		let newFormula = originalFormula;
		for (let propDef of this.#_propertiesDefinition.values()) {
			let refName = this.getPropertyAspectName(propDef.name);
			let newName = this.getValuePropertyAspectName(refName, lineID);
			var regex = new RegExp('\\b' + refName + '\\b', "g"); // TODO : Optimize. save in property instead of recreating each time
			newFormula = newFormula.replaceAll(regex, newName);
		}
		return newFormula;
	}

	/**
	 * Return all Line Aspect related to this LineElement. LineProperty and LinePropertyValue
	 *
	 * @param {Map<string,BaseAspect>} aspects
	 * @param {string?} [filterLineID] Optional line id to get only values form that line
	 * @return {BaseAspect[]} All aspect related to LineElement
	 * @memberof LineElement
	 */
	getAllLineAspects(aspects, filterLineID) {
		let ignoreLine = filterLineID ? true : false;
		let result = Array();
		for (let propDef of this.#_propertiesDefinition.values()) {
			result.push(aspects.get(this.getPropertyAspectName(propDef.name)));
		}
		let propCount = result.length;
		for (let lineID of this.#_values.keys()) {
			for (let propIndex = 0; propIndex < propCount; propIndex++) {
				if (ignoreLine || lineID == filterLineID) {
					let propValueName = this.getValuePropertyAspectName(result[propIndex].name, lineID);
					result.push(aspects.get(propValueName));
				}
			}
		}
		return result;
	}

	/**
	 * Return property composed name [LineName]_[propName]
	 * @param {string} propName
	 * @return {string} 
	 * @memberof LineElement
	 */
	getPropertyAspectName(propName) {
		return this.name + "_" + propName;
	}

	/**
	 * Return LinePropertyValue composed name [LineName]_[propName]_[lineID]
	 * @param {string} propName
	 * @param {string} lineID
	 * @return {string} 
	 * @memberof LineElement
	 */
	getValuePropertyAspectName(propName, lineID) {
		return propName + "_" + lineID;
	}

	/**
	 * Return Line ID values original Map. Don't modify directly.
	 * @param {string} lineID
	 * @return {Map<string,*>}  Line Map data. The original Don't modify.
	 * @memberof LineElement
	 */
	getLine(lineID) {
		return this.#_values.get(lineID);
	}

	/**
	 * Returns true if LineElement has a line with given ID
	 * @param {string} lineID
	 * @return {boolean} 
	 * @memberof LineElement
	 */
	hasLine(lineID) {
		return this.#_values.has(lineID);
	}

	/**
	 * Set Line Value for property
	 * @param {string} lineID
	 * @param {string} property name. Not composed name.
	 * @param {*} value
	 * @memberof LineElement
	 */
	setLineValue(lineID, property, value) {
		if (!this.#_values.has(lineID)) {
			this.#_values.set(lineID, new Object());
			this.value = this.#_values.size;
		}
		this.#_values.get(lineID)[property] = value;
	}
	/**
	 * Get line Value for property
	 * @param {string} lineID
	 * @param {string} property Property name. Not composed name.
	 * @return {*} 
	 * @memberof LineElement
	 */
	getLineValue(lineID, property) {
		if (!this.#_values.has(lineID)) {
			console.error("getLineValue accessed with invalid row index " + index);
			return 0;
		}
		return this.#_values.get(lineID)[property];
	}

	/**
	 * Delete Line internally
	 * @param {string} lineID
	 * @memberof LineElement
	 */
	deleteLine(lineID) {
		if (this.#_values.has(lineID)) {
			this.#_values.delete(lineID);
			this.value = this.#_values.size;
		}
	}

	/**
	 * @param {Map<string,*>} scope
	 * @memberof LineElement
	 */
	initializeFromScope(scope) {
		this.#_values = scope.get(this.name);
	}

	/**
	 * @param {Map<string,*>} scope
	 * @memberof LineElement
	 */
	initialize(scope) {
		scope.set(this.name, this.#_values);
	}
	getValue() {
		return this.value;
	}
	/**
	 * Cannot be called directly
	 * @memberof LineElement
	 */
	setValue() {
		console.error("setValue ignored. LineElement value can't be set directly");
	}

	/**
	 * @param {Map<string,*>} scope
	 * @memberof LineElement
	 */
	reset(scope) {
		this.#_values = new Map();
		this.value = this.#_values.size;
		this.initialize(scope);
	}
}

/**
 * Line Property. mainly use to allow references to trigger and manage names.
 * Value is the Aspect name directly.
 * @class LineProperty
 * @extends {BaseAspect}
 */
class LineProperty extends BaseAspect {
	/** @type {LineElement} */
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
		this.valueCalculatedState.state = EnumCalculatedState.Calculated;
		this.weightCalculatedState.state = EnumCalculatedState.NotCalculated;
	}

	// property name is the short property name. qty.
	get additionnalWeight() { return this.#_additionalWeight; }
	get parentLine() { return this.#_lineAspect; }
	get lineIDPropertyName() {
		return this.parentLine.lineIDPropertyName;
	}

/**
 * Initialized linkedAspect. Line PropertyValue use  Formula Aspect or AspectRefererence.
 * @param {string} lineID
 * @return {BaseAspect}  Instanciated Aspect for this priperty and lineID
 * @memberof LineProperty
 */
initializeLinkedAspect(lineID) {
		return this.#_linkedAspectFactory(this, lineID);
	}

/**
 * Get composed name of a LinePropertyValue Aspect
 * @param {string} lineID
 * @return {string} 
 * @memberof LineProperty
 */
getValuePropertyAspectName(lineID) {
		return this.parentLine.getValuePropertyAspectName(this.name, lineID);
	}

/**
 * Sets line value for this property at the given lineID
 * @param {string} lineID
 * @param {*} newValue
 * @memberof LineProperty
 */
setLineValue(lineID, newValue) {
		this.parentLine.setLineValue(lineID, this.name, newValue);
	}

/**
 * Cannot be called directly.
 * @param {*} newValue
 * @memberof LineProperty
 */
setValue(newValue) {
		console.error("setValue ignored. LineProperty value can't be set directly");
	}

/**
 * @param {Map<string,*>} scope
 * @memberof LineProperty
 */
reset(scope) {
		this.value = this.name;
		scope.set(this.name, this.value);
	}

/**
 * @param {Map<string,*>} aspectMap
 * @param {boolean} forceCalculation
 * @memberof LineProperty
 */
calculateWeight(aspectMap, forceCalculation) {
		this.weight = this.additionnalWeight;
	}
}

/**
 * Represent a single Aspect in a given Line of a LineElement Aspect
 * @class LinePropertyValue
 * @extends {BaseAspect}
 */
class LinePropertyValue extends BaseAspect {
	/** @type {LineProperty} */
	#_parentProperty = null;
	/** @type {LineElement} */
	#_parentLine = null;
	/** @type {BaseAspect} */
	#_linkedAspect;
	#_lineID = -1;
	#_additionalWeight = 10;

	/**
	 * Creates an instance of LinePropertyValue.
	 * @param {LineProperty} parentProperty Parent Property linked to this Aspect
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
		this.valueCalculatedState.state = linkedAspect == null ? EnumCalculatedState.Calculated : EnumCalculatedState.AlwaysCalculate; // always set the scope on a getValue, so calculateAlways called
		this.weightCalculatedState.state = parentProperty.weightCalculatedState.state;
	}

	get lineID() { return this.#_lineID; }
	get linkedAspect() { return this.#_linkedAspect; }
	get parentLine() { return this.#_parentLine; }
	get parentProperty() { return this.#_parentProperty; }
	get additionalWeight() { return this.#_additionalWeight; }
	get weightChanged() { return (this.linkedAspect && this.linkedAspect.weightChanged); }
	set weightChanged(value) { if (this.linkedAspect && this.linkedAspect.weightChanged) this.linkedAspect.weightChanged = value; }

	/**
 * Set value internally in the line
 * @param {*} newValue
 * @memberof LinePropertyValue
 */
#setInternalValue(newValue) {
		this.parentLine.setLineValue(this.lineID, this.parentProperty.name, newValue);
		this.value = newValue;
	}

/**
 * @param {Map<string,*>} scope
 * @param {boolean} forceRecalculate
 * @memberof LinePropertyValue
 */
calculateValue(scope, forceRecalculate) {
		if (this.#_linkedAspect) {
			this.#setInternalValue(this.#_linkedAspect.getValue(scope, forceRecalculate));
		}
		return true;
	}
/**
 * @param {Map<string,*>} scope
 * @memberof LinePropertyValue
 */
initializeFromScope(scope) {
		let lineValues = scope.get(this.parentLine.name);
		let currentLineObject = lineValues.get(this.lineID);
		this.value = currentLineObject[this.parentProperty.name];
	}
/**
 * @param {*} newValue
 * @param {Map<string,*>} scope
 * @return {*} 
 * @memberof LinePropertyValue
 */
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

/**
 * @param {Map<string,BaseAspect>} aspectMap
 * @memberof LinePropertyValue
 */
calculateWeight(aspectMap) {
		this.weight = this.additionalWeight;
		if (this.#_linkedAspect) {
			this.weight += this.#_linkedAspect.getWeight(aspectMap);
		}
	}

/**
 * @param {BaseAspect[]} aspectArray
 * @return {boolean} 
 * @memberof LinePropertyValue
 */
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

/**
 * @class AspectLineFilter
 */
class AspectLineFilter extends BaseAspect {
	#_name = '';
	#_filterText = ''; // used in debug only
	#_lineName = '';
	/** @type {AspectFormula} */
	#_formula = null;
	/** @type {Map<string, string>} */
	#_lines = new Map();
	actions = {};
	/** @type {Map<string, number>} */
	#_referedMembers = null;
	/**
 * @typedef PropertyNameInfo
 * @type {object}
 * @property {string} scopeName Name in the scope. LineName _ propName
 * @property {string} propName Property name only
 */
	/** @type {PropertyNameInfo[]} */
	#_lineProperties = null;

	/**
	 * Creates an instance of LineFilter.
	 * @param {string} name Name of the filter, for Dom element reference
	 * @param {string} lineName Name of the LineElement that is an Aspect in DAS
	 * @param {string} filter Formula to evaluate to include a given lineID into the filter shown line
	 * @memberof LineFilter
	 */
	constructor(name, lineName, filter) {
		super(name, name, false, false, true); // not a directvalue, do not save to storage, and is LineAspect
		this.value = [];
		this.#_lineName = lineName;
		this.valueCalculatedState.state = EnumCalculatedState.NotCalculated;
		this.weightCalculatedState.state = EnumCalculatedState.NotCalculated;
		this.#_filterText = filter;
		this.#_formula = new AspectFormula(name, name, filter);
		this.#_referedMembers = new Map(this.#_formula.referedMembers);
		this.#setLineProperties();
		this.#_referedMembers.set(lineName,1);
	}
	get lineName() { return this.#_lineName; }

	#setLineProperties() {
		this.#_lineProperties = Array();
		let cutPoint = this.lineName.length + 1;
		for(let memberName of this.#_referedMembers.keys()) {
			if (memberName.startsWith(this.lineName + "_")) {
				let shortName = memberName.substring(cutPoint);
				let obj = {scopeName: memberName, propName:shortName};
				this.#_lineProperties.push(obj);
			}
		}
	}

	/**
	 * @param {BaseAspect[]} aspectArray
	 * @param {LinePropertyValue?} [aspectLineValue]
	 * @memberof AspectReference
	 */
	refersTo(aspectArray, aspectLineValue) {
		for (let aspect of aspectArray) {
			if (this.#_referedMembers.has(aspect.name)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get the referred value
	 * @param {Map<string,*>} scope
	 * @param {boolean} forceRecalculate
	 * @return {*} value
	 * @memberof AspectReference
	 */
	calculateValue(scope, forceRecalculate) {
		// heavy calculations. need to calculate for each line AND must copy the scope to insert values without affecting other aspects ...
		let newList = Array();
		let localScope = new Map(scope);
		let lineAspectValues = scope.get(this.lineName);
		for(let lineID of lineAspectValues.keys()) {
			let values = lineAspectValues.get(lineID);
			// replace property with their values instead of their name in scope, for the context of this filter
			for(let nameInfo of this.#_lineProperties) {
				localScope.set(nameInfo.scopeName, values[nameInfo.scopeName]);
			}
			if (this.#_formula.getValue(localScope, true)) {
				newList.push(lineID);
			}
		}
		this.value = newList;
		return true;
	}
	
	/**
	 * @param {Map<string,BaseAspect>} aspectMap
	 * @memberof AspectReference
	 */
	calculateWeight(aspectMap, circularReferenceMap) {
		this.#_formula.calculateWeight(aspectMap, circularReferenceMap);
	}

	/**
	 * Create a new AspectModifiedInfo instance with all the value, names, etc info needed for UI update.
	 * @return {AspectModifiedInfo} Modified info of this Aspect
	 * @memberof BaseAspect
	 */
	toAspectModifiedInfo() {
		return super.toAspectModifiedInfo('filter');
	}

}

// ****************************************************************************************
// Functions for math.js, the formula parser

function getCheckCondition(propNameCond, propValueCond) {
	let checkCondition = (o) => { return true; }

	if (propNameCond && propValueCond) {
		if (Array.isArray(propNameCond._data) && Array.isArray(propValueCond._data)) {
			let arrayCount = math.min(propNameCond._data.length, propValueCond._data.length);
			checkCondition = (o) => {
				for (let condIndex = 0; condIndex < arrayCount; condIndex++) {
					if (o[propNameCond._data[condIndex]] != propValueCond._data[condIndex]) {
						return false;
					}
				}
				return true;
			}
		} else {
			checkCondition = (o) => { return o[propNameCond] == propValueCond; }
		}
	}
	return checkCondition;
}

// import the new function in the math namespace
math.import({
	// operation: sum, count, mean
	lineAggregate: function (lineMap, propertyName, operation, propNameCond, propValueCond) {
		if (!operation) operation = "sum";
		let checkCondition = getCheckCondition(propNameCond, propValueCond);

		let index = 0;
		let valueArray = Array();
		for (let lineObject of lineMap.values()) {
			if (checkCondition(lineObject)) {
				valueArray.push(lineObject[propertyName]);
				index += 1;
			}
		}

		if (index == 0) return 0; // when empty, return 0 as the value
		switch (operation) {
			case "sum":
				return valueArray.reduce((a, b) => a + b, 0);
			case "mean":
				return index == 0 ? 0 : valueArray.reduce((a, b) => a + b, 0) / (index);
			case "count":
				return index;
			case "min":
				return math.min(...valueArray);
			case "max":
				return math.max(...valueArray);
			default:
				return valueArray.reduce((a, b) => { a + b }, 0);
		}
	},
	/**
	 * Return line ID of the first line meeting criteria
	 * @param {Map<String, Map>} lineMap 
	 * @param {String} propNameCond 
	 * @param {*} propValue 
	 * @returns 
	 */
	lineID: function (lineMap, propNameCond, propValue) {
		let checkCondition = getCheckCondition(propNameCond, propValue);
		for (let entry of lineMap) {
			let lineID =  entry[0];
			let lineObject = entry[1];
			if (lineObject.hasOwnProperty(propNameCond)) {
				if (checkCondition(lineObject)) {
					return lineID;
				}
			}
		}
		return -1;
	},
	lineFirst: function (lineMap, propNameCond, propValue) {
		let checkCondition = getCheckCondition(propNameCond, propValue);
		for (let lineObject of lineMap.values()) {
			if (lineObject.hasOwnProperty(propNameCond)) {
				if (checkCondition(lineObject)) {
					return lineObject;
				}
			}
		}
		return new Object();
	},
	// receive a reference value, an array and defualt value. 
	//  array: each even element is the value looked for, and the odd is the value to return
	//    defaultValue is returned if nothing match
	caseValue: function (refValue, valueArray, defaultValue) {
		let realArray = valueArray._data;
		if (! Array.isArray(realArray)) {
			return 0;
		}
		let maxIndex = realArray.length - (realArray.length % 2) -1
		for (let index = 0; index < maxIndex; index += 2) {
			if (refValue == realArray[index]) {
				return realArray[index+1];
			}
		}
		return defaultValue;
	}
});