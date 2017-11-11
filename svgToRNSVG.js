function parseCSSText(cssText) {
    cssText = cssText.replace('style=', '');
    cssText = cssText.replace(/"/g, '');
    var style = {}, [, ruleName, rule] = cssText.match(/(.*){([^}]*)}/)||[,,cssText];
    var cssToJs = s => s.replace(/[\W]+\w/g, match => match.slice(-1).toUpperCase());
    var properties = rule.split(";").map(o => o.split(":").map(x => x && x.trim()));
    for (var [property, value] of properties) style[cssToJs(property)] = value;
    return {cssText, ruleName: ruleName && ruleName.trim(), style};
}

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

function fixSVGText() {
    var text = editor.getValue();
    const openTags = text.match(/\<(.*?)\ /g);

    if (openTags !== null) {
        openTags.map(openTag => {
            const regExpTag = new RegExp(openTag);
            let element = openTag.match(/\<(.*?)\s/);
            if (element[1] !== "svg") {
                text = text.replace(regExpTag, '<Svg.' + element[1].charAt(0).toUpperCase() + element[1].slice(1) + ' ')
            }
        })
    }

    const openTagsNoSpace = text.match(/\<(.*?)\>(.*?)/g);

    if (openTagsNoSpace !== null) {
        openTagsNoSpace.map(openTag => {
            const regExpTag = new RegExp(openTag);
            let element = openTag.match(/\<(.*?)\>(.*?)/);
            if (element[1] !== "svg" && element.input.indexOf('/') === -1) {
                text = text.replace(regExpTag, '<Svg.' + element[1].charAt(0).toUpperCase() + element[1].slice(1) + '>')
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
                if (element[1] !== "svg") {
                    text = text.replace(regExpTag, '</Svg.' + element[1].charAt(0).toUpperCase() + element[1].slice(1) + '>')
                }
            }
        })
    }

    const dashes = text.match(/\w*-\w*/g);

    if (dashes !== null) {
        dashes.map(dash => {
            if (isNaN(Number(dash))) {
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
    text = text.replace(new RegExp('defs', 'g'), 'Svg.Defs');

    var styles = text.match(/style=(["'])(?:(?=(\\?))\2.)*?\1/g);
    var placeHolders = text.match(/style=(["'])(?:(?=(\\?))\2.)*?\1/g);

    styles = styles !== null ? styles.map(item => {
        return parseCSSText(item).style;
    }) : []

    for (var i = 0; i < styles.length; i++) {
        var newStyles = '';
        Object.keys(styles[i]).forEach((key,index) => {
            if (key === '"') {
                return
            }
            newStyles += key + '=' + '"' + styles[i][key] + '"' + ' '
        })
        text = text.replace(placeHolders[i], newStyles);
    }
    text = text.replace(new RegExp('styleStroke', 'g'), 'stroke');

    console.log(text)
    editor.setValue(text);
    // const leftOverStyles = text.match(/style/g);

    // if (leftOverStyles !== null) {
    //     leftOverStyles.map(style => {
    //         const regExpTag = new RegExp(style);
    //         let element = text.match(/style/);
    //         console.log(element)
    //     })
    // }
}
