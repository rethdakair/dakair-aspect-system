/* Has 2 static classes. Listed here with public members
  TemplateManager, DomHelper

  TemplateManager
    processTemplate
      returns a cloned instance of the template elements with events assigned and values replaced
    -------------------
      templateOrId    : Element Id to get as template OR Dom Element node directly
      eventsMap       : Maps with keys string and event as values. Set by data-template-events.
      valuesToReplace : Either a Map with key string and values string or an array of values that will be matched against tempalte parameters.
    -------------------------------------------------------------------------------------------------------------------

  DomHelper
    hasClass
      returns true of false, depending if the class exist
    -------------------
      element         : Dom node to validate class against
      theClassName    : The class name searched for this element
    -------------------------------------------------------------------------------------------------------------------
    
    addClass
      returns nothing. Add the calss to the Dom Element.
    -------------------
      element         : Dom node to add class to 
      theClassName    : The class name to add
    -------------------------------------------------------------------------------------------------------------------

    removeClass
      returns nothing. Remove the class from the Dom Element.
    -------------------
      element         : Dom node to remove class from
      theClassName    : The class name to seek and remove
    -------------------------------------------------------------------------------------------------------------------
    
    insertBefore
      returns nothing. Insert the node before the given node, using its parent as a base.
    -------------------
      nodeAfter       : Dom node that is the reference for the insertion. will be the node after the newNode.
      newNode         : newNode (Dom node) to insert or move before the nodeAfter
      removeNodeAfter : Optional. Defaults to false. If true, the nodeAfter is deleted after the insertion.

    toggleVisibility
      returns nothing. Adds or remove the Bootstrap d-none class to elements to make them visible or invisible.
    -------------------
  		elementList 		: Dom element list, array. Must be iterable, used in for loop.
 			isVisible 			: Boolean. Make it visible or not
*/
/* this class aims to take a template and changes values of attribute and apply sub-template from it

	*/
	class TemplateManager {
    static #constApplyTemplateNodeName = 'APPLY-TEMPLATE';
    static #constTemplateIdName = 'data-template-id';
		static #constTemplateParametersName = 'data-template-parameters';
    static #constEventAttributeName = 'data-template-event';
    
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

		// do the replacement of values
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
			} else if (node.nodeType === Node.TEXT_NODE && node.textContent){
				let valueEl = this.#getProcessedValue(node.textContent, replacementMap);
				if (valueEl != node.textContent) {
					node.textContent = valueEl;
				}
			}
		}

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

		static #processEachChildren(children, eventsMap, replacementMap) {
			
			let newArray = Array.from(children);
			for(let child of newArray) {
				// change ids
				this.#processNode(child, eventsMap, replacementMap);
			}
		}

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

		static #applyEvents(node, eventsMap) {
			if (node && node.hasAttribute && node.hasAttribute(TemplateManager.#constEventAttributeName)) {
				let attrValue = node.getAttribute(TemplateManager.#constEventAttributeName);
				let eventArray = JSON.parse(attrValue.replaceAll("'",'"'));
				let invalidConfig = true;
				if (eventArray && Array.isArray(eventArray)) {
          if (!Array.isArray(eventArray[0])) { // when not an array, only 2 first values are used
            if (eventArray.length == 2) {
              this.#applySingleEvent(node, eventArray[0], eventArray[1]);
              invalidConfig = false;
            }
          } else { // else, all elements of array shoould be array too [eventName, eventFunctionName]
            for(const elem of eventArray) {
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

		static #applySingleEvent(eventsMap, node, eventName, eventFunction) {
			if (!eventsMap.has(eventFunction)) {
				console.error(`COuld not map Event ${eventName}. Function '${eventFunction}' not found in eventFunctioNMap`);
				return;
			}
			let fn = eventsMap.get(eventFunction);
			node.addEventListener(eventName, (eventArgs) => { fn(eventArgs); });
		}

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
				let keyArray = JSON.parse(localKeys.replaceAll("'",'"'));
				let valueArray = Array.isArray(localValues) ? localValues : JSON.parse(localValues.replaceAll("'",'"'));
				let max = math.min(keyArray.length, valueArray.length);
				for (let index=0; index < max; index++) {
					localMap.set(keyArray[index], valueArray[index]);
				}
			}
      return localMap;
    }

		static #processApplyTemplate(node, eventsMap) {
			
			// get template Id
			let id = node.getAttribute(TemplateManager.#constTemplateIdName);
			let localValues = node.getAttribute(TemplateManager.#constTemplateParametersName);

			let templateNode = document.getElementById(id);
			if (!templateNode) {
				throw `Could not find template id '${id}'`;
			}
      let localMap = this.#getMapFromTemplateParameters(templateNode, localValues);

			let nodeProcessed = this.processTemplate(id, eventsMap, localMap);
      DomHelper.insertBefore(node, nodeProcessed, true);
			
			return nodeProcessed;
		}

	}

  // this class has some helper methods
	class DomHelper {
		static hasClass(element, theClassName) {
			for (let className of element.classList) {
				if (className == theClassName) return true;
			}
			return false;
		}
		static addClass(element, theClassName) {
			if (this.hasClass(element, theClassName)) return;
			element.classList.add(theClassName);
		}
		static removeClass(element, theClassName) {
			if (!this.hasClass(element, theClassName)) return;
			element.classList.remove(theClassName);
		}

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

	