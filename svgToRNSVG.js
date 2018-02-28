let expo = false;

function expoCheck(value) {
    if (value === 'expo') {
        const expoStyle = document.getElementById('expoButton').style.backgroundColor = '#B71C1C';
        const rnStyle = document.getElementById('rnButton').style.backgroundColor = '#2B2E35';
        expo = true;
    } else {
        const expoStyle = document.getElementById('expoButton').style.backgroundColor = '#2B2E35';
        const rnStyle = document.getElementById('rnButton').style.backgroundColor = '#B71C1C';
        expo = false;
    }
}

function parseCSSText(cssText) {
    cssText = cssText.replace('style=', '');
    cssText = cssText.replace(/"/g, '');    
    let style = {},
        [, ruleName, rule] = cssText.match(/(.*){([^}]*)}/) || [, , cssText];    
    let cssToJs = s => s.replace(/[\W]+\w/g, match => match.slice(-1).toUpperCase());    
    let properties = rule.split(";").map(o => o.split(":").map(x => x && x.trim()));    
    for (let [property, value] of properties) {
        if (property.length > 0) {
            style[cssToJs(property)] = value;
        }
    }    
    return { cssText, ruleName: ruleName && ruleName.trim(), style };
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

function fixSVGText() {
    let text = editor.getValue();
    text = text.replace(/\<?(.*?)\?>(.*?)/g, ''); // remove all xml headers
    text = text.replace(/\<!(.*?)\->(.*?)/g, ''); // remove all comments
    text = text.replace(/\xml(.*?)\"(.*?)\"(.*?)/g, ''); // remove all xml namespaces
    text = text.replace(/\<!(.*?)\>(.*?)/g, '');
    text = js_beautify(text, { e4x: true });
    let elements = text.match(/<([\s\S]*?)>/g);

    elements.map(element => {
        text = text.replace(element, element.replace(/(?:\r\n|\r|\n)/g, ''));
    })

    const openTags = text.match(/\<(.*?)\ /g);

    if (openTags !== null) {
        openTags.map(openTag => {
            const regExpTag = new RegExp(openTag);
            let element = openTag.match(/\<(.*?)\s/);
            if (element.input.indexOf('svg') === -1 && element.input.indexOf('/') === -1 && element.input.indexOf('Svg') === -1) {
                const prefix = expo ? '<Svg.' : '<';
                text = text.replace(regExpTag, prefix + element[1].charAt(0).toUpperCase() + element[1].slice(1) + ' ')
            }
        })
    }

    const openTagsNoSpace = text.match(/\<(.*?)\>(.*?)/g);

    if (openTagsNoSpace !== null) {
        openTagsNoSpace.map(openTag => {
            const regExpTag = new RegExp(openTag);
            let element = openTag.match(/\<(.*?)\>(.*?)/);
            if (element.input.indexOf('svg') === -1 && element.input.indexOf('/') === -1 && element.input.indexOf('Svg') === -1) {
                const prefix = expo ? '<Svg.' : '<';
                text = text.replace(regExpTag, prefix + element[1].charAt(0).toUpperCase() + element[1].slice(1) + '>')
            }
        })
    }

    const closeTags = text.match(/\<(.*?)\>(.*?)/g);

    if (closeTags !== null) {
        closeTags.map(closeTag => {
            if (closeTag.indexOf('</') > -1) {
                const regExpTag = new RegExp(closeTag);
                let element = closeTag.match(/\<(.*?)\>(.*?)/);
                element[1] = element[1].replace('/', '');
                if (element.input.indexOf('svg') === -1 && element.input.indexOf('Svg') === -1) {
                    const prefix = expo ? '</Svg.' : '</';
                    text = text.replace(regExpTag, prefix + element[1].charAt(0).toUpperCase() + element[1].slice(1) + '>')
                }
            }
        })
    }

    const dashes = text.match(/\w*-\w*/g);

    if (dashes !== null) {
        dashes.map(dash => {
            const checkDash = dash.split('-');
            let checkDashFirstLetter = checkDash[1][0];
            if (checkDash[1] === '') {
                checkDashFirstLetter = false;
            }
            else {
                checkDashFirstLetter = isNaN(Number(checkDash[1][0]));
            }
            if (isNaN(Number(dash.replace('-', ''))) && checkDashFirstLetter) {
                const regExpTag = new RegExp(dash);
                let element = dash.match(/-/);
                const index = element['index'];
                const originalInput = element['input'];
                element['input'] = element['input'].replace('-', '');
                element['input'] = element['input'].replaceAt(index, element['input'][index].toUpperCase())
                text = text.replace(originalInput, element['input'])
            }
        })
    }
    text = text.replace(new RegExp('svg', 'g'), 'Svg');
    text = text.replace(new RegExp('stroke-linecap', 'g'), 'strokeLinecap');
    text = text.replace(new RegExp('transform=""', 'g'), '');

    let styles = text.match(/style=(["'])(?:(?=(\\?))\2.)*?\1/g);
    let placeHolders = text.match(/style=(["'])(?:(?=(\\?))\2.)*?\1/g);

    styles = styles !== null ? styles.map(item => {
        return parseCSSText(item).style;
    }) : []

    for (var i = 0; i < styles.length; i++) {
        var newStyles = '';
        Object.keys(styles[i]).forEach((key, index) => {
            if (key === '"') {
                return
            }
            newStyles += key + '=' + '"' + styles[i][key] + '"' + ' '
        })
        text = text.replace(placeHolders[i], newStyles);
    }

    text = text.replace(/^\s*\n/gm, '');
    text = text.replace(/ +(?= )/g, ''); // replace multiple spaces with 1 space
    if (expo) {
        text = "import React from 'react'; \nimport { Svg } from 'expo';\n\nexport default (props) => (\n" + text + ')';
    } else {
        /* Get all components in SVG, ex: G, Path, etc. Add them to imports */
        const tags = text.match(/\<(.*?)\>(.*?)/g);
        const imports = [];
        tags.map(tag => {
            const splitTag = tag.split(' ');
            let componentToImport = splitTag[0];
            componentToImport = componentToImport.replace('<', '');
            componentToImport = componentToImport.replace('/', '');
            componentToImport = componentToImport.replace('>', '');
            if (imports.indexOf(componentToImport) === -1 &&
                componentToImport !== 'Svg') {
                imports.push(componentToImport);
            }

        })
        text = "import React from 'react'; \nimport Svg, { " + imports.join(', ') + " } from 'react-native-svg';\n\nexport default (props) => (\n" + text + ')';
    }

    const tags = text.match(/\<(.*?)\>(.*?)/g);
    tags.map(tag => {
        const splitTag = tag.split(' ');
        splitTag.map(item => {
            if (item.indexOf('width="') > -1) {
                let tempItem = item.replace('width="', 'width={');
                tempItem = tempItem.replace('"', '}');
                tempItem = tempItem.replace('px', '');
                text = text.replace(item, tempItem);
            }
            else if (item.indexOf('height="') > -1) {
                let tempItem = item.replace('height="', 'height={');
                tempItem = tempItem.replace('"', '}');
                tempItem = tempItem.replace('px', '');
                text = text.replace(item, tempItem);
            }
        })
        if (tag.indexOf('<Svg') > -1 
                && tag.indexOf('width="') === -1
                && tag.indexOf('height="') === -1
                && tag.indexOf('Svg.') === -1
            ) {
                let tempItem = splitTag[0] + ' width={props.width} height={props.height}';
                text = text.replace(splitTag[0], tempItem);
            }

    })

    text = js_beautify(text, { e4x: true });
    editor.setValue(text);

}