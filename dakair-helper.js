/* 2 static classes : TemplateManager, DomHelper */

/**
 * This class aims to take a template and changes values of attribute and apply sub-template from it
 * @class TemplateManager
 */
class TemplateManager {
	static #constApplyTemplateNodeName = 'APPLY-TEMPLATE';
	static #constTemplateIdName = 'data-template-id';
	static #constTemplateParametersName = 'data-template-parameters';
	static #constEventAttributeName = 'data-template-event';
	/**
	 *
	 * Returns a cloned instance of the template elements with events assigned and values replaced
	 * @static
	 * @param {DomElement | string} templateOrId Template Node or name. Node will ge obtained by name if not sent.
	 * @param {Map<string, string>} eventsMap Map of Events to assicate with events listener when listed.
	 * @param {string} valuesToReplace String of JsonValues associated to property name used to do text replace in the template. Replaces ' by " for ease of use.
	 * @return {DomElement} Cloned node of the tempalte, with values replaced and events mapped
	 * @memberof TemplateManager
	 */
	static processTemplate(templateOrId, eventsMap, valuesToReplace) {
		// get the template node
		let templateNode = (typeof templateOrId === 'string') ? document.getElementById(templateOrId) : templateOrId;
		if (!templateNode) {
			throw `Could not find template '${templateOrId}'!`;
		}
		let clone = templateNode.content.cloneNode(true).firstElementChild;
		let replacementMap = valuesToReplace;
		if (!(valuesToReplace instanceof Map)) {
			if (!Array.isArray(valuesToReplace)) {
				throw "valuesToReplace is expected to be a Map(key,value) or an array of values.";
			}
			replacementMap = this.#getMapFromTemplateParameters(templateNode, valuesToReplace);
		}
		// process attributes replacement, event mapping
		this.#processNode(clone, eventsMap, replacementMap);
		return clone;
	}

	/**
	 * Replaces nodes attributes values with given parameters values when found
	 * @static
	 * @param {DomElement} node DOM Node to analyze attributes from
	 * @param {Map<string,string>} replacementMap Map of values to find and the values to replace them with
	 * @memberof TemplateManager
	 */
	static #replaceNodeAttributes(node, replacementMap) {
		if (node.id) {
			let newId = this.#getProcessedValue(node.id, replacementMap);
			if (newId != node.id) node.id = newId;
		}
		if (node && node.hasAttributes && node.hasAttributes()) {
			for (const attr of node.attributes) {
				let attrValue = this.#getProcessedValue(attr.value, replacementMap);
				if (attrValue != attr.value) {
					node.setAttribute(attr.name, attrValue);
				}
			}
		}

		if (node.nodeName == 'INPUT' && node.value) {
			let valueEl = this.#getProcessedValue(node.value, replacementMap);
			if (valueEl != node.value) {
				node.value = valueEl;
			}
		} else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
			let valueEl = this.#getProcessedValue(node.textContent, replacementMap);
			if (valueEl != node.textContent) {
				node.textContent = valueEl;
			}
		}
	}

	/**
	 * Gets processed value passed through all the replacement map values
	 * @static
	 * @param {string} currentValue Current Text value of the attribute
	 * @param {Map<string,string>} replacementMap Map of values to find and the values to replace them with
	 * @return {string} Processed and replaced text value
	 * @memberof TemplateManager
	 */
	static #getProcessedValue(currentValue, replacementMap) {
		if (!currentValue) return currentValue;

		let newValue = currentValue;
		for (const mapEntry of replacementMap) {
			let key = mapEntry[0];
			let value = mapEntry[1];
			if (newValue.indexOf(key) > -1) {
				newValue = newValue.replaceAll(key, value);
			}
		}
		return newValue;
	}

	/**
	 * Go throu all children, replacing attributes and mapping events. Recursive with @processNode
	 * @static
	 * @param {DomElement} children Node children
	 * @param {Map<string, function>} eventsMap Map of events name and associated function
	 * @param {Map<string,string>} replacementMap Map of values to find and the values to replace them with
	 * @memberof TemplateManager
	 */
	static #processEachChildren(children, eventsMap, replacementMap) {

		let newArray = Array.from(children);
		for (let child of newArray) {
			// change ids
			this.#processNode(child, eventsMap, replacementMap);
		}
	}

	/**
	 * Process all attributes and sub template of a single node. Recursive with @processEachChildren
	 * @static
	 * @param {DomElement} child node to analyze
	 * @param {Map<string, function>} eventsMap Map of events name and associated function
	 * @param {Map<string,string>} replacementMap Map of values to find and the values to replace them with
	 * @memberof TemplateManager
	 */
	static #processNode(child, eventsMap, replacementMap) {
		this.#replaceNodeAttributes(child, replacementMap);
		// validate if apply-template
		if (child.nodeName == TemplateManager.#constApplyTemplateNodeName || child.id == TemplateManager.#constApplyTemplateNodeName) {
			this.#processApplyTemplate(child, eventsMap);
		} else {
			this.#applyEvents(child, eventsMap);
		}

		if (child.childNodes) { // child.children
			this.#processEachChildren(child.childNodes, eventsMap, replacementMap); // child.children
		}
	}

	/**
	 * Apply events to elements with appropriate attributes
	 * @static
	 * @param {DomElement} node node to analyze
	 * @param {Map<string, function>} eventsMap Map of events name and associated function
	 * @memberof TemplateManager
	 */
	static #applyEvents(node, eventsMap) {
		if (node && node.hasAttribute && node.hasAttribute(TemplateManager.#constEventAttributeName)) {
			let attrValue = node.getAttribute(TemplateManager.#constEventAttributeName);
			let eventArray = JSON.parse(attrValue.replaceAll("'", '"'));
			let invalidConfig = true;
			if (eventArray && Array.isArray(eventArray)) {
				if (!Array.isArray(eventArray[0])) { // when not an array, only 2 first values are used
					if (eventArray.length == 2) {
						this.#applySingleEvent(node, eventArray[0], eventArray[1]);
						invalidConfig = false;
					}
				} else { // else, all elements of array shoould be array too [eventName, eventFunctionName]
					for (const elem of eventArray) {
						if (Array.isArray(elem) && elem.length == 2) {
							invalidConfig = false;
							this.#applySingleEvent(eventsMap, node, elem[0], elem[1]);
						}
					}
				}
				if (invalidConfig) {
					console.warn(`node had invalid value in ${TemplateManager.#constEventAttributeName}. expected array of eventName, functionName from functionMap. Got '${attrValue}'`);
				}
			}
		}
	}


	/**
	 * Apply a single event to a node
	 * @static
	 * @param {Map<string, function>} eventsMap Map of events name and associated function
	 * @param {DomElement} node node to analyze
	 * @param {string} eventName Name of the event to map
	 * @param {function} eventFunction Function to adds as a listener to.
	 * @memberof TemplateManager
	 */
	static #applySingleEvent(eventsMap, node, eventName, eventFunction) {
		if (!eventsMap.has(eventFunction)) {
			console.error(`Could not map Event ${eventName}. Function '${eventFunction}' not found in eventFunctionMap`);
			return;
		}
		let fn = eventsMap.get(eventFunction);
		node.addEventListener(eventName, (eventArgs) => { fn(eventArgs); });
	}


	/**
	 * Gets Map of parameters names from a node @#constTemplateParametersName attribute
	 * @static
	 * @param {DomElement} templateNode node to analyze	 
	 * @param {string[]} values values to use in replace. keys are in the attribute value.
	 * @memberof TemplateManager
	 */
	static #getMapFromTemplateParameters(templateNode, values) {
		let localMap = new Map();
		if (!templateNode) {
			throw `getTemplateParameters can't process null template`;
		}
		if (!values) {
			return localMap;
		}

		let localKeys = templateNode.getAttribute(TemplateManager.#constTemplateParametersName);
		let localValues = values;
		if (localKeys && localValues) {
			let keyArray = JSON.parse(localKeys.replaceAll("'", '"'));
			let valueArray = Array.isArray(localValues) ? localValues : JSON.parse(localValues.replaceAll("'", '"'));
			let max = math.min(keyArray.length, valueArray.length);
			for (let index = 0; index < max; index++) {
				localMap.set(keyArray[index], valueArray[index]);
			}
		}
		return localMap;
	}

	/**
	 * Process the special node apply-template (template inside a template)
	 * @static
	 * @param {DomElement} node The Dom Node of the apply-template element
	 * @param {Map<string, function>} eventsMap Map of events name and associated function
	 * @return {DomElement} processed node into the associated tempalte, attributes modified and event maps processed
	 * @memberof TemplateManager
	 */
	static #processApplyTemplate(node, eventsMap) {

		// get template Id
		let id = node.getAttribute(TemplateManager.#constTemplateIdName);
		let localValues = node.getAttribute(TemplateManager.#constTemplateParametersName);

		let templateNode = document.getElementById(id);
		if (!templateNode) {
			if (!id) {
				throw `Template id undefined. Make sure to use data-template-id attribute in apply-template tag.`;
			} else {
				throw `Could not find template id '${id}'`;
			}
			
		}
		let localMap = this.#getMapFromTemplateParameters(templateNode, localValues);

		let nodeProcessed = this.processTemplate(id, eventsMap, localMap);
		DomHelper.insertBefore(node, nodeProcessed, true);

		return nodeProcessed;
	}

}

/**
 * Helper class with useful methods
 * @class DomHelper
 */
class DomHelper {
	/**
	 * Execute a given function when Dom ready
	 * @static
	 * @param {function} fn
	 * @memberof DomHelper
	 */
	static executeWhenDomReady(fn) {
		let fnLoad = () => {
			if (document.readyState == "complete") {
				fn();
			}
		};
		if (document.readyState != "complete") {
			document.addEventListener('readystatechange', fnLoad);
		} else {
			fnLoad();
		}
	}

	/**
	 * Tells if a class is present in Dom Element or not
	 * @static
	 * @param {DomElement} element Dom Element to validate
	 * @param {string} theClassName class name
	 * @return {boolean}  Whether class is in the classList or not
	 * @memberof DomHelper
	 */
	static hasClass(element, theClassName) {
		if (element == null) {
			return false;
		}
		for (let className of element.classList) {
			if (className == theClassName) return true;
		}
		return false;
	}

	/**
	 * Add a class to an element if it doesnt have it already
	 * @static
	 * @param {DomElement} element Dom Element to modify
	 * @param {string} theClassName class name
	 * @memberof DomHelper
	 */
	static addClass(element, theClassName) {
		if (this.hasClass(element, theClassName)) return;
		element.classList.add(theClassName);
	}

	/**
	 * Remove a class to an element if it doesnt have it already
	 * @static
	 * @param {DomElement} element Dom Element to modify
	 * @param {string} theClassName class name
	 * @memberof DomHelper
	 */
	static removeClass(element, theClassName) {
		if (!this.hasClass(element, theClassName)) return;
		element.classList.remove(theClassName);
	}

	/**
	 * Insert a node before another in the DOM. can remove the reference After Node.
	 * @static
	 * @param {DomElement} nodeAfter Dom Element used as a reference.
	 * @param {DomElement} newNode New Dom Element added.
	 * @param {boolean} [removeNodeAfter=false] Remove the reference nodeAfter sent if true.
	 * @memberof DomHelper
	 */
	static insertBefore(nodeAfter, newNode, removeNodeAfter = false) {
		let parent = nodeAfter.parentNode;
		parent.insertBefore(newNode, nodeAfter);
		if (removeNodeAfter) {
			parent.removeChild(nodeAfter);
		}
	}
	/**
	 * This function makes use of bootstrap "d-none" to set the display none or remove it
	 * from a serie of Dom Elements.
	 * @static
	 * @param {*} elementList - Dom element list, array. Must be iterable for use in for loop.
	 * @param {boolean} isVisible - Make it visible or not
	 * @memberof DomHelper
	 */
	static toggleVisibility(elementList, isVisible) {
		for (let element of elementList) {
			if (isVisible) {
				this.removeClass(element, 'd-none');
			} else {
				this.addClass(element, 'd-none');
			}
		}
	}

}

