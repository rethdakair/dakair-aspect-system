
# Dakair Aspect System

## Table of content
- [Goal](#goal)
- [Glossary](#glossary)
- [Usage - quick](#usage---quick)
- [How does it work](#how-does-it-work)
- [Aspects definition](#aspect-definition)
- [Special consideration](#special-consideration)
- [Copyrights](#copyrights)

## Goal
The goal of the Dakair Aspect System (DAS) is to provide an easy system for character sheet to include dynamic elements and calculations to their html sheet to integrate into VTT, specifically Talespire.

This is user made content, not affiliated with BouncyRock, Talespire, math.js in any way.

## Glossary

- DAS: Dakair Aspect System 
   - Originally named *Custom Attribute System* (CAS), but confusion with existing rpg and html attribute name drove me to rename it.
- Aspect: Any element that can be referred. In RPG, it can be an attribute, a skill, the weight of an item. In this system, everything value is managed by an aspect.
- Field: An element that represent data to be displayed.
- Formula: A mathematical formula resolved by math.js.
- Line: The DAS used a system that allows definition array-like aspects to be created dynamically. For example a gear list could include the name, quantity, weight and total weight aspects. When you add a line, all those related aspects are added.
- Property: An aspect name that is part of a line. When the composed property name is mentioned, it means that you must include the line-name _ property_name. A property name in the skill line would be composed like this: skill_name
- Reference aspect: This aspect allow to refer to an another aspect by name and returns it's value. For example, in a skill list, you could provide a choice of linked aspect names and want to get the linked aspect value dynamically.

## Usage - quick
Here is the TLDR; code to use the system. The symbol [...] means any of your code can be there 😊.

#### Include these in your html page:
```
<head>
  [...]
  <script src="math.js" ></script>
  <script src="custom-aspect-system.js" ></script>
  <script src="custom-aspect-system-ui.js" ></script>
</head>
<body>
  [...] - Should include the template, else nothing will happen
  <script>
    var casHandler = new CasUiHandler();
	casHandler.initialize();
  </script>
</body>
```
#### Sample template
This simple template creates 2 fields. A user input field and a formula based on that field. See template definition for the complete reference.
```
<div>
    <label>str</label>
    <input type="text" data-ref-key="strength" data-default-value="12" class="field-data" >
</div>
<div class="col">
    <label>str modifier</label>
    <input type="text"  data-ref-key="strength_mod" data-formula="floor((strength - 10) / 2)" class="field-data" >
</div>
```

## How does it work
The DAS system is divided in 2 parts, ui and the DAS. The ui handler is not mandatory and can be replaced with custom code. This section presume the usage of the unmodifier CasUiHandler class.

In the script, when CasUiHandler is initialized, it parse the document for the css selectors of the different fields and container it supports. Current value of elements is treated as default-value, unless overidden. It then sends the aspects to the DAS system, and DAS recalculate any other aspects that are impacted and send new calculated values back.

## Aspect Definition
This section suppose the usage of the default selectors and DOM attributes, as defined in custom-aspect-system-ui.js, classes CasSelectors and CasAttributes. See next section to customize.

## Optional Dom Attributes 

Those dom attributes can be set on any aspect and are not mandatory



| | Dom attribute | Explanation |
| ---|----------| -----|
| | data-default-value | Override the value of the eleemnt as the default value for this element |
| | data-type | Default is  ?. Can be int, float, text. It is evaluated from the default-value when left at ?. Really useful for aspects used in aggregate function, as 1+3=12 is not what you expect from a sum of values. |



### Data Field
The basic kind of field is a direct data field. It is meant to capture the input of the user and transmit it's value. 
|| Data field |
| ----------| -----|
| class | "field-data" |
| attributes | data-ref-key="name"|
| examples | `<input type="text" data-ref-key="strength"  class="field-data" >` <br /> `<select data-ref-key="link" class="field-data"><option value="strength">Strength</option><option value="dexterity">Dexterity</option></select>`|

### Reference field
This kind of aspect allow to reference the name of another Aspect and get the referred value. Useful when you can choose a changing aspect to select the appropriate modifier for a test.
|| Reference field |
| ------| -----|
| class | "field-data" |
| attributes | data-ref-key="name" <br /> data-reference="aspect-name"|
| example | `<input type="text" data-ref-key="changing-value" data-reference="link" class="field-data" >` |

### Formula field
The data-formula aspect must contain the mathematical formula. All function of math.js are handled, as math.js handles all the calculations.

The aspect must be referred by composed name. For most aspect, the data-ref-key is the simple aspect name, but not for line aspect fields. 

| | Formula field |
| ------| -----|
| class | "field-data" |
| attributes | data-ref-key="name" <br /> data-formula="formula" |
| special | Read Line element for special line proeprty name and referral |
| example | `<input type="text" data-ref-key="strength-mod" data-formula="floor((attr_str - 10) / 2)" class="field-data" >` |


### Line Aspects

Line aspects are designed for repeating sections of aspects. Meant to host skill list, spell list or gears, or any dynamic size aspects. It's sub-aspects (called properties) can contains the 3 other kinds of aspects (data, formula, reference).  Read carefully the Line sub-section in this documentation.

#### **Line Template** 
It defines the parent element, the line name used and each of the aspects that is created per line. However, before loading data, only the definition is created. **The whole line definition must be enclosed within a single parent**. If not, the delete button script will only partially delete the line.

|| Line template |
| ------| -----|
| tag | template |
| class | "line-definition" |
| attributes | data-line-name="lineName" |
| special | Whole definition should have a parent element (any div will do) inside the tag|
| example | See [complete line example](#line-example) |

#### **Line Properties**

All normal kind of aspects can be added (Direct, Formula and reference).

|| Line Fields |
| ------| -----|
| class | "field-line-data" |
| attributes | data-line-name="lineName" <br /> data-ref-key="name" |
|| For reference aspect <br /> data-reference="name" |
|| For formula aspect <br /> data-formula="formula" |
|||
|special| For references and formulas, use composed name (lineName_propertyName) <br /> Include `[line-id]` to refer to that line's property <br /> ex: `data-reference="skill_link[line-id]"` |
| example | See [complete line example](#line-example) |

#### 2. **The container**
It is the section where the html template will be added per line created.

|| Line container |
| ------| -----|
| class | "line-container" |
| attributes | data-line-name="lineName" |
| example | See [complete line example](#line-example) |

#### 3. **The Add button**

It adds the new line in the DAS and create the rendered html element in the container. It must be located *outside* the line definition.

|| Line container |
| ------| -----|
| class | "line-button-add" |
| attributes | data-line-name="lineName" |
| special | Whole definition should have a parent element (any div will do) |
| example | See [complete line example](#line-example) |

**Line Formula specifications**
---

Line aspects names are composed of the line-name _ data-ref-key (ex: `skill_gear`). There is a special value `[line-id]` that can be inserted for line aspect. For an item line with properties of quantity and weight, the formula for weight-calculation would be :
**gear_quantity[line-id] * gear_weight[line-id]**

Special functions and their parameters
|lineAggregate| returns aggregation of all lines|
| --- | --- |
|lineMap| The line aspect name, will get the internal Map reference|
|propertyName| The line property name. Used to calculate the value|
|operation| Optional. Default to sum. can be sum,mean,count|
|propNameCond| Optional. **Property name** used to do conditional check for aggregation. <br /> If included, is paired with next parameter to establish condition.|
|propValueCond| Optional. **Property value** used to do conditional check for aggregation. |
|||
|returns| the value of the aggregated operation, 0 if nothing found.|
|ex| sum: `data-formula="lineAggregate(gear, quantity)"` <br /> count: `data-formula="lineAggregate(gear, name, 'count')"` <br /> condition : `data-formula="lineAggregate(gear, name, 'count', isStolen, 'true')"`|

|lineFirst| returns first line matching a criteria|
| --- | --- |
|lineMap| The line aspect name, will get the internal Map reference|
|propNameCond| **Property name** used to do conditional check with next parameter. |
|propValueCond| **Property value** needed to return line value. |
|||
|returns| The Line Object matching the condition. Returns a new empty Object if condition not met|
|ex|`data-formula="lineFirst(gear, worn, 1)"`|


#### Line example
```
<button type="button" data-line-name="gear" class="line-button-add">Add Gear</button>
[...]
<div data-line-name="gear" class="line-container">
</div>
[...]
<template data-line-name="gear" class="line-definition">
  <div>      
    <label>weight</label>
    <input type="text" data-ref-key="weight" class="field-line-data" >
    <label>qty</label>
    <input type="text" data-ref-key="qty" class="field-line-data">
    <label>Line - calc weight</label>
    <input type="text" data-ref-key="weight_calc" data-formula="gear_qty[line-id] * gear_weight[line-id]" class="field-line-data" >        
    <button type="button" class="line-button-delete">Delete</button>
  </div>
</template>
```

## Special consideration

- Checkboxes values are not treated with any consideration, so they have checked and unchecked values.
- Field-data must be either input or select. The DAS-ui does not support other cases.
- The system is made to be easy and flexible to a limit, not to handle all possible cases.

## Customized selectors and attributes

The clean way to change the attributes and selectors is to instanciate them and set their properties.
Use the constructor of the DAS to use your own instances instead of default ones.

Warnings:
- CasSelectors.lineParent : Must be a single attribute, as it is assigned by replacing the dot.
- CasSelectors.templateDefinition : Value is used in a not condition when looking for non-line fields.

example :
```
  <script>
    let mySelectors = new CasSelectors();
    mySelectors.field = '.das-field';
    let myAttributes = new CasAttributes();
    myAttributes.fieldKey = 'data-das-key';
    var casHandler = new CasUiHandler(mySelectors, myAttributes);
	casHandler.initialize();
  </script>
```

## Copyrights

- CustomAtributeSystem has been developped by Rethdakair is is given freely to use anyhow and anywhere you want, without any liability from my side.
- DAS is not linked in any way to math.js, nor the authors of DAS.
- [math.js](https://mathjs.org/) is open source and licensed under the Apache 2.0 License.

Updated 2024-01-05 in Quebec (Canada) by Rethdakair